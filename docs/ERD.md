# Nimbus normalized data model

```mermaid
erDiagram
  USERS ||--o{ WORKSPACE_MEMBERS : joins
  WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
  WORKSPACES ||--o{ PROJECTS : owns
  USERS ||--o{ PROJECTS : owns
  PROJECTS ||--o{ PROJECT_MEMBERS : contains
  USERS ||--o{ PROJECT_MEMBERS : joins
  USERS ||--|| USER_CREDENTIALS : authenticates
  USERS ||--o{ AUTH_SESSIONS : signs_in
  PROJECTS ||--o{ TASKS : contains
  TASKS ||--o{ TASKS : contains
  TASKS ||--o{ TASK_ASSIGNEES : assigned
  USERS ||--o{ TASK_ASSIGNEES : works_on
  USERS ||--o{ TASKS : creates
  PROJECTS ||--o{ CUSTOM_COLUMNS : defines
  TASKS ||--o{ TASK_CUSTOM_VALUES : has
  CUSTOM_COLUMNS ||--o{ TASK_CUSTOM_VALUES : types
  TASKS ||--o{ TASK_COMMENTS : has
  USERS ||--o{ TASK_COMMENTS : authors
  WORKSPACES ||--o{ ACTIVITY_LOGS : records
```

## Core keys

- `workspace_members`: primary key `(workspace_id, user_id)`.
- `project_members`: primary key `(project_id, user_id)`.
- `task_custom_values`: primary key `(task_id, column_id)`.
- `task_assignees`: primary key `(task_id, user_id)`.
- `user_credentials`: primary key `user_id`.
- `auth_sessions`: primary key `token_hash`.
- All child foreign keys use `ON DELETE RESTRICT` or `CASCADE` deliberately.
- Archive fields preserve lifecycle history; permanent deletes are exceptional.

## Task audit columns

`tasks` stores `project_id`, `parent_id`, the compatibility `assignee_id`,
`created_by`, `updated_by`,
`archived_by`, `created_at`, `updated_at`, and `archived_at`. Display names and
role labels are joined at read time; current assignments come from
`task_assignees`.
