// Cipta pelayan Fastify, dan hidupkan log supaya kita nampak apa yang berlaku
const fastify = require('fastify')({ logger: true });

// Pintu API: bila orang ketuk /api/health, balas dengan status dan versi Node
fastify.get('/api/health', async () => {
  return { status: 'ok', node: process.version };
});

// Hidupkan pelayan pada port 3000
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();