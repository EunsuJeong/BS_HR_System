/**
 * PM2 Configuration for BS HR System
 * Windows PC + PM2 기반 사내 서버 배포 설정
 *
 * 사용법:
 * - 시작: pm2 start pm2.config.js
 * - 중지: pm2 stop bs-hr-backend
 * - 재시작: pm2 restart bs-hr-backend
 * - 로그 확인: pm2 logs bs-hr-backend
 * - 자동시작 설정: pm2 startup
 */

module.exports = {
  apps: [
    {
      // ==================== 앱 기본 정보 ====================
      name: 'bs-hr-backend',
      script: './server/server.js',
      description: '부성스틸 AI 인사관리 시스템 백엔드',

      // ==================== 클러스터 설정 ====================
      // 'cluster' 모드: 여러 워커 프로세스로 병렬 처리 (권장)
      // 'fork' 모드: 단일 워커 프로세스 (테스트용)
      instances: 'max', // CPU 코어 수만큼 자동 실행 (예: 4코어 = 4개 프로세스)
      exec_mode: 'cluster',

      // ==================== 환경 변수 ====================
      // Windows PC 사내 서버 환경변수
      // .env 파일에서도 읽어오지만, 명시적으로 설정 가능
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        // 이하는 .env 파일에서 로드됨 (명시 권장 x, 보안상 .env만 사용)
      },

      // ==================== 로그 설정 ====================
      // 로그 파일 경로 (Windows: C:\Users\[User]\Desktop\...\logs\)
      error_file: './logs/pm2-error.log', // 에러 로그
      out_file: 'NUL', // 표준 출력 무시 (Windows)
      log_file: './logs/pm2-combined.log', // 병합 로그
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // 로그 타임스탬프 포맷
      time: true, // 로그에 타임스탬프 추가

      // ==================== 프로세스 관리 ====================
      autorestart: true, // 크래시 시 자동 재시작
      watch: false, // 파일 변경 감지 비활성화 (프로덕션 환경)
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'backups',
        '.git',
        '.env',
      ],
      max_memory_restart: '500M', // 메모리 500MB 초과 시 자동 재시작

      // ==================== 재시작 정책 ====================
      max_restarts: 10, // 1분 내 최대 재시작 횟수
      min_uptime: '30s', // 최소 가동시간 (이 시간 내 종료되면 에러로 간주)

      // ==================== 로그 통합 ====================
      merge_logs: true, // 여러 워커의 로그를 하나 파일로 통합

      // ==================== 로그 로테이션 (pm2-logrotate 사용 시)
      // pm2 install pm2-logrotate
      // pm2 set pm2-logrotate:max_size 20M
      // pm2 set pm2-logrotate:retain 7
      // pm2 set pm2-logrotate:compress true

      // ==================== 고급 설정 ====================
      cwd: './', // 작업 디렉토리
      interpreter: 'node', // Node.js 사용
      interpreter_args: '--max-old-space-size=2048', // Node.js 메모리 할당 (2GB)

      // ==================== 환경 변수 파일 ====================
      // PM2가 .env 파일을 자동으로 로드하지 않으므로 dotenv-cli 또는 수동 설정
      // 추천: server.js에서 dotenv.config() 사용 (현재 구현됨)
    },
  ],

  // ==================== PM2 전역 설정 ====================
  deploy: {
    // 수동 배포 (Git 기반 배포 필요 시 설정)
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/EunsuJeong/BS_HR_System.git',
      path: '/home/node/bs-hr-system',
      'post-deploy': 'npm install && pm2 restart bs-hr-backend',
    },
  },
};
