-- WordPress site connections
CREATE TABLE IF NOT EXISTS sites (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    url          TEXT NOT NULL,
    username     TEXT NOT NULL,
    app_password TEXT NOT NULL,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
);

-- App-wide settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Content generation tasks
CREATE TABLE IF NOT EXISTS tasks (
    id                       TEXT PRIMARY KEY,
    site_id                  TEXT NOT NULL REFERENCES sites(id),
    name                     TEXT NOT NULL,
    prompt                   TEXT NOT NULL,
    system_prompt            TEXT,
    post_type                TEXT NOT NULL DEFAULT 'post',
    post_status              TEXT NOT NULL DEFAULT 'draft',
    post_count               INTEGER NOT NULL DEFAULT 5,
    interval_minutes         INTEGER NOT NULL DEFAULT 60,
    model_override           TEXT,
    generate_excerpt         INTEGER NOT NULL DEFAULT 0,
    category_ids             TEXT,
    tag_ids                  TEXT,
    status                   TEXT NOT NULL DEFAULT 'pending',
    current_step             TEXT DEFAULT 'idle',
    posts_completed          INTEGER DEFAULT 0,
    total_prompt_tokens      INTEGER DEFAULT 0,
    total_completion_tokens  INTEGER DEFAULT 0,
    total_estimated_cost     REAL DEFAULT 0.0,
    started_at               TEXT,
    completed_at             TEXT,
    error_message            TEXT,
    created_at               TEXT DEFAULT (datetime('now')),
    updated_at               TEXT DEFAULT (datetime('now'))
);

-- Individual generated posts
CREATE TABLE IF NOT EXISTS posts (
    id                TEXT PRIMARY KEY,
    task_id           TEXT NOT NULL REFERENCES tasks(id),
    sequence_number   INTEGER NOT NULL,
    title             TEXT,
    content           TEXT,
    excerpt           TEXT,
    wp_post_id        INTEGER,
    status            TEXT NOT NULL DEFAULT 'pending',
    prompt_tokens     INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    estimated_cost    REAL DEFAULT 0.0,
    scheduled_at      TEXT,
    published_at      TEXT,
    error_message     TEXT,
    created_at        TEXT DEFAULT (datetime('now'))
);

-- Task execution log
CREATE TABLE IF NOT EXISTS task_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id    TEXT NOT NULL REFERENCES tasks(id),
    level      TEXT NOT NULL DEFAULT 'info',
    message    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Global usage tracking (aggregated per day)
CREATE TABLE IF NOT EXISTS usage_daily (
    date              TEXT NOT NULL,
    model             TEXT NOT NULL,
    prompt_tokens     INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens      INTEGER DEFAULT 0,
    estimated_cost    REAL DEFAULT 0.0,
    request_count     INTEGER DEFAULT 0,
    PRIMARY KEY (date, model)
);
