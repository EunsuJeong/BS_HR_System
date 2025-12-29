const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Schedule, SystemLog, UserSession } = require('../models');

// ✅ 일정 조회 (삭제된 일정 제외)
router.get('/schedules', async (req, res) => {
  try {
    // isDeleted가 false이거나 존재하지 않는 일정만 조회 (유령 일정 방지)
    const schedules = await Schedule.find({
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false }
      ]
    }).sort({ date: 1 });
    console.log(`✅ [GET /schedules] 일정 ${schedules.length}건 조회 (삭제된 일정 제외)`);
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('❌ [GET /schedules] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 일정 생성
router.post('/schedules', async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();
    console.log(`✅ [POST /schedules] 일정 생성: ${schedule.title}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('schedule-created', {
        scheduleId: schedule._id,
        title: schedule.title,
        date: schedule.date,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('❌ [POST /schedules] 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 일정 수정
router.put('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!schedule) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }
    console.log(
      `✅ [PUT /schedules/${req.params.id}] 일정 수정: ${schedule.title}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('schedule-updated', {
        scheduleId: schedule._id,
        title: schedule.title,
        date: schedule.date,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('❌ [PUT /schedules] 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 일정 삭제
router.delete('/schedules/:id', async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: '일정을 찾을 수 없습니다.' });
    }
    console.log(
      `✅ [DELETE /schedules/${req.params.id}] 일정 삭제: ${schedule.title}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('schedule-deleted', {
        scheduleId: schedule._id,
        title: schedule.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: '일정이 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ [DELETE /schedules] 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ 시스템 로그 기록
router.post('/logs', async (req, res) => {
  const log = new SystemLog(req.body);
  await log.save();
  res.json({ success: true });
});

// ✅ 세션 기록
router.post('/sessions', async (req, res) => {
  const session = new UserSession(req.body);
  await session.save();
  res.json({ success: true });
});

module.exports = router;

// ✅ 시스템 헬스체크 (DB 상태 포함)
router.get('/health', async (req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  const conn = mongoose.connection;
  res.json({
    success: true,
    db: {
      state: stateMap[conn.readyState] || String(conn.readyState),
      name: conn.name,
      host: conn.host,
    },
    serverTime: new Date().toISOString(),
  });
});

// ✅ 사용 가능한 AI 모델 목록 조회
router.get('/available-models', async (req, res) => {
  try {
    const allModels = [
      // OpenAI 모델 - GPT-5 시리즈
      'gpt-5.1',
      'gpt-5.1-chat-latest',
      'gpt-5.1-codex',
      'gpt-5',
      'gpt-5-chat-latest',
      'gpt-5-codex',
      'gpt-5-pro',
      'gpt-5-mini',
      'gpt-5-nano',
      // GPT-4.1 시리즈
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      // O 시리즈
      'o3-mini',
      'o1',
      'o1-mini',
      'o1-preview',
      // GPT-4o 시리즈
      'gpt-4o',
      'gpt-4o-2024-11-20',
      'gpt-4o-2024-05-13',
      'chatgpt-4o-latest',
      'gpt-4o-mini',
      // GPT-4 시리즈
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-0613',
      'gpt-4-0125-preview',
      // GPT-3.5 시리즈
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106',
      // Realtime 시리즈
      'gpt-realtime',
      'gpt-realtime-mini',
      // Gemini 모델
      'gemini-2.0-flash-thinking-exp',
      'gemini-2.0-pro-exp',
      'gemini-2.0-flash-exp',
      'gemini-exp-1206',
      'gemini-exp-1121',
      'gemini-exp-1114',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-8b',
      'gemini-pro',
      // Claude 모델
      'claude-sonnet-4-5-20250929',
      'claude-3.7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    console.log(`✅ [GET /system/available-models] 모델 ${allModels.length}개 반환`);
    res.json({ success: true, models: allModels });
  } catch (error) {
    console.error('❌ [GET /system/available-models] 오류:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 수동 백업 실행 (관리자용)
router.post('/backup', async (req, res) => {
  try {
    const { manualBackup } = require('../utils/backupScheduler');

    console.log('🔧 [POST /system/backup] 수동 백업 요청 받음');

    const result = await manualBackup();

    if (result) {
      console.log('✅ [POST /system/backup] 수동 백업 성공');
      res.json({
        success: true,
        message: '데이터베이스 백업이 완료되었습니다.',
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('백업 실패');
    }
  } catch (error) {
    console.error('❌ [POST /system/backup] 오류:', error);
    res.status(500).json({
      success: false,
      error: '백업 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// ✅ 백업 파일 목록 조회
router.get('/backups', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const BACKUP_DIR = path.join(__dirname, '../../backups');

    // 백업 디렉토리가 없으면 빈 배열 반환
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          sizeInMB: (stats.size / 1024 / 1024).toFixed(2),
          createdAt: stats.mtime,
          age: Math.floor((Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)) // 일 단위
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // 최신순 정렬

    console.log(`✅ [GET /system/backups] 백업 파일 ${backupFiles.length}개 조회`);
    res.json({ success: true, backups: backupFiles });
  } catch (error) {
    console.error('❌ [GET /system/backups] 오류:', error);
    res.status(500).json({
      success: false,
      error: '백업 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});
