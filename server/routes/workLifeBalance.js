const express = require('express');
const router = express.Router();
const workLifeBalanceService = require('../services/workLifeBalanceService');

/**
 * @route   GET /api/worklife/stats/:year/:month
 * @desc    특정 월의 워라밸 지표 조회
 * @access  Private
 */
router.get('/stats/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: '올바른 년도와 월을 입력해주세요.',
      });
    }

    const stats = await workLifeBalanceService.getWorkLifeBalance(year, month);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: '해당 월의 워라밸 지표가 없습니다.',
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('워라밸 지표 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '워라밸 지표 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/worklife/stats/:year
 * @desc    특정 연도의 워라밸 지표 조회 (월별)
 * @access  Private
 */
router.get('/stats/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);

    if (!year) {
      return res.status(400).json({
        success: false,
        message: '올바른 년도를 입력해주세요.',
      });
    }

    const stats = await workLifeBalanceService.getWorkLifeBalanceByYear(year);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('연도별 워라밸 지표 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '워라밸 지표 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/worklife/calculate
 * @desc    워라밸 지표 계산 및 저장 (수동 트리거)
 * @access  Private (Admin only)
 */
router.post('/calculate', async (req, res) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: '년도와 월을 입력해주세요.',
      });
    }

    console.log(`📊 워라밸 지표 수동 계산 요청: ${year}년 ${month}월`);

    // 계산 수행
    const result = await workLifeBalanceService.calculateWorkLifeBalance(
      year,
      month
    );

    // DB에 저장
    const saved = await workLifeBalanceService.saveWorkLifeBalance(result);

    res.json({
      success: true,
      message: '워라밸 지표 계산 및 저장이 완료되었습니다.',
      data: saved,
    });
  } catch (error) {
    console.error('워라밸 지표 계산 실패:', error);
    res.status(500).json({
      success: false,
      message: '워라밸 지표 계산 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/worklife/calculate/current
 * @desc    현재 월의 워라밸 지표 계산 및 저장
 * @access  Private (Admin only)
 */
router.post('/calculate/current', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    console.log(`📊 현재 월 워라밸 지표 계산 시작: ${year}년 ${month}월`);

    // 계산 수행
    const result = await workLifeBalanceService.calculateWorkLifeBalance(
      year,
      month
    );

    // DB에 저장
    const saved = await workLifeBalanceService.saveWorkLifeBalance(result);

    res.json({
      success: true,
      message: `${year}년 ${month}월 워라밸 지표 계산 완료`,
      data: saved,
    });
  } catch (error) {
    console.error('현재 월 워라밸 지표 계산 실패:', error);
    res.status(500).json({
      success: false,
      message: '워라밸 지표 계산 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/worklife/stats/current
 * @desc    현재 월의 워라밸 지표 조회 (캐시된 데이터 우선, 없으면 계산)
 * @access  Private
 */
router.get('/stats/current', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // 먼저 캐시된 데이터 조회
    let stats = await workLifeBalanceService.getWorkLifeBalance(year, month);

    // 캐시된 데이터가 없거나 오래된 경우 (6시간 이상)
    if (
      !stats ||
      new Date() - new Date(stats.calculatedAt) > 6 * 60 * 60 * 1000
    ) {
      console.log('📊 캐시된 데이터가 없거나 오래됨. 재계산 시작...');

      const result = await workLifeBalanceService.calculateWorkLifeBalance(
        year,
        month
      );
      stats = await workLifeBalanceService.saveWorkLifeBalance(result);
    }

    res.json({
      success: true,
      data: stats,
      cached: new Date() - new Date(stats.calculatedAt) < 6 * 60 * 60 * 1000,
    });
  } catch (error) {
    console.error('현재 월 워라밸 지표 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '워라밸 지표 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
