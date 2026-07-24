# Nimbus architecture

## Delivery sequence

1. Requirements: actors, lifecycle rules, permissions, and acceptance criteria.
2. Design: normalized ERD, API contracts, server authorization, and migration.
3. Implementation: migrations, repositories/routes, then UI components.
4. Verification: integrity, RBAC, CRUD, responsive, typecheck, audit, and build.

## Application boundaries

- `src/app/api`: HTTP validation and response mapping only.
- `src/lib/auth`: authenticated actor and authorization rules.
- `src/lib/repositories`: workspace-scoped Neon queries.
- `src/lib/types`: shared transport/domain types.
- `src/components/task-manager`: task workspace feature.
- `src/components/workspace`: project, member, and role surfaces.
- `db/migrations`: ordered, forward-only schema changes.

Routes do not trust role, project, assignee, or workspace values supplied by the
browser. They resolve the actor from the session adapter, load membership from
Neon, and scope every mutation by `workspace_id`.

## Workspace authorization

The session adapter resolves an opaque HttpOnly cookie through the
`auth_sessions` table, then loads the user's active workspace membership before
any mutation. Development retains an explicit header adapter for local role
testing; production authorization accepts the server session only.

Authorization occurs in this order:

1. Resolve authenticated user.
2. Resolve active membership for the requested workspace.
3. Verify the role capability.
4. Verify the target project/task belongs to the same workspace.
5. Verify ownership rules for member-level task edits.
6. Execute the mutation and write an activity event.

## API contracts

- `GET/POST /api/projects`: list or create workspace projects.
- `PATCH/DELETE /api/projects/:id`: edit, archive/restore, or delete an eligible
  archived empty project.
- `GET/POST /api/tasks`: list scoped tasks or create a task.
- `PATCH/DELETE /api/tasks/:id`: update lifecycle or permanently delete.
- `GET/POST /api/users`: list members or add a user and membership.
- `PATCH/DELETE /api/users/:id`: update role/profile or deactivate membership.
- `GET/POST /api/columns?projectId=`: list or create project columns.
- `PATCH/DELETE /api/columns/:id`: configure or remove a project column.
- `POST /api/auth/signup`: create a Member account and session.
- `POST /api/auth/login`: verify a password and create a session.
- `GET /api/auth/session`: restore the signed-in user.
- `POST /api/auth/logout`: revoke the current session.

Error semantics are consistent: `400` invalid input, `401` missing identity,
`403` disallowed role/scope, `404` missing scoped entity, and `409` integrity
conflict.

## Migration strategy

The original prototype stored project names and assignees directly on tasks.
Migration `002_normalized_workspace.sql` is additive:

1. Create workspaces, users, memberships, projects, project members, typed
   values, comments, and activity tables.
2. Copy existing workspace users into global users and memberships.
3. Create projects from distinct legacy task project names.
4. Add task foreign-key columns and backfill them from legacy values.
5. Copy JSON custom values into typed value rows.
6. Keep legacy columns temporarily for rollback compatibility.

No table or user data is dropped by the migration.

Migration `003_task_collaboration.sql` adds a self-referencing task parent for
one-level subtask nesting and a normalized `task_assignees` join table. Existing
single-owner tasks are backfilled into the join table without removing their
legacy primary-assignee fields.

Migration `004_authentication.sql` adds scrypt password credentials and
server-side session records. Raw passwords and raw session tokens are never
stored in the database.
