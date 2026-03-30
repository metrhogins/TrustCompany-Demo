const crypto = require('crypto');

const SECRET     = 'TLL_SECRET_2026';        // change this to your own secret
const PASSKEY    = 'ztakora-demo-2026';  // change this to your own passkey
const EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const payload   = JSON.stringify({ passkey: PASSKEY, exp: Date.now() + EXPIRES_MS });
const iv        = crypto.randomBytes(16);
const keyBuf    = crypto.scryptSync(SECRET, 'salt', 32);
const cipher    = crypto.createCipheriv('aes-256-cbc', keyBuf, iv);
const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
const token     = iv.toString('hex') + ':' + encrypted.toString('hex');

console.log('\n  Generated encrypted key:\n');
console.log('  ' + token);
console.log('\n  Share this with your demo user.');
console.log('  They run the install script with this key.\n');
