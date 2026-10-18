// Baca fail .env (hanya wujud di Mac). Di GoDaddy, nilainya diberi terus oleh hosting.
require('dotenv').config({ path: __dirname + '/.env' });

const mysql = require('mysql2/promise');
const fastify = require('fastify')({ logger: true });
const { runMigrations } = require('./migrate');

// Tanpa kunci rahsia, token tak boleh ditandatangani dengan selamat
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET belum ditetapkan');
}
fastify.register(require('@fastify/jwt'), { secret: process.env.JWT_SECRET });

// Kolam sambungan: beberapa sambungan ke MySQL dikongsi dan digunakan semula
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// Pintu utama: GoDaddy mengetuk alamat ini untuk memastikan app sihat
fastify.get('/', async () => {
  return { app: 'itaska', status: 'ok' };
});

// Pintu API: bila orang ketuk /api/health, balas dengan status dan versi Node
fastify.get('/api/health', async () => {
  return { status: 'ok', node: process.version };
});

// Pintu ujian pangkalan data. SEMENTARA: buang sebelum menerbitkan app.
fastify.get('/api/db-check', async (request, reply) => {
  try {
    const [rows] = await pool.query('SELECT VERSION() AS version, DATABASE() AS db');
    return { status: 'ok', mysql: rows[0].version, database: rows[0].db };
  } catch (err) {
    request.log.error(err);
    reply.code(500);
    return { status: 'error', message: 'Tidak dapat bersambung ke pangkalan data' };
  }
});

// Pintu log masuk
require('./auth')(fastify, pool);

// Hidupkan pelayan pada port yang diberi, atau 3000
const start = async () => {
  try {
    // Migrasi automatik hanya berjalan jika suis AUTO_MIGRATE=1 dipasang
    if (process.env.AUTO_MIGRATE === '1') {
      const count = await runMigrations((msg) => fastify.log.info(msg));
      fastify.log.info('Migrasi automatik: ' + count + ' dijalankan');
    }
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();