// ===============================================
// 📊 Excel 자동 백업 스케줄러
// - 매일 자정: 직원 / 근태 / 연차 → Excel
// - 매달 15일 자정: 급여 → Excel
// ===============================================

const cron = require('node-cron');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const DEFAULT_BACKUP_DIR = path.resolve('D:/BS_HR_System/backups');
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : DEFAULT_BACKUP_DIR;

function pad2(v) {
  return String(v).padStart(2, '0');
}

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getMonthlyDir(now = new Date()) {
  const year = String(now.getFullYear());
  const month = pad2(now.getMonth() + 1);
  const dir = path.join(BACKUP_DIR, year, month, 'excel');
  ensureDir(dir);
  return { dir, year, month };
}

// 헤더 스타일 공통 적용
function applyHeaderStyle(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 20;
}

// ===============================================
// 직원 시트
// ===============================================
async function addEmployeeSheet(workbook) {
  const Employee = require('../models/hr/employees');
  const ws = workbook.addWorksheet('직원');

  ws.columns = [
    { header: '직원ID',    key: 'employeeId',     width: 12 },
    { header: '이름',      key: 'name',            width: 10 },
    { header: '부서',      key: 'department',      width: 12 },
    { header: '세부부서',  key: 'subDepartment',   width: 12 },
    { header: '직책',      key: 'role',            width: 10 },
    { header: '직급',      key: 'position',        width: 10 },
    { header: '급여유형',  key: 'salaryType',      width: 10 },
    { header: '근무유형',  key: 'workType',        width: 10 },
    { header: '계약유형',  key: 'contractType',    width: 10 },
    { header: '상태',      key: 'status',          width: 8  },
    { header: '입사일',    key: 'joinDate',        width: 12 },
    { header: '퇴사일',    key: 'leaveDate',       width: 12 },
    { header: '연락처',    key: 'phone',           width: 14 },
    { header: '총연차',    key: 'totalAnnual',     width: 8  },
    { header: '사용연차',  key: 'usedAnnual',      width: 8  },
    { header: '잔여연차',  key: 'remainAnnual',    width: 8  },
    { header: '연차시작일', key: 'annualLeaveStart', width: 12 },
    { header: '연차종료일', key: 'annualLeaveEnd',   width: 12 },
  ];

  const employees = await Employee.find({}).lean();
  employees.forEach((e) => {
    ws.addRow({
      employeeId:      e.employeeId,
      name:            e.name,
      department:      e.department,
      subDepartment:   e.subDepartment,
      role:            e.role,
      position:        e.position,
      salaryType:      e.salaryType,
      workType:        e.workType,
      contractType:    e.contractType,
      status:          e.status,
      joinDate:        formatDate(e.joinDate),
      leaveDate:       formatDate(e.leaveDate),
      phone:           e.phone,
      totalAnnual:     e.totalAnnual,
      usedAnnual:      e.usedAnnual,
      remainAnnual:    e.remainAnnual,
      annualLeaveStart: e.annualLeaveStart,
      annualLeaveEnd:   e.annualLeaveEnd,
    });
  });

  applyHeaderStyle(ws);
  console.log(`  ✅ 직원 시트: ${employees.length}건`);
}

// ===============================================
// 근태 시트
// ===============================================
async function addAttendanceSheet(workbook) {
  const Attendance = require('../models/hr/attendance');
  const ws = workbook.addWorksheet('근태');

  ws.columns = [
    { header: '직원ID',        key: 'employeeId',        width: 12 },
    { header: '날짜',          key: 'date',              width: 12 },
    { header: '출근시간',      key: 'checkIn',           width: 10 },
    { header: '퇴근시간',      key: 'checkOut',          width: 10 },
    { header: '근무유형',      key: 'shiftType',         width: 8  },
    { header: '상태',          key: 'status',            width: 10 },
    { header: '총근무(분)',    key: 'totalWorkMinutes',  width: 10 },
    { header: '연장(시간)',    key: 'overtimeHours',     width: 10 },
    { header: '휴일(시간)',    key: 'holidayHours',      width: 10 },
    { header: '야간(시간)',    key: 'nightHours',        width: 10 },
    { header: '비고',          key: 'remarks',           width: 20 },
  ];

  const records = await Attendance.find({}).sort({ date: -1 }).lean();
  records.forEach((a) => {
    ws.addRow({
      employeeId:       a.employeeId,
      date:             a.date,
      checkIn:          a.checkIn,
      checkOut:         a.checkOut,
      shiftType:        a.shiftType,
      status:           a.status,
      totalWorkMinutes: a.totalWorkMinutes,
      overtimeHours:    a.overtimeHours,
      holidayHours:     a.holidayHours,
      nightHours:       a.nightHours,
      remarks:          a.remarks,
    });
  });

  applyHeaderStyle(ws);
  console.log(`  ✅ 근태 시트: ${records.length}건`);
}

// ===============================================
// 연차 시트
// ===============================================
async function addLeaveSheet(workbook) {
  const Leave = require('../models/hr/leaves');
  const ws = workbook.addWorksheet('연차');

  ws.columns = [
    { header: '직원ID',    key: 'employeeId',    width: 12 },
    { header: '직원명',    key: 'employeeName',  width: 10 },
    { header: '부서',      key: 'department',    width: 12 },
    { header: '직급',      key: 'position',      width: 10 },
    { header: '유형',      key: 'type',          width: 12 },
    { header: '시작일',    key: 'startDate',     width: 12 },
    { header: '종료일',    key: 'endDate',       width: 12 },
    { header: '신청일수',  key: 'requestedDays', width: 10 },
    { header: '상태',      key: 'status',        width: 8  },
    { header: '신청사유',  key: 'reason',        width: 20 },
    { header: '승인자',    key: 'approverName',  width: 10 },
    { header: '승인일',    key: 'approvedAt',    width: 12 },
    { header: '반려사유',  key: 'rejectionReason', width: 20 },
    { header: '신청일시',  key: 'requestDate',   width: 16 },
  ];

  const leaves = await Leave.find({}).sort({ requestDate: -1 }).lean();
  leaves.forEach((l) => {
    ws.addRow({
      employeeId:      l.employeeId,
      employeeName:    l.employeeName,
      department:      l.department,
      position:        l.position,
      type:            l.type,
      startDate:       formatDate(l.startDate),
      endDate:         formatDate(l.endDate),
      requestedDays:   l.requestedDays,
      status:          l.status,
      reason:          l.reason,
      approverName:    l.approverName,
      approvedAt:      formatDate(l.approvedAt),
      rejectionReason: l.rejectionReason,
      requestDate:     formatDate(l.requestDate),
    });
  });

  applyHeaderStyle(ws);
  console.log(`  ✅ 연차 시트: ${leaves.length}건`);
}

// ===============================================
// 매일 자정 - 직원/근태/연차 Excel 백업
// ===============================================
async function performDailyExcelBackup() {
  try {
    const now = new Date();
    const { dir, year, month } = getMonthlyDir(now);
    const day = pad2(now.getDate());
    const fileName = `${year}_${month}_${day}_data.xlsx`;
    const filePath = path.join(dir, fileName);

    console.log('📊 Excel 일일 백업 시작:', new Date().toLocaleString('ko-KR'));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '부성스틸 HR 시스템';
    workbook.created = now;

    await addEmployeeSheet(workbook);
    await addAttendanceSheet(workbook);
    await addLeaveSheet(workbook);

    await workbook.xlsx.writeFile(filePath);
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Excel 일일 백업 완료: ${fileName} (${sizeMB} MB)`);
    return true;
  } catch (error) {
    console.error('❌ Excel 일일 백업 실패:', error);
    return false;
  }
}

// ===============================================
// 매달 15일 자정 - 급여 Excel 백업
// ===============================================
async function performMonthlyPayrollBackup() {
  try {
    const now = new Date();
    const { dir, year, month } = getMonthlyDir(now);
    const fileName = `${year}_${month}_payroll.xlsx`;
    const filePath = path.join(dir, fileName);

    console.log('📊 Excel 급여 백업 시작:', new Date().toLocaleString('ko-KR'));

    const Payroll = require('../models/hr/payrolls');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '부성스틸 HR 시스템';
    workbook.created = now;

    const ws = workbook.addWorksheet('급여');
    ws.columns = [
      { header: '직원ID',    key: 'employeeId',          width: 12 },
      { header: '이름',      key: 'name',                width: 10 },
      { header: '부서',      key: 'department',          width: 12 },
      { header: '직급',      key: 'position',            width: 10 },
      { header: '년도',      key: 'year',                width: 6  },
      { header: '월',        key: 'month',               width: 4  },
      { header: '시급',      key: 'hourlyWage',          width: 10 },
      { header: '기본급',    key: 'basicPay',            width: 12 },
      { header: '연장(H)',   key: 'overtimeHours',       width: 8  },
      { header: '연장수당',  key: 'overtimePay',         width: 12 },
      { header: '휴일(H)',   key: 'holidayWorkHours',    width: 8  },
      { header: '휴일수당',  key: 'holidayWorkPay',      width: 12 },
      { header: '야간(H)',   key: 'nightWorkHours',      width: 8  },
      { header: '야간수당',  key: 'nightWorkPay',        width: 12 },
      { header: '차량수당',  key: 'carAllowance',        width: 10 },
      { header: '교통수당',  key: 'transportAllowance',  width: 10 },
      { header: '전화수당',  key: 'phoneAllowance',      width: 10 },
      { header: '기타수당',  key: 'otherAllowance',      width: 10 },
      { header: '연차수당',  key: 'annualLeavePay',      width: 10 },
      { header: '상여금',    key: 'bonus',               width: 10 },
      { header: '총지급액',  key: 'totalSalary',         width: 12 },
      { header: '소득세',    key: 'incomeTax',           width: 10 },
      { header: '지방세',    key: 'localTax',            width: 10 },
      { header: '국민연금',  key: 'nationalPension',     width: 10 },
      { header: '건강보험',  key: 'healthInsurance',     width: 10 },
      { header: '장기요양',  key: 'longTermCare',        width: 10 },
      { header: '고용보험',  key: 'employmentInsurance', width: 10 },
      { header: '선지급',    key: 'advanceDeduction',    width: 10 },
      { header: 'IRP',       key: 'irpMatching',         width: 10 },
      { header: '기타공제',  key: 'otherDeduction',      width: 10 },
      { header: '기숙사',    key: 'dormitory',           width: 10 },
      { header: '총공제액',  key: 'totalDeduction',      width: 12 },
      { header: '실수령액',  key: 'netSalary',           width: 12 },
    ];

    // 이번 달 데이터 조회 (15일 기준으로 직전 달까지 포함)
    const payrolls = await Payroll.find({ year: now.getFullYear() })
      .sort({ month: 1, department: 1, name: 1 })
      .lean();

    payrolls.forEach((p) => {
      ws.addRow({
        employeeId:          p.employeeId,
        name:                p.name,
        department:          p.department,
        position:            p.position,
        year:                p.year,
        month:               p.month,
        hourlyWage:          p.hourlyWage,
        basicPay:            p.basicPay,
        overtimeHours:       p.overtimeHours,
        overtimePay:         p.overtimePay,
        holidayWorkHours:    p.holidayWorkHours,
        holidayWorkPay:      p.holidayWorkPay,
        nightWorkHours:      p.nightWorkHours,
        nightWorkPay:        p.nightWorkPay,
        carAllowance:        p.carAllowance,
        transportAllowance:  p.transportAllowance,
        phoneAllowance:      p.phoneAllowance,
        otherAllowance:      p.otherAllowance,
        annualLeavePay:      p.annualLeavePay,
        bonus:               p.bonus,
        totalSalary:         p.totalSalary,
        incomeTax:           p.incomeTax,
        localTax:            p.localTax,
        nationalPension:     p.nationalPension,
        healthInsurance:     p.healthInsurance,
        longTermCare:        p.longTermCare,
        employmentInsurance: p.employmentInsurance,
        advanceDeduction:    p.advanceDeduction,
        irpMatching:         p.irpMatching,
        otherDeduction:      p.otherDeduction,
        dormitory:           p.dormitory,
        totalDeduction:      p.totalDeduction,
        netSalary:           p.netSalary,
      });
    });

    applyHeaderStyle(ws);

    await workbook.xlsx.writeFile(filePath);
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ Excel 급여 백업 완료: ${fileName} (${sizeMB} MB), ${payrolls.length}건`);
    return true;
  } catch (error) {
    console.error('❌ Excel 급여 백업 실패:', error);
    return false;
  }
}

// ===============================================
// 오늘 Excel 백업 누락 시 즉시 보정
// ===============================================
async function checkAndRunCatchupExcelBackup() {
  try {
    const now = new Date();
    const { dir, year, month } = getMonthlyDir(now);
    const day = pad2(now.getDate());
    const fileName = `${year}_${month}_${day}_data.xlsx`;
    const filePath = path.join(dir, fileName);

    if (fs.existsSync(filePath)) return false;

    console.log('⚠️ 오늘 Excel 백업 파일이 없어 보정 백업을 즉시 실행합니다.');
    return await performDailyExcelBackup();
  } catch (error) {
    console.error('❌ Excel 보정 백업 실패:', error.message);
    return false;
  }
}

// ===============================================
// 스케줄러 시작
// ===============================================
function startExcelBackupScheduler() {
  // 매일 01:03 - 직원/근태/연차 Excel 백업
  cron.schedule(
    '3 1 * * *',
    async () => {
      console.log('\n========================================');
      console.log('⏰ Excel 일일 백업 시작 (매일 01:03)');
      console.log('========================================');
      await performDailyExcelBackup();
    },
    { timezone: 'Asia/Seoul' }
  );

  // 매일 01:08 누락 여부 체크 (01:03 백업이 실패했을 경우 보정)
  cron.schedule(
    '8 1 * * *',
    async () => {
      await checkAndRunCatchupExcelBackup();
    },
    { timezone: 'Asia/Seoul' }
  );

  // 매달 15일 01:03 - 급여 Excel 백업
  cron.schedule(
    '3 1 15 * *',
    async () => {
      console.log('\n========================================');
      console.log('⏰ Excel 급여 백업 시작 (매달 15일 01:03)');
      console.log('========================================');
      await performMonthlyPayrollBackup();
    },
    { timezone: 'Asia/Seoul' }
  );

  console.log('✅ Excel 백업 스케줄러 시작됨');
  console.log('   - 매일 01:03 KST: 직원/근태/연차 Excel (보정 01:08)');
  console.log('   - 매달 15일 01:03 KST: 급여 Excel');
  console.log('📁 저장 경로:', BACKUP_DIR);

  // 서버 시작 시 당일 파일 없으면 즉시 보정
  checkAndRunCatchupExcelBackup();
}

module.exports = {
  startExcelBackupScheduler,
  performDailyExcelBackup,
  performMonthlyPayrollBackup,
  checkAndRunCatchupExcelBackup,
};
