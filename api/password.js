const crypto = require('crypto');
const { promisify } = require('util');

// Versi async scrypt, supaya tidak menyekat pelayan semasa mencincang
const scrypt = promisify(crypto.scrypt);

// Hash kata laluan. Hasilnya teks berbentuk "garam:hash"
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex'); // garam rawak, berbeza setiap kali
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return salt + ':' + hash;
}

// Semak kata laluan: cincang semula dengan garam yang sama, kemudian bandingkan
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

module.exports = { hashPassword, verifyPassword };