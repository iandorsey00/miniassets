export const DEFAULT_SQLITE_DATABASE_URL = "file:./data/miniassets.db";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || DEFAULT_SQLITE_DATABASE_URL;
}

export function resolveSqliteFilePath(databaseUrl: string, cwd = process.cwd()) {
  const fileUrl = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
  if (fileUrl.startsWith("/")) {
    return fileUrl;
  }

  return new URL(fileUrl, `file://${cwd.endsWith("/") ? cwd : `${cwd}/`}`).pathname;
}
