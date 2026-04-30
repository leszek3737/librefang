//! Contract tests for the `KernelHandle` memory methods on `LibreFangKernel`.
//!
//! Validates that `memory_store`, `memory_recall`, and `memory_list` correctly
//! isolate global vs peer-scoped namespaces.

use librefang_kernel::LibreFangKernel;
use librefang_kernel_handle::KernelHandle;
use librefang_types::config::KernelConfig;

fn boot() -> (LibreFangKernel, tempfile::TempDir) {
    let tmp = tempfile::tempdir().expect("failed to create temp directory");
    let home_dir = tmp.path().to_path_buf();
    let data_dir = home_dir.join("data");
    std::fs::create_dir_all(&data_dir).expect("failed to create data directory");
    std::fs::create_dir_all(home_dir.join("skills")).unwrap();
    std::fs::create_dir_all(home_dir.join("workspaces").join("agents")).unwrap();
    std::fs::create_dir_all(home_dir.join("workspaces").join("hands")).unwrap();

    let config = KernelConfig {
        home_dir,
        data_dir: data_dir.clone(),
        network_enabled: false,
        memory: librefang_types::config::MemoryConfig {
            sqlite_path: Some(data_dir.join("test.db")),
            ..Default::default()
        },
        ..KernelConfig::default()
    };

    let kernel = LibreFangKernel::boot_with_config(config).expect("failed to boot test kernel");
    (kernel, tmp)
}

#[test]
fn test_memory_store_recall_isolates_peer_namespaces() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    kh.memory_store("key1", serde_json::json!("global_val"), None)
        .expect("store global");
    kh.memory_store("key1", serde_json::json!("peer_a_val"), Some("peer-a"))
        .expect("store peer-a");
    kh.memory_store("key1", serde_json::json!("peer_b_val"), Some("peer-b"))
        .expect("store peer-b");

    assert_eq!(
        kh.memory_recall("key1", None).expect("recall global"),
        Some(serde_json::json!("global_val"))
    );
    assert_eq!(
        kh.memory_recall("key1", Some("peer-a"))
            .expect("recall peer-a"),
        Some(serde_json::json!("peer_a_val"))
    );
    assert_eq!(
        kh.memory_recall("key1", Some("peer-b"))
            .expect("recall peer-b"),
        Some(serde_json::json!("peer_b_val"))
    );
    assert_eq!(
        kh.memory_recall("key1", Some("peer-c"))
            .expect("recall peer-c"),
        None
    );
}

#[test]
fn test_memory_list_separates_global_and_peer_keys() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    kh.memory_store("g1", serde_json::json!(1), None)
        .expect("store g1");
    kh.memory_store("g2", serde_json::json!(2), None)
        .expect("store g2");
    kh.memory_store("p1", serde_json::json!(3), Some("peer-a"))
        .expect("store p1");
    kh.memory_store("p2", serde_json::json!(4), Some("peer-a"))
        .expect("store p2");

    let global_keys = kh.memory_list(None).expect("list global");
    assert!(global_keys.contains(&"g1".to_string()));
    assert!(global_keys.contains(&"g2".to_string()));
    assert!(!global_keys.contains(&"p1".to_string()));
    assert!(!global_keys.contains(&"p2".to_string()));

    let peer_keys = kh.memory_list(Some("peer-a")).expect("list peer-a");
    assert!(peer_keys.contains(&"p1".to_string()));
    assert!(peer_keys.contains(&"p2".to_string()));
    assert!(!peer_keys.contains(&"g1".to_string()));
    assert!(!peer_keys.contains(&"g2".to_string()));
}

#[test]
fn test_memory_recall_nonexistent_key_returns_none() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    assert_eq!(
        kh.memory_recall("nonexistent", None)
            .expect("recall nonexistent global"),
        None
    );
    assert_eq!(
        kh.memory_recall("nonexistent", Some("peer-x"))
            .expect("recall nonexistent peer"),
        None
    );
}
