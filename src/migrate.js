#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  let connection;

  try {
    // Create connection using environment variables
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('📊 Connected to database');

    // Create migrations table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('📋 Migrations table ready');

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`🔍 Found ${migrationFiles.length} migration files`);

    // Get already executed migrations
    const [executedMigrations] = await connection.execute('SELECT id FROM migrations');
    const executedIds = executedMigrations.map(m => m.id);

    // Run pending migrations
    for (const file of migrationFiles) {
      const migrationId = path.parse(file).name;

      if (!executedIds.includes(migrationId)) {
        console.log(`🚀 Running migration: ${migrationId}`);

        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Split SQL into individual statements and execute them separately
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
          if (statement.trim()) {
            await connection.execute(statement.trim() + ';');
          }
        }

        await connection.execute('INSERT INTO migrations (id, name) VALUES (?, ?)', [migrationId, file]);

        console.log(`✅ Migration ${migrationId} completed`);
      } else {
        console.log(`⏭️  Migration ${migrationId} already executed`);
      }
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
