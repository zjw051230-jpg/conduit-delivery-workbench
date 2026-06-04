const CONTEXT_PROFILES = {
  "crud.fullstack": {
    requiredSignals: ["ui_file", "api_file"],
    optionalSignals: ["route_file", "test_file", "graph_evidence"],
  },
  ui_change: {
    requiredSignals: ["ui_file"],
    optionalSignals: ["style_file", "component_file", "test_file"],
  },
  bugfix: {
    requiredSignals: ["suspected_file"],
    optionalSignals: ["error_log", "test_file", "related_callsite"],
  },
  test_fix: {
    requiredSignals: ["test_file", "implementation_file"],
    optionalSignals: ["error_log"],
  },
  config_change: {
    requiredSignals: ["config_file"],
    optionalSignals: ["package_file", "build_script"],
  },
  backend_api: {
    requiredSignals: ["api_file"],
    optionalSignals: ["route_file", "controller_file", "service_file", "model_file", "test_file"],
  },
  docs_change: {
    requiredSignals: ["doc_file"],
    optionalSignals: ["related_code_file"],
  },
  unknown: {
    requiredSignals: ["some_relevant_file"],
    optionalSignals: ["graph_evidence"],
  },
};

module.exports = { CONTEXT_PROFILES };
