const { spawn } = require('child_process');
const path = require('path');

const mongodPath = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
const dbPath = 'C:\\data\\db';

console.log('🔄 Starting MongoDB...');

const mongod = spawn(mongodPath, ['--dbpath', dbPath], {
  stdio: 'inherit'
});

mongod.on('error', (error) => {
  console.error('❌ Failed to start MongoDB:', error.message);
  process.exit(1);
});

mongod.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`❌ MongoDB exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {
  mongod.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  mongod.kill('SIGTERM');
  process.exit(0);
});
