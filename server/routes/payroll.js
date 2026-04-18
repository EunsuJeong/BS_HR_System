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
    const uploadErrors = []; // 파싱 에러 수집

    // alias 기반 안전 필드 읽기: 0도 정상값으로 처리 (|| 연산자 버그 방지)
    const getField = (record, ...aliases) => {
      for (const alias of aliases) {
        if (record[alias] !== undefined) return record[alias];
      }
      return undefined;
    };

    // 숫자 파싱: 실패 시 null 반환 (0과 구분)
    const parseNumber = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[,원]/g, '').trim();
        if (cleaned === '' || cleaned === '-') return undefined; // 빈 값/대시 → 미입력
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed; // null = 파싱 실패
      }
      return undefined; // null/undefined 입력 → 미입력
    };

    // 필수 컬럼 헤더 검증 (첫 번째 레코드 기준)
    const REQUIRED_COLUMNS = [
      { field: 'employeeId', aliases: ['employeeId', '사번'] },
      { field: 'netSalary',  aliases: ['netSalary',  '차인지급액'] },
      { field: 'totalSalary', aliases: ['totalSalary', '급여합계'] },
    ];
    const firstRecord = records[0];
    const missingColumns = REQUIRED_COLUMNS.filter(
      ({ aliases }) => !aliases.some((a) => firstRecord[a] !== undefined)
    );
    if (missingColumns.length > 0) {
      return res.status(400).json({
        success: false,
        message: `필수 컬럼 누락: ${missingColumns.map((c) => c.aliases.join(' 또는 ')).join(', ')}`,
      });
    }

    let rowIdx = 0;
    for (const record of records) {
      rowIdx++;
      const empId = getField(record, 'employeeId', '사번');
      if (!empId) {
        console.warn(`⚠️ ${rowIdx}행: employeeId 없음, 스킵`);
        continue;
      }

      const rowErrors = [];

      // 필드 파싱 헬퍼: aliases 배열로 값을 찾고, 파싱 실패 시 에러 수집
      // required=true 이면 필드 없음/파싱 실패 모두 에러로 기록 → 해당 행 저장 금지
      const pf = (aliases, fieldName, required = false) => {
        const raw = getField(record, ...aliases);
        if (raw === undefined) {
          if (required) {
            rowErrors.push({ field: fieldName, raw: undefined, reason: '필드 없음', required: true });
          }
          return 0;
        }
        const result = parseNumber(raw);
        if (result === null) {
          rowErrors.push({ field: fieldName, raw, reason: 'NaN 변환 실패', required });
          return 0;
        }
        return result ?? 0; // undefined(빈값) → 0
      };

      const payrollData = {
        employeeId: empId,
        year: parseInt(year),
        month: parseInt(month),
        yearMonth,

        // 직원 정보
        name:       getField(record, 'name', '성명')       || '',
        department: getField(record, 'department', '부서')  || '',
        position:   getField(record, 'position', '직급')    || '',
        joinDate:   getField(record, 'joinDate', '입사일자') || '',

        // 기본 급여
        hourlyWage: pf(['hourlyWage', '시급'],         'hourlyWage'),
        basicHours: pf(['basicHours', '기본시간'],      'basicHours'),
        basicPay:   pf(['basicPay',   '기본급'],        'basicPay', true),

        // 근무 시간 및 수당
        overtimeHours:    pf(['overtimeHours',    '연장시간'],   'overtimeHours'),
        overtimePay:      pf(['overtimePay',      '연장수당'],   'overtimePay'),
        holidayWorkHours: pf(['holidayWorkHours', '휴일근로시간'], 'holidayWorkHours'),
        holidayWorkPay:   pf(['holidayWorkPay',   '휴일근로수당'], 'holidayWorkPay'),
        nightWorkHours:   pf(['nightWorkHours',   '야간근로시간'], 'nightWorkHours'),
        nightWorkPay:     pf(['nightWorkPay',     '야간근로수당'], 'nightWorkPay'),

        // 공제 항목
        lateEarlyHours:      pf(['lateEarlyHours',      '지각조퇴시간'], 'lateEarlyHours'),
        lateEarlyDeduction:  pf(['lateEarlyDeduction',  '지각조퇴공제'], 'lateEarlyDeduction'),
        absentDays:          pf(['absentDays',           '결근일수'],     'absentDays'),
        absentDeduction:     pf(['absentDeduction',      '결근공제'],     'absentDeduction'),

        // 수당
        carAllowance:       pf(['carAllowance',       '차량수당', '차량'], 'carAllowance'),
        transportAllowance: pf(['transportAllowance', '교통비'],           'transportAllowance'),
        phoneAllowance:     pf(['phoneAllowance',     '통신비'],           'phoneAllowance'),
        otherAllowance:     pf(['otherAllowance',     '기타수당'],         'otherAllowance'),
        annualLeaveDays:    pf(['annualLeaveDays',    '년차일수'],         'annualLeaveDays'),
        annualLeavePay:     pf(['annualLeavePay',     '년차수당'],         'annualLeavePay'),
        bonus:              pf(['bonus',              '상여금'],           'bonus'),

        // 급여 합계
        totalSalary: pf(['totalSalary', '급여합계'], 'totalSalary', true),

        // 세금 및 보험
        incomeTax:            pf(['incomeTax',            '소득세'],   'incomeTax'),
        localTax:             pf(['localTax',             '지방세'],   'localTax'),
        nationalPension:      pf(['nationalPension',      '국민연금'], 'nationalPension'),
        healthInsurance:      pf(['healthInsurance',      '건강보험'], 'healthInsurance'),
        longTermCare:         pf(['longTermCare',         '장기요양'], 'longTermCare'),
        employmentInsurance:  pf(['employmentInsurance',  '고용보험'], 'employmentInsurance'),

        // 기타 공제
        advanceDeduction: pf(['advanceDeduction', '가불금과태료'],    'advanceDeduction'),
        irpMatching:      pf(['irpMatching',      '매칭IRP적립'],     'irpMatching'),
        otherDeduction:   pf(['otherDeduction',   '경조비기타공제'],  'otherDeduction'),
        dormitory:        pf(['dormitory',        '기숙사'],          'dormitory'),

        // 연말정산
        healthYearEnd:    pf(['healthYearEnd',    '건강보험연말정산'],  'healthYearEnd'),
        longTermYearEnd:  pf(['longTermYearEnd',  '장기요양연말정산'],  'longTermYearEnd'),
        taxYearEnd:       pf(['taxYearEnd',       '연말정산징수세액'],  'taxYearEnd'),

        // 최종 금액
        totalDeduction: pf(['totalDeduction', '공제합계'],  'totalDeduction', true),
        netSalary:      pf(['netSalary',      '차인지급액'], 'netSalary',      true),

        lastModified: new Date(),
      };

      // 필수 필드 파싱 실패 시 해당 행 저장 금지
      const hasRequiredError = rowErrors.some((e) => e.required);
      if (rowErrors.length > 0) {
        uploadErrors.push({
          row: rowIdx,
          employeeId: empId,
          skipped: hasRequiredError,
          errors: rowErrors,
        });
        console.warn(`⚠️ [Payroll] ${rowIdx}행(${empId}) 파싱 오류:`, rowErrors);
      }
      if (hasRequiredError) continue; // 필수 필드 실패 → bulkOps 제외

      bulkOps.push({
        updateOne: {
          filter: { employeeId: payrollData.employeeId, yearMonth },
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
        parseErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
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

    // console.log(`🔍 [Payroll API] 급여 데이터 조회: ${yearMonth}`);

    const payrolls = await Payroll.find({ yearMonth })
      .lean()
      .sort({ employeeId: 1 });

    // console.log(`✅ [Payroll API] 조회 완료: ${payrolls.length}건`);

    // if (payrolls.length > 0) {
    //   console.log(`📝 [Payroll API] 첫 번째 데이터:`, payrolls[0]);
    // }

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

    // console.log(
    //   `🔍 [Payroll API] 직원 급여 조회: ${employeeId}, year: ${year || 'all'}`
    // );

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
