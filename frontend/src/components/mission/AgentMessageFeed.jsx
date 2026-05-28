import React from "react";
import { StatusBadge } from "../common/StatusBadge";
import { buildRunFeed } from "../../lib/taskViewModel";

export function AgentMessageFeed({ task }) {
  const messages = buildRunFeed(task);

  return (
    <section className="mission-card feed-panel">
      <div className="section-heading horizontal">
        <div>
          <p>Live Run Feed</p>
          <h2>Agent 事件流</h2>
        </div>
        <span className="feed-count">{messages.length} events</span>
      </div>
      <div className="feed-list">
        {messages.map((message) => (
          <article className="feed-item" key={message.id}>
            <span className="feed-dot" />
            <div>
              <div className="feed-title">
                <strong>{message.title}</strong>
                <StatusBadge status={message.status} />
              </div>
              <p>{message.detail}</p>
              {message.evidence && <code>{message.evidence}</code>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
