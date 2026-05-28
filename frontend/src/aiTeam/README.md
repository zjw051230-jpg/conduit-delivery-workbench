# AI Page Team Coordination

This directory defines the front-end AI team mechanism for parallel software delivery page work.

## Roles

- Flow Architect: owns product-flow configuration and navigation metadata.
- Flow Integrator: owns `App.jsx` integration and page renderer wiring.
- Task Inbox Worker: owns `pages/softwareDelivery/TaskInboxPage.jsx`.
- PM Request Worker: owns `pages/softwareDelivery/PMRequestPage.jsx`.
- Requirement Brief Worker: owns `pages/softwareDelivery/RequirementBriefPage.jsx`.
- Work Breakdown Worker: owns `pages/softwareDelivery/WorkBreakdownPage.jsx`.
- Implementation Plan Worker: owns `pages/softwareDelivery/ImplementationPlanPage.jsx`.
- Code Changes Worker: owns `pages/softwareDelivery/CodeChangesPage.jsx`.
- Preview Effect Worker: owns `pages/softwareDelivery/PreviewEffectPage.jsx`.
- Verification Worker: owns `pages/softwareDelivery/VerificationPage.jsx`.
- Review Worker: owns `pages/softwareDelivery/ReviewPage.jsx`.
- Delivery Worker: owns `pages/softwareDelivery/DeliveryPage.jsx`.
- Artifact Engineer: owns `components/artifacts/**`.
- QA Gatekeeper: read-only verification and risk reporting.

## File ownership

- `frontend/src/App.jsx`: only Flow Integrator may edit.
- `frontend/src/productFlow/softwareDeliveryFlow.js`: only Flow Architect or Flow Integrator may edit.
- `frontend/src/pages/softwareDelivery/TaskInboxPage.jsx`: only Task Inbox Worker may edit.
- `frontend/src/pages/softwareDelivery/PMRequestPage.jsx`: only PM Request Worker may edit.
- `frontend/src/pages/softwareDelivery/RequirementBriefPage.jsx`: only Requirement Brief Worker may edit.
- `frontend/src/pages/softwareDelivery/WorkBreakdownPage.jsx`: only Work Breakdown Worker may edit.
- `frontend/src/pages/softwareDelivery/ImplementationPlanPage.jsx`: only Implementation Plan Worker may edit.
- `frontend/src/pages/softwareDelivery/CodeChangesPage.jsx`: only Code Changes Worker may edit.
- `frontend/src/pages/softwareDelivery/PreviewEffectPage.jsx`: only Preview Effect Worker may edit.
- `frontend/src/pages/softwareDelivery/VerificationPage.jsx`: only Verification Worker may edit.
- `frontend/src/pages/softwareDelivery/ReviewPage.jsx`: only Review Worker may edit.
- `frontend/src/pages/softwareDelivery/DeliveryPage.jsx`: only Delivery Worker may edit.
- `frontend/src/components/artifacts/**`: only Artifact Engineer may edit.
- `backend/**`: forbidden for all frontend page workers.
- `conduit-realworld-example-app/**`: forbidden for all teams unless the controller separately authorizes it.

## Parallel development rules

1. Every Page Worker edits only its owned page file.
2. App integration is Flow Integrator only.
3. Product-flow configuration is Flow Architect or Flow Integrator only.
4. Shared artifact rendering belongs to Artifact Engineer only.
5. QA Gatekeeper is read-only by default.
6. Pages receive data only through the shared props contract.
7. No two workers may edit the same file in the same work batch.
8. Delivery / PR behavior must not be changed by page workers.
9. Backend and Conduit changes require separate controller authorization.

## Props contract

Every software delivery page receives:

```js
{
  pageConfig,
  task,
  artifacts,
  currentArtifact,
  onNavigate,
  onRunStep,
  onRegenerate,
  onApprove,
  onRequestRevision,
  actions,
  loading,
  error,
}
```

Pages must not read global state directly. The renderer and Integrator provide page data through props.

## Integration order

1. Flow Architect updates product-flow config if the page contract changes.
2. Page Worker implements or updates only its page file.
3. Artifact Engineer updates shared artifact components only if the page needs reusable rendering.
4. Flow Integrator wires page exports into the renderer or App.
5. QA Gatekeeper verifies tests and reports risks.

## Conflict handling

- If a worker needs a file outside its ownership, stop and request Flow Integrator coordination.
- If two pages need the same shared artifact component, Artifact Engineer owns the shared component.
- If App routing, page selection, or global state needs changes, Flow Integrator owns the change.
- If backend data is missing, record the need as a frontend contract gap; do not edit backend in a page-worker task.

## Worker receipt format

Every Page Worker must report using this format:

```md
## 【角色】

## 【负责页面】

## 【只修改的文件】

【明确未触碰】

* App.jsx：
* backend/**：
* conduit-realworld-example-app/**：
* Delivery / PR 逻辑：

## 【页面完成内容】

## 【props contract 是否遵守】

## 【测试命令】

## 【测试结果】

## 【风险点】

【下一步建议】
只给一个最小下一步。
```
