'use strict';

/**
 * Employee Service
 * 직원 관련 MongoDB 쿼리를 담당
 */

const { Employee } = require('../models');

/**
 * 직원 요약 데이터 조회 (쿼리에서 특정 직원 언급 감지)
 */
async function getEmployeeSummary(query) {
  const employees = await Employee.find().lean();

  // 언급된 직원 찾기: 정확한 이름 → 사번 → 부분 이름
  let mentioned = employees.find(e => e.name && query.includes(e.name));
  if (!mentioned) {
    mentioned = employees.find(e => e.employeeId && query.includes(e.employeeId));
  }
  if (!mentioned && query.length >= 2) {
    mentioned = employees.find(e => {
      const name = e.name || '';
      for (let i = 0; i <= name.length - 2; i++) {
        if (query.includes(name.substring(i, i + 2))) return true;
      }
      return false;
    });
  }

  const byDept = employees.reduce((acc, e) => {
    acc[e.department] = (acc[e.department] || 0) + 1;
    return acc;
  }, {});

  const byPosition = employees.reduce((acc, e) => {
    acc[e.position] = (acc[e.position] || 0) + 1;
    return acc;
  }, {});

  return {
    intent:    'employee',
    total:     employees.length,
    active:    employees.filter(e => e.status === '재직').length,
    resigned:  employees.filter(e => e.status === '퇴사').length,
    byDept,
    byPosition,
    mentioned: mentioned ? {
      name:       mentioned.name,
      department: mentioned.department,
      position:   mentioned.position,
      status:     mentioned.status,
      hireDate:   mentioned.hireDate || mentioned.joinDate,
      workType:   mentioned.workType,
    } : null,
  };
}

module.exports = { getEmployeeSummary };
