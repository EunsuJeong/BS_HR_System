const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const moment = require('moment-timezone');

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
  return moment.tz(dateStr, "YYYY-MM-DD", "Asia/Seoul").startOf("day").toDate();
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
    const { id, password } = req.body;

    // 직원 이름 또는 employeeId로 검색
    const employee = await Employee.findOne({
      $or: [{ name: id }, { employeeId: id }],
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        error: '아이디를 찾을 수 없습니다.',
      });
    }

    // 비밀번호 확인
    if (employee.password !== password) {
      return res.status(401).json({
        success: false,
        error: '비밀번호가 일치하지 않습니다.',
      });
    }

    // 퇴사자 확인
    if (employee.status === '퇴사') {
      return res.status(403).json({
        success: false,
        error: '퇴사한 직원은 로그인할 수 없습니다.',
      });
    }

    // 비밀번호 제외하고 응답 (id 필드를 employeeId로 매핑)
    const { password: _, ...employeeData } = employee.toObject();
    const responseData = {
      ...employeeData,
      id: employeeData.employeeId, // 프론트엔드와 일관성을 위해 id 필드 추가
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

// ✅ 직원 비밀번호 변경
router.put('/employees/:employeeId/password', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log(`🔐 [Employees API] 비밀번호 변경 요청: employeeId=${employeeId}`);

    // 직원 찾기
    const employee = await Employee.findOne({ employeeId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: '직원을 찾을 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인
    if (employee.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        error: '현재 비밀번호가 일치하지 않습니다.',
      });
    }

    // 새 비밀번호 업데이트
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
    const employees = await Employee.find();
    res.json(employees);
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

    // findOneAndUpdate를 사용하여 직접 업데이트
    const employee = await Employee.findOneAndUpdate(
      { employeeId: req.params.id },
      req.body,
      {
        new: true, // 업데이트된 문서 반환
        runValidators: true, // 스키마 검증 실행
      }
    );

    if (!employee) {
      console.error('❌ 직원을 찾을 수 없음. 조회 조건:', {
        employeeId: req.params.id,
      });
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
    res.json({ success: true, data: employee });
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
    const employee = new Employee(req.body);

    await employee.save();
    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('❌ 직원 등록 실패:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 직원 삭제 (실제 삭제)
router.delete('/employees/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    console.log('📤 직원 삭제 요청:', employeeId);

    // 직원 삭제
    const employee = await Employee.findOneAndDelete({ employeeId });

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, error: '직원을 찾을 수 없습니다.' });
    }

    // 관련 데이터 삭제
    await Promise.all([
      Leave.deleteMany({ employeeId }),
      Attendance.deleteMany({ employeeId }),
      Evaluation.deleteMany({ employeeId }),
    ]);

    console.log('✅ 직원 및 관련 데이터 삭제 완료:', employeeId);
    res.json({ success: true, data: employee });
  } catch (error) {
    console.error('❌ 직원 삭제 실패:', error.message);
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

    // 대기 상태의 연차만 수정 가능
    if (existingLeave.status !== '대기') {
      return res.status(400).json({
        success: false,
        error: '대기 중인 연차만 수정할 수 있습니다.',
      });
    }

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
    console.log(`🔍 [근무형태 분석] ${year}년 ${month}월 ${targetInfo} 시작...`);

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

    console.log(`📊 [근무형태 분석] 근태 데이터 ${attendances.length}건 조회 (${targetInfo})`);

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
    for (const [employeeId, checkInTimes] of Object.entries(employeeAttendance)) {
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
      `✅ [근무형태 분석] 완료: ${updatedCount}명 업데이트 (전체 ${Object.keys(employeeAttendance).length}명 중)`
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

module.exports = router;
