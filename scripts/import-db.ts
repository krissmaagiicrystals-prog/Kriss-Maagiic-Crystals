import dns from 'dns';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const targetUri = process.argv[2] || process.env.NEW_MONGODB_URI;

async function main() {
  if (!targetUri) {
    console.error('❌ Error: Please provide the target MongoDB URI.');
    console.log('Usage: npx tsx scripts/import-db.ts "<NEW_MONGODB_URI>"');
    process.exit(1);
  }

  const exportDir = path.join(process.cwd(), 'backup_db_export');
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Error: backup_db_export folder not found. Run export-db.ts first.');
    process.exit(1);
  }

  console.log('Connecting to target database...');
  await mongoose.connect(targetUri);
  console.log('✓ Connected to new MongoDB cluster!');

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection instance not found');

  const files = fs.readdirSync(exportDir).filter((f: string) => f.endsWith('.json'));

  for (const file of files) {
    const colName = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(exportDir, file), 'utf8'));

    if (Array.isArray(data) && data.length > 0) {
      console.log(`Importing ${data.length} documents into collection: ${colName}...`);
      const transformed = data.map((doc: any) => {
        const item = { ...doc };
        if (item._id && typeof item._id === 'string' && item._id.length === 24) {
          item._id = new mongoose.Types.ObjectId(item._id);
        }
        return item;
      });

      await db.collection(colName).deleteMany({});
      await db.collection(colName).insertMany(transformed);
      console.log(`  ✓ Successfully imported ${colName}`);
    } else {
      console.log(`Skipping empty collection: ${colName}`);
    }
  }

  console.log('\n🎉 Migration complete! All collections restored to client cluster.');
  await mongoose.disconnect();
}

main().catch(console.error);
