const express = require('express');
const router = express.Router();
const { SafetyAccident, WeatherCache } = require('../models');

// ✅ 전체 안전사고 조회 (날짜 범위 지원)
router.get('/accidents', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    const accidents = await SafetyAccident.find(query).sort({
      date: -1,
      createdAt: -1,
    });
    console.log(`✅ [Safety API] 안전사고 조회: ${accidents.length}건`);
    res.json(accidents);
  } catch (error) {
    console.error('❌ 안전사고 조회 오류:', error);
    res.status(500).json({ message: '안전사고 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 안전사고 등록
router.post('/accidents', async (req, res) => {
  try {
    const accident = new SafetyAccident(req.body);
    await accident.save();
    console.log(
      `✅ [Safety API] 안전사고 등록: ${accident.date}, ${accident.severity}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('safety-accident-created', {
        accidentId: accident._id,
        date: accident.date,
        severity: accident.severity,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(accident);
  } catch (error) {
    console.error('❌ 안전사고 등록 오류:', error);
    res.status(500).json({ message: '안전사고 등록 중 오류가 발생했습니다.' });
  }
});

// ✅ 특정 날짜 사고 목록
router.get('/accidents/:date', async (req, res) => {
  try {
    const data = await SafetyAccident.find({ date: req.params.date });
    res.json(data);
  } catch (error) {
    console.error('❌ 안전사고 조회 오류:', error);
    res.status(500).json({ message: '안전사고 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 안전사고 수정
router.put('/accidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const accident = await SafetyAccident.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!accident) {
      return res.status(404).json({ message: '안전사고를 찾을 수 없습니다.' });
    }

    console.log(`✅ [Safety API] 안전사고 수정: ${id}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('safety-accident-updated', {
        accidentId: accident._id,
        date: accident.date,
        severity: accident.severity,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(accident);
  } catch (error) {
    console.error('❌ 안전사고 수정 오류:', error);
    res.status(500).json({ message: '안전사고 수정 중 오류가 발생했습니다.' });
  }
});

// ✅ 안전사고 삭제
router.delete('/accidents/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const accident = await SafetyAccident.findByIdAndDelete(id);

    if (!accident) {
      return res.status(404).json({ message: '안전사고를 찾을 수 없습니다.' });
    }

    console.log(`✅ [Safety API] 안전사고 삭제: ${id}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('safety-accident-deleted', {
        accidentId: accident._id,
        date: accident.date,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ message: '안전사고가 삭제되었습니다.', accident });
  } catch (error) {
    console.error('❌ 안전사고 삭제 오류:', error);
    res.status(500).json({ message: '안전사고 삭제 중 오류가 발생했습니다.' });
  }
});

// ✅ 날씨 캐시 조회
router.get('/weather', async (req, res) => {
  const { location } = req.query;
  const cache = await WeatherCache.findOne({ location });
  res.json(cache || {});
});

module.exports = router;
