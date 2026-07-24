ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence TEXT NOT NULL DEFAULT 'none';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_recurrence_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_recurrence_check
  CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'));

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id <> depends_on_id)
);

CREATE INDEX IF NOT EXISTS task_dependencies_parent_idx
  ON task_dependencies (depends_on_id, task_id);

INSERT INTO schema_migrations (version)
VALUES ('006_task_planning')
ON CONFLICT (version) DO NOTHING;
