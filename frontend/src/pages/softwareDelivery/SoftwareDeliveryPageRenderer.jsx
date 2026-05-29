import React from "react";
import { getDefaultSoftwareDeliveryPage, getPageById } from "../../productFlow/stepNavigation";
import SoftwareDeliveryWorkbenchPreview from "./SoftwareDeliveryWorkbenchPreview";

export function SoftwareDeliveryPageRenderer({
  actions = {},
  artifacts,
  currentProductPageId,
  error,
  loading = false,
  onApprove,
  onNavigate,
  onRegenerate,
  onRequestRevision,
  onRunStep,
  task,
}) {
  const pageConfig = getPageById(currentProductPageId) || getDefaultSoftwareDeliveryPage();
  const resolvedArtifacts = artifacts || task?.artifacts || [];
  const currentArtifact = resolvedArtifacts.find((artifact) => artifact.type === pageConfig.artifactType) || null;

  return (
    <SoftwareDeliveryWorkbenchPreview
      actions={actions}
      artifacts={resolvedArtifacts}
      currentArtifact={currentArtifact}
      error={error}
      loading={loading}
      onApprove={onApprove}
      onNavigate={onNavigate}
      onRegenerate={onRegenerate}
      onRequestRevision={onRequestRevision}
      onRunStep={onRunStep}
      pageConfig={pageConfig}
      task={task}
    />
  );
}

export default SoftwareDeliveryPageRenderer;
