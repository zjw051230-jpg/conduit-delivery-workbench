import axios from "axios";

async function readData(request) {
  const response = await request;
  return response.data;
}

export function fetchConfig() {
  return readData(axios.get("/api/ai/config"));
}

export function submitTask(payload) {
  return readData(axios.post("/api/ai/tasks", payload));
}

export function replayTask(taskId, options) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/replay`, options));
}

export function fetchTask(taskId) {
  return readData(axios.get(`/api/ai/tasks/${taskId}`));
}

export function fetchStages(taskId) {
  return readData(axios.get(`/api/ai/tasks/${taskId}/stages`));
}

export function fetchArtifacts(taskId, type) {
  const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
  return readData(axios.get(`/api/ai/tasks/${taskId}/artifacts${suffix}`));
}

export function runStage(taskId, stageId, options) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/stages/${stageId}/run`, options));
}

export function runNextStage(taskId) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/run-next`));
}

export function runAllStages(taskId) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/run-all`));
}

export function deliveryPreview(taskId) {
  return readData(axios.get(`/api/ai/tasks/${taskId}/delivery/preview`));
}

export function deliveryCommit(taskId) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/delivery/commit`));
}

export function remotePreview(taskId) {
  return readData(axios.get(`/api/ai/tasks/${taskId}/delivery/remote-preview`));
}

export function submitRemotePrAuthorization(taskId, remoteApproval) {
  return readData(axios.post(`/api/ai/tasks/${taskId}/delivery/pr`, remoteApproval));
}
