// Tetapkan semula kata laluan seorang pengguna.
// Emel diberi sebagai hujah, dan kata laluan baharu dibaca daripada pemboleh ubah NEWPW.
require('dotenv').config({ path: __dirname + '/.env' });
const mysql = require('mysql2/promise');
const { hashPassword } = require('./password');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const password = process.env.NEWPW || '';
  if (!email) throw new Error('Beri emel: node api/set-password.js emel@contoh.com');
  if (password.length < 10) throw new Error('Kata laluan baharu mesti sekurang-kurangnya 10 aksara');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const hash = await hashPassword(password);
    const [result] = await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
    console.log(result.affectedRows === 1 ? 'Kata laluan dikemas kini untuk ' + email : 'Tiada pengguna dengan emel itu');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Gagal:', err.message);
  process.exit(1);
});