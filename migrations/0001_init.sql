-- Accounts
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE libraries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  system_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner | member
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, library_id)
);
CREATE INDEX memberships_library ON memberships(library_id);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE invites (
  code TEXT PRIMARY KEY,
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  used_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE login_failures (
  email TEXT NOT NULL,
  at TEXT NOT NULL
);
CREATE INDEX login_failures_email ON login_failures(email, at);

-- Collection data (per library)
CREATE TABLE lists (
  id TEXT PRIMARY KEY,
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX lists_library ON lists(library_id);

CREATE TABLE books (
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  data TEXT NOT NULL, -- the saved book as JSON
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (library_id, id)
);

CREATE TABLE catalog_isbns (
  library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  scope TEXT NOT NULL, -- library | system
  isbn TEXT NOT NULL,
  PRIMARY KEY (library_id, scope, isbn)
);

-- Library of Things orders
CREATE TABLE lot_orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  library_id TEXT REFERENCES libraries(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  library_name TEXT NOT NULL,
  bill_to TEXT,
  tax_exempt INTEGER NOT NULL DEFAULT 0,
  cert_name TEXT,
  subscriber INTEGER NOT NULL DEFAULT 0,
  pay_method TEXT NOT NULL,
  items TEXT NOT NULL, -- JSON
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'invoiced', -- invoiced | paid | building | shipped | cancelled
  created_at TEXT NOT NULL
);
CREATE INDEX lot_orders_library ON lot_orders(library_id);
