CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  initials TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'slate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c5cff',
  description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

INSERT INTO workspaces (id, name, slug, plan)
VALUES ('workspace-acme', 'Acme Studio', 'acme-studio', 'free')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, initials, tone)
SELECT id, name, email, initials, tone
FROM workspace_users
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  initials = EXCLUDED.initials,
  tone = EXCLUDED.tone,
  updated_at = NOW();

INSERT INTO workspace_members (workspace_id, user_id, role, active)
SELECT 'workspace-acme', id, role, active
FROM workspace_users
ON CONFLICT (workspace_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  active = EXCLUDED.active;

INSERT INTO projects (
  id, workspace_id, name, color, description, owner_id
)
SELECT
  'project-' || SUBSTR(MD5(project), 1, 12),
  'workspace-acme',
  project,
  CASE project
    WHEN 'Product launch' THEN '#7c5cff'
    WHEN 'Website v2' THEN '#21c8a8'
    WHEN 'Mobile app' THEN '#ffb547'
    ELSE '#4a8df6'
  END,
  '',
  (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
FROM (SELECT DISTINCT project FROM tasks) legacy_projects
WHERE EXISTS (SELECT 1 FROM users)
ON CONFLICT (workspace_id, name) DO NOTHING;

INSERT INTO project_members (project_id, user_id)
SELECT projects.id, workspace_members.user_id
FROM projects
JOIN workspace_members
  ON workspace_members.workspace_id = projects.workspace_id
WHERE workspace_members.active = TRUE
ON CONFLICT (project_id, user_id) DO NOTHING;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_by TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tasks
SET project_id = projects.id
FROM projects
WHERE projects.workspace_id = 'workspace-acme'
  AND projects.name = tasks.project
  AND tasks.project_id IS NULL;

UPDATE tasks
SET assignee_id = users.id
FROM users
WHERE (
    users.id = tasks.assignee ->> 'id'
    OR users.name = tasks.assignee ->> 'name'
  )
  AND tasks.assignee_id IS NULL;

UPDATE tasks
SET created_by = COALESCE(
  assignee_id,
  (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
)
WHERE created_by IS NULL;

ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN created_by SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_project_id_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_project_id_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_assignee_id_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_assignee_id_fk
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_created_by_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_created_by_fk
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_updated_by_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_updated_by_fk
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_archived_by_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_archived_by_fk
      FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END
$$;

ALTER TABLE custom_columns ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE custom_columns ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE custom_columns ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

UPDATE custom_columns
SET project_id = (
  SELECT id
  FROM projects
  WHERE workspace_id = 'workspace-acme' AND name = 'Product launch'
  LIMIT 1
)
WHERE project_id IS NULL;

ALTER TABLE custom_columns ALTER COLUMN project_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'custom_columns_project_id_fk'
  ) THEN
    ALTER TABLE custom_columns
      ADD CONSTRAINT custom_columns_project_id_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS task_custom_values (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL REFERENCES custom_columns(id) ON DELETE CASCADE,
  value JSONB,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, column_id)
);

INSERT INTO task_custom_values (task_id, column_id, value)
SELECT tasks.id, values.key, values.value
FROM tasks
CROSS JOIN LATERAL JSONB_EACH(tasks.custom_fields) values
JOIN custom_columns ON custom_columns.id = values.key
ON CONFLICT (task_id, column_id) DO UPDATE SET value = EXCLUDED.value;

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_workspace_idx
  ON projects (workspace_id, archived);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx
  ON tasks (project_id, archived);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx
  ON tasks (assignee_id, archived);
CREATE INDEX IF NOT EXISTS activity_workspace_idx
  ON activity_logs (workspace_id, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('002_normalized_workspace')
ON CONFLICT (version) DO NOTHING;
