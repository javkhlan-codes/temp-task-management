ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_parent_id_fk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_parent_id_fk
      FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

INSERT INTO task_assignees (task_id, user_id, assigned_by)
SELECT id, assignee_id, COALESCE(updated_by, created_by)
FROM tasks
WHERE assignee_id IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS tasks_parent_idx
  ON tasks (parent_id, created_at);
CREATE INDEX IF NOT EXISTS task_assignees_user_idx
  ON task_assignees (user_id, task_id);

INSERT INTO schema_migrations (version)
VALUES ('003_task_collaboration')
ON CONFLICT (version) DO NOTHING;
