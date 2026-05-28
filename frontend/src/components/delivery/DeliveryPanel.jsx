import React from "react";
import { FileList } from "../common/FileList";
import { AlgorithmWorkflowControl } from "../workflow/AlgorithmWorkflowControl";
import { TASK_MODES, getTaskMode } from "../../lib/taskViewModel";

export function DeliveryPanel({
  delivery,
  deliveryLoading,
  onDeliveryCommit,
  onDeliveryPreview,
  onFetchArtifacts,
  onFetchStages,
  onRemoteApprovalChange,
  onRemoteConfirm,
  onRemotePreview,
  onReplay,
  onRunAllStages,
  onRunNextStage,
  onRunStage,
  remoteApproval,
  replayLoading,
  task,
  workflowLoading,
  workflowMessage,
}) {
  if (getTaskMode(task) === TASK_MODES.ALGORITHM_COMPETITION) {
    return (
      <section className="mission-card delivery-console">
        <AlgorithmWorkflowControl
          onFetchArtifacts={onFetchArtifacts}
          onFetchStages={onFetchStages}
          onRunAllStages={onRunAllStages}
          onRunNextStage={onRunNextStage}
          onRunStage={onRunStage}
          task={task}
          workflowLoading={workflowLoading}
          workflowMessage={workflowMessage}
        />
        <div className="section-heading">
          <p>Delivery / PR Control</p>
          <h2>算法比赛工作流安全闸门</h2>
        </div>
        <AlgorithmSafetyNotice />
        <p className="muted delivery-task-ref">Active task: {task.id}</p>
      </section>
    );
  }

  return (
    <section className="mission-card delivery-console">
      <div className="section-heading">
        <p>Delivery / PR Control</p>
        <h2>本地交付与远端 PR 闸门</h2>
      </div>

      <div className="replay-actions">
        <h3>Replay Controls</h3>
        <p className="muted">基于当前需求重新跑编排链路，可先预览，也可以写入 Conduit 目标仓库。</p>
        <div className="button-row">
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: false, runTests: false })}
          >
            {replayLoading ? "重放中..." : "重新预览"}
          </button>
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: true, runTests: false })}
          >
            重放并写入 Conduit
          </button>
          <button
            disabled={replayLoading}
            type="button"
            onClick={() => onReplay({ applyChanges: true, runTests: true })}
          >
            重放写入并测试
          </button>
        </div>
      </div>

      <div className="delivery-actions">
        <h3>PR Delivery</h3>
        <p className="muted">安全版保留准备报告、本地分支/提交、远端 readiness 预览；git push / gh pr create 默认禁用。</p>
        <div className="button-row">
          <button disabled={deliveryLoading} type="button" onClick={onDeliveryPreview}>
            {deliveryLoading ? "处理中..." : "生成 PR 准备报告"}
          </button>
          <button disabled={deliveryLoading} type="button" onClick={onDeliveryCommit}>
            创建本地提交
          </button>
          <button disabled={deliveryLoading} type="button" onClick={onRemotePreview}>
            检查远端 PR 条件
          </button>
          <button disabled type="button">
            创建远端 PR（需要授权）
          </button>
        </div>
        {delivery && <DeliveryReport delivery={delivery} />}
        {delivery?.readiness && (
          <RemotePrConfirmation
            approval={remoteApproval}
            deliveryLoading={deliveryLoading}
            onApprovalChange={onRemoteApprovalChange}
            onConfirm={onRemoteConfirm}
          />
        )}
      </div>
      <p className="muted delivery-task-ref">Active task: {task.id}</p>
    </section>
  );
}

function AlgorithmSafetyNotice() {
  return (
    <div className="algorithm-safety-notice">
      <strong>Skeleton mode</strong>
      <p>Algorithm competition skeleton mode does not run repository writes, tests, commits, push, or PR actions.</p>
      <ul className="safety-list">
        <li>No repository write</li>
        <li>No test command execution</li>
        <li>No commit</li>
        <li>No push</li>
        <li>No PR</li>
      </ul>
    </div>
  );
}

export function DeliveryReport({ delivery }) {
  const readiness = delivery.readiness;
  const proposal = delivery.proposal;
  const safety = delivery.safety || proposal?.safety;
  const changedFiles = delivery.changedFiles || proposal?.changedFiles || [];
  const diffSummary = delivery.diffSummary || proposal?.diffSummary || "No diff.";
  const branchName = delivery.branchName || proposal?.sourceBranch || readiness?.currentBranch || "unknown";
  const testStatus = delivery.testStatus || proposal?.testSummary || "unknown";

  return (
    <div className="delivery-report">
      <dl className="compact-list">
        <dt>Delivery 状态</dt>
        <dd>{delivery.status}</dd>
        <dt>Safety Gate</dt>
        <dd>{safety?.allowed ? "Safety Gate: PASS" : "Safety Gate: BLOCKED"}</dd>
        <dt>测试结果</dt>
        <dd>{testStatus}</dd>
        <dt>分支名</dt>
        <dd>{branchName}</dd>
        {delivery.commitHash && (
          <>
            <dt>本地提交</dt>
            <dd>{delivery.commitHash}</dd>
          </>
        )}
      </dl>

      {readiness && (
        <>
          <h4>Remote Readiness</h4>
          <dl className="compact-list">
            <dt>状态</dt>
            <dd>{readiness.ready ? "Remote Readiness: READY" : "Remote Readiness: BLOCKED"}</dd>
            <dt>远端</dt>
            <dd>{readiness.remote || "none"}</dd>
            <dt>base branch</dt>
            <dd>{readiness.baseBranch || "unknown"}</dd>
            <dt>current branch</dt>
            <dd>{readiness.currentBranch || "unknown"}</dd>
            <dt>current commit</dt>
            <dd>{readiness.currentCommit || "unknown"}</dd>
            <dt>gh auth</dt>
            <dd>{readiness.ghAuth?.ok ? "gh auth: OK" : "gh auth: BLOCKED"}</dd>
          </dl>
          <h4>Blocking Issues</h4>
          <FileList files={delivery.blockingIssues || readiness.blockingIssues} emptyText="无阻塞项。" />
        </>
      )}

      {proposal && (
        <>
          <h4>PR Proposal</h4>
          <dl className="compact-list">
            <dt>PR title</dt>
            <dd>{proposal.prTitle}</dd>
            <dt>target remote</dt>
            <dd>{proposal.targetRemote}</dd>
            <dt>source branch</dt>
            <dd>{proposal.sourceBranch}</dd>
            <dt>base branch</dt>
            <dd>{proposal.baseBranch}</dd>
          </dl>
          <h4>PR Body</h4>
          <pre>{proposal.prBody}</pre>
        </>
      )}

      {delivery.commandPreview?.length > 0 && (
        <>
          <h4>Command Preview</h4>
          <FileList files={delivery.commandPreview} emptyText="暂无命令预览。" />
        </>
      )}

      <h4>变更文件</h4>
      <FileList files={changedFiles} emptyText="暂无 Git 变更。" />

      <h4>Diff Summary</h4>
      <pre>{diffSummary}</pre>

      {delivery.commitMessage && (
        <>
          <h4>Commit Message</h4>
          <pre>{delivery.commitMessage}</pre>
        </>
      )}

      {delivery.message && <p className="muted">{delivery.message}</p>}
      <p className={safety?.allowed ? "success" : "error"}>{safety?.message}</p>
      <p className="muted">push: {String(delivery.remoteActions?.push)} / pr: {String(delivery.remoteActions?.pr)}</p>
    </div>
  );
}

function RemotePrConfirmation({ approval, deliveryLoading, onApprovalChange, onConfirm }) {
  function updateApproval(field, value) {
    onApprovalChange({ ...approval, [field]: value });
  }

  return (
    <form
      className="remote-confirmation"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <h4>远端 PR 二次确认</h4>
      <p className="muted">提交前会再次校验分支、提交、origin、gh auth、base branch 和 PR 冲突；授权字段不完整时不会执行远端动作。</p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.explicitApproval}
          onChange={(event) => updateApproval("explicitApproval", event.target.checked)}
        />
        我已确认这是要交付的远端 PR
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.allowPush}
          onChange={(event) => updateApproval("allowPush", event.target.checked)}
        />
        授权执行 git push
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={approval.allowPrCreate}
          onChange={(event) => updateApproval("allowPrCreate", event.target.checked)}
        />
        授权执行 gh pr create
      </label>
      <label className="field-row">
        确认分支名
        <input
          aria-label="确认分支名"
          value={approval.confirmedBranchName}
          onChange={(event) => updateApproval("confirmedBranchName", event.target.value)}
        />
      </label>
      <label className="field-row">
        确认提交 hash
        <input
          aria-label="确认提交 hash"
          value={approval.confirmedCommitHash}
          onChange={(event) => updateApproval("confirmedCommitHash", event.target.value)}
        />
      </label>
      <button disabled={deliveryLoading} type="submit">
        提交远端 PR 二次确认
      </button>
    </form>
  );
}
