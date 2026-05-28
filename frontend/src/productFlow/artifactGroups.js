export const artifactGroups = [
  {
    id: "requirement",
    title: "Requirement Evidence",
    description: "PM input and structured requirement brief artifacts.",
    artifactTypes: ["pm_request", "requirement_brief"],
  },
  {
    id: "breakdown",
    title: "Work Breakdown Evidence",
    description: "Task ownership, touched modules, test scope, and skill assignment.",
    artifactTypes: ["work_breakdown"],
  },
  {
    id: "plan",
    title: "Implementation Plan Evidence",
    description: "Implementation plan and module-level execution strategy.",
    artifactTypes: ["implementation_plan"],
  },
  {
    id: "code",
    title: "Code Change Evidence",
    description: "Changed files and diff-level delivery evidence.",
    artifactTypes: ["code_diff"],
  },
  {
    id: "preview",
    title: "Preview Evidence",
    description: "Product effect preview and visible behavior summary.",
    artifactTypes: ["effect_preview"],
  },
  {
    id: "tests",
    title: "Verification Evidence",
    description: "Test command output and verification result artifacts.",
    artifactTypes: ["test_result"],
  },
  {
    id: "review",
    title: "Review Evidence",
    description: "Human review readiness and safety gate artifacts.",
    artifactTypes: ["review_report"],
  },
  {
    id: "pr",
    title: "Delivery Evidence",
    description: "Local commit, PR readiness, and PR preview artifacts.",
    artifactTypes: ["local_commit", "pr_readiness", "pr_preview"],
  },
];
