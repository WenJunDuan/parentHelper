import Database from '@tauri-apps/plugin-sql'

const DB_URL = 'sqlite:xiaozhi.db'

let databasePromise: Promise<Database> | null = null

export async function openDatabase() {
  if (!databasePromise) {
    databasePromise = Database.load(DB_URL).catch((error) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

export async function dbSelect<T>(sql: string, params: unknown[] = []) {
  const database = await openDatabase()
  return database.select<T>(sql, params)
}

export async function dbExecute(sql: string, params: unknown[] = []) {
  const database = await openDatabase()
  return database.execute(sql, params)
}
