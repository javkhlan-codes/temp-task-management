CREATE TABLE IF NOT EXISTS user_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx
  ON auth_sessions (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions (expires_at);

INSERT INTO schema_migrations (version)
VALUES ('004_authentication')
ON CONFLICT (version) DO NOTHING;
