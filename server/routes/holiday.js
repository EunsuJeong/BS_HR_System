const express = require('express');
const router = express.Router();
const Schedule = require('../models/system/schedules');

// ✅ 특정 연도 공휴일 조회 (schedules 컬렉션에서)
router.get('/year/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const holidays = await Schedule.find({
      type: '공휴일',
      year: parseInt(year),
    }).sort({
      date: 1,
    });

    // 프론트엔드가 기대하는 형태로 변환
    const holidayMap = {};
    holidays.forEach((holiday) => {
      const fullDate = holiday.date; // YYYY-MM-DD
      const shortDate = holiday.date.substring(5); // MM-DD
      holidayMap[fullDate] = holiday.title;
      holidayMap[shortDate] = holiday.title;
    });

    console.log(
      `✅ [GET /holiday/year/${year}] 공휴일 ${holidays.length}건 조회 (schedules)`
    );
    res.json({ success: true, data: holidayMap });
  } catch (error) {
    console.error('❌ [GET /holiday/year] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 여러 연도 공휴일 조회 (schedules 컬렉션에서)
router.get('/years/:startYear/:endYear', async (req, res) => {
  try {
    const { startYear, endYear } = req.params;
    const holidays = await Schedule.find({
      type: '공휴일',
      year: {
        $gte: parseInt(startYear),
        $lte: parseInt(endYear),
      },
    }).sort({ date: 1 });

    // 연도별로 그룹화
    const holidaysByYear = {};
    holidays.forEach((holiday) => {
      const year = holiday.year;
      if (!holidaysByYear[year]) {
        holidaysByYear[year] = {};
      }
      const fullDate = holiday.date;
      const shortDate = holiday.date.substring(5);
      holidaysByYear[year][fullDate] = holiday.title;
      holidaysByYear[year][shortDate] = holiday.title;
    });

    console.log(
      `✅ [GET /holiday/years/${startYear}-${endYear}] 공휴일 ${holidays.length}건 조회 (schedules)`
    );
    res.json({ success: true, data: holidaysByYear });
  } catch (error) {
    console.error('❌ [GET /holiday/years] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 공휴일 통계 (schedules 컬렉션에서)
router.get('/stats', async (req, res) => {
  try {
    const totalHolidays = await Schedule.countDocuments({ type: '공휴일' });
    const years = await Schedule.aggregate([
      { $match: { type: '공휴일' } },
      { $group: { _id: '$year' } },
      { $sort: { _id: 1 } },
    ]);

    const minYear = years.length > 0 ? years[0]._id : null;
    const maxYear = years.length > 0 ? years[years.length - 1]._id : null;

    const typeStats = await Schedule.aggregate([
      { $match: { type: '공휴일' } },
      { $group: { _id: '$holidayType', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    console.log(
      `✅ [GET /holiday/stats] 통계 조회: ${totalHolidays}건 (schedules)`
    );
    res.json({
      success: true,
      data: {
        totalHolidays,
        minYear,
        maxYear,
        years: years.map((y) => y._id),
        typeStats: typeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('❌ [GET /holiday/stats] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 공휴일 대량 추가 (일회성 초기화용)
router.post('/bulk', async (req, res) => {
  try {
    const { holidays } = req.body;

    if (!Array.isArray(holidays)) {
      return res.status(400).json({
        success: false,
        error: 'holidays 배열이 필요합니다.',
      });
    }

    let successCount = 0;
    let skipCount = 0;

    for (const holiday of holidays) {
      try {
        await Holiday.findOneAndUpdate(
          { year: holiday.year, date: holiday.date },
          holiday,
          { upsert: true, new: true }
        );
        successCount++;
      } catch (error) {
        if (error.code === 11000) {
          skipCount++;
        } else {
          throw error;
        }
      }
    }

    console.log(
      `✅ [POST /holiday/bulk] 저장: ${successCount}건, 중복: ${skipCount}건`
    );
    res.json({
      success: true,
      message: `${successCount}건 저장, ${skipCount}건 중복`,
      successCount,
      skipCount,
    });
  } catch (error) {
    console.error('❌ [POST /holiday/bulk] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 커스텀 공휴일 생성 (schedules 컬렉션에)
router.post('/', async (req, res) => {
  try {
    const { date, name, type = 'custom' } = req.body;

    if (!date || !name) {
      return res.status(400).json({
        success: false,
        error: '날짜와 이름이 필요합니다.',
      });
    }

    const year = new Date(date).getFullYear();

    // 중복 체크
    const existing = await Schedule.findOne({ type: '공휴일', date });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '이미 등록된 날짜입니다.',
      });
    }

    const holiday = await Schedule.create({
      type: '공휴일',
      year,
      date,
      title: name,
      holidayType: type,
      isCustom: true,
    });

    console.log(
      `✅ [POST /holiday] 공휴일 생성: ${date} - ${name} (schedules)`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('holiday-created', {
        holidayId: holiday._id,
        date: holiday.date,
        title: holiday.title,
        year: holiday.year,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: holiday,
      message: '공휴일이 등록되었습니다.',
    });
  } catch (error) {
    console.error('❌ [POST /holiday] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 공휴일 수정 (schedules 컬렉션에서)
router.put('/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { name, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '이름이 필요합니다.',
      });
    }

    const updateData = { title: name };
    if (type) updateData.holidayType = type;

    const holiday = await Schedule.findOneAndUpdate(
      { type: '공휴일', date },
      updateData,
      { new: true }
    );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: '해당 공휴일을 찾을 수 없습니다.',
      });
    }

    console.log(`✅ [PUT /holiday/${date}] 공휴일 수정: ${name} (schedules)`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('holiday-updated', {
        holidayId: holiday._id,
        date: holiday.date,
        title: holiday.title,
        year: holiday.year,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: holiday,
      message: '공휴일이 수정되었습니다.',
    });
  } catch (error) {
    console.error('❌ [PUT /holiday] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 공휴일 삭제 (schedules 컬렉션에서)
router.delete('/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const holiday = await Schedule.findOneAndDelete({ type: '공휴일', date });

    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: '해당 공휴일을 찾을 수 없습니다.',
      });
    }

    console.log(
      `✅ [DELETE /holiday/${date}] 공휴일 삭제: ${holiday.title} (schedules)`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('holiday-deleted', {
        holidayId: holiday._id,
        date: holiday.date,
        title: holiday.title,
        year: holiday.year,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: holiday,
      message: '공휴일이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('❌ [DELETE /holiday] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
