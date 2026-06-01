const { sequelize } = require('./config/database');

const requiredColumns = {
  Users: [
    { name: 'loginAttempts', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'lockoutUntil', type: 'DATETIME NULL DEFAULT NULL' },
    { name: 'isVerified', type: 'TINYINT(1) NOT NULL DEFAULT 0' },
  ],
  SupportTickets: [
    { name: 'contactPhone', type: 'VARCHAR(20) NULL DEFAULT NULL' },
    { name: 'isBannedRequest', type: 'TINYINT(1) NOT NULL DEFAULT 0' },
  ],
};

const addMissingColumns = async () => {
  let added = 0;
  for (const [table, columns] of Object.entries(requiredColumns)) {
    let tableExists = true;
    let existingColumns;
    try {
      [existingColumns] = await sequelize.query(`SHOW COLUMNS FROM \`${table}\``);
    } catch (err) {
      if (err.message.includes("doesn't exist")) {
        tableExists = false;
      } else {
        console.error(`Error reading ${table}:`, err.message);
      }
      continue;
    }
    if (!tableExists) continue;

    const existingNames = new Set(existingColumns.map(r => r.Field));
    for (const col of columns) {
      if (!existingNames.has(col.name)) {
        try {
          await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.type}`);
          console.log(`Added column ${table}.${col.name}`);
          added++;
        } catch (err) {
          console.error(`Failed to add ${table}.${col.name}:`, err.message);
        }
      }
    }
  }
  return added;
};

const removeDuplicateIndexes = async () => {
  let removed = 0;
  try {
    const [tables] = await sequelize.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      { replacements: [process.env.DB_NAME] }
    );
    for (const { TABLE_NAME } of tables) {
      const [indexes] = await sequelize.query(`SHOW INDEXES FROM \`${TABLE_NAME}\``);
      const copyIndexes = new Set();
      for (const idx of indexes) {
        const key = idx.Key_name;
        if (/_copy_\d+$/.test(key)) {
          copyIndexes.add(key);
        }
      }
      for (const key of copyIndexes) {
        try {
          await sequelize.query(`DROP INDEX \`${key}\` ON \`${TABLE_NAME}\``);
          console.log(`Dropped duplicate index ${TABLE_NAME}.${key}`);
          removed++;
        } catch (err) {
          console.error(`Failed to drop ${TABLE_NAME}.${key}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Error checking duplicate indexes:', err.message);
  }
  return removed;
};

const requiredIndexes = [
  { table: 'Messages', name: 'idx_receiver_read', columns: 'receiverId, isRead' },
  { table: 'Messages', name: 'idx_sender_receiver_created', columns: 'senderId, receiverId, createdAt' },
  { table: 'GroupMembers', name: 'idx_user_group', columns: 'userId' },
  { table: 'Statuses', name: 'idx_user_expires', columns: 'userId, expiresAt' },
  { table: 'ChannelFollowers', name: 'idx_channel_follower_user', columns: 'userId' },
  { table: 'SupportTickets', name: 'idx_ticket_user_status', columns: 'userId, status' },
  { table: 'SupportMessages', name: 'idx_ticket_messages', columns: 'ticketId, createdAt' },
  { table: 'Channels', name: 'idx_channel_invite', columns: 'inviteCode' },
];

const addMissingIndexes = async () => {
  let added = 0;
  for (const idx of requiredIndexes) {
    try {
      const [existing] = await sequelize.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
        { replacements: [process.env.DB_NAME, idx.table, idx.name] }
      );
      if (existing.length === 0) {
        await sequelize.query(`CREATE INDEX \`${idx.name}\` ON \`${idx.table}\` (${idx.columns})`);
        console.log(`Created index ${idx.table}.${idx.name}`);
        added++;
      }
    } catch (err) {
      console.error(`Failed to create index ${idx.table}.${idx.name}:`, err.message);
    }
  }
  return added;
};

const runMigrations = async () => {
  console.log('Running safe migrations...');
  const removed = await removeDuplicateIndexes();
  if (removed > 0) console.log(`Cleaned ${removed} duplicate index(es)`);
  const added = await addMissingColumns();
  if (added > 0) console.log(`Added ${added} missing column(s)`);
  const idxAdded = await addMissingIndexes();
  if (idxAdded > 0) console.log(`Created ${idxAdded} missing index(es)`);
  if (removed === 0 && added === 0 && idxAdded === 0) console.log('Schema is up to date');
};

module.exports = { runMigrations };
