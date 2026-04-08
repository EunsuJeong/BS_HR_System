/**
 * PM2 Configuration for BS HR System
 * Windows PC + PM2 기반 사내 서버 배포 설정
 *
 * ⚠️ 주의: `npm start` 대신 반드시 아래 방법으로 실행하세요.
 *   npm start는 concurrently + nodemon을 사용하기 때문에
 *   PM2가 자식 프로세스를 제대로 관리하지 못합니다.
 *
 * 사용법:
 * - 전체 시작: pm2 start pm2.config.js
 * - 전체 중지: pm2 stop all
 * - 전체 재시작: pm2 restart all
 * - 개별 재시작: pm2 restart bs-hr-backend
 * - 로그 확인: pm2 logs (전체) / pm2 logs bs-hr-backend (개별)
 * - 자동시작 설정: pm2 startup  →  pm2 save
 * - 프로세스 목록: pm2 list
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
      instances: 1, // 로컬 PC 환경: 단일 프로세스 (max 사용 시 메모리 과부하)
      exec_mode: 'fork',

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
      restart_delay: 3000, // 재시작 전 3초 대기 (포트 해제 대기)
      kill_timeout: 5000, // 종료 신호 후 5초 대기 (graceful shutdown)

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
      windowsHide: true, // Windows에서 콘솔 창 숨김

      // ==================== 환경 변수 파일 ====================
      // PM2가 .env 파일을 자동으로 로드하지 않으므로 dotenv-cli 또는 수동 설정
      // 추천: server.js에서 dotenv.config() 사용 (현재 구현됨)
    },
    {
      // ==================== 스케줄러 프로세스 ====================
      // 메인 서버와 완전 분리 → 백업/연차 블로킹이 API 서버에 영향 없음
      name: 'bs-hr-scheduler',
      script: './server/scheduler.js',
      description: '부성스틸 AI 인사관리 시스템 스케줄러 (백업/연차)',

      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
      },

      error_file: './logs/scheduler-error.log',
      out_file: './logs/scheduler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      merge_logs: true,

      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      max_restarts: 10,
      min_uptime: '30s',

      cwd: './',
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=512',
      windowsHide: true, // Windows에서 콘솔 창 숨김
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
