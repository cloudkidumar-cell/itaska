// Menjalankan fail migrasi (.sql) mengikut urutan, dan merekod yang sudah dijalankan
require('dotenv').config({ path: __dirname + '/.env' });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Jadual yang mencatat migrasi mana yang sudah dijalankan
    await connection.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (' +
      'name VARCHAR(255) NOT NULL PRIMARY KEY, ' +
      'applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)'
    );

    const [rows] = await connection.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));

    // Cari semua fail .sql dalam folder migrations, susun ikut nama
    const dir = path.join(__dirname, 'migrations');
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
      : [];

    let count = 0;
    for (const file of files) {
      if (done.has(file)) continue; // sudah dijalankan, langkau
      console.log('Menjalankan: ' + file);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      count++;
    }

    console.log(count === 0 ? 'Tiada migrasi baharu.' : 'Selesai: ' + count + ' migrasi dijalankan.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Migrasi gagal:', err.message);
  process.exit(1);
});