const express = require('express');
const router = express.Router();
const Attendance = require('../models/hr/attendance');
const AttendanceStats = require('../models/hr/attendanceStats');
const moment = require('moment-timezone');
const { calculateAndSaveStats, categorizeWorkHours, calculateWorkMinutes } = require('../utils/attendanceStatsCalculator');

/**
 * @route   POST /api/attendance/check-in
 * @desc    출근 등록
 * @access  Private
 */
router.post('/check-in', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = moment().tz('Asia/Seoul').startOf('day').toDate();

    // 오늘 출근 기록이 있는지 확인
    const existing = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (existing && existing.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: '이미 출근 등록이 완료되었습니다.',
      });
    }

    const checkInTime = new Date();
    const standardTime = moment()
      .tz('Asia/Seoul')
      .hour(9)
      .minute(0)
      .second(0)
      .toDate();
    const isLate = checkInTime > standardTime;

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId, date: today },
      {
        $set: {
          'checkIn.time': checkInTime,
          'checkIn.location': req.body.location || 'Office',
          'checkIn.ipAddress': req.ip,
          isLate,
          status: isLate ? 'late' : 'present',
        },
      },
      { new: true, upsert: true }
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-checked-in', {
        attendanceId: attendance._id,
        employeeId: attendance.employeeId,
        checkInTime: attendance.checkIn.time,
        isLate,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: '출근 등록이 완료되었습니다.',
      data: attendance,
    });
  } catch (error) {
    console.error('출근 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '출근 등록 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/attendance/check-out
 * @desc    퇴근 등록
 * @access  Private
 */
router.post('/check-out', async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = moment().tz('Asia/Seoul').startOf('day').toDate();

    const attendance = await Attendance.findOne({
      employeeId,
      date: today,
    });

    if (!attendance || !attendance.checkIn.time) {
      return res.status(400).json({
        success: false,
        message: '출근 기록이 없습니다.',
      });
    }

    if (attendance.checkOut.time) {
      return res.status(400).json({
        success: false,
        message: '이미 퇴근 등록이 완료되었습니다.',
      });
    }

    const checkOutTime = new Date();
    const workMinutes = Math.floor(
      (checkOutTime - attendance.checkIn.time) / (1000 * 60)
    );

    attendance.checkOut.time = checkOutTime;
    attendance.checkOut.location = req.body.location || 'Office';
    attendance.checkOut.ipAddress = req.ip;
    attendance.workMinutes = workMinutes;

    await attendance.save();

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-checked-out', {
        attendanceId: attendance._id,
        employeeId: attendance.employeeId,
        checkOutTime: attendance.checkOut.time,
        workMinutes,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: '퇴근 등록이 완료되었습니다.',
      data: attendance,
    });
  } catch (error) {
    console.error('퇴근 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '퇴근 등록 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance
 * @desc    전체 출퇴근 기록 조회
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { date, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (date) {
      const targetDate = moment(date).tz('Asia/Seoul').startOf('day').toDate();
      const endDate = moment(date).tz('Asia/Seoul').endOf('day').toDate();
      filter.date = { $gte: targetDate, $lte: endDate };
    }

    const skip = (page - 1) * limit;
    const records = await Attendance.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '출퇴근 기록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/:employeeId
 * @desc    직원별 출퇴근 기록 조회
 * @access  Private
 */
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    const filter = { employeeId };

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const records = await Attendance.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ date: -1 });

    const total = await Attendance.countDocuments(filter);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '출퇴근 기록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/stats/:employeeId
 * @desc    직원별 출퇴근 통계
 * @access  Private
 */
router.get('/stats/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    const startDate = month
      ? moment(month).startOf('month').toDate()
      : moment().startOf('month').toDate();
    const endDate = month
      ? moment(month).endOf('month').toDate()
      : moment().endOf('month').toDate();

    const stats = await Attendance.aggregate([
      {
        $match: {
          employeeId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          presentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
          },
          lateDays: {
            $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] },
          },
          absentDays: {
            $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] },
          },
          totalWorkMinutes: { $sum: '$workMinutes' },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalDays: 0,
        presentDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalWorkMinutes: 0,
      },
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/attendance/bulk
 * @desc    근태 데이터 대량 저장
 * @access  Private
 */
router.post('/bulk', async (req, res) => {
  try {
    const { records, year, month } = req.body;

    console.log(`[근태 대량 저장] ${year}년 ${month}월 데이터 저장 시작`);
    console.log(`[근태 대량 저장] 총 ${records ? records.length : 0}건`);

    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'records 배열이 필요합니다.',
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month가 필요합니다.',
      });
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];

    for (const record of records) {
      try {
        const { employeeId, date, checkIn, checkOut, shiftType, leaveType } =
          record;

        // 첫 번째 레코드 샘플 로깅
        if (inserted + updated + errors === 0) {
          console.log(
            '[근태 대량 저장] 첫 번째 레코드 샘플:',
            JSON.stringify(record)
          );
        }

        if (!employeeId || !date) {
          errors++;
          errorDetails.push({
            employeeId,
            date,
            error: '필수 필드 누락 (employeeId, date)',
          });
          continue;
        }

        // 기존 레코드 확인
        const existing = await Attendance.findOne({ employeeId, date });

        // 업데이트 데이터 구성
        const updateData = {};

        // checkIn과 checkOut은 문자열로 저장 (스키마: checkIn: String, checkOut: String)
        if (checkIn) {
          updateData.checkIn = checkIn;
        }

        if (checkOut) {
          updateData.checkOut = checkOut;
        }

        // shiftType 설정
        if (shiftType) {
          updateData.shiftType = shiftType;
        } else {
          updateData.shiftType = '주간';
        }

        // leaveType이 있으면 status 설정
        if (leaveType) {
          updateData.status = leaveType;
        }

        const result = await Attendance.findOneAndUpdate(
          { employeeId, date },
          { $set: updateData },
          { upsert: true, new: true }
        );

        if (existing) {
          updated++;
        } else {
          inserted++;
        }
      } catch (error) {
        errors++;
        const errorDetail = {
          employeeId: record.employeeId,
          date: record.date,
          error: error.message,
        };
        errorDetails.push(errorDetail);

        // 첫 번째 에러 상세 로깅
        if (errors === 1) {
          console.error('[근태 대량 저장] 첫 번째 에러 상세:', errorDetail);
          console.error('[근태 대량 저장] 스택:', error.stack);
        }
      }
    }

    console.log(
      `[근태 대량 저장] ✅ 완료: ${inserted}건 추가, ${updated}건 업데이트, ${errors}건 실패`
    );

    // AttendanceStats 컬렉션에 월별 통계 계산 및 저장
    try {
      console.log(`[근태 대량 저장] AttendanceStats 계산 시작...`);

      // 해당 월의 모든 근태 데이터 조회
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const monthlyAttendanceRecords = await Attendance.find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).lean();

      console.log(
        `[근태 대량 저장] ${monthlyAttendanceRecords.length}건의 근태 데이터로 통계 계산`
      );

      // 통계 계산 및 저장
      const statsResult = await calculateAndSaveStats(
        monthlyAttendanceRecords,
        year,
        month
      );

      if (statsResult.success) {
        console.log(
          `[근태 대량 저장] ✅ AttendanceStats 저장 완료:`,
          statsResult.results
        );
      } else {
        console.error(
          `[근태 대량 저장] ❌ AttendanceStats 저장 실패:`,
          statsResult.error
        );
      }
    } catch (statsError) {
      console.error(
        '[근태 대량 저장] ❌ AttendanceStats 계산 중 오류:',
        statsError
      );
      // 통계 저장 실패는 무시하고 계속 진행 (근태 데이터는 이미 저장됨)
    }

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-bulk-saved', {
        year,
        month,
        inserted,
        updated,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `${inserted}건 추가, ${updated}건 업데이트, ${errors}건 실패`,
      stats: {
        inserted,
        updated,
        errors,
      },
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    });
  } catch (error) {
    console.error('[근태 대량 저장] ❌ 오류:', error);
    res.status(500).json({
      success: false,
      message: '근태 데이터 대량 저장 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/attendance/monthly/:year/:month
 * @desc    월별 근태 데이터 조회
 * @access  Private
 */
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(
      daysInMonth
    ).padStart(2, '0')}`;

    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ employeeId: 1, date: 1 });

    // 데이터 형식 통일: checkIn/checkOut이 객체면 문자열로 변환
    const normalizedRecords = attendanceRecords.map((record) => {
      // Mongoose 문서를 plain object로 변환
      const doc = record._doc || record;

      // checkIn 처리
      let checkInStr = '';
      if (doc.checkIn) {
        if (typeof doc.checkIn === 'object' && doc.checkIn.time) {
          // 객체 형태: {time: Date, location: String, ipAddress: String}
          const checkInDate = new Date(doc.checkIn.time);
          checkInStr = checkInDate.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        } else if (typeof doc.checkIn === 'string') {
          // 이미 문자열 형태
          checkInStr = doc.checkIn;
        }
      }

      // checkOut 처리
      let checkOutStr = '';
      if (doc.checkOut) {
        if (typeof doc.checkOut === 'object' && doc.checkOut.time) {
          const checkOutDate = new Date(doc.checkOut.time);
          checkOutStr = checkOutDate.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        } else if (typeof doc.checkOut === 'string') {
          checkOutStr = doc.checkOut;
        }
      }

      return {
        _id: doc._id,
        employeeId: doc.employeeId,
        date: doc.date,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        shiftType: doc.shiftType || null,
        status: doc.status || null,
        note: doc.note || null,
        totalWorkMinutes: doc.totalWorkMinutes || 0,
        overtimeHours: doc.overtimeHours || 0,
        holidayHours: doc.holidayHours || 0,
        nightHours: doc.nightHours || 0,
        remarks: doc.remarks || '',
        autoDetermined: doc.autoDetermined || false,
        createdAt: doc.createdAt,
      };
    });

    res.json({
      success: true,
      data: normalizedRecords,
      count: normalizedRecords.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '월별 근태 데이터 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/attendance/monthly/:year/:month
 * @desc    월별 근태 데이터 대량 저장/업데이트
 * @access  Private
 */
router.post('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const { attendanceData } = req.body;

    console.log(`[근태 저장] ${year}년 ${month}월 데이터 저장 시작`);
    console.log(
      `[근태 저장] 총 ${attendanceData ? attendanceData.length : 0}건`
    );

    if (!attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        success: false,
        message: 'attendanceData 배열이 필요합니다.',
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const record of attendanceData) {
      try {
        const {
          employeeId,
          date,
          checkIn,
          checkOut,
          shiftType,
          status,
          remarks,
        } = record;

        if (!employeeId || !date) {
          errorCount++;
          errors.push({ employeeId, date, error: '필수 필드 누락' });
          continue;
        }

        // 특근 시간 계산 (휴일 근무 여부 판단)
        let overtimeHours = 0;
        let holidayHours = 0;
        let nightHours = 0;
        let totalWorkMinutes = 0;

        if (checkIn && checkOut) {
          // 날짜로부터 요일 판단 (0: 일요일, 6: 토요일)
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay();
          const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;

          // 근무 시간 분류
          const categorized = categorizeWorkHours(checkIn, checkOut, shiftType || '주간', isHoliday);
          overtimeHours = categorized.overtimeHours || 0;
          holidayHours = categorized.holidayHours || 0;
          nightHours = categorized.nightHours || 0;

          // 총 근무 시간
          totalWorkMinutes = calculateWorkMinutes(checkIn, checkOut);
        }

        await Attendance.findOneAndUpdate(
          { employeeId, date },
          {
            $set: {
              checkIn: checkIn || '',
              checkOut: checkOut || '',
              shiftType: shiftType || '주간',
              status: status || '',
              remarks: remarks || '',
              totalWorkMinutes: totalWorkMinutes,
              overtimeHours: overtimeHours,
              holidayHours: holidayHours,
              nightHours: nightHours,
              autoDetermined: true,
            },
          },
          { upsert: true, new: true }
        );

        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          employeeId: record.employeeId,
          date: record.date,
          error: error.message,
        });
      }
    }

    console.log(
      `[근태 저장] ✅ 완료: ${successCount}건 성공, ${errorCount}건 실패`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-monthly-saved', {
        year,
        month,
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: `${successCount}건 저장 완료, ${errorCount}건 실패`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[근태 저장] ❌ 오류:', error);
    res.status(500).json({
      success: false,
      message: '월별 근태 데이터 저장 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/attendance/recalculate-overtime
 * @desc    기존 근태 데이터의 특근 시간 재계산
 * @access  Private
 */
router.post('/recalculate-overtime', async (req, res) => {
  try {
    const { year, month } = req.body;

    console.log(`[특근 재계산] ${year}년 ${month}월 데이터 재계산 시작`);

    // 해당 월의 모든 근태 데이터 조회
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const attendanceRecords = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    console.log(`[특근 재계산] ${attendanceRecords.length}건의 데이터 발견`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const record of attendanceRecords) {
      try {
        const { checkIn, checkOut, shiftType, date } = record;

        if (!checkIn || !checkOut) {
          skippedCount++;
          continue;
        }

        // 날짜로부터 요일 판단 (0: 일요일, 6: 토요일)
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.getDay();
        const isHoliday = dayOfWeek === 0 || dayOfWeek === 6;

        // 근무 시간 분류
        const categorized = categorizeWorkHours(checkIn, checkOut, shiftType || '주간', isHoliday);
        const overtimeHours = categorized.overtimeHours || 0;
        const holidayHours = categorized.holidayHours || 0;
        const nightHours = categorized.nightHours || 0;

        // 총 근무 시간
        const totalWorkMinutes = calculateWorkMinutes(checkIn, checkOut);

        // 업데이트
        await Attendance.findByIdAndUpdate(record._id, {
          $set: {
            totalWorkMinutes: totalWorkMinutes,
            overtimeHours: overtimeHours,
            holidayHours: holidayHours,
            nightHours: nightHours,
            autoDetermined: true,
          },
        });

        updatedCount++;
      } catch (error) {
        console.error(`[특근 재계산] 레코드 ${record._id} 업데이트 실패:`, error);
        skippedCount++;
      }
    }

    console.log(`[특근 재계산] ✅ 완료: ${updatedCount}건 업데이트, ${skippedCount}건 스킵`);

    res.json({
      success: true,
      message: `${year}년 ${month}월 특근 시간 재계산 완료`,
      updatedCount,
      skippedCount,
      totalCount: attendanceRecords.length,
    });
  } catch (error) {
    console.error('[특근 재계산] ❌ 오류:', error);
    res.status(500).json({
      success: false,
      message: '특근 시간 재계산 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

// ==========================================
// 근태 수정
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { Attendance } = require('../models');
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, error: '근태 정보를 찾을 수 없습니다.' });
    }
    console.log(`✅ [PUT /attendance/${req.params.id}] 근태 수정`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-updated', {
        attendanceId: attendance._id,
        employeeId: attendance.employeeId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error('❌ [PUT /attendance] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 근태 삭제
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const { Attendance } = require('../models');
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, error: '근태 정보를 찾을 수 없습니다.' });
    }
    console.log(`✅ [DELETE /attendance/${req.params.id}] 근태 삭제`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('attendance-deleted', {
        attendanceId: attendance._id,
        employeeId: attendance.employeeId,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: '근태 정보가 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ [DELETE /attendance] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 월별 통계 조회 (attendanceStats에서)
// ==========================================
/**
 * @route   GET /api/attendance/stats/:year/:month
 * @desc    월별 근태 합계 통계 조회 (빠른 조회를 위해 저장된 통계 사용)
 * @access  Private
 */
router.get('/stats/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;

    const stats = await AttendanceStats.find({
      year: parseInt(year),
      month: parseInt(month),
    })
      .select(
        'employeeId year month totalWorkMinutes regularHours earlyHours overtimeHours nightHours holidayHours workDays lateDays earlyLeaveDays absentDays annualLeaveDays morningHalfDays afternoonHalfDays'
      )
      .lean();

    res.json({
      success: true,
      data: stats,
      count: stats.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '월별 통계 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
