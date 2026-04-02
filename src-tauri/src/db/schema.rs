use rusqlite::{Connection, Result as SqlResult};

const MIGRATION_001: &str = include_str!("../../migrations/001_initial.sql");
const MIGRATION_002: &str = include_str!("../../migrations/002_interval_seconds.sql");

pub fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(MIGRATION_001)?;
    // Migration 002: rename interval_minutes to interval_seconds.
    // Ignored if already applied (new install already has the correct column name).
    let _ = conn.execute_batch(MIGRATION_002);
    Ok(())
}
