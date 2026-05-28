import React from "react";
import { statusTone } from "../../lib/taskViewModel";

export function StatusBadge({ status }) {
  return <span className={`status-badge badge-${statusTone(status)}`}>{status || "pending"}</span>;
}
