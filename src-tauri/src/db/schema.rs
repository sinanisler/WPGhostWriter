use rusqlite::{Connection, Result as SqlResult};

const MIGRATION_SQL: &str = include_str!("../../migrations/001_initial.sql");

pub fn run_migrations(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(MIGRATION_SQL)
}
