// Menjalankan fail migrasi (.sql) mengikut urutan, dan merekod yang sudah dijalankan.
// Boleh dipanggil oleh app semasa bermula (AUTO_MIGRATE=1), atau terus melalui: npm run migrate
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Jalankan semua migrasi yang belum dijalankan, dan pulangkan bilangan yang dijalankan
async function runMigrations(log = console.log) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Kunci: Preview dan Published berkongsi satu pangkalan data,
    // jadi hanya satu app boleh bermigrasi pada satu masa
    const [lock] = await connection.query("SELECT GET_LOCK('itaska_migrate', 60) AS got");
    if (lock[0].got !== 1) throw new Error('Tidak dapat memperoleh kunci migrasi');

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
      log('Menjalankan: ' + file);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      count++;
    }
    return count;
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK('itaska_migrate')");
    } catch (e) {
      // sambungan terputus: kunci dilepaskan sendiri oleh MySQL
    }
    await connection.end();
  }
}

module.exports = { runMigrations };

// Jika fail ini dijalankan terus (npm run migrate), baca .env dan jalankan migrasi
if (require.main === module) {
  require('dotenv').config({ path: __dirname + '/.env' });
  runMigrations()
    .then((count) =>
      console.log(count === 0 ? 'Tiada migrasi baharu.' : 'Selesai: ' + count + ' migrasi dijalankan.')
    )
    .catch((err) => {
      console.error('Migrasi gagal:', err.message);
      process.exit(1);
    });
}