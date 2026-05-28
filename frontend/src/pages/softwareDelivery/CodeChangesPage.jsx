import React from "react";

export default function CodeChangesPage({ pageConfig, loading, error }) {
  return <PageSkeleton pageConfig={pageConfig} loading={loading} error={error} />;
}

function PageSkeleton({ pageConfig = {}, loading, error }) {
  return (
    <section className="artifact-card software-delivery-page-skeleton" aria-label={`${pageConfig.title || "Software Delivery"} page`}>
      <p className="eyebrow">Software Delivery Page</p>
      <h3>{pageConfig.title || "Code Changes"}</h3>
      <p>{pageConfig.primaryQuestion}</p>
      <dl className="compact-list">
        <dt>Produced artifact</dt>
        <dd>{pageConfig.producedArtifact || "n/a"}</dd>
        <dt>View location</dt>
        <dd>{pageConfig.viewLocation || "n/a"}</dd>
        <dt>Primary action</dt>
        <dd>{pageConfig.primaryAction || "n/a"}</dd>
        <dt>Previous page</dt>
        <dd>{pageConfig.previousPage || "none"}</dd>
        <dt>Next page</dt>
        <dd>{pageConfig.nextPage || "none"}</dd>
      </dl>
      {loading && <p className="muted">Loading page data...</p>}
      {error && <p className="mission-alert">{error}</p>}
    </section>
  );
}
