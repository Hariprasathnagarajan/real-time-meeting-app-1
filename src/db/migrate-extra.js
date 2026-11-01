const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:local.db' });

async function run() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS signaling_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_code TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS breakout_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL REFERENCES meetings(id),
      name TEXT NOT NULL,
      assigned_participant_ids TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'closed',
      created_at TEXT NOT NULL
    );
  `);

  const cols = [
    { table: 'chat_messages', col: 'recipient_user_id', def: 'TEXT' },
    { table: 'chat_messages', col: 'recipient_name', def: 'TEXT' },
    { table: 'meetings', col: 'is_locked', def: 'INTEGER DEFAULT 0' },
    { table: 'meetings', col: 'allow_screen_share', def: 'INTEGER DEFAULT 1' },
    { table: 'meetings', col: 'allow_chat', def: 'INTEGER DEFAULT 1' },
    { table: 'meetings', col: 'allow_unmute', def: 'INTEGER DEFAULT 1' },
    { table: 'meetings', col: 'allow_video', def: 'INTEGER DEFAULT 1' },
    { table: 'meetings', col: 'allow_rename', def: 'INTEGER DEFAULT 1' },
  ];

  for (const { table, col, def } of cols) {
    try {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def};`);
      console.log(`Added column ${col} to ${table}`);
    } catch (err) {
      // Column probably already exists
    }
  }

  console.log('Database migration completed successfully.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
