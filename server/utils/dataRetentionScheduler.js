// ===============================================
// 🗄️ 데이터 보존기한 관리 스케줄러
// ===============================================

const cron = require('node-cron');
const mongoose = require('mongoose');

// 보존기한 설정 (일)
const RETENTION_POLICIES = {
  // 근태 및 급여 데이터: 3년
  ATTENDANCE: 3 * 365, // 1,095일
  PAYROLL: 3 * 365, // 1,095일

  // AI 관련 데이터: 10일
  AI_RECOMMENDATIONS: 10,
  AI_LOGS: 10,
  SYSTEM_LOGS: 10,

  // HR 관련 데이터: 5년
  LEAVES: 5 * 365, // 1,825일
  NOTICES: 5 * 365, // 1,825일
  SUGGESTIONS: 5 * 365, // 1,825일
  EVALUATIONS: 5 * 365, // 1,825일
  NOTIFICATIONS: 5 * 365, // 1,825일
};

/**
 * 지정된 기간이 지난 데이터 삭제
 */
async function deleteOldData(model, retentionDays, dateField = 'createdAt') {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await model.deleteMany({
      [dateField]: { $lt: cutoffDate }
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ ${model.modelName}: ${result.deletedCount}건 삭제 (${retentionDays}일 이상 경과)`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error(`❌ ${model.modelName} 데이터 삭제 실패:`, error);
    return 0;
  }
}

/**
 * 근태 기록 정리 (3년)
 */
async function cleanupAttendanceData() {
  try {
    const Attendance = mongoose.model('Attendance');
    const AttendanceSheet = mongoose.model('AttendanceSheet');
    const AttendanceStats = mongoose.model('AttendanceStats');
    const AttendanceSummary = mongoose.model('AttendanceSummary');

    console.log('📊 근태 데이터 정리 시작...');

    let totalDeleted = 0;

    // Attendance: createdAt 기준
    totalDeleted += await deleteOldData(Attendance, RETENTION_POLICIES.ATTENDANCE, 'createdAt');

    // AttendanceSheet: year/month 기준 (3년 전 데이터)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const cutoffYear = threeYearsAgo.getFullYear();
    const cutoffMonth = threeYearsAgo.getMonth() + 1;

    const sheetResult = await AttendanceSheet.deleteMany({
      $or: [
        { year: { $lt: cutoffYear } },
        { year: cutoffYear, month: { $lt: cutoffMonth } }
      ]
    });
    if (sheetResult.deletedCount > 0) {
      console.log(`🗑️ AttendanceSheet: ${sheetResult.deletedCount}건 삭제 (3년 이상 경과)`);
      totalDeleted += sheetResult.deletedCount;
    }

    // AttendanceStats: year/month 기준
    const statsResult = await AttendanceStats.deleteMany({
      $or: [
        { year: { $lt: cutoffYear } },
        { year: cutoffYear, month: { $lt: cutoffMonth } }
      ]
    });
    if (statsResult.deletedCount > 0) {
      console.log(`🗑️ AttendanceStats: ${statsResult.deletedCount}건 삭제 (3년 이상 경과)`);
      totalDeleted += statsResult.deletedCount;
    }

    // AttendanceSummary: createdAt 기준
    totalDeleted += await deleteOldData(AttendanceSummary, RETENTION_POLICIES.ATTENDANCE, 'createdAt');

    return totalDeleted;
  } catch (error) {
    console.error('❌ 근태 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * 급여 데이터 정리 (3년)
 */
async function cleanupPayrollData() {
  try {
    const Payroll = mongoose.model('Payroll');

    console.log('💰 급여 데이터 정리 시작...');

    // year/month 기준 (3년 전 데이터)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const cutoffYear = threeYearsAgo.getFullYear();
    const cutoffMonth = threeYearsAgo.getMonth() + 1;

    const result = await Payroll.deleteMany({
      $or: [
        { year: { $lt: cutoffYear } },
        { year: cutoffYear, month: { $lt: cutoffMonth } }
      ]
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Payroll: ${result.deletedCount}건 삭제 (3년 이상 경과)`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('❌ 급여 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * AI 관련 데이터 정리 (10일)
 */
async function cleanupAIData() {
  try {
    const AiRecommendation = mongoose.model('AiRecommendation');
    const AiLog = mongoose.model('AiLog');

    console.log('🤖 AI 데이터 정리 시작...');

    let totalDeleted = 0;
    totalDeleted += await deleteOldData(AiRecommendation, RETENTION_POLICIES.AI_RECOMMENDATIONS, 'createdAt');
    totalDeleted += await deleteOldData(AiLog, RETENTION_POLICIES.AI_LOGS, 'createdAt');

    return totalDeleted;
  } catch (error) {
    console.error('❌ AI 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * 시스템 로그 정리 (10일)
 */
async function cleanupSystemLogs() {
  try {
    const SystemLog = mongoose.model('SystemLog');

    console.log('📝 시스템 로그 정리 시작...');

    return await deleteOldData(SystemLog, RETENTION_POLICIES.SYSTEM_LOGS, 'timestamp');
  } catch (error) {
    console.error('❌ 시스템 로그 정리 실패:', error);
    return 0;
  }
}

/**
 * HR 관련 데이터 정리 (5년)
 */
async function cleanupHRData() {
  try {
    const Leave = mongoose.model('Leave');
    const Notice = mongoose.model('Notice');
    const Suggestion = mongoose.model('Suggestion');
    const Evaluation = mongoose.model('Evaluation');
    const Notification = mongoose.model('Notification');

    console.log('📋 HR 데이터 정리 시작...');

    let totalDeleted = 0;
    totalDeleted += await deleteOldData(Leave, RETENTION_POLICIES.LEAVES, 'createdAt');
    totalDeleted += await deleteOldData(Notice, RETENTION_POLICIES.NOTICES, 'createdAt');
    totalDeleted += await deleteOldData(Suggestion, RETENTION_POLICIES.SUGGESTIONS, 'createdAt');
    totalDeleted += await deleteOldData(Evaluation, RETENTION_POLICIES.EVALUATIONS, 'createdAt');
    totalDeleted += await deleteOldData(Notification, RETENTION_POLICIES.NOTIFICATIONS, 'createdAt');

    return totalDeleted;
  } catch (error) {
    console.error('❌ HR 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * 전체 데이터 정리 실행
 */
async function performDataCleanup() {
  try {
    console.log('\n========================================');
    console.log('🗑️ 데이터 보존기한 정리 시작');
    console.log('⏰ 실행 시각:', new Date().toLocaleString('ko-KR'));
    console.log('========================================\n');

    let totalDeleted = 0;

    // 근태 데이터 (3년)
    totalDeleted += await cleanupAttendanceData();

    // 급여 데이터 (3년)
    totalDeleted += await cleanupPayrollData();

    // AI 데이터 (10일)
    totalDeleted += await cleanupAIData();

    // 시스템 로그 (10일)
    totalDeleted += await cleanupSystemLogs();

    // HR 데이터 (5년)
    totalDeleted += await cleanupHRData();

    console.log('\n========================================');
    console.log(`✅ 데이터 정리 완료: 총 ${totalDeleted}건 삭제`);
    console.log('========================================\n');

    return totalDeleted;
  } catch (error) {
    console.error('❌ 데이터 정리 실패:', error);
    return 0;
  }
}

/**
 * 데이터 정리 스케줄러 시작
 */
function startDataRetentionScheduler() {
  // 매일 새벽 2시에 실행 (백업 후 실행)
  cron.schedule('0 2 * * *', async () => {
    await performDataCleanup();
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('✅ 데이터 보존기한 스케줄러 시작됨 (매일 새벽 02:00 KST)');
  console.log('📋 보존기한 정책:');
  console.log('   - 근태/급여 데이터: 3년');
  console.log('   - AI 로그: 10일');
  console.log('   - HR 데이터: 5년');
}

/**
 * 수동 데이터 정리 실행 (테스트용)
 */
async function manualCleanup() {
  console.log('\n========================================');
  console.log('🔧 수동 데이터 정리 실행');
  console.log('========================================');
  return await performDataCleanup();
}

module.exports = {
  startDataRetentionScheduler,
  manualCleanup,
  performDataCleanup,
  RETENTION_POLICIES,
};
