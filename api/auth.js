const { verifyPassword } = require('./password');

// Mendaftarkan pintu log masuk pada pelayan Fastify yang diberi
module.exports = function registerAuth(fastify, pool) {
  // Penjaga pintu: letak pada laluan yang memerlukan log masuk
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify(); // semak cop mohor dan tarikh tamat tempoh
    } catch (err) {
      reply.code(401).send({ status: 'error', message: 'Sila log masuk' });
    }
  });

  // Log masuk: emel + kata laluan -> token
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', maxLength: 190 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const email = request.body.email.trim().toLowerCase();

      const [rows] = await pool.query(
        'SELECT id, company_id, branch_id, email, password_hash, full_name, role ' +
          'FROM users WHERE email = ? AND is_active = 1',
        [email]
      );
      const user = rows[0];

      // Mesej sama sama ada emel tiada atau kata laluan salah
      const ok = user ? await verifyPassword(request.body.password, user.password_hash) : false;
      if (!ok) {
        reply.code(401);
        return { status: 'error', message: 'Emel atau kata laluan tidak betul' };
      }

      // Isi token boleh dibaca sesiapa, jadi jangan letak rahsia di dalamnya
      const token = fastify.jwt.sign(
        {
          sub: String(user.id),
          role: user.role,
          companyId: user.company_id,
          branchId: user.branch_id,
        },
        { expiresIn: '8h' }
      );

      return {
        status: 'ok',
        token,
        user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
      };
    }
  );

  // Siapa saya? Hanya boleh dibuka dengan token yang sah
  fastify.get('/api/auth/me', { onRequest: [fastify.authenticate] }, async (request) => {
    return { status: 'ok', user: request.user };
  });
};