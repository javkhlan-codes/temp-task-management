# Nimbus normalized data model

```mermaid
erDiagram
  USERS ||--o{ WORKSPACE_MEMBERS : joins
  WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
  WORKSPACES ||--o{ PROJECTS : owns
  USERS ||--o{ PROJECTS : owns
  PROJECTS ||--o{ PROJECT_MEMBERS : contains
  USERS ||--o{ PROJECT_MEMBERS : joins
  PROJECTS ||--o{ TASKS : contains
  USERS ||--o{ TASKS : assigned
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
- All child foreign keys use `ON DELETE RESTRICT` or `CASCADE` deliberately.
- Archive fields preserve lifecycle history; permanent deletes are exceptional.

## Task audit columns

`tasks` stores `project_id`, `assignee_id`, `created_by`, `updated_by`,
`archived_by`, `created_at`, `updated_at`, and `archived_at`. Display names and
role labels are joined at read time.
