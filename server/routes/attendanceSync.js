const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const AttendanceSheet = require('../models/hr/attendanceSheet');
const moment = require('moment-timezone');

/**
 * @route   POST /api/attendance/sync-to-sheet
 * @desc    Attendance 데이터를 AttendanceSheet로 동기화 (계산 포함)
 * @access  Private
 */
router.post('/sync-to-sheet', async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year와 month는 필수입니다.',
      });
    }

    console.log(`[SYNC] ${year}년 ${month}월 데이터 동기화 시작...`);

    const startDate = moment()
      .tz('Asia/Seoul')
      .year(parseInt(year))
      .month(parseInt(month) - 1)
      .startOf('month')
      .toDate();

    const endDate = moment()
      .tz('Asia/Seoul')
      .year(parseInt(year))
      .month(parseInt(month) - 1)
      .endOf('month')
      .toDate();

    // Attendance에서 해당 월 데이터 가져오기
    const allRecords = await Attendance.find({}).lean();
    const records = allRecords.filter((record) => {
      try {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      } catch (e) {
        return false;
      }
    });

    console.log(`[SYNC] ${records.length}건의 원본 데이터 발견`);

    if (records.length === 0) {
      return res.json({
        success: true,
        message: '동기화할 데이터가 없습니다.',
        stats: { synced: 0, errors: 0 },
      });
    }

    // 직원별로 그룹화
    const employeeData = {};
    records.forEach((record) => {
      const employeeId = record.employeeId;
      const date = moment(record.date).tz('Asia/Seoul').format('YYYY-MM-DD');
      const day = moment(record.date).tz('Asia/Seoul').format('D'); // 1~31

      if (!employeeData[employeeId]) {
        employeeData[employeeId] = {};
      }

      let checkInStr = '';
      let checkOutStr = '';

      if (record.checkIn && record.checkIn.time) {
        checkInStr = moment(record.checkIn.time)
          .tz('Asia/Seoul')
          .format('HH:mm');
      }

      if (record.checkOut && record.checkOut.time) {
        checkOutStr = moment(record.checkOut.time)
          .tz('Asia/Seoul')
          .format('HH:mm');
      }

      employeeData[employeeId][day] = {
        date: date,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        shiftType: record.shiftType || null,
        status: record.status || '출근',
        type: 'work',
        totalWorkMinutes: record.workMinutes || 0,
        overtimeHours: record.overtimeHours || 0,
        holidayHours: record.holidayHours || 0,
        nightHours: record.nightHours || 0,
        remarks: record.remarks || '',
        autoDetermined: record.autoDetermined || false,
      };
    });

    console.log(
      `[SYNC] ${Object.keys(employeeData).length}명의 직원 데이터 처리`
    );

    // 각 직원별 AttendanceSheet 생성/업데이트
    let syncedCount = 0;
    let errorCount = 0;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    for (const [employeeId, dailyRecords] of Object.entries(employeeData)) {
      try {
        const recordsMap = new Map();
        Object.entries(dailyRecords).forEach(([day, record]) => {
          recordsMap.set(day, record);
        });

        const sheet = await AttendanceSheet.findOneAndUpdate(
          { employeeId, yearMonth },
          {
            employeeId,
            yearMonth,
            dailyRecords: recordsMap,
            updatedAt: new Date(),
          },
          { new: true, upsert: true }
        );

        // 통계 자동 계산 및 저장
        sheet.calculateMonthlyStats();
        await sheet.save();

        syncedCount++;

        if (syncedCount <= 3) {
          console.log(
            `[SYNC] ${employeeId} 동기화 완료 - 일수: ${
              recordsMap.size
            }, 총근무시간: ${sheet.monthlyStats.totalWorkHours.toFixed(1)}h`
          );
        }
      } catch (err) {
        console.error(`[SYNC] ${employeeId} 동기화 실패:`, err.message);
        errorCount++;
      }
    }

    console.log(`[SYNC] 완료 - 성공: ${syncedCount}, 실패: ${errorCount}`);

    res.json({
      success: true,
      message: `${year}년 ${month}월 데이터 동기화 완료`,
      stats: {
        synced: syncedCount,
        errors: errorCount,
        totalRecords: records.length,
      },
    });
  } catch (error) {
    console.error('[SYNC] 오류:', error);
    res.status(500).json({
      success: false,
      message: '동기화 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
