import Database from '@tauri-apps/plugin-sql'

const DB_URL = 'sqlite:xiaozhi.db'

export async function openDatabase() {
  return Database.load(DB_URL)
}
