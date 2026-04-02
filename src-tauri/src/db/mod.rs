use rusqlite::{Connection, Result as SqlResult};
use std::sync::{Arc, Mutex};

pub mod queries;
pub mod schema;

pub type Db = Arc<Mutex<Connection>>;

pub fn open(app_data_dir: &std::path::Path) -> SqlResult<Db> {
    std::fs::create_dir_all(app_data_dir).ok();
    let db_path = app_data_dir.join("wpghostwriter.db");
    let conn = Connection::open(db_path)?;

    // Enable WAL mode for better concurrency
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    schema::run_migrations(&conn)?;

    Ok(Arc::new(Mutex::new(conn)))
}
