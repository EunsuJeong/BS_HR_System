const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/busung_hr';

async function migrateNoticeViewCount() {
  try {
    console.log('=== Notice ViewCount Migration ===\n');
    console.log('Connecting to:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('Connected!\n');

    const db = mongoose.connection.db;
    const collection = db.collection('notices');

    // viewCount 필드가 없는 문서 찾기
    const missingField = await collection.countDocuments({ viewCount: { $exists: false } });
    console.log(`Found ${missingField} notices without viewCount field\n`);

    if (missingField === 0) {
      console.log('All notices already have viewCount field. No migration needed.');
      process.exit(0);
    }

    // 모든 공지사항에 viewCount와 viewedBy 필드 추가
    const result = await collection.updateMany(
      {
        $or: [
          { viewCount: { $exists: false } },
          { viewedBy: { $exists: false } }
        ]
      },
      {
        $set: {
          viewCount: 0,
          viewedBy: []
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} notices`);
    console.log('Migration complete!\n');

    // 검증
    const sample = await collection.find().limit(3).toArray();
    console.log('Sample notices after migration:');
    sample.forEach((n, i) => {
      console.log(`  ${i + 1}. ${n.title?.substring(0, 30)}`);
      console.log(`     viewCount: ${n.viewCount}`);
      console.log(`     viewedBy: [${n.viewedBy.length} items]`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateNoticeViewCount();
