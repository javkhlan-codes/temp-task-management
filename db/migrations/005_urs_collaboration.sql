ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'guest', 'viewer'));

ALTER TABLE workspace_users
  DROP CONSTRAINT IF EXISTS workspace_users_role_check;

ALTER TABLE workspace_users
  ADD CONSTRAINT workspace_users_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'guest', 'viewer'));

ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS mention_ids TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 3145728),
  content BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx
  ON task_comments (task_id, created_at);
CREATE INDEX IF NOT EXISTS task_attachments_task_idx
  ON task_attachments (task_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, read_at, created_at DESC);

INSERT INTO schema_migrations (version)
VALUES ('005_urs_collaboration')
ON CONFLICT (version) DO NOTHING;
