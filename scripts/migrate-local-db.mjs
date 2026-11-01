import { createClient } from '@libsql/client';
import { existsSync, readFileSync, statSync } from 'node:fs';

const url = process.env.TURSO_CONNECTION_URL || 'file:local.db';
if (!url.startsWith('file:')) {
  console.log('Using configured Turso database; skipping local migration helper.');
  process.exit(0);
}

const client = createClient({ url });
const migrationPath = new URL('../drizzle/0000_round_rhino.sql', import.meta.url);
const migration = readFileSync(migrationPath, 'utf8');
const statements = migration.split(/--> statement-breakpoint/).map((statement) => statement.trim()).filter(Boolean);

const dbPath = url.slice('file:'.length);
if (!existsSync(dbPath) || statSync(dbPath).size === 0) {
  for (const statement of statements) await client.execute(statement);
  console.log(`Applied ${statements.length} local migration statements.`);
} else {
  console.log(`${dbPath} already exists; leaving existing data untouched.`);
}
