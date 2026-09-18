import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/models/User';

async function main() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.SEED_ADMIN_EMAIL || 'info@krissmaagiiccrystals.com').trim().toLowerCase();
  const newPassword = args[1] || process.env.SEED_ADMIN_PASSWORD || 'KrissAdmin@2026';
  const name = args[2] || 'KrissMaagiic Admin';

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is missing from environment variables.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB Atlas...`);
  await mongoose.connect(uri);
  console.log('✓ Connected successfully.');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      active: true,
    });
    console.log(`\n✅ New Admin User Created:`);
  } else {
    user.passwordHash = passwordHash;
    user.role = 'admin';
    user.active = true;
    if (name && !user.name) user.name = name;
    await user.save();
    console.log(`\n✅ Existing Admin User Password Updated:`);
  }

  console.log(`-----------------------------------------------`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${newPassword}`);
  console.log(`Role:     admin`);
  console.log(`Active:   true`);
  console.log(`-----------------------------------------------`);
  console.log(`You can now log in at /admin/login\n`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error resetting admin password:', err);
  process.exit(1);
});
