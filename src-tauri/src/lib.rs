mod commands;
mod scheduler;

use std::path::PathBuf;

use commands::secure_store::SecureStoreState;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
  app.path()
    .app_data_dir()
    .unwrap_or_else(|_| PathBuf::from("."))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let salt_path = PathBuf::from("stronghold-salt.txt");

  tauri::Builder::default()
    .setup(|app| {
      let _ = app_data_dir(app.handle());

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      app.manage(SecureStoreState::default());
      scheduler::TaskScheduler::default().start();

      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())
    .plugin(
      tauri_plugin_sql::Builder::new().add_migrations(
        "sqlite:xiaozhi.db",
        vec![Migration {
          version: 1,
          description: "init",
          sql: include_str!("../migrations/0001_init.sql"),
          kind: MigrationKind::Up,
        }],
      )
      .build(),
    )
    .invoke_handler(tauri::generate_handler![
      commands::db::db_execute,
      commands::secure_store::secure_store_set,
      commands::secure_store::secure_store_get,
      commands::file::file_read_text,
      commands::file::file_write_text,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
