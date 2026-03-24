'use strict';

/**
 * Leave Service
 * 연차/휴가 관련 MongoDB 쿼리를 담당
 */

const { Leave } = require('../models');

/**
 * 연차 요약 데이터 조회
 */
async function getLeaveSummary(query) {
  let year  = new Date().getFullYear();
  let month = new Date().getMonth(); // 0-indexed

  const yearMatch  = query.match(/(\d{4})\s*년/);
  const monthMatch = query.match(/(\d{1,2})\s*월/);
  if (yearMatch)  year  = parseInt(yearMatch[1]);
  if (monthMatch) month = parseInt(monthMatch[1]) - 1;

  const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
  const endOfMonth   = new Date(year, month + 1, 0).toISOString().split('T')[0];

  // 전체 연차 목록 + 해당 월 연차만 별도 조회
  const [allLeaves, monthLeaves] = await Promise.all([
    Leave.find().lean(),
    Leave.find({
      $or: [
        { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate:   { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    }).lean(),
  ]);

  const statusCount = (list, status) => list.filter(l => l.status === status).length;
  const pendingList = allLeaves
    .filter(l => l.status === '대기')
    .slice(0, 5)
    .map(l => l.employeeName || l.name);

  return {
    intent:  'leave',
    period:  { year, month: month + 1, startOfMonth, endOfMonth },
    all: {
      total:     allLeaves.length,
      pending:   statusCount(allLeaves, '대기'),
      pendingNames: pendingList,
      approved:  statusCount(allLeaves, '승인'),
      rejected:  statusCount(allLeaves, '반려'),
      cancelled: statusCount(allLeaves, '취소'),
    },
    month: {
      total:    monthLeaves.length,
      pending:  statusCount(monthLeaves, '대기'),
      approved: statusCount(monthLeaves, '승인'),
      records:  monthLeaves.slice(0, 20).map(l => ({
        name:      l.employeeName || l.name,
        startDate: l.startDate,
        endDate:   l.endDate,
        type:      l.type,
        status:    l.status,
      })),
    },
  };
}

module.exports = { getLeaveSummary };
