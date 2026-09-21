import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "compose", "postgres", "init");

/**
 * Applies every `.sql` file in `compose/postgres/init`, in filename order.
 * The same files seed a brand-new Postgres volume automatically (via
 * `docker-entrypoint-initdb.d`); this script lets a developer re-apply them
 * against an existing volume as an explicit, repeatable command. Every
 * statement must be idempotent (`CREATE ... IF NOT EXISTS`, etc.).
 */
async function main() {
  const client = new Client({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? "cpp_local",
    password: process.env.POSTGRES_PASSWORD ?? "change-me-locally",
    database: process.env.POSTGRES_DB ?? "cpp",
  });

  await client.connect();
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }
    console.log(`Applied ${files.length} migration file(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
