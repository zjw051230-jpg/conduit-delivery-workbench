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
      <div className="timeline-rail product-flow-rail">
        {steps.map((step) => {
          const status = step.status || productStepStatus(step.key, task, delivery, isAlgorithm);
          const isCurrent = isAlgorithm ? step.key === getCurrentProductStepKey(task, delivery, isAlgorithm) : step.key === currentPage.id;
          const failure = getProductStepFailure(step.key, task, delivery, isAlgorithm);
          const className = `timeline-step timeline-${timelineTone(status)}${isCurrent ? " timeline-current" : ""}`;
          const page = isAlgorithm ? null : getPageById(step.key);
          const intent = page?.intent || step.nextAction || "Review this stage";
          const content = (
            <>
              <span>{step.label}</span>
              <strong>{isCurrent ? `current / ${status}` : status}</strong>
              <small>{failure || intent}</small>
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
