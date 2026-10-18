// Cipta data permulaan: satu syarikat, satu cawangan, dan satu akaun pemilik.
// Hanya berjalan jika belum ada pengguna. Kata laluan dibaca daripada .env, bukan dalam kod.
require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');
const { hashPassword } = require('./password');

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD || '';
  if (!email || password.length < 10) {
    throw new Error('Tetapkan SEED_OWNER_EMAIL dan SEED_OWNER_PASSWORD (sekurang-kurangnya 10 aksara) dalam api/.env');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [existing] = await connection.query('SELECT COUNT(*) AS total FROM users');
    if (existing[0].total > 0) {
      console.log('Sudah ada pengguna. Tiada apa-apa dibuat.');
      return;
    }

    const [company] = await connection.query('INSERT INTO companies (name) VALUES (?)', ['Syarikat Ujian']);
    await connection.query('INSERT INTO branches (company_id, name) VALUES (?, ?)', [company.insertId, 'Cawangan Ujian']);

    // Pemilik melihat semua cawangan, jadi branch_id dibiarkan kosong (NULL)
    const hash = await hashPassword(password);
    await connection.query(
      'INSERT INTO users (company_id, branch_id, email, password_hash, full_name, role) VALUES (?, NULL, ?, ?, ?, ?)',
      [company.insertId, email, hash, 'Pemilik Ujian', 'owner']
    );
    console.log('Dibuat: syarikat, cawangan dan akaun pemilik (' + email + ').');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Seed gagal:', err.message);
  process.exit(1);
});