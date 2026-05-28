import React from "react";
import { getDefaultSoftwareDeliveryPage, getPageById } from "../../productFlow/stepNavigation";
import {
  TASK_MODES,
  buildTimelineSteps,
  getCurrentProductStepKey,
  getProductStepFailure,
  getTaskMode,
  productStepStatus,
  timelineTone,
} from "../../lib/taskViewModel";

export function RunTimeline({ currentProductPageId, delivery, onProductPageChange, selectedTaskMode, task }) {
  const isAlgorithm = getTaskMode(task, selectedTaskMode) === TASK_MODES.ALGORITHM_COMPETITION;
  const steps = buildTimelineSteps(task, delivery, isAlgorithm);
  const currentPage = isAlgorithm ? null : getPageById(currentProductPageId) || getDefaultSoftwareDeliveryPage();

  return (
    <section className="mission-card timeline-panel">
      <div className="section-heading horizontal">
        <div>
          <p>Pipeline Timeline</p>
          <h2>{isAlgorithm ? "Labs / Debug Workflow" : "Conduit Delivery Path"}</h2>
        </div>
        <span className="safety-pill">Dangerous remote actions isolated</span>
      </div>
      {!isAlgorithm && currentPage && <ProductPageSummary page={currentPage} />}
      <div className="timeline-rail product-flow-rail">
        {steps.map((step) => {
          const status = step.status || productStepStatus(step.key, task, delivery, isAlgorithm);
          const isCurrent = isAlgorithm ? step.key === getCurrentProductStepKey(task, delivery, isAlgorithm) : step.key === currentPage.id;
          const failure = getProductStepFailure(step.key, task, delivery, isAlgorithm);
          const className = `timeline-step timeline-${timelineTone(status)}${isCurrent ? " timeline-current" : ""}`;
          const content = (
            <>
              <span>{step.label}</span>
              <strong>{isCurrent ? `current / ${status}` : status}</strong>
              <dl className="product-step-meta">
                <dt>Produced artifact</dt>
                <dd>{step.producedArtifact}</dd>
                <dt>View location</dt>
                <dd>{step.viewLocation}</dd>
                <dt>Next action</dt>
                <dd>{step.nextAction}</dd>
                {failure && (
                  <>
                    <dt>Failure</dt>
                    <dd>{failure}</dd>
                  </>
                )}
              </dl>
            </>
          );

          return isAlgorithm ? (
            <article className={className} key={step.key}>{content}</article>
          ) : (
            <button className={className} key={step.key} type="button" onClick={() => onProductPageChange(step.key)}>
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProductPageSummary({ page }) {
  return (
    <article className="artifact-card">
      <div className="artifact-card-title">
        <h3>Current page: {page.title}</h3>
        <span>{page.safetyLevel}</span>
      </div>
      <p>{page.primaryQuestion}</p>
      <dl className="compact-list">
        <dt>Produced artifact</dt>
        <dd>{page.producedArtifact}</dd>
        <dt>View location</dt>
        <dd>{page.viewLocation}</dd>
        <dt>Primary action</dt>
        <dd>{page.primaryAction}</dd>
        <dt>Previous page</dt>
        <dd>{page.previousPage || "none"}</dd>
        <dt>Next page</dt>
        <dd>{page.nextPage || "none"}</dd>
      </dl>
    </article>
  );
}
