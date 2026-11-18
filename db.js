require("dotenv").config();

const { createClient } = require("@libsql/client");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !url.startsWith("libsql://")) {
  throw new Error("Set TURSO_DATABASE_URL to your Turso database URL.");
}

if (!authToken) {
  throw new Error("Set TURSO_AUTH_TOKEN to your Turso token.");
}

const client = createClient({
  url,
  authToken,
  intMode: "number"
});

// Keep the existing query style, using asynchronous cloud queries.
const db = {
  prepare(sql) {
    return {
      async all(...args) {
        const result = await client.execute({ sql, args });
        return result.rows.map(row => ({ ...row }));
      },

      async get(...args) {
        const result = await client.execute({ sql, args });
        const row = result.rows[0];
        return row ? { ...row } : undefined;
      }
    };
  },

  close() {
    client.close();
  }
};

module.exports = db;