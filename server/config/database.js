const mongoose = require('mongoose');

/**
 * MongoDB 연결 함수
 */
const connectDB = async () => {
  try {
    // 두 환경변수 모두 지원: MONGO_URI(신규) / MONGODB_URI(기존)
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error(
        '환경변수 MONGO_URI 또는 MONGODB_URI가 설정되지 않았습니다 (.env.production).'
      );
    }

    const options = {
      // useNewUrlParser: true, // mongoose 6.0 이상에서는 기본값
      // useUnifiedTopology: true, // mongoose 6.0 이상에서는 기본값
      serverSelectionTimeoutMS: 5000, // 5초 타임아웃
      socketTimeoutMS: 45000, // 45초 소켓 타임아웃
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // 연결 이벤트 리스너
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // 개발 환경에서는 프로세스를 종료하지 않고 계속 실행
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

/**
 * MongoDB 연결 종료
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
  }
};

module.exports = { connectDB, disconnectDB };
