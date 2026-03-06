const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const bcrypt = require('bcryptjs');

const {
  Employee,
  Attendance,
  AttendanceSummary,
  Leave,
  Payroll,
  Evaluation,
} = require('../models');

// YYYY-MM-DD 문자열을 한국 시간 기준 Date 객체로 변환
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  // moment-timezone을 사용하여 KST 기준 00:00:00으로 Date 객체 생성
  // DB에는 UTC로 저장되지만, KST로 읽을 때 정확한 날짜가 표시됨
  return moment.tz(dateStr, 'YYYY-MM-DD', 'Asia/Seoul').startOf('day').toDate();
};

// Date 객체를 YYYY-MM-DD 문자열로 변환 (로컬 시간대 기준)
const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ✅ 로그인 (직원 인증)
router.post('/login', async (req, res) => {
  try {
    const { id, password, versionInfo } = req.body;

    // 재직 중인 직원만 검색 (이름 또는 employeeId) - 우선순위 1순위
    const employee = await Employee.findOne({
      $or: [{ name: id }, { employeeId: id }],
      status: '재직', // 재직 중인 직원만 검색
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        error: '재직 중인 직원을 찾을 수 없습니다. 사번을 확인해주세요.',
      });
    }

    // 비밀번호 확인 (평문 비교)
    if (employee.password !== password) {
      return res.status(401).json({
        success: false,
        error: '비밀번호가 일치하지 않습니다.',
      });
    }

    console.log(`✅ [직원 로그인] ${employee.name} (${employee.employeeId})`);

    // ✅ 마지막 로그인 시간 업데이트 (KST 기준)
    employee.lastLogin = moment.tz('Asia/Seoul').toDate();

    // ✅ 앱 버전 정보 업데이트
    if (versionInfo) {
      employee.appVersion = versionInfo.version || 'Domain';
      employee.platformType = versionInfo.platformType || 'Domain';
      employee.platform = versionInfo.platform || 'web';
      employee.userAgent = versionInfo.userAgent || '';
      employee.lastVersionUpdate = new Date();

      console.log(
        `📱 [로그인] ${employee.name} - 버전: ${employee.appVersion}, 플랫폼: ${employee.platformType}`
      );
    }

    await employee.save();

    // 비밀번호 제외하고 응답 (id 필드를 employeeId로 매핑)
    const { password: _, ...employeeData } = employee.toObject();
    const responseData = {
      ...employeeData,
      id: employeeData.employeeId, // 프론트엔드와 일관성을 위해 id 필드 추가
      usedLeave: employeeData.leaveUsed || 0, // leaveUsed를 usedLeave로도 매핑
      isAdmin: false,
    };

    console.log('🔍 로그인 성공 - 반환 데이터:', {
      id: responseData.id,
      employeeId: responseData.employeeId,
      name: responseData.name,
      _id: responseData._id,
    });

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('❌ 로그인 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 선호 언어 저장
router.put('/employees/:employeeId/language', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { preferredLanguage } = req.body;
    if (!['ko', 'en'].includes(preferredLanguage)) {
      return res.status(400).json({ success: false, error: '유효하지 않은 언어 코드입니다.' });
    }
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { preferredLanguage },
      { new: true }
    );
    if (!employee) {
      return res.status(404).json({ success: false, error: '직원을 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 비밀번호 변경
router.put('/employees/:employeeId/password', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log(
      `🔐 [Employees API] 비밀번호 변경 요청: employeeId=${employeeId}`
    );

    // 직원 찾기
    const employee = await Employee.findOne({ employeeId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '직원을 찾을 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인 (평문 비교)
    if (employee.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        error: '현재 비밀번호가 일치하지 않습니다.',
      });
    }

    // 새 비밀번호 평문으로 저장
    employee.password = newPassword;
    employee.updatedAt = new Date();
    await employee.save();

    console.log(`✅ [Employees API] 비밀번호 변경 완료: ${employee.name}`);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    console.error('❌ [Employees API] 비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 변경 중 오류가 발생했습니다.',
    });
  }
});

// ✅ 직원 전체 조회
router.get('/employees', async (_, res) => {
  try {
    // ✅ 캐시 방지 헤더 설정 (강력 새로고침 시에도 최신 데이터 제공)
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    const employees = await Employee.find();
    // leaveUsed를 usedLeave로도 매핑 (프론트엔드 호환성)
    const employeesWithMapping = employees.map((emp) => {
      const empObj = emp.toObject();
      // ✅ leaveUsed 값이 있으면 그대로 사용, 없으면 0 (null/undefined 모두 처리)
      const leaveUsedValue =
        empObj.leaveUsed !== undefined && empObj.leaveUsed !== null
          ? empObj.leaveUsed
          : 0;

      empObj.usedLeave = leaveUsedValue;
      // leaveUsed도 그대로 유지 (양방향 호환성)
      empObj.leaveUsed = leaveUsedValue;

      return empObj;
    });

    console.log('🔍 [GET /hr/employees] 샘플 응답 데이터 (첫 번째 직원):');
    if (employeesWithMapping.length > 0) {
      const sample = employeesWithMapping[0];
      console.log(`  - employeeId: ${sample.employeeId}`);
      console.log(`  - name: ${sample.name}`);
      console.log(
        `  - leaveUsed: ${sample.leaveUsed} (타입: ${typeof sample.leaveUsed})`
      );
      console.log(
        `  - usedLeave: ${sample.usedLeave} (타입: ${typeof sample.usedLeave})`
      );
    }

    // 일관성있는 API 응답 형식 사용
    res.json({ success: true, data: employeesWithMapping });
  } catch (error) {
    console.error('❌ 직원 조회 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 정보 수정
router.put('/employees/:id', async (req, res) => {
  try {
    console.log('📥 직원 정보 수정 요청:', {
      'req.params.id': req.params.id,
      'req.params.id 타입': typeof req.params.id,
      'req.params.id 길이': req.params.id?.length,
      'ObjectId 형식인가?': mongoose.Types.ObjectId.isValid(req.params.id),
      body: req.body,
      hasPassword: !!req.body.password,
      passwordValue: req.body.password
        ? '***' + req.body.password.slice(-4)
        : 'none',
    });

    // 날짜 문자열을 KST Date로 변환
    if (req.body.joinDate && typeof req.body.joinDate === 'string') {
      req.body.joinDate = parseDateString(req.body.joinDate);
    }
    if (req.body.leaveDate && typeof req.body.leaveDate === 'string') {
      req.body.leaveDate = parseDateString(req.body.leaveDate);
    }

    // 비밀번호는 평문으로 저장 (해싱하지 않음)
    // if (req.body.password) {
    //   req.body.password = await bcrypt.hash(req.body.password, 10);
    // }

    // usedLeave를 leaveUsed로 변환 (프론트엔드 호환성)
    if (req.body.usedLeave !== undefined) {
      req.body.leaveUsed = req.body.usedLeave;
      delete req.body.usedLeave;
    }

    // findOneAndUpdate를 사용하여 직접 업데이트
    // MongoDB _id 또는 employeeId로 조회
    let query;
    if (
      mongoose.Types.ObjectId.isValid(req.params.id) &&
      req.params.id.length === 24
    ) {
      // MongoDB ObjectId 형식인 경우
      query = { _id: req.params.id };
    } else {
      // employeeId 형식인 경우
      query = { employeeId: req.params.id };
    }

    const employee = await Employee.findOneAndUpdate(query, req.body, {
      new: true, // 업데이트된 문서 반환
      runValidators: true, // 스키마 검증 실행
    });

    if (!employee) {
      console.error('❌ 직원을 찾을 수 없음. 조회 조건:', query);
      // 디버깅: 실제 DB에 있는 직원 ID 목록 출력
      const allEmployees = await Employee.find({})
        .select('employeeId _id')
        .limit(5);
      console.log(
        '💡 DB의 직원 샘플 (최대 5명):',
        allEmployees.map((e) => ({
          employeeId: e.employeeId,
          _id: e._id.toString(),
        }))
      );

      return res
        .status(404)
        .json({ success: false, error: '직원을 찾을 수 없습니다.' });
    }

    console.log('✅ 직원 정보 수정 완료:', employee.employeeId);

    // leaveUsed를 usedLeave로도 매핑 (프론트엔드 호환성)
    const employeeObj = employee.toObject();
    employeeObj.usedLeave = employeeObj.leaveUsed || 0;

    res.json({ success: true, data: employeeObj });
  } catch (error) {
    console.error('❌ 직원 정보 수정 실패:', error.message);
    console.error('❌ 전체 에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 등록
router.post('/employees', async (req, res) => {
  try {
    // 날짜 문자열을 KST Date로 변환
    if (req.body.joinDate && typeof req.body.joinDate === 'string') {
      req.body.joinDate = parseDateString(req.body.joinDate);
    }
    if (req.body.leaveDate && typeof req.body.leaveDate === 'string') {
      req.body.leaveDate = parseDateString(req.body.leaveDate);
    }

    // 비밀번호는 평문으로 저장 (해싱하지 않음)
    // if (req.body.password) {
    //   req.body.password = await bcrypt.hash(req.body.password, 10);
    // }

    const employee = new Employee(req.body);

    await employee.save();

    // leaveUsed를 usedLeave로도 매핑 (프론트엔드 호환성)
    const employeeObj = employee.toObject();
    employeeObj.usedLeave = employeeObj.leaveUsed || 0;

    res.json({ success: true, data: employeeObj });
  } catch (error) {
    console.error('❌ 직원 등록 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 퇴사 처리 (Soft Delete - 상태만 '퇴사'로 변경, 데이터 보존)
router.delete('/employees/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    console.log('📤 직원 퇴사 처리 요청:', employeeId);

    // 직원 상태를 '퇴사'로 변경 (데이터는 보존)
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      {
        status: '퇴사',
        leaveDate: new Date(), // 퇴사일 자동 기록
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, error: '직원을 찾을 수 없습니다.' });
    }

    console.log('✅ 직원 퇴사 처리 완료 (데이터 보존):', employeeId);
    console.log(`   - 이름: ${employee.name}, 퇴사일: ${employee.leaveDate}`);

    // leaveUsed를 usedLeave로도 매핑 (프론트엔드 호환성)
    const employeeObj = employee.toObject();
    employeeObj.usedLeave = employeeObj.leaveUsed || 0;

    res.json({
      success: true,
      data: employeeObj,
      message: '퇴사 처리되었습니다. 데이터는 보존됩니다.',
    });
  } catch (error) {
    console.error('❌ 직원 퇴사 처리 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 근태 조회
router.get('/attendance/:date', async (req, res) => {
  const data = await Attendance.find({ date: req.params.date });
  res.json(data);
});

// ✅ 근태 등록/수정
router.post('/attendance', async (req, res) => {
  const { employeeId, date } = req.body;
  await Attendance.findOneAndUpdate({ employeeId, date }, req.body, {
    upsert: true,
  });
  res.json({ success: true });
});

// ✅ 근태 대량 저장
router.post('/attendance/bulk', async (req, res) => {
  try {
    const { records, year, month } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: '저장할 데이터가 없습니다.',
      });
    }

    console.log(
      `[근태 대량 저장] ${year}년 ${month}월 데이터 ${records.length}건 저장 시작`
    );

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // 각 레코드를 upsert (존재하면 업데이트, 없으면 삽입)
    for (const record of records) {
      try {
        const { employeeId, date, checkIn, checkOut, shiftType, leaveType } =
          record;

        // 필수 필드 검증
        if (!employeeId || !date) {
          console.warn('[근태 대량 저장] 필수 필드 누락:', record);
          errors++;
          continue;
        }

        const result = await Attendance.findOneAndUpdate(
          { employeeId, date },
          {
            employeeId,
            date,
            checkIn: checkIn || null,
            checkOut: checkOut || null,
            shiftType: shiftType || null,
            leaveType: leaveType || null,
          },
          { upsert: true, new: true }
        );

        if (result.isNew) {
          inserted++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error('[근태 대량 저장] 레코드 저장 실패:', error.message);
        errors++;
      }
    }

    console.log(
      `[근태 대량 저장] 완료 - 저장: ${inserted}건, 수정: ${updated}건, 실패: ${errors}건`
    );

    res.json({
      success: true,
      message: '근태 데이터가 저장되었습니다.',
      stats: {
        inserted,
        updated,
        errors,
      },
    });
  } catch (error) {
    console.error('[근태 대량 저장] 에러:', error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ✅ 연차 내역
router.get('/leaves', async (_, res) =>
  res.json(await Leave.find().sort({ requestDate: -1 }))
);

// ✅ 연차 신청
router.post('/leaves', async (req, res) => {
  try {
    console.log('📥 연차 신청 요청 받음:', JSON.stringify(req.body, null, 2));

    // 직원 정보 조회 (비정규화를 위해)
    const employee = await Employee.findOne({
      employeeId: req.body.employeeId,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '직원 정보를 찾을 수 없습니다.',
      });
    }

    const leaveData = {
      ...req.body,
      employeeName: employee.name,
      department: employee.department,
      position: employee.position,
      requestDate: new Date(), // 현재 한국 시간(KST)으로 신청일 기록
      startDate: parseDateString(req.body.startDate), // YYYY-MM-DD를 KST Date로 변환
      endDate: parseDateString(req.body.endDate), // YYYY-MM-DD를 KST Date로 변환
      // requestedDays는 프론트엔드에서 계산해서 보내거나, 여기서 계산
      requestedDays:
        req.body.requestedDays ||
        calculateLeaveDays(req.body.startDate, req.body.endDate, req.body.type),
    };

    // 날짜 검증 로그 (상세)
    console.log('📅 CREATE 날짜 검증 상세:', {
      '요청 startDate': req.body.startDate,
      '요청 endDate': req.body.endDate,
      '파싱된 startDate': leaveData.startDate,
      '파싱된 endDate': leaveData.endDate,
      'startDate 타입': typeof leaveData.startDate,
      'endDate 타입': typeof leaveData.endDate,
      'startDate getTime': leaveData.startDate?.getTime(),
      'endDate getTime': leaveData.endDate?.getTime(),
      '비교 결과 (endDate >= startDate)':
        leaveData.endDate >= leaveData.startDate,
    });

    // 종료일이 시작일보다 이전인 경우 명시적으로 검증
    if (leaveData.endDate < leaveData.startDate) {
      console.error('❌ CREATE 날짜 검증 실패: 종료일이 시작일보다 앞섬');
      return res.status(400).json({
        success: false,
        error: '종료일은 시작일 이후여야 합니다',
      });
    }

    const leave = new Leave(leaveData);
    console.log(
      '💾 저장할 Leave 객체:',
      JSON.stringify(leave.toObject(), null, 2)
    );

    await leave.save();
    console.log('✅ Leave 저장 완료:', leave._id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('leave-created', {
        leaveId: leave._id,
        employeeName: leave.employeeName,
        leaveType: leave.leaveType,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ Leave 저장 실패:', error.message);

    // Mongoose validation 에러 처리
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// 연차 일수 계산 헬퍼 함수
const calculateLeaveDays = (startDate, endDate, type) => {
  // 반차: 0.5일
  if (type && type.includes('반차')) {
    return 0.5;
  }

  // 경조, 공가, 휴직: 연차 미차감 (0일)
  if (
    type === '경조' ||
    type === '경조사' ||
    type === '공가' ||
    type === '휴직'
  ) {
    return 0;
  }

  // 외출, 조퇴, 결근, 기타: 1일 고정
  if (
    type === '외출' ||
    type === '조퇴' ||
    type === '결근' ||
    type === '기타' ||
    type === '병가' ||
    type === '특별휴가'
  ) {
    return 1;
  }

  // 연차: 실제 사용일수 계산
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return days;
};

// ✅ 연차 내용 수정 (직원용)
router.put('/leaves/:id', async (req, res) => {
  try {
    console.log('========================================');
    console.log('📥 연차 수정 요청 시작');
    console.log('leaveId:', req.params.id);
    console.log('req.body 전체:', JSON.stringify(req.body, null, 2));
    console.log('req.body.startDate:', req.body.startDate);
    console.log('req.body.endDate:', req.body.endDate);
    console.log('========================================');

    // ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.error('❌ 유효하지 않은 ObjectId:', req.params.id);
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 연차 ID입니다.',
      });
    }

    const existingLeave = await Leave.findById(req.params.id);
    if (!existingLeave) {
      console.error('❌ 연차를 찾을 수 없음:', req.params.id);
      return res.status(404).json({
        success: false,
        error: '연차 신청을 찾을 수 없습니다.',
      });
    }

    // 관리자는 모든 상태의 연차 수정 가능
    // (직원은 '대기' 상태만 수정 가능하지만, 이 API는 관리자용으로도 사용됨)
    console.log('✅ 연차 수정 가능 - 현재 상태:', existingLeave.status);

    // 날짜 파싱
    let parsedStartDate = existingLeave.startDate;
    let parsedEndDate = existingLeave.endDate;

    if (req.body.startDate) {
      parsedStartDate = parseDateString(req.body.startDate);
      console.log('✅ startDate 파싱됨:', parsedStartDate);
    } else {
      console.log('⚠️ req.body.startDate 없음, 기존값 사용:', parsedStartDate);
    }

    if (req.body.endDate) {
      parsedEndDate = parseDateString(req.body.endDate);
      console.log('✅ endDate 파싱됨:', parsedEndDate);
    } else {
      console.log('⚠️ req.body.endDate 없음, 기존값 사용:', parsedEndDate);
    }

    const updateData = {
      ...req.body,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };

    // 날짜 검증 로그 (상세)
    console.log('📅 최종 updateData:', {
      startDate: updateData.startDate,
      endDate: updateData.endDate,
      type: updateData.type,
      reason: updateData.reason,
      contact: updateData.contact,
    });

    // 날짜 유효성 검사
    if (!updateData.startDate || !updateData.endDate) {
      console.error('❌ 날짜가 null 또는 undefined');
      return res.status(400).json({
        success: false,
        error: '시작일과 종료일은 필수입니다',
      });
    }

    // 날짜 비교
    const startTime = new Date(updateData.startDate).getTime();
    const endTime = new Date(updateData.endDate).getTime();

    console.log('🔍 날짜 비교:', {
      startTime,
      endTime,
      diff: endTime - startTime,
      isValid: endTime >= startTime,
    });

    // 종료일이 시작일보다 이전인 경우 명시적으로 검증
    if (endTime < startTime) {
      console.error('❌ 날짜 검증 실패: 종료일이 시작일보다 앞섬');
      return res.status(400).json({
        success: false,
        error: '종료일은 시작일 이후여야 합니다',
      });
    }

    console.log('✅ 날짜 검증 통과');

    // requestedDays 재계산
    if (updateData.startDate && updateData.endDate && updateData.type) {
      if (updateData.type.includes('반차')) {
        updateData.requestedDays = 0.5;
      } else if (
        updateData.type === '경조' ||
        updateData.type === '경조사' ||
        updateData.type === '공가' ||
        updateData.type === '휴직'
      ) {
        // 경조, 공가, 휴직: 연차 미차감 (0일)
        updateData.requestedDays = 0;
      } else if (
        updateData.type === '외출' ||
        updateData.type === '조퇴' ||
        updateData.type === '결근' ||
        updateData.type === '기타' ||
        updateData.type === '병가' ||
        updateData.type === '특별휴가'
      ) {
        // 외출, 조퇴, 결근, 기타: 1일 고정
        updateData.requestedDays = 1;
      } else {
        // 연차: 실제 사용일수 계산
        const start = new Date(updateData.startDate);
        const end = new Date(updateData.endDate);
        updateData.requestedDays =
          Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // 변경 이력 추가
    if (!existingLeave.history) {
      existingLeave.history = [];
    }
    existingLeave.history.push({
      status: '수정',
      changedBy: existingLeave.employeeId,
      changedByName: existingLeave.employeeName,
      changedAt: new Date(),
      comment: '직원이 연차 내용을 수정함',
    });
    updateData.history = existingLeave.history;

    const leave = await Leave.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    console.log('✅ 연차 수정 완료:', leave);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('leave-updated', {
        leaveId: leave._id,
        employeeName: leave.employeeName,
        leaveType: leave.leaveType,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ 연차 수정 실패:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', '),
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 연차 상태 변경 (승인/거절)
router.put('/leaves/:id/status', async (req, res) => {
  try {
    console.log('📥 연차 상태 변경 요청:', {
      leaveId: req.params.id,
      body: req.body,
    });

    const { status, approvedBy, approverName, rejectionReason } = req.body;

    // 기존 연차 정보 조회
    const existingLeave = await Leave.findById(req.params.id);
    if (!existingLeave) {
      return res.status(404).json({
        success: false,
        error: '연차 신청을 찾을 수 없습니다.',
      });
    }

    const updateData = {
      status,
    };

    // 승인 처리
    if (status === '승인') {
      updateData.approver = approvedBy;
      updateData.approverName = approverName;
      updateData.approvedAt = new Date();
      updateData.approvedDays = existingLeave.requestedDays; // 신청 일수를 그대로 승인

      // 변경 이력 추가
      if (!existingLeave.history) {
        existingLeave.history = [];
      }
      existingLeave.history.push({
        status: '승인',
        changedBy: approvedBy,
        changedByName: approverName,
        changedAt: new Date(),
        comment: '연차 승인',
      });
    }

    // 반려 처리
    if (status === '반려') {
      updateData.rejectedBy = approvedBy;
      updateData.rejectedByName = approverName;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason || '관리자에 의해 반려됨';

      // 변경 이력 추가
      if (!existingLeave.history) {
        existingLeave.history = [];
      }
      existingLeave.history.push({
        status: '반려',
        changedBy: approvedBy,
        changedByName: approverName,
        changedAt: new Date(),
        comment: rejectionReason || '관리자에 의해 반려됨',
      });
    }

    // 취소 처리
    if (status === '취소') {
      // 변경 이력 추가
      if (!existingLeave.history) {
        existingLeave.history = [];
      }
      existingLeave.history.push({
        status: '취소',
        changedBy: existingLeave.employeeId,
        changedByName: existingLeave.employeeName,
        changedAt: new Date(),
        comment: '직원에 의해 취소됨',
      });
    }

    // history 업데이트
    if (existingLeave.history && existingLeave.history.length > 0) {
      updateData.history = existingLeave.history;
    }

    const leave = await Leave.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    console.log('✅ 연차 상태 변경 완료:', leave);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('leave-status-changed', {
        leaveId: leave._id,
        employeeName: leave.employeeName,
        status: leave.status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error('❌ 연차 상태 변경 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 급여 내역 (월별)
router.get('/payrolls/:ym', async (req, res) => {
  const data = await Payroll.find({ yearMonth: req.params.ym });
  res.json(data);
});

// ============================================================
// 평가 관리 API
// ============================================================

// ✅ 평가 전체 조회
router.get('/evaluations', async (req, res) => {
  try {
    const evaluations = await Evaluation.find().sort({
      year: -1,
      createdAt: -1,
    });
    console.log(`✅ [GET /evaluations] 평가 ${evaluations.length}건 조회`);
    res.json(evaluations);
  } catch (error) {
    console.error('❌ [GET /evaluations] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 평가 생성
router.post('/evaluations', async (req, res) => {
  try {
    const { year, employeeId, name, department, grade, content, status } =
      req.body;

    // 필수 필드 검증
    if (!year || !employeeId || !name || !department || !grade || !content) {
      return res.status(400).json({
        success: false,
        error: '모든 필수 항목을 입력해주세요.',
      });
    }

    // 중복 체크 (동일 연도 + 동일 직원)
    const existing = await Evaluation.findOne({ year, employeeId });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `${name}님의 ${year}년도 평가가 이미 존재합니다.`,
      });
    }

    const evaluation = await Evaluation.create({
      year,
      employeeId,
      name,
      department,
      grade,
      content,
      status: status || '예정',
    });

    console.log(
      `✅ [POST /evaluations] 평가 생성: ${year}년 ${name} (${grade}등급)`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('evaluation-created', {
        evaluationId: evaluation._id,
        employeeId: evaluation.employeeId,
        name: evaluation.name,
        year: evaluation.year,
        grade: evaluation.grade,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('❌ [POST /evaluations] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 평가 수정
router.put('/evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { year, employeeId, grade, content, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 평가 ID입니다.',
      });
    }

    // 평가 찾기
    const evaluation = await Evaluation.findById(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: '해당 평가를 찾을 수 없습니다.',
      });
    }

    // 연도나 직원ID 변경 시 중복 체크
    if (
      (year && year !== evaluation.year) ||
      (employeeId && employeeId !== evaluation.employeeId)
    ) {
      const duplicate = await Evaluation.findOne({
        year: year || evaluation.year,
        employeeId: employeeId || evaluation.employeeId,
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: `${evaluation.name}님의 ${
            year || evaluation.year
          }년도 평가가 이미 존재합니다.`,
        });
      }
    }

    // 업데이트할 필드만 적용
    const updateData = { updatedAt: Date.now() };
    if (year) updateData.year = year;
    if (employeeId) updateData.employeeId = employeeId;
    if (grade) updateData.grade = grade;
    if (content) updateData.content = content;
    if (status) updateData.status = status;

    const updated = await Evaluation.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    console.log(
      `✅ [PUT /evaluations/${id}] 평가 수정: ${updated.year}년 ${updated.name}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('evaluation-updated', {
        evaluationId: updated._id,
        employeeId: updated.employeeId,
        name: updated.name,
        year: updated.year,
        grade: updated.grade,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ [PUT /evaluations] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 평가 삭제
router.delete('/evaluations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: '올바르지 않은 평가 ID입니다.',
      });
    }

    const evaluation = await Evaluation.findByIdAndDelete(id);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: '해당 평가를 찾을 수 없습니다.',
      });
    }

    console.log(
      `✅ [DELETE /evaluations/${id}] 평가 삭제: ${evaluation.year}년 ${evaluation.name}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('evaluation-deleted', {
        evaluationId: evaluation._id,
        employeeId: evaluation.employeeId,
        name: evaluation.name,
        year: evaluation.year,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: evaluation });
  } catch (error) {
    console.error('❌ [DELETE /evaluations] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 근무형태 자동 분석 및 업데이트
router.post('/analyze-work-type', async (req, res) => {
  try {
    const { year, month, employeeId } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: '년도와 월이 필요합니다.',
      });
    }

    const targetInfo = employeeId ? `직원 ${employeeId}` : '모든 직원';
    console.log(
      `🔍 [근무형태 분석] ${year}년 ${month}월 ${targetInfo} 시작...`
    );

    // 1. 해당 월의 근태 데이터 조회 (employeeId가 있으면 특정 직원만)
    const query = {
      year: parseInt(year),
      month: parseInt(month),
      checkIn: { $exists: true, $ne: null },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendances = await Attendance.find(query);

    console.log(
      `📊 [근무형태 분석] 근태 데이터 ${attendances.length}건 조회 (${targetInfo})`
    );

    // 2. 직원별로 그룹화
    const employeeAttendance = {};
    attendances.forEach((att) => {
      const empId = att.employeeId;
      if (!employeeAttendance[empId]) {
        employeeAttendance[empId] = [];
      }
      employeeAttendance[empId].push(att.checkIn);
    });

    // 3. 각 직원의 근무형태 분석
    const updates = [];
    for (const [employeeId, checkInTimes] of Object.entries(
      employeeAttendance
    )) {
      let dayShiftCount = 0;
      let nightShiftCount = 0;

      checkInTimes.forEach((checkInTime) => {
        if (!checkInTime) return;

        // 시간 추출 (HH:MM 형식)
        let hour, minute;
        if (typeof checkInTime === 'string') {
          // "08:30" 형식
          const parts = checkInTime.split(':');
          hour = parseInt(parts[0]);
          minute = parseInt(parts[1] || 0);
        } else if (checkInTime instanceof Date) {
          // Date 객체
          hour = checkInTime.getHours();
          minute = checkInTime.getMinutes();
        } else {
          return;
        }

        const totalMinutes = hour * 60 + minute;

        // 주간: 04:00(240분) ~ 17:30(1050분)
        // 야간: 17:30 ~ 04:00
        if (totalMinutes >= 240 && totalMinutes <= 1050) {
          dayShiftCount++;
        } else {
          nightShiftCount++;
        }
      });

      // 근무형태 결정
      let workType;
      if (dayShiftCount > 0 && nightShiftCount > 0) {
        workType = '주간/야간'; // 하루라도 섞이면 시프터
      } else if (dayShiftCount > 0) {
        workType = '주간';
      } else if (nightShiftCount > 0) {
        workType = '야간';
      } else {
        continue; // 데이터 없으면 업데이트 안 함
      }

      updates.push({ employeeId, workType });
    }

    // 4. DB 업데이트
    let updatedCount = 0;
    for (const update of updates) {
      const result = await Employee.findOneAndUpdate(
        { employeeId: update.employeeId },
        { workType: update.workType },
        { new: true }
      );
      if (result) {
        updatedCount++;
        console.log(
          `✅ [근무형태 분석] ${update.employeeId}: ${update.workType}`
        );
      }
    }

    console.log(
      `✅ [근무형태 분석] 완료: ${updatedCount}명 업데이트 (전체 ${
        Object.keys(employeeAttendance).length
      }명 중)`
    );

    // Socket.io 이벤트 발생
    if (req.app.locals.io) {
      req.app.locals.io.emit('work-type-analyzed', {
        year,
        month,
        updatedCount,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `${updatedCount}명의 근무형태가 분석되었습니다.`,
      updatedCount,
      totalEmployees: Object.keys(employeeAttendance).length,
    });
  } catch (error) {
    console.error('❌ [근무형태 분석] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ leaveUsed 필드 마이그레이션 (한 번만 실행)
router.post('/migrate-usedleave', async (req, res) => {
  try {
    console.log('🔄 leaveUsed 데이터 마이그레이션 시작...');

    // 모든 직원 조회
    const employees = await Employee.find({});
    console.log(`📊 총 ${employees.length}명의 직원 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      // leaveUsed 필드가 없거나 undefined인 경우에만 업데이트
      if (emp.leaveUsed === undefined || emp.leaveUsed === null) {
        // annualLeave.used 값이 있으면 leaveUsed로 복사, 없으면 0
        emp.leaveUsed = emp.annualLeave?.used || 0;
        await emp.save();
        console.log(
          `✅ ${emp.name} (${emp.employeeId}): leaveUsed = ${emp.leaveUsed}`
        );
        updatedCount++;
      } else {
        console.log(
          `⏭️  ${emp.name} (${emp.employeeId}): 이미 leaveUsed 있음 (${emp.leaveUsed})`
        );
        skippedCount++;
      }
    }

    console.log('✅ 마이그레이션 완료!');
    res.json({
      success: true,
      message: 'leaveUsed 필드 마이그레이션 완료',
      updatedCount,
      skippedCount,
      totalEmployees: employees.length,
    });
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// contractType 필드 추가 마이그레이션 (모든 직원에게 '정규직' 기본값 설정)
// ============================================================
router.post('/migrate-contract-type', async (req, res) => {
  try {
    console.log('🔧 [마이그레이션] contractType 필드 추가 시작...');

    const employees = await Employee.find({});
    console.log(`   총 ${employees.length}명의 직원 발견`);

    // contractType이 없는 직원만 업데이트
    const result = await Employee.updateMany(
      { contractType: { $exists: false } },
      { $set: { contractType: '정규직' } }
    );

    // contractType이 null이거나 빈 문자열인 경우도 업데이트
    const result2 = await Employee.updateMany(
      { $or: [{ contractType: null }, { contractType: '' }] },
      { $set: { contractType: '정규직' } }
    );

    const totalUpdated = result.modifiedCount + result2.modifiedCount;

    console.log(`✅ [마이그레이션] 완료: ${totalUpdated}명 업데이트됨`);

    res.json({
      success: true,
      message: 'contractType 필드 마이그레이션 완료',
      updatedCount: totalUpdated,
      totalEmployees: employees.length,
    });
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// contractType 텍스트 변경 마이그레이션 ('정규직' -> '정규' 등)
// ============================================================
router.post('/migrate-contract-type-text', async (req, res) => {
  try {
    console.log('🔧 [마이그레이션] contractType 텍스트 변경 시작...');

    const employees = await Employee.find({});
    console.log(`   총 ${employees.length}명의 직원 발견`);

    // '정규직' -> '정규'
    const result1 = await Employee.updateMany(
      { contractType: '정규직' },
      { $set: { contractType: '정규' } }
    );

    // '계약직' -> '계약'
    const result2 = await Employee.updateMany(
      { contractType: '계약직' },
      { $set: { contractType: '계약' } }
    );

    // '촉탁직' -> '촉탁'
    const result3 = await Employee.updateMany(
      { contractType: '촉탁직' },
      { $set: { contractType: '촉탁' } }
    );

    const totalUpdated =
      result1.modifiedCount + result2.modifiedCount + result3.modifiedCount;

    console.log(`✅ [마이그레이션] 완료: ${totalUpdated}명 업데이트됨`);
    console.log(`   - 정규직 -> 정규: ${result1.modifiedCount}명`);
    console.log(`   - 계약직 -> 계약: ${result2.modifiedCount}명`);
    console.log(`   - 촉탁직 -> 촉탁: ${result3.modifiedCount}명`);

    res.json({
      success: true,
      message: 'contractType 텍스트 변경 마이그레이션 완료',
      updatedCount: totalUpdated,
      totalEmployees: employees.length,
      details: {
        regular: result1.modifiedCount,
        contract: result2.modifiedCount,
        temporary: result3.modifiedCount,
      },
    });
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
