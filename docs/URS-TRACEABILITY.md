# Pro Team URS traceability

**URS version:** 1.0

**Reviewed:** 2026-07-24

**Legend:** ✅ Implemented · 🟡 Partial · ⬜ Planned

This matrix records what is available in the current web application. “Partial”
is used when the core workflow works but a production-grade extension from the
URS is still outstanding.

## Functional requirements

| ID | Status | Current implementation / acceptance evidence |
| --- | :---: | --- |
| REQ-001 | ✅ | Create, view, edit, archive/restore, and admin-delete tasks through the task modal and task APIs. |
| REQ-002 | ✅ | Title, description, status, priority, due date, progress, tags, and custom values persist. |
| REQ-003 | ✅ | Multi-assignee selection persists through normalized `task_assignees`; inactive/out-of-workspace users are rejected. |
| REQ-004 | ✅ | Top-level tasks can create, display, edit, and complete nested subtasks. |
| REQ-005 | ✅ | Same-project dependencies persist in `task_dependencies`; invalid targets and cycles are rejected. |
| REQ-006 | 🟡 | Daily/weekly/monthly recurrence configuration persists; automatic future-instance generation is not scheduled yet. |
| REQ-007 | ✅ | Tags and typed project custom fields are supported. |
| REQ-008 | ✅ | To do, in progress, review, and done states can be selected and updated. |
| REQ-009 | 🟡 | Kanban drag-and-drop updates status; cross-project/group drag is not implemented. |
| REQ-010 | ✅ | Users with permission can create workspaces and projects/boards. |
| REQ-011 | ✅ | Tasks support free-form groups/sections and grouped list rendering. |
| REQ-012 | ⬜ | Project templates are planned. |
| REQ-013 | 🟡 | Projects can be archived/restored and safely deleted; duplication is planned. |
| REQ-014 | ✅ | Kanban view with drag-and-drop status changes. |
| REQ-015 | ✅ | Grouped, editable table/list view. |
| REQ-016 | ✅ | Month calendar with due-date task cards. |
| REQ-017 | 🟡 | Timeline view displays task duration; interactive dependency lines and full Gantt editing are planned. |
| REQ-018 | ✅ | Dashboard workload panel shows task distribution by member. |
| REQ-019 | ✅ | Authenticated project participants can add and read task comments. |
| REQ-020 | ✅ | `@` mention selection stores mention IDs and creates in-app notifications. |
| REQ-021 | ✅ | Click or drag-and-drop attachments, authenticated download, MIME/size validation, 3 MB limit. |
| REQ-022 | ✅ | Per-task activity history records creation, changes, comments, and attachments. |
| REQ-023 | ✅ | In-app notifications cover assignment, mention/comment, and status changes. |
| REQ-024 | ⬜ | Email and native mobile push delivery are planned. |
| REQ-025 | ⬜ | Scheduled approaching/overdue reminders are planned. |
| REQ-026 | ⬜ | Per-user notification preferences are planned. |
| REQ-027 | ⬜ | Rule-based automation engine is planned. |
| REQ-028 | ⬜ | Deadline escalation automation is planned. |
| REQ-029 | ⬜ | Slack integration is planned. |
| REQ-030 | ⬜ | GitHub issue/PR linking is planned. |
| REQ-031 | ⬜ | Gmail and Google Calendar synchronization are planned. |
| REQ-032 | ⬜ | Public REST API keys and outbound webhooks are planned; current APIs are session-protected app APIs. |
| REQ-033 | ✅ | Dashboard summarizes total/completed/overdue tasks and workload. |
| REQ-034 | ✅ | Status distribution, priority donut, and member workload charts. |
| REQ-035 | ✅ | Current filtered result exports to UTF-8 CSV with spreadsheet-formula protection. |
| REQ-036 | ✅ | Global task search covers title, description, project, group, status, priority, people, email, and tags. |
| REQ-037 | ✅ | Status, priority, assignee, due-date, and tag filters combine with search. |
| REQ-038 | ⬜ | Named saved filter/view persistence is planned. |
| REQ-039 | ✅ | Server-enforced Admin, Manager, Member, Guest, and Viewer RBAC. |
| REQ-040 | ✅ | Workspace and project membership scope every protected read/write route. |
| REQ-041 | ✅ | Guest role can access assigned projects, comment/upload, and cannot manage tasks or settings. |

## Non-functional requirements

| ID | Status | Current implementation / remaining verification |
| --- | :---: | --- |
| NFR-01 | 🟡 | Optimistic UI and scoped queries are implemented; production p95 load testing against the deployed database is still required. |
| NFR-02 | 🟡 | Relational indexes and normalized data are in place; hundred-user/thousand-task load tests remain. |
| NFR-03 | ⬜ | Uptime and automated backup are deployment-provider/SLA configuration. |
| NFR-04 | 🟡 | Scrypt password hashes, opaque hashed sessions, HttpOnly cookies, RBAC, and server-only secrets are implemented; production TLS/encryption, SSO, and 2FA require deployment configuration/extensions. |
| NFR-05 | ✅ | Responsive UI, Kanban drag-and-drop, focus states, filters, and inline editing are available. |
| NFR-06 | 🟡 | Responsive mobile web is implemented; native iOS/Android apps are not. |
| NFR-07 | ✅ | Primary product UI is Mongolian; dates use `mn-MN` and `Asia/Ulaanbaatar`. |
| NFR-08 | 🟡 | Activity/audit records exist; retention policy and formal privacy compliance review remain. |
| NFR-09 | 🟡 | Semantic controls, labels, keyboard focus, ARIA labels, and contrast-aware themes are present; formal WCAG audit remains. |

## Security acceptance checks

- Secrets are read only from server environment variables; `.env*` is excluded
  from Git.
- Session cookies are opaque and HttpOnly; stored session tokens are hashed.
- Every mutating route verifies authentication, workspace scope, and role.
- Attachment access requires project membership and returns
  `X-Content-Type-Options: nosniff`.
- CSV cells beginning with spreadsheet formula markers are escaped.
- Dependency targets, assignees, projects, parent tasks, and attachment sizes are
  validated server-side.

## Next delivery slice

The highest-value outstanding slice is recurring-instance scheduling, deadline
reminders/preferences, project templates/duplication, and saved views. External
integrations and native push should follow after production deployment,
background-job infrastructure, and secret management are selected.
