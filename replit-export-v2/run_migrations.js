import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = "postgresql://postgres.jrhyeqgxgbxzyvwrvoji:sb_secret_Na4y9DCOGyBGMA47mvn6bQ_9vyZek2q@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

async function run() {
  console.log("Connecting to Supabase PostgreSQL database via Pooler (IPv4)...");
  const client = new Client({ connectionString });
  await client.connect();
  console.log("Connected successfully!");

  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files.`);

  for (const file of files) {
    console.log(`Running migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`Migration ${file} executed successfully.`);
    } catch (err) {
      console.error(`Error executing migration ${file}:`, err.message);
      // Don't stop on warnings, but stop on actual errors
      if (!err.message.includes("already exists")) {
        throw err;
      }
    }
  }

  await client.end();
  console.log("All migrations executed. Database schema is up-to-date!");
}

run().catch(err => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
