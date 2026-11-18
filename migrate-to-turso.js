require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { createClient } = require("@libsql/client");

async function migrate() {
  let local;
  let cloud;
  let transaction;

  try {
    local = new Database(
      path.join(__dirname, "data", "support-backup.db"),
      { readonly: true }
    );

    const records = local.prepare(
      "SELECT id, title, category, description, status FROM records ORDER BY id"
    ).all();

    if (records.length === 0) {
      throw new Error("The backup has no records. Transfer stopped.");
    }

    cloud = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    transaction = await cloud.transaction("write");

    await transaction.executeMultiple(
      fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8")
    );

    const existing = await transaction.execute(
      "SELECT COUNT(*) AS total FROM records"
    );

    if (Number(existing.rows[0].total) !== 0) {
      throw new Error("Cloud already contains records. Nothing overwritten.");
    }

    for (const record of records) {
      await transaction.execute({
        sql: `INSERT INTO records
              (id, title, category, description, status)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          record.id,
          record.title,
          record.category,
          record.description,
          record.status
        ]
      });
    }

    const sequence = local.prepare(
      "SELECT seq FROM sqlite_sequence WHERE name = 'records'"
    ).get();

    if (sequence) {
      await transaction.execute({
        sql: "UPDATE sqlite_sequence SET seq = MAX(seq, ?) WHERE name = 'records'",
        args: [sequence.seq]
      });
    }

    await transaction.execute({
      sql: "INSERT OR IGNORE INTO app_migrations (name) VALUES (?)",
      args: ["initial-records-v1"]
    });

    await transaction.commit();

    console.log(`Success: transferred ${records.length} records to Turso.`);
    console.log("Your local database and backup are unchanged.");
  } catch (error) {
    let message = String(error.message);

    for (const secret of [
      process.env.TURSO_AUTH_TOKEN,
      process.env.TURSO_DATABASE_URL
    ]) {
      if (secret) message = message.split(secret).join("[hidden]");
    }

    console.log("Transfer stopped:", message);
    process.exitCode = 1;
  } finally {
    transaction?.close();
    cloud?.close();
    local?.close();
  }
}

migrate();