//! `docker_exec` sandbox tool — run an LLM-supplied command inside a
//! disposable Docker container scoped to the agent's workspace.

use std::path::Path;
use std::sync::Arc;
use tracing::warn;

struct ContainerGuard {
    container: Option<Arc<crate::docker_sandbox::SandboxContainer>>,
}

impl ContainerGuard {
    fn new(container: crate::docker_sandbox::SandboxContainer) -> Self {
        Self {
            container: Some(Arc::new(container)),
        }
    }

    fn inner(&self) -> &crate::docker_sandbox::SandboxContainer {
        self.container.as_ref().unwrap()
    }

    fn defuse(mut self) -> Arc<crate::docker_sandbox::SandboxContainer> {
        self.container.take().unwrap()
    }
}

impl Drop for ContainerGuard {
    fn drop(&mut self) {
        if let Some(container) = self.container.take() {
            tokio::spawn(async move {
                let _ = crate::docker_sandbox::destroy_sandbox(&container).await;
            });
        }
    }
}

pub(super) async fn tool_docker_exec(
    input: &serde_json::Value,
    docker_config: Option<&librefang_types::config::DockerSandboxConfig>,
    workspace_root: Option<&Path>,
    caller_agent_id: Option<&str>,
) -> Result<String, String> {
    let config = docker_config.ok_or("Docker sandbox not configured")?;

    if !config.enabled {
        return Err("Docker sandbox is disabled. Set docker.enabled=true in config.".into());
    }

    let command = input["command"]
        .as_str()
        .ok_or("Missing 'command' parameter")?;

    let workspace = workspace_root.ok_or("Docker exec requires a workspace directory")?;
    let agent_id = caller_agent_id.unwrap_or("default");

    // Check Docker availability
    if !crate::docker_sandbox::is_docker_available().await {
        return Err(
            "Docker is not available on this system. Install Docker to use docker_exec.".into(),
        );
    }

    let container = crate::docker_sandbox::create_sandbox(config, agent_id, workspace).await?;
    let guard = ContainerGuard::new(container);

    let timeout = std::time::Duration::from_secs(config.timeout_secs);
    let result = crate::docker_sandbox::exec_in_sandbox(guard.inner(), command, timeout).await;

    let container = guard.defuse();
    if let Err(e) = crate::docker_sandbox::destroy_sandbox(&container).await {
        warn!("Failed to destroy Docker sandbox: {e}");
    }

    let exec_result = result?;

    let response = serde_json::json!({
        "exit_code": exec_result.exit_code,
        "stdout": exec_result.stdout,
        "stderr": exec_result.stderr,
        "container_id": container.container_id,
    });

    serde_json::to_string_pretty(&response).map_err(|e| format!("Serialize error: {e}"))
}
