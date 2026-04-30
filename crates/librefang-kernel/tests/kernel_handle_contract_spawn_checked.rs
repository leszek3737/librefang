use librefang_kernel::LibreFangKernel;
use librefang_kernel_handle::KernelHandle;
use librefang_types::capability::Capability;
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

fn minimal_manifest() -> &'static str {
    r#"
name = "test-agent"
version = "0.1.0"
description = "test"
author = "test"
module = "builtin:chat"

[model]
provider = "none"
model = "none"
system_prompt = "test"
"#
}

fn child_manifest() -> &'static str {
    r#"
name = "child-agent"
version = "0.1.0"
description = "child"
author = "test"
module = "builtin:chat"

[model]
provider = "none"
model = "none"
system_prompt = "test"
"#
}

fn child_manifest_with_escalated_tool() -> &'static str {
    r#"
name = "privileged-child-agent"
version = "0.1.0"
description = "child requesting parent-denied tool"
author = "test"
module = "builtin:chat"

[model]
provider = "none"
model = "none"
system_prompt = "test"

[capabilities]
tools = ["shell_exec"]
"#
}

#[tokio::test(flavor = "multi_thread")]
async fn test_spawn_agent_checked_with_empty_parent_caps() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    let result = kh.spawn_agent_checked(minimal_manifest(), None, &[]).await;
    assert!(
        result.is_ok(),
        "spawn_agent_checked failed: {:?}",
        result.err()
    );

    let (id, name) = result.unwrap();
    assert!(!id.is_empty());
    assert_eq!(name, "test-agent");

    let agents = kh.list_agents();
    assert!(
        agents.iter().any(|a| a.id == id),
        "spawned agent should appear in list_agents"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn test_spawn_agent_checked_passes_parent_id() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    let (parent_id, _parent_name) = kh
        .spawn_agent(minimal_manifest(), None)
        .await
        .expect("parent spawn failed");

    let result = kh
        .spawn_agent_checked(child_manifest(), Some(&parent_id), &[])
        .await;
    assert!(
        result.is_ok(),
        "spawn_agent_checked with parent failed: {:?}",
        result.err()
    );

    let (child_id, child_name) = result.unwrap();
    assert!(!child_id.is_empty());
    assert_eq!(child_name, "child-agent");

    let agents = kh.list_agents();
    assert!(
        agents.iter().any(|a| a.id == parent_id),
        "parent agent should be in list_agents"
    );
    assert!(
        agents.iter().any(|a| a.id == child_id),
        "child agent should be in list_agents"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn test_spawn_agent_checked_with_capability_list() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    let parent_caps = vec![
        Capability::ToolInvoke("*".to_string()),
        Capability::FileRead("/data/*".to_string()),
        Capability::NetConnect("*.example.com:443".to_string()),
    ];

    let result = kh
        .spawn_agent_checked(minimal_manifest(), None, &parent_caps)
        .await;
    assert!(
        result.is_ok(),
        "spawn_agent_checked with caps failed: {:?}",
        result.err()
    );

    let (id, name) = result.unwrap();
    assert!(!id.is_empty());
    assert_eq!(name, "test-agent");

    let agents = kh.list_agents();
    assert!(
        agents.iter().any(|a| a.id == id),
        "spawned agent should appear in list_agents"
    );
}

#[tokio::test(flavor = "multi_thread")]
async fn test_spawn_agent_checked_rejects_capability_escalation() {
    let (kernel, _tmp) = boot();
    let kh: &dyn KernelHandle = &kernel;

    let parent_caps = vec![Capability::FileRead("/data/*".to_string())];

    let result = kh
        .spawn_agent_checked(child_manifest_with_escalated_tool(), None, &parent_caps)
        .await;
    assert!(
        result.is_err(),
        "spawn_agent_checked should reject child capability escalation"
    );

    let error = result.unwrap_err();
    let error_lower = error.to_lowercase();
    assert!(
        error_lower.contains("escalation")
            || error_lower.contains("denied")
            || error_lower.contains("capability"),
        "error should mention capability denial or escalation, got: {error}"
    );
}
