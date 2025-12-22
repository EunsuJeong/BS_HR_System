const express = require('express');
const router = express.Router();
const { Payroll } = require('../models');

// ==========================================
// 급여 데이터 대량 저장 (업로드)
// ==========================================
router.post('/bulk', async (req, res) => {
  try {
    const { records, year, month } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: '저장할 급여 데이터가 없습니다.',
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '연도와 월 정보가 필요합니다.',
      });
    }

    console.log(
      `📊 [Payroll API] 급여 데이터 저장 요청: ${year}년 ${month}월, ${records.length}건`
    );

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const bulkOps = [];

    for (const record of records) {
      if (!record.employeeId) {
        console.warn('⚠️ employeeId가 없는 레코드 스킵:', record);
        continue;
      }

      // 숫자 필드 안전하게 파싱
      const parseNumber = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const cleaned = val.replace(/[,원]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      const payrollData = {
        employeeId: record.employeeId || record.사번,
        year: parseInt(year),
        month: parseInt(month),
        yearMonth: yearMonth,

        // 직원 정보
        name: record.name || record.성명 || '',
        department: record.department || record.부서 || '',
        position: record.position || record.직급 || '',
        joinDate: record.joinDate || record.입사일자 || '',

        // 기본 급여
        hourlyWage: parseNumber(record.hourlyWage || record.시급),
        basicHours: parseNumber(record.basicHours || record.기본시간),
        basicPay: parseNumber(record.basicPay || record.기본급),

        // 근무 시간 및 수당
        overtimeHours: parseNumber(record.overtimeHours || record.연장시간),
        overtimePay: parseNumber(record.overtimePay || record.연장수당),
        holidayWorkHours: parseNumber(
          record.holidayWorkHours || record.휴일근로시간
        ),
        holidayWorkPay: parseNumber(
          record.holidayWorkPay || record.휴일근로수당
        ),
        nightWorkHours: parseNumber(
          record.nightWorkHours || record.야간근로시간
        ),
        nightWorkPay: parseNumber(record.nightWorkPay || record.야간근로수당),

        // 공제 항목
        lateEarlyHours: parseNumber(
          record.lateEarlyHours || record.지각조퇴시간
        ),
        lateEarlyDeduction: parseNumber(
          record.lateEarlyDeduction || record.지각조퇴공제
        ),
        absentDays: parseNumber(record.absentDays || record.결근일수),
        absentDeduction: parseNumber(record.absentDeduction || record.결근공제),

        // 수당
        carAllowance: parseNumber(
          record.carAllowance || record.차량수당 || record.차량
        ),
        transportAllowance: parseNumber(
          record.transportAllowance || record.교통비
        ),
        phoneAllowance: parseNumber(record.phoneAllowance || record.통신비),
        otherAllowance: parseNumber(record.otherAllowance || record.기타수당),
        annualLeaveDays: parseNumber(record.annualLeaveDays || record.년차일수),
        annualLeavePay: parseNumber(record.annualLeavePay || record.년차수당),
        bonus: parseNumber(record.bonus || record.상여금),

        // 급여 합계
        totalSalary: parseNumber(record.totalSalary || record.급여합계),

        // 세금 및 보험
        incomeTax: parseNumber(record.incomeTax || record.소득세),
        localTax: parseNumber(record.localTax || record.지방세),
        nationalPension: parseNumber(record.nationalPension || record.국민연금),
        healthInsurance: parseNumber(record.healthInsurance || record.건강보험),
        longTermCare: parseNumber(record.longTermCare || record.장기요양),
        employmentInsurance: parseNumber(
          record.employmentInsurance || record.고용보험
        ),

        // 기타 공제
        advanceDeduction: parseNumber(
          record.advanceDeduction || record.가불금과태료
        ),
        irpMatching: parseNumber(record.irpMatching || record.매칭IRP적립),
        otherDeduction: parseNumber(
          record.otherDeduction || record.경조비기타공제
        ),
        dormitory: parseNumber(record.dormitory || record.기숙사),

        // 연말정산
        healthYearEnd: parseNumber(
          record.healthYearEnd || record.건강보험연말정산
        ),
        longTermYearEnd: parseNumber(
          record.longTermYearEnd || record.장기요양연말정산
        ),
        taxYearEnd: parseNumber(record.taxYearEnd || record.연말정산징수세액),

        // 최종 금액
        totalDeduction: parseNumber(record.totalDeduction || record.공제합계),
        netSalary: parseNumber(record.netSalary || record.차인지급액),

        lastModified: new Date(),
      };

      bulkOps.push({
        updateOne: {
          filter: { employeeId: payrollData.employeeId, yearMonth: yearMonth },
          update: { $set: payrollData },
          upsert: true,
        },
      });
    }

    if (bulkOps.length === 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 급여 데이터가 없습니다.',
      });
    }

    const result = await Payroll.bulkWrite(bulkOps);

    console.log(`✅ [Payroll API] 급여 데이터 저장 완료:`, {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: bulkOps.length,
    });

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('payroll-bulk-uploaded', {
        year,
        month,
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        total: bulkOps.length,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `${year}년 ${month}월 급여 데이터 ${bulkOps.length}건 저장 완료`,
      data: {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        total: bulkOps.length,
      },
    });
  } catch (error) {
    console.error('❌ [Payroll API] 급여 데이터 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '급여 데이터 저장 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

// ==========================================
// 월별 급여 데이터 조회
// ==========================================
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    console.log(`🔍 [Payroll API] 급여 데이터 조회: ${yearMonth}`);

    const payrolls = await Payroll.find({ yearMonth })
      .lean()
      .sort({ employeeId: 1 });

    console.log(`✅ [Payroll API] 조회 완료: ${payrolls.length}건`);

    if (payrolls.length > 0) {
      console.log(`📝 [Payroll API] 첫 번째 데이터:`, payrolls[0]);
    }

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length,
    });
  } catch (error) {
    console.error('❌ [Payroll API] 급여 데이터 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '급여 데이터 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

// ==========================================
// 특정 직원의 급여 내역 조회
// ==========================================
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, limit } = req.query;

    let query = { employeeId };
    if (year) {
      query.year = parseInt(year);
    }

    console.log(
      `🔍 [Payroll API] 직원 급여 조회: ${employeeId}, year: ${year || 'all'}`
    );

    const payrolls = await Payroll.find(query)
      .lean()
      .sort({ year: -1, month: -1 })
      .limit(limit ? parseInt(limit) : 12);

    console.log(`✅ [Payroll API] 조회 완료: ${payrolls.length}건`);

    res.json({
      success: true,
      data: payrolls,
      count: payrolls.length,
    });
  } catch (error) {
    console.error('❌ [Payroll API] 직원 급여 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 급여 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

// ==========================================
// 급여 생성 (단일)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const payroll = new Payroll(req.body);
    await payroll.save();
    console.log(`✅ [POST /payroll] 급여 생성: ${payroll.employeeId}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('payroll-created', {
        payrollId: payroll._id,
        employeeId: payroll.employeeId,
        year: payroll.year,
        month: payroll.month,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({ success: true, data: payroll });
  } catch (error) {
    console.error('❌ [POST /payroll] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 급여 수정
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!payroll) {
      return res.status(404).json({ success: false, error: '급여 정보를 찾을 수 없습니다.' });
    }
    console.log(`✅ [PUT /payroll/${req.params.id}] 급여 수정`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('payroll-updated', {
        payrollId: payroll._id,
        employeeId: payroll.employeeId,
        year: payroll.year,
        month: payroll.month,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('❌ [PUT /payroll] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 급여 삭제
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findByIdAndDelete(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, error: '급여 정보를 찾을 수 없습니다.' });
    }
    console.log(`✅ [DELETE /payroll/${req.params.id}] 급여 삭제`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('payroll-deleted', {
        payrollId: payroll._id,
        employeeId: payroll.employeeId,
        year: payroll.year,
        month: payroll.month,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: '급여 정보가 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ [DELETE /payroll] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
