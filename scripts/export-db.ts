import dns from 'dns';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Error: MONGODB_URI is missing from environment variables.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  try {
    await mongoose.connect(uri, {
      tlsAllowInvalidCertificates: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✓ Connected successfully!');
  } catch (err) {
    console.error('❌ Database connection failed!');
    console.error(err);
    process.exit(1);
  }

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection instance not found');

    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections.`);

    // Create export folder in project root
    const exportDir = path.join(process.cwd(), 'backup_db_export');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    for (const colInfo of collections) {
      const colName = colInfo.name;
      console.log(`Exporting collection: ${colName}...`);
      const documents = await db.collection(colName).find({}).toArray();
      
      const fileDest = path.join(exportDir, `${colName}.json`);
      fs.writeFileSync(fileDest, JSON.stringify(documents, null, 2), 'utf8');
      console.log(`  -> Written ${documents.length} docs to ${fileDest}`);
    }

    console.log(`\n🎉 Success! All collections exported to: ${exportDir}`);
  } catch (err) {
    console.error('❌ Export failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(console.error);
