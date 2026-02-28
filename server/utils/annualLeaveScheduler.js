const cron = require('node-cron');
const { Employee, Notification } = require('../models');

/**
 * 연차 휴가 만료 알림 스케줄러
 * - 매일 오전 8시에 실행
 * - 각 직원의 연차 만료일 확인
 * - DB에 알림 저장 및 소켓 전송
 */

// 연차 휴가 기간 계산
function calculateAnnualLeavePeriod(employee) {
  const hireDate = new Date(employee.hireDate || employee.joinDate);
  if (isNaN(hireDate.getTime())) {
    console.error('Invalid hire date for employee:', employee.name);
    return null;
  }

  const today = new Date();
  const currentYear = today.getFullYear();

  // 올해 기준 연차 기간 계산
  const annualStartThisYear = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());
  const annualEndThisYear = new Date(annualStartThisYear);
  annualEndThisYear.setFullYear(annualEndThisYear.getFullYear() + 1);
  annualEndThisYear.setDate(annualEndThisYear.getDate() - 1);

  let annualStart, annualEnd;

  if (today < annualStartThisYear) {
    // 작년 연차 기간 사용
    annualStart = new Date(annualStartThisYear);
    annualStart.setFullYear(annualStart.getFullYear() - 1);
    annualEnd = new Date(annualStart);
    annualEnd.setFullYear(annualEnd.getFullYear() + 1);
    annualEnd.setDate(annualEnd.getDate() - 1);
  } else {
    // 올해 연차 기간 사용
    annualStart = annualStartThisYear;
    annualEnd = annualEndThisYear;
  }

  // 근속연수 계산
  const years = Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));

  // 연차 개수 계산
  let totalAnnual = 15;
  if (years >= 1 && years < 3) totalAnnual = 15;
  else if (years >= 3 && years < 5) totalAnnual = 16;
  else if (years >= 5 && years < 7) totalAnnual = 17;
  else if (years >= 7 && years < 9) totalAnnual = 18;
  else if (years >= 9 && years < 11) totalAnnual = 19;
  else if (years >= 11 && years < 13) totalAnnual = 20;
  else if (years >= 13 && years < 15) totalAnnual = 21;
  else if (years >= 15 && years < 17) totalAnnual = 22;
  else if (years >= 17 && years < 19) totalAnnual = 23;
  else if (years >= 19 && years < 21) totalAnnual = 24;
  else if (years >= 21) totalAnnual = 25;

  return {
    annualStart: annualStart.toISOString().split('T')[0],
    annualEnd: annualEnd.toISOString().split('T')[0],
    totalAnnual,
    years
  };
}

// 사용한 연차 계산 (Leave 모델 참조)
async function calculateUsedAnnualLeave(employeeId, annualStart, annualEnd) {
  const { Leave } = require('../models');

  const approvedLeaves = await Leave.find({
    employeeId: employeeId,
    status: '승인',
    $or: [
      { startDate: { $gte: annualStart, $lte: annualEnd } },
      { endDate: { $gte: annualStart, $lte: annualEnd } },
      { $and: [
        { startDate: { $lte: annualStart } },
        { endDate: { $gte: annualEnd } }
      ]}
    ]
  });

  let usedDays = 0;
  approvedLeaves.forEach(leave => {
    if (leave.type === '연차') {
      const start = new Date(Math.max(new Date(leave.startDate), new Date(annualStart)));
      const end = new Date(Math.min(new Date(leave.endDate), new Date(annualEnd)));
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      usedDays += days;
    } else if (leave.type === '반차(오전)' || leave.type === '반차(오후)') {
      usedDays += 0.5;
    }
  });

  return usedDays;
}

// 만료 알림 생성 함수
async function createLeaveExpiryNotification(employee, annualData, daysUntilExpiry, notificationKey) {
  const todayStr = new Date().toISOString().split('T')[0];

  let title, content, priority;

  if (daysUntilExpiry === 180) {
    // 6개월 전
    title = `남은 연차 기간 만료 예정 알림 (6개월 전)`;
    content = `${employee.name}님의 현재 연차가 6개월 후 만료 예정입니다. 기간 내 사용하시기 바랍니다.\n\n남은 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n총 연차: ${annualData.totalAnnual}일\n사용 연차: ${annualData.usedAnnual}일\n잔여 연차: ${annualData.remainAnnual}일`;
    priority = 'LOW';
  } else if (daysUntilExpiry === 90) {
    // 3개월 전
    title = `남은 연차 기간 만료 예정 알림 (3개월 전)`;
    content = `${employee.name}님의 현재 연차가 3개월 후 만료 예정입니다. 만료 후 자동 소멸되므로 반드시 기간 내 사용하시기 바랍니다.\n연차 사용 계획을 세워주세요.\n\n남은 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n총 연차: ${annualData.totalAnnual}일\n사용 연차: ${annualData.usedAnnual}일\n잔여 연차: ${annualData.remainAnnual}일`;
    priority = 'MEDIUM';
  } else if (daysUntilExpiry === 30) {
    // 30일 전
    title = `남은 연차 기간 만료 예정 알림 (30일 전)`;
    content = `${employee.name}님의 현재 연차가 1개월 후 만료 예정입니다. 기간 내 사용하시기 바랍니다.\n\n남은 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n총 연차: ${annualData.totalAnnual}일\n사용 연차: ${annualData.usedAnnual}일\n잔여 연차: ${annualData.remainAnnual}일`;
    priority = 'MEDIUM';
  } else if (daysUntilExpiry === 7) {
    // 7일 전
    title = `긴급 연차 기간 만료 예정 알림 (7일 전)`;
    content = `${employee.name}님의 현재 연차가 7일 후 만료 예정입니다. 기간 내 사용하시기 바랍니다.\n\n남은 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n총 연차: ${annualData.totalAnnual}일\n사용 연차: ${annualData.usedAnnual}일\n잔여 연차: ${annualData.remainAnnual}일`;
    priority = 'HIGH';
  } else {
    return null;
  }

  // DB에 저장 (중복 방지)
  const notification = new Notification({
    notificationType: '시스템',
    title,
    content,
    message: content,
    sender: '시스템',
    priority,
    recipients: {
      type: '개인',
      value: employee.name,
      selectedEmployees: [employee.id]
    },
    related: {
      entity: 'annualLeave',
      refId: employee.id,
      annualStart: annualData.annualStart,
      annualEnd: annualData.annualEnd,
      nextAnnualStart: (() => {
        const nextStart = new Date(annualData.annualEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        return nextStart.toISOString().split('T')[0];
      })()
    },
    createdAt: new Date()
  });

  await notification.save();

  return notification;
}

// 관리자에게 알림 생성
async function createAdminNotification(employee, originalNotification) {
  // 인사팀 관리자 찾기
  const hrManager = await Employee.findOne({
    department: '인사팀',
    subDepartment: '인사관리',
    role: '팀장'
  });

  // 경영진 관리자 찾기
  const ceoManager = await Employee.findOne({
    department: '경영진',
    subDepartment: '경영관리',
    role: '대표'
  });

  const adminList = [hrManager, ceoManager].filter(Boolean);

  for (const admin of adminList) {
    const adminNotif = new Notification({
      ...originalNotification.toObject(),
      _id: undefined,
      recipients: {
        type: '개인',
        value: admin.name,
        selectedEmployees: [admin.id]
      },
      createdAt: new Date()
    });

    await adminNotif.save();
  }
}

// ============ 연차 갱신 관련 함수 ============

// 이월 연차 계산 (잔여 연차 전부)
function calculateCarryOverLeave(remainingLeave) {
  return remainingLeave; // 잔여 연차 전부 이월 (소수점 포함)
}

// 다음 연차 기간 계산
function calculateNextAnnualPeriod(employee, currentAnnualEnd) {
  const hireDate = new Date(employee.hireDate || employee.joinDate);
  const nextStart = new Date(currentAnnualEnd);
  nextStart.setDate(nextStart.getDate() + 1);

  const nextEnd = new Date(nextStart);
  nextEnd.setFullYear(nextEnd.getFullYear() + 1);
  nextEnd.setDate(nextEnd.getDate() - 1);

  // 다음 기간의 근속연수 계산
  const years = Math.floor((nextStart - hireDate) / (365.25 * 24 * 60 * 60 * 1000));

  // 연차 개수 계산
  let totalAnnual = 15;
  if (years >= 1 && years < 3) totalAnnual = 15;
  else if (years >= 3 && years < 5) totalAnnual = 16;
  else if (years >= 5 && years < 7) totalAnnual = 17;
  else if (years >= 7 && years < 9) totalAnnual = 18;
  else if (years >= 9 && years < 11) totalAnnual = 19;
  else if (years >= 11 && years < 13) totalAnnual = 20;
  else if (years >= 13 && years < 15) totalAnnual = 21;
  else if (years >= 15 && years < 17) totalAnnual = 22;
  else if (years >= 17 && years < 19) totalAnnual = 23;
  else if (years >= 19 && years < 21) totalAnnual = 24;
  else if (years >= 21) totalAnnual = 25;

  return {
    annualStart: nextStart.toISOString().split('T')[0],
    annualEnd: nextEnd.toISOString().split('T')[0],
    totalAnnual,
    years
  };
}

// 직원용 연차 갱신 알림 생성
async function createEmployeeRenewalNotification(employee, nextPeriod, carryOverLeave) {
  const todayStr = new Date().toISOString().split('T')[0];

  const notification = new Notification({
    notificationType: '시스템',
    title: '📢 연차 기간 자동 갱신 알림',
    content: `${employee.name}님의 연차가 새 기준으로 자동 갱신되었습니다.\n\n📅 새 연차 기간: ${nextPeriod.annualStart} ~ ${nextPeriod.annualEnd}\n📊 총 연차: ${nextPeriod.totalAnnual}일\n🔄 이월 연차: ${carryOverLeave}일 (수당 계산용)\n✅ 사용 가능 연차: ${nextPeriod.totalAnnual}일`,
    message: `연차가 자동 갱신되었습니다. 새 연차 기간: ${nextPeriod.annualStart} ~ ${nextPeriod.annualEnd}`,
    sender: '시스템',
    priority: 'HIGH',
    recipients: {
      type: '개인',
      value: employee.name,
      selectedEmployees: [employee.id]
    },
    related: {
      entity: 'annualLeaveRenewal',
      refId: employee.id,
      annualStart: nextPeriod.annualStart,
      annualEnd: nextPeriod.annualEnd,
      totalAnnual: nextPeriod.totalAnnual,
      carryOverLeave: carryOverLeave
    },
    createdAt: new Date()
  });

  await notification.save();
  return notification;
}

// 관리자용 연차 갱신 요약 알림 생성
async function createAdminRenewalSummary(employee, nextPeriod, carryOverLeave) {
  // 인사팀 관리자 찾기
  const hrManager = await Employee.findOne({
    department: '인사팀',
    subDepartment: '인사관리',
    role: '팀장'
  });

  // 경영진 관리자 찾기
  const ceoManager = await Employee.findOne({
    department: '경영진',
    subDepartment: '경영관리',
    role: '대표'
  });

  const adminList = [hrManager, ceoManager].filter(Boolean);

  for (const admin of adminList) {
    const adminNotif = new Notification({
      notificationType: '시스템',
      title: `📋 ${employee.name}님 연차 갱신 완료`,
      content: `${employee.name}님의 연차가 자동 갱신되었습니다.\n\n📅 새 연차 기간: ${nextPeriod.annualStart} ~ ${nextPeriod.annualEnd}\n📊 총 연차: ${nextPeriod.totalAnnual}일\n🔄 이월 연차: ${carryOverLeave}일 (수당 계산용)\n✅ 사용 가능 연차: ${nextPeriod.totalAnnual}일`,
      message: `${employee.name}님 연차 자동 갱신 완료`,
      sender: '시스템',
      priority: 'MEDIUM',
      recipients: {
        type: '개인',
        value: admin.name,
        selectedEmployees: [admin.id]
      },
      related: {
        entity: 'annualLeaveRenewal',
        refId: employee.id,
        annualStart: nextPeriod.annualStart,
        annualEnd: nextPeriod.annualEnd
      },
      createdAt: new Date()
    });

    await adminNotif.save();
  }
}

// 실제 체크 함수
async function checkAnnualLeaveExpiry(io) {
  try {
    console.log('✅ [연차만료알림] 연차 만료일 체크 시작...');

    // KST 기준 오늘 날짜 문자열 (YYYY-MM-DD)
    const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
    const year = new Date().getFullYear();

    // 재직 중인 직원 조회
    const employees = await Employee.find({ status: '재직' });

    let notificationCount = 0;

    for (const employee of employees) {
      // DB의 annualLeaveEnd 우선 사용 (없으면 joinDate 기반 계산으로 폴백)
      const annualEndStr = employee.annualLeaveEnd;
      const annualStartStr = employee.annualLeaveStart;
      if (!annualEndStr || !annualStartStr) continue;

      // KST 기준 만료일까지 일수 계산 (문자열 날짜 직접 비교)
      const daysUntilExpiry = Math.round(
        (new Date(annualEndStr + 'T00:00:00+09:00') - new Date(todayKST + 'T00:00:00+09:00'))
        / (1000 * 60 * 60 * 24)
      );

      // calculateAnnualLeavePeriod는 totalAnnual 계산용으로만 사용
      const annualPeriod = calculateAnnualLeavePeriod(employee) || {};

      // 사용한 연차 계산 (DB의 연차 기간 기준)
      const usedAnnual = await calculateUsedAnnualLeave(
        employee.id,
        annualStartStr,
        annualEndStr
      );

      const totalAnnual = employee.totalAnnual || employee.baseAnnual || annualPeriod.totalAnnual || 15;
      const annualData = {
        annualStart: annualStartStr,
        annualEnd: annualEndStr,
        totalAnnual,
        usedAnnual,
        remainAnnual: totalAnnual - usedAnnual
      };

      // ============ 1. 연차 만료 예고 알림 (180일, 90일, 30일, 7일 전) ============
      if (annualData.remainAnnual > 0) {
        const notificationDays = [180, 90, 30, 7];

        for (const days of notificationDays) {
          if (daysUntilExpiry === days) {
            const notificationKey = `leaveExpiry${days}_${employee.id}_${year}`;

            // 오늘 이미 보낸 알림인지 체크 (KST 기준)
            const todayStart = new Date(todayKST + 'T00:00:00+09:00');
            const todayEnd = new Date(todayKST + 'T23:59:59+09:00');

            const existingNotif = await Notification.findOne({
              'related.entity': 'annualLeave',
              'related.refId': employee.id,
              title: { $regex: `${days === 180 ? '6개월' : days === 90 ? '3개월' : days === 30 ? '30일' : '7일'} 전` },
              createdAt: {
                $gte: todayStart,
                $lt: todayEnd
              }
            });

            if (!existingNotif) {
              // 알림 생성
              const notification = await createLeaveExpiryNotification(
                employee,
                annualData,
                days,
                notificationKey
              );

              if (notification) {
                // 관리자에게도 알림
                await createAdminNotification(employee, notification);

                // Socket.io를 통해 실시간 전송
                if (io) {
                  io.emit('new-notification', {
                    type: 'annualLeaveExpiry',
                    employeeId: employee.id,
                    notification: notification.toObject()
                  });
                }

                notificationCount++;
              }
            }
          }
        }
      }

      // ============ 2. 연차 갱신 처리 (만료일 다음날 이후) ============
      // daysUntilExpiry < 0: 만료일이 지났음 (누락된 경우도 소급 처리)
      if (daysUntilExpiry < 0) {
        console.log(`🔄 [연차갱신] ${employee.name}님 연차 갱신 시작...`);

        // 오늘 이미 갱신했는지 체크 (KST 기준)
        const todayStart = new Date(todayKST + 'T00:00:00+09:00');
        const todayEnd = new Date(todayKST + 'T23:59:59+09:00');

        const existingRenewal = await Notification.findOne({
          'related.entity': 'annualLeaveRenewal',
          'related.refId': employee.id,
          createdAt: {
            $gte: todayStart,
            $lt: todayEnd
          }
        });

        if (!existingRenewal) {
          // 이월 연차 계산
          const carryOverLeave = calculateCarryOverLeave(annualData.remainAnnual);

          // 다음 연차 기간 계산 (DB의 만료일 기준)
          const nextPeriod = calculateNextAnnualPeriod(employee, annualEndStr);

          // Employee DB 업데이트
          await Employee.findByIdAndUpdate(employee._id, {
            annualLeaveStart: nextPeriod.annualStart,
            annualLeaveEnd: nextPeriod.annualEnd,
            baseAnnual: nextPeriod.totalAnnual,
            carryOverLeave: carryOverLeave, // 기록용 (수당 계산용)
            totalAnnual: nextPeriod.totalAnnual, // 총연차 = 기본연차
            leaveUsed: 0, // 기준 사용연차도 리셋 (프론트 계산 동기화)
            usedAnnual: 0,
            remainAnnual: nextPeriod.totalAnnual // 잔여 = 총연차
          });

          // 직원 알림 생성
          const employeeNotif = await createEmployeeRenewalNotification(
            employee,
            nextPeriod,
            carryOverLeave
          );

          // 관리자 알림 생성
          await createAdminRenewalSummary(employee, nextPeriod, carryOverLeave);

          // Socket.io를 통해 실시간 전송
          if (io) {
            io.emit('new-notification', {
              type: 'annualLeaveRenewal',
              employeeId: employee.id,
              notification: employeeNotif.toObject()
            });
          }

          notificationCount++;
          console.log(`✅ [연차갱신] ${employee.name}님 갱신 완료 - 이월: ${carryOverLeave}일, 기본: ${nextPeriod.totalAnnual}일`);
        } else {
          console.log(`⏭️  [연차갱신] ${employee.name}님 이미 갱신됨 (오늘 처리 완료)`);
        }
      }
    }

    console.log(`✅ [연차만료알림] 체크 완료: ${notificationCount}건의 알림 생성`);
  } catch (error) {
    console.error('❌ [연차만료알림] 에러 발생:', error);
  }
}

// 스케줄러 시작
function startAnnualLeaveScheduler(io) {
  console.log('🚀 [연차만료알림] 시작 - 매일 오전 8시 실행');

  // 매일 오전 8시에 실행 (KST 기준)
  cron.schedule('0 8 * * *', () => {
    console.log(`✅ [연차만료알림] 스케줄 시작 - ${new Date().toLocaleString('ko-KR')}`);
    checkAnnualLeaveExpiry(io);
  }, {
    timezone: "Asia/Seoul"
  });

  // 즉시 시작 시 테스트 용도로 바로 체크 (테스트 후 주석 처리 권장)
  // checkAnnualLeaveExpiry(io);
}

module.exports = { startAnnualLeaveScheduler, checkAnnualLeaveExpiry };
