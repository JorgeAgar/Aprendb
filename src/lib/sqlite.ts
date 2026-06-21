import initSqlJs, { type Database } from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { commerceSeedSql } from "@/data/schema";
import type { QueryResult } from "@/types/query";

let databasePromise: Promise<Database> | undefined;

export function getDatabase() {
  databasePromise ??= initSqlJs({
    locateFile: () => sqlWasmUrl,
  }).then((SQL) => {
    const database = new SQL.Database();
    database.run(commerceSeedSql);
    return database;
  });

  return databasePromise;
}

export async function executeSql(sql: string): Promise<QueryResult> {
  if (sql.trim().startsWith("--")) {
    return { columns: [], rows: [] };
  }

  const database = await getDatabase();
  const [result] = database.exec(sql);

  return {
    columns: result?.columns ?? [],
    rows: (result?.values ?? []) as QueryResult["rows"],
  };
}
