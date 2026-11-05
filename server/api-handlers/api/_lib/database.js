async function query(text, params = []) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const error = new Error("Database is not configured.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(connectionString);
  return sql.query(text, params);
}

module.exports = { query };
