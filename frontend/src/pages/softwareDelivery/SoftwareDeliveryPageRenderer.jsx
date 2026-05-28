import React from "react";
import { getDefaultSoftwareDeliveryPage, getPageById } from "../../productFlow/stepNavigation";
import CodeChangesPage from "./CodeChangesPage";
import DeliveryPage from "./DeliveryPage";
import ImplementationPlanPage from "./ImplementationPlanPage";
import PMRequestPage from "./PMRequestPage";
import PreviewEffectPage from "./PreviewEffectPage";
import RequirementBriefPage from "./RequirementBriefPage";
import ReviewPage from "./ReviewPage";
import TaskInboxPage from "./TaskInboxPage";
import VerificationPage from "./VerificationPage";
import WorkBreakdownPage from "./WorkBreakdownPage";

export const softwareDeliveryPageComponents = {
  task_inbox: TaskInboxPage,
  pm_request: PMRequestPage,
  requirement_brief: RequirementBriefPage,
  work_breakdown: WorkBreakdownPage,
  implementation_plan: ImplementationPlanPage,
  code_changes: CodeChangesPage,
  preview_effect: PreviewEffectPage,
  verification: VerificationPage,
  review: ReviewPage,
  delivery: DeliveryPage,
};

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
  const PageComponent = softwareDeliveryPageComponents[pageConfig.id] || PMRequestPage;
  const resolvedArtifacts = artifacts || task?.artifacts || [];
  const currentArtifact = resolvedArtifacts.find((artifact) => artifact.type === pageConfig.artifactType) || null;

  return (
    <PageComponent
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
