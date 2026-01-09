/**
 * [2_관리자 모드] 2.5_연차 관리 통합 모듈
 * - Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { NotificationAPI } from '../../api/communication';

// ============================================================
// [2_관리자 모드] 2.5_연차 관리 - HOOKS
// ============================================================

export const useAnnualLeaveEditor = (dependencies = {}) => {
  const {
    calculateEmployeeAnnualLeave = () => ({}),
    setEditingAnnualLeave = () => {},
    setEditAnnualData = () => {},
    editAnnualData = {},
    setEmployees = () => {},
    setLeaveRequests = () => {},
    devLog = console.log,
  } = dependencies;

  // [2_관리자 모드] 2.6_연차관리 - 연차 수정 시작
  const handleEditAnnualLeave = useCallback(
    (employee) => {
      const annualData = calculateEmployeeAnnualLeave(employee);
      setEditingAnnualLeave(employee.id);
      setEditAnnualData({
        ...annualData,
        employeeId: employee.id,
      });
    },
    [calculateEmployeeAnnualLeave, setEditingAnnualLeave, setEditAnnualData]
  );

  // [2_관리자 모드] 2.6_연차관리 - 연차 수정 저장
  const handleSaveAnnualLeave = useCallback(
    (employeeId) => {
      const baseAnnual = editAnnualData.baseAnnual || 0;
      const carryOverLeave = editAnnualData.carryOverLeave || 0;
      const totalAnnual = baseAnnual + carryOverLeave;

      const finalData = {
        ...editAnnualData,
        baseAnnual,
        carryOverLeave,
        totalAnnual,
        remainAnnual: totalAnnual - (editAnnualData.usedAnnual || 0),
      };

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employeeId ||
          emp.employeeId === employeeId ||
          emp.employeeNumber === employeeId
            ? {
                ...emp,
                ...finalData,
                annualLeave: {
                  total: totalAnnual,
                  used: finalData.usedAnnual || 0,
                  remaining: totalAnnual - (finalData.usedAnnual || 0),
                  carryOver: carryOverLeave,
                  baseAnnual: baseAnnual,
                },
              }
            : emp
        )
      );

      localStorage.setItem(
        `annualLeave_${employeeId}`,
        JSON.stringify({
          total: totalAnnual,
          used: finalData.usedAnnual || 0,
          remaining: totalAnnual - (finalData.usedAnnual || 0),
          carryOver: carryOverLeave,
          baseAnnual: baseAnnual,
          lastModified: new Date().toISOString(),
        })
      );

      if (editAnnualData.totalAnnualLeave !== undefined) {
        setLeaveRequests((prev) =>
          prev.map((leave) =>
            leave.employeeId === employeeId
              ? {
                  ...leave,
                  remainingLeave:
                    editAnnualData.totalAnnualLeave - (leave.usedLeave || 0),
                }
              : leave
          )
        );
      }

      setEditingAnnualLeave(null);
      setEditAnnualData({});

      alert('연차 정보가 수정되었습니다.');

      devLog(`${employeeId} 연차 정보 저장 완료:`, editAnnualData);
    },
    [
      editAnnualData,
      setEmployees,
      setLeaveRequests,
      setEditingAnnualLeave,
      setEditAnnualData,
      devLog,
    ]
  );

  // [2_관리자 모드] 2.6_연차관리 - 연차 수정 취소
  const handleCancelAnnualLeaveEdit = useCallback(() => {
    setEditingAnnualLeave(null);
    setEditAnnualData({});
  }, [setEditingAnnualLeave, setEditAnnualData]);

  return {
    handleEditAnnualLeave,
    handleSaveAnnualLeave,
    handleCancelAnnualLeaveEdit,
  };
};

// ============================================================
// useLeaveApproval.js
// ============================================================

export const useLeaveApproval = (dependencies = {}) => {
  const {
    leaveRequests = [],
    setLeaveRequests = () => {},
    employees = [],
    send자동알림 = () => {},
    currentUser = {},
    devLog = console.log,
    leaveSearch = {},
    leaveSortField = '',
    leaveSortOrder = 'asc',
    leaveApprovalData = {},
    setLeaveApprovalData = () => {},
    setShowLeaveApprovalPopup = () => {},
  } = dependencies;

  // [2_관리자 모드] 2.6_연차관리 - 연차 승인 시작
  const handleApproveLeave = useCallback(
    (leaveId) => {
      setLeaveApprovalData({
        id: leaveId,
        type: 'approve',
        remark: '',
      });
      setShowLeaveApprovalPopup(true);
    },
    [setLeaveApprovalData, setShowLeaveApprovalPopup]
  );

  // [2_관리자 모드] 2.6_연차관리 - 연차 반려 시작
  const handleRejectLeave = useCallback(
    (leaveId) => {
      setLeaveApprovalData({
        id: leaveId,
        type: 'reject',
        remark: '',
      });
      setShowLeaveApprovalPopup(true);
    },
    [setLeaveApprovalData, setShowLeaveApprovalPopup]
  );

  // [2_관리자 모드] 2.6_연차관리 - 연차 승인/반려 확정
  const handleLeaveApprovalConfirm = useCallback(async () => {
    const { id, type, remark } = leaveApprovalData;
    const targetLeave = leaveRequests.find((lr) => lr.id === id);
    if (!targetLeave) return;

    let approvedDays = 0;
    const leaveType = targetLeave.type || targetLeave.leaveType || '';
    if (leaveType === '연차') {
      const start = new Date(targetLeave.startDate);
      const end = new Date(targetLeave.endDate);
      approvedDays = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (leaveType.startsWith('반차')) {
      approvedDays = 0.5;
    }

    const employeeName =
      employees.find((emp) => emp.id === targetLeave.employeeId)?.name ||
      '알 수 없음';

    const finalRemark =
      remark.trim() || (type === 'approve' ? '승인됨' : '사유 없음');

    if (type === 'approve') {
      try {
        // DB에 승인 상태 저장
        const { default: LeaveAPI } = await import('../../api/leave');
        const approvedDate = new Date().toISOString().split('T')[0];
        await LeaveAPI.updateStatus(id, {
          status: '승인',
          approvedBy: currentUser.id || currentUser.employeeId,
          approverName: currentUser.name,
          remark: finalRemark,
        });

        // 로컬 state 업데이트
        const now = new Date();
        setLeaveRequests((prev) =>
          prev.map((lr) =>
            lr.id === id
              ? {
                  ...lr,
                  status: '승인',
                  approvedAt: now,
                  approvedDays: approvedDays,
                  approver: currentUser.id || currentUser.employeeId,
                  approverName: currentUser.name,
                  remark: finalRemark,
                }
              : lr
          )
        );

        const targetEmployee = employees.find(
          (emp) => emp.id === targetLeave.employeeId
        );
        if (targetEmployee) {
          send자동알림({
            처리유형: '연차 승인',
            대상자: targetEmployee,
            처리자: currentUser.name,
            알림내용: `${employeeName}님의 ${
              targetLeave.type
            } 신청이 승인되었습니다.\n기간: ${targetLeave.startDate}${
              targetLeave.endDate !== targetLeave.startDate
                ? ` ~ ${targetLeave.endDate}`
                : ''
            }\n승인 일수: ${approvedDays}일\n승인 사유: ${finalRemark}\n승인일시: ${new Date().toLocaleString(
              'ko-KR'
            )}`,
          });
        }

        alert(
          `연차가 승인되었습니다.\n승인 대상: ${employeeName}\n승인 일수: ${approvedDays}일\n승인일: ${new Date().toLocaleDateString(
            'ko-KR'
          )}`
        );

        setShowLeaveApprovalPopup(false);
        setLeaveApprovalData({ id: null, type: '', remark: '' });

        setTimeout(() => {
          devLog(`연차 승인 완료 - ${employeeName}: ${approvedDays}일`);
        }, 100);
      } catch (error) {
        console.error('❌ 연차 승인 실패:', error);
        alert('연차 승인 중 오류가 발생했습니다.');
      }
    } else {
      try {
        // DB에 반려 상태 저장
        const { default: LeaveAPI } = await import('../../api/leave');
        await LeaveAPI.updateStatus(id, {
          status: '반려',
          approvedBy: currentUser.id || currentUser.employeeId,
          approverName: currentUser.name,
          rejectionReason: finalRemark,
          remark: finalRemark,
        });

        // 로컬 state 업데이트
        const now = new Date();
        setLeaveRequests((prev) =>
          prev.map((lr) =>
            lr.id === id
              ? {
                  ...lr,
                  status: '반려',
                  rejectedAt: now,
                  rejectedBy: currentUser.id || currentUser.employeeId,
                  rejectedByName: currentUser.name,
                  rejectionReason: finalRemark,
                  remark: finalRemark,
                }
              : lr
          )
        );

        const targetEmployee = employees.find(
          (emp) => emp.id === targetLeave.employeeId
        );
        if (targetEmployee) {
          send자동알림({
            처리유형: '연차 반려',
            대상자: targetEmployee,
            처리자: currentUser.name,
            알림내용: `${employeeName}님의 ${
              targetLeave.type
            } 신청이 반려되었습니다.\n기간: ${targetLeave.startDate}${
              targetLeave.endDate !== targetLeave.startDate
                ? ` ~ ${targetLeave.endDate}`
                : ''
            }\n반려 사유: ${finalRemark}\n반려일시: ${new Date().toLocaleString(
              'ko-KR'
            )}`,
          });
        }
        alert(
          `연차가 반려되었습니다.\n대상: ${employeeName}\n반려 사유: ${finalRemark}`
        );

        setShowLeaveApprovalPopup(false);
        setLeaveApprovalData({ id: null, type: '', remark: '' });
      } catch (error) {
        console.error('❌ 연차 반려 실패:', error);
        alert('연차 반려 중 오류가 발생했습니다.');
      }
    }
  }, [
    leaveRequests,
    setLeaveRequests,
    employees,
    send자동알림,
    currentUser,
    devLog,
    leaveApprovalData,
    setShowLeaveApprovalPopup,
    setLeaveApprovalData,
  ]);

  // [2_관리자 모드] 2.6_연차 관리 - 연차 신청 목록 필터링
  const getFilteredLeaveRequests = useCallback(
    (leaveList) => {
      return leaveList.filter((lr) => {
        if (leaveSearch.year || leaveSearch.month || leaveSearch.day) {
          const requestDate = new Date(lr.requestDate);
          if (
            leaveSearch.year &&
            requestDate.getFullYear() !== parseInt(leaveSearch.year)
          ) {
            return false;
          }
          if (
            leaveSearch.month &&
            requestDate.getMonth() + 1 !== parseInt(leaveSearch.month)
          ) {
            return false;
          }
          if (
            leaveSearch.day &&
            requestDate.getDate() !== parseInt(leaveSearch.day)
          ) {
            return false;
          }
        }

        if (leaveSearch.status !== '전체' && lr.status !== leaveSearch.status) {
          return false;
        }

        if (leaveSearch.type !== '전체' && lr.type !== leaveSearch.type) {
          return false;
        }

        if (leaveSearch.keyword) {
          if (
            !lr.employeeId?.includes(leaveSearch.keyword) &&
            !lr.name?.includes(leaveSearch.keyword)
          ) {
            return false;
          }
        }

        return true;
      });
    },
    [leaveSearch]
  );

  // [2_관리자 모드] 2.6_연차 관리 - 연차 신청 목록 정렬
  const getSortedLeaveRequests = useCallback(
    (leaveList) => {
      if (!leaveSortField) return leaveList;

      return [...leaveList].sort((a, b) => {
        let aVal, bVal;

        switch (leaveSortField) {
          case 'applyDate':
            aVal = new Date(a.requestDate);
            bVal = new Date(b.requestDate);
            break;
          case 'id':
            aVal = a.employeeId;
            bVal = b.employeeId;
            break;
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'startDate':
            aVal = new Date(a.startDate);
            bVal = new Date(b.startDate);
            break;
          case 'endDate':
            aVal = new Date(a.endDate);
            bVal = new Date(b.endDate);
            break;
          case 'type':
            aVal = a.type;
            bVal = b.type;
            break;
          case 'reason':
            aVal = a.reason || '개인사정';
            bVal = b.reason || '개인사정';
            break;
          case 'contact':
            aVal = a.contact || '';
            bVal = b.contact || '';
            break;
          case 'status':
            aVal = a.status;
            bVal = b.status;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return leaveSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return leaveSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    },
    [leaveSortField, leaveSortOrder]
  );

  return {
    handleApproveLeave,
    handleRejectLeave,
    handleLeaveApprovalConfirm,
    getFilteredLeaveRequests,
    getSortedLeaveRequests,
  };
};

// ============================================================
// useAnnualLeaveManager.js
// ============================================================

// *[2_관리자 모드] 2.6.1_연차 기간 만료 체크 및 자동 갱신 훅*

/**
 * 연차 기간 만료 체크 및 자동 갱신을 관리하는 커스텀 훅
 * @param {Object} params - 훅 파라미터
 * @param {Array} params.employees - 직원 목록
 * @param {Function} params.setEmployees - 직원 목록 업데이트 함수
 * @param {Array} params.realtimeNotifications - 실시간 알림 목록
 * @param {Function} params.setRealtimeNotifications - 실시간 알림 업데이트 함수
 * @param {Function} params.setNotificationLogs - 알림 로그 업데이트 함수
 * @param {Function} params.calculateEmployeeAnnualLeave - 직원 연차 계산 함수
 * @param {Function} params.get연차갱신알림수신자 - 연차 갱신 알림 수신자 조회 함수
 * @param {Function} params.devLog - 개발 로그 함수
 */
export const useAnnualLeaveManager = ({
  employees,
  setEmployees,
  realtimeNotifications,
  setRealtimeNotifications,
  setNotificationLogs,
  calculateEmployeeAnnualLeave,
  get연차갱신알림수신자,
  devLog,
}) => {
  useEffect(() => {
    /**
     * 직원의 연차 정보를 리셋하는 함수
     */
    const resetEmployeeAnnualLeave = (
      employeeId,
      currentAnnualData,
      carryOverLeave = 0
    ) => {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === employeeId) {
            const nextPeriod = getNextAnnualPeriod(
              emp,
              emp.leaveYearEnd || calculateEmployeeAnnualLeave(emp).annualEnd
            );
            const totalAnnualWithCarryOver =
              nextPeriod.totalAnnual + carryOverLeave;

            return {
              ...emp,
              annualLeave: {
                total: totalAnnualWithCarryOver,
                used: 0, // 사용 연차 초기화
                remaining: totalAnnualWithCarryOver,
                carryOver: carryOverLeave, // 이월연차 기록
                baseAnnual: nextPeriod.totalAnnual, // 기본 연차 기록
              },
              usedAnnual: 0, // 기존 필드도 초기화
              totalAnnual: totalAnnualWithCarryOver,
              carryOverLeave: carryOverLeave,
              lastAnnualReset: new Date().toISOString(), // 마지막 갱신일 기록
            };
          }
          return emp;
        })
      );

      const nextPeriod = getNextAnnualPeriod(
        employees.find((e) => e.id === employeeId),
        currentAnnualData.annualEnd
      );
      const totalAnnualWithCarryOver = nextPeriod.totalAnnual + carryOverLeave;

      localStorage.setItem(
        `annualLeave_${employeeId}`,
        JSON.stringify({
          total: totalAnnualWithCarryOver,
          used: 0,
          remaining: totalAnnualWithCarryOver,
          carryOver: carryOverLeave,
          baseAnnual: nextPeriod.totalAnnual,
          resetDate: new Date().toISOString(),
        })
      );
    };

    /**
     * 연차 기간 만료를 체크하고 알림을 발송하는 메인 함수
     */
    const checkAnnualLeavePeriodExpiry = () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const year = today.getFullYear();
      const currentHour = today.getHours();

      const renewalRecordKey = `annualLeaveRenewal_${year}`;
      const renewalRecord = JSON.parse(
        localStorage.getItem(renewalRecordKey) || '{}'
      );

      let renewedEmployees = [];
      let newNotifications = [];

      employees.forEach((employee) => {
        const annualData = calculateEmployeeAnnualLeave(employee);
        const endDate = new Date(annualData.annualEnd);
        const daysUntilExpiry = Math.ceil(
          (endDate - today) / (1000 * 60 * 60 * 24)
        );

        // 180일 전 알림 (6개월 전)
        const notification180Key = `leaveExpiry180_${employee.id}_${year}`;
        if (
          daysUntilExpiry === 180 &&
          currentHour === 8 &&
          !localStorage.getItem(notification180Key)
        ) {
          const nextPeriod = getNextAnnualPeriod(
            employee,
            annualData.annualEnd
          );
          const notification180 = createExpiryNotification6Months(
            employee,
            annualData,
            nextPeriod,
            todayStr
          );
          newNotifications.push(notification180);
          localStorage.setItem(notification180Key, todayStr);

          const 대표 = employees.find(
            (emp) =>
              emp.department === '대표' &&
              emp.subDepartment === '대표' &&
              emp.role === '대표'
          );
          const 관리팀장 = employees.find(
            (emp) =>
              emp.department === '관리' &&
              emp.subDepartment === '관리' &&
              emp.role === '팀장'
          );
          const 관리자목록 = [대표, 관리팀장].filter(Boolean);

          관리자목록.forEach((관리자) => {
            const adminNotif = {
              ...notification180,
              id: Date.now() + Math.random(),
              recipients: { type: '개인', value: 관리자.name },
              employeeId: 관리자.id,
            };
            newNotifications.push(adminNotif);
          });
        }

        // 90일 전 알림 (3개월 전)
        const notification90Key = `leaveExpiry90_${employee.id}_${year}`;
        if (
          daysUntilExpiry === 90 &&
          currentHour === 8 &&
          !localStorage.getItem(notification90Key)
        ) {
          const nextPeriod = getNextAnnualPeriod(
            employee,
            annualData.annualEnd
          );
          const notification90 = createExpiryNotification3Months(
            employee,
            annualData,
            nextPeriod,
            todayStr
          );
          newNotifications.push(notification90);
          localStorage.setItem(notification90Key, todayStr);

          const 대표 = employees.find(
            (emp) =>
              emp.department === '대표' &&
              emp.subDepartment === '대표' &&
              emp.role === '대표'
          );
          const 관리팀장 = employees.find(
            (emp) =>
              emp.department === '관리' &&
              emp.subDepartment === '관리' &&
              emp.role === '팀장'
          );
          const 관리자목록 = [대표, 관리팀장].filter(Boolean);

          관리자목록.forEach((관리자) => {
            const adminNotif = {
              ...notification90,
              id: Date.now() + Math.random(),
              recipients: { type: '개인', value: 관리자.name },
              employeeId: 관리자.id,
            };
            newNotifications.push(adminNotif);
          });
        }

        // 30일 전 알림
        const notification30Key = `leaveExpiry30_${employee.id}_${year}`;
        if (
          daysUntilExpiry === 30 &&
          currentHour === 8 &&
          !localStorage.getItem(notification30Key)
        ) {
          const nextPeriod = getNextAnnualPeriod(
            employee,
            annualData.annualEnd
          );
          const notification30 = createExpiryNotification30Days(
            employee,
            annualData,
            nextPeriod,
            todayStr
          );
          newNotifications.push(notification30);
          localStorage.setItem(notification30Key, todayStr);

          const 대표 = employees.find(
            (emp) =>
              emp.department === '대표' &&
              emp.subDepartment === '대표' &&
              emp.role === '대표'
          );
          const 관리팀장 = employees.find(
            (emp) =>
              emp.department === '관리' &&
              emp.subDepartment === '관리' &&
              emp.role === '팀장'
          );
          const 관리자목록 = [대표, 관리팀장].filter(Boolean);

          관리자목록.forEach((관리자) => {
            const adminNotif = {
              ...notification30,
              id: Date.now() + Math.random(),
              recipients: { type: '개인', value: 관리자.name },
              employeeId: 관리자.id,
            };
            newNotifications.push(adminNotif);
          });
        }

        // 7일 전 알림
        const notification7Key = `leaveExpiry7_${employee.id}_${year}`;
        if (
          daysUntilExpiry === 7 &&
          currentHour === 8 &&
          !localStorage.getItem(notification7Key)
        ) {
          const nextPeriod = getNextAnnualPeriod(
            employee,
            annualData.annualEnd
          );
          const notification7 = createExpiryNotification7Days(
            employee,
            annualData,
            nextPeriod,
            todayStr
          );
          newNotifications.push(notification7);
          localStorage.setItem(notification7Key, todayStr);

          const 대표 = employees.find(
            (emp) =>
              emp.department === '대표' &&
              emp.subDepartment === '대표' &&
              emp.role === '대표'
          );
          const 관리팀장 = employees.find(
            (emp) =>
              emp.department === '관리' &&
              emp.subDepartment === '관리' &&
              emp.role === '팀장'
          );
          const 관리자목록 = [대표, 관리팀장].filter(Boolean);

          관리자목록.forEach((관리자) => {
            const adminNotif = {
              ...notification7,
              id: Date.now() + Math.random(),
              recipients: { type: '개인', value: 관리자.name },
              employeeId: 관리자.id,
            };
            newNotifications.push(adminNotif);
          });
        }

        // 자동 갱신 처리
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const isNextDayAfterExpiry =
          today.toISOString().split('T')[0] ===
          nextDay.toISOString().split('T')[0];

        if (
          isNextDayAfterExpiry &&
          currentHour === 8 &&
          !renewalRecord[employee.id]
        ) {
          devLog(
            `🔄 ${employee.name}님의 연차 기간이 만료되어 자동 갱신됩니다.`
          );

          const remainingLeave = annualData.remainAnnual;
          const carryOverLeave = calculateCarryOverLeave(remainingLeave);

          resetEmployeeAnnualLeave(employee.id, annualData, carryOverLeave);

          renewalRecord[employee.id] = {
            date: todayStr,
            carryOver: carryOverLeave,
            totalAnnual: annualData.totalAnnual,
          };

          const nextPeriod = getNextAnnualPeriod(
            employee,
            annualData.annualEnd
          );
          renewedEmployees.push({
            employee,
            nextPeriod,
            carryOverLeave,
          });

          const employeeNotification = createAnnualRenewalNotification(
            employee,
            annualData,
            nextPeriod,
            carryOverLeave,
            todayStr
          );

          newNotifications.push(employeeNotification);
        }
      });

      // 갱신 기록 저장
      if (Object.keys(renewalRecord).length > 0) {
        localStorage.setItem(renewalRecordKey, JSON.stringify(renewalRecord));
      }

      // 관리자용 갱신 보고 알림
      if (renewedEmployees.length > 0) {
        const adminNotificationKey = `adminLeaveRenewal_${year}`;
        const adminAlreadySent = localStorage.getItem(adminNotificationKey);

        if (!adminAlreadySent) {
          const adminNotification = createAdminRenewalNotification(
            renewedEmployees,
            year,
            todayStr
          );

          newNotifications.push(adminNotification);
          localStorage.setItem(adminNotificationKey, todayStr);
        }
      }

      // 알림 발송 및 로그 기록
      if (newNotifications.length > 0) {
        setRealtimeNotifications((prev) => [...newNotifications, ...prev]);

        // DB에 알림 로그 저장
        newNotifications.forEach(async (notification) => {
          try {
            const notificationLogData = {
              notificationType: '시스템',
              title: notification.title,
              content: notification.content,
              status: '진행중', // 직원들이 볼 수 있도록 '진행중' 상태로 저장
              startDate:
                notification.startDate ||
                new Date().toISOString().split('T')[0],
              endDate:
                notification.endDate || new Date().toISOString().split('T')[0],
              repeatCycle: '즉시',
              recipients: notification.recipients,
              priority: notification.priority || 'medium',
              // createdAt은 서버에서 자동 생성
            };

            await NotificationAPI.create(notificationLogData);

            const logEntry = {
              id: Date.now() + Math.random(),
              type: '연차관리',
              title: notification.title,
              recipients:
                notification.recipients.type === '개인'
                  ? notification.recipients.value
                  : '관리자',
              content: notification.content,
              createdAt: new Date().toLocaleString('ko-KR'),
              completedAt: null,
              처리유형: '연차갱신알림',
              우선순위: notification.priority || 'medium',
            };
            setNotificationLogs((prev) => [logEntry, ...prev]);
          } catch (error) {
            console.error('❌ 연차 알림 로그 DB 저장 실패:', error);
          }
        });
      }
    };

    // ⚠️ DEPRECATED: 연차 갱신 로직이 서버로 이동되었습니다.
    // 📍 서버: server/utils/annualLeaveScheduler.js
    // 📍 매일 오전 8시에 자동 실행 (cron 스케줄러)
    devLog('[연차관리] ⚠️ 프론트엔드 연차 갱신 로직은 deprecated - 서버에서 처리 중');

    // 최초 실행 - DISABLED (서버에서 처리)
    // checkAnnualLeavePeriodExpiry();

    // 매일 자동 실행 - DISABLED (서버에서 처리)
    // const interval = setInterval(
    //   checkAnnualLeavePeriodExpiry,
    //   24 * 60 * 60 * 1000
    // );

    return () => {}; // cleanup 불필요
  }, [devLog]);
};

// ============================================================
// [2_관리자 모드] 2.5_연차 관리 - SERVICES
// ============================================================

// ============ annualLeaveService.js ============
// *[2_관리자 모드] 2.6_연차 관리 서비스*

/**
 * 직원의 다음 연차 기간 정보를 계산하는 함수
 * @param {Object} employee - 직원 정보 객체
 * @returns {Object} 다음 연차 기간 정보 (annualStart, annualEnd, totalAnnual, years)
 */
export const getNextAnnualPeriod = (employee, currentAnnualEnd = null) => {
  const hireDate = new Date(employee.hireDate || employee.joinDate);

  if (isNaN(hireDate.getTime())) {
    console.error('Invalid hire date for employee:', employee);
    return { annualStart: '', annualEnd: '', totalAnnual: 15, years: 0 };
  }

  // 현재 연차 종료일을 기준으로 다음 연차 기간 계산
  let annualStartDate;
  if (currentAnnualEnd) {
    // 현재 연차 종료일이 제공된 경우, 그 다음날부터 시작
    annualStartDate = new Date(currentAnnualEnd);
    annualStartDate.setDate(annualStartDate.getDate() + 1);
  } else {
    // 제공되지 않은 경우, 현재 년도 기준으로 계산
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const thisYearStart = new Date(
      currentYear,
      hireDate.getMonth(),
      hireDate.getDate()
    );

    // 현재 날짜가 올해 연차 시작일 이전이면 작년 기준, 이후면 내년 기준
    if (currentDate >= thisYearStart) {
      annualStartDate = new Date(
        currentYear + 1,
        hireDate.getMonth(),
        hireDate.getDate()
      );
    } else {
      annualStartDate = new Date(
        currentYear,
        hireDate.getMonth(),
        hireDate.getDate()
      );
    }
  }

  const annualStart = `${annualStartDate.getFullYear()}-${String(
    annualStartDate.getMonth() + 1
  ).padStart(2, '0')}-${String(annualStartDate.getDate()).padStart(2, '0')}`;

  // 연차 종료일은 시작일로부터 1년 후 -1일
  const endDate = new Date(annualStartDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const annualEnd = `${endDate.getFullYear()}-${String(
    endDate.getMonth() + 1
  ).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  // 근속년수 계산 (다음 연차 시작일 기준)
  let years = annualStartDate.getFullYear() - hireDate.getFullYear();
  let months = annualStartDate.getMonth() - hireDate.getMonth();
  let days = annualStartDate.getDate() - hireDate.getDate();

  // 일 단위 계산: 기준일의 일자가 입사일자보다 작으면 한 달을 차감
  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let totalAnnual = 0;
  if (years < 1) {
    const totalMonths = years * 12 + months;
    totalAnnual = Math.min(totalMonths, 11);
  } else {
    totalAnnual = 15;
    const additionalYears = Math.floor((years - 1) / 2);
    totalAnnual += Math.min(additionalYears, 10);
  }

  return { annualStart, annualEnd, totalAnnual, years };
};

/**
 * 연차 이월 한도 계산
 * @param {number} remainingLeave - 잔여 연차
 * @returns {number} 이월 가능한 연차 (최대 11일)
 */
export const calculateCarryOverLeave = (remainingLeave) => {
  return Math.min(remainingLeave, 11); // 법정 이월 한도 11일
};

/**
 * 연차 갱신 알림 생성
 * @param {Object} employee - 직원 정보
 * @param {Object} annualData - 현재 연차 정보
 * @param {Object} nextPeriod - 다음 연차 기간 정보
 * @param {number} carryOverLeave - 이월 연차
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createAnnualRenewalNotification = (
  employee,
  annualData,
  nextPeriod,
  carryOverLeave,
  todayStr
) => {
  return {
    id: Date.now() + Math.random(),
    title: `📢 연차 기간 자동 갱신 알림`,
    content: `${employee.name}님의 연차가 새 기준으로 자동 갱신되었습니다.\n\n📅 새 연차 기간: ${nextPeriod.annualStart} ~ ${nextPeriod.annualEnd}\n📊 기본 연차: ${nextPeriod.totalAnnual}일`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '개인', value: employee.name },
    priority: 'high',
    isAutoGenerated: true,
    employeeId: employee.id,
  };
};

/**
 * 연차 만료 예정 알림 생성 (6개월 전)
 * @param {Object} employee - 직원 정보
 * @param {Object} annualData - 현재 연차 정보
 * @param {Object} nextPeriod - 다음 연차 기간 정보
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createExpiryNotification6Months = (
  employee,
  annualData,
  nextPeriod,
  todayStr
) => {
  return {
    id: Date.now() + Math.random(),
    title: `📅 연차 기간 만료 예정 알림 (6개월 전)`,
    content: `${employee.name}님의 잔여 연차가 6개월 후 소멸될 예정입니다.기간 내 사용해 주시기 바랍니다.\n\n📅 현재 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n📊 총 연차: ${annualData.totalAnnual}일\n✅ 사용 연차: ${annualData.usedAnnual}일\n🔄 잔여 연차: ${annualData.remainAnnual}일`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '개인', value: employee.name },
    priority: 'low',
    isAutoGenerated: true,
    employeeId: employee.id,
  };
};

/**
 * 연차 만료 예정 알림 생성 (3개월 전)
 * @param {Object} employee - 직원 정보
 * @param {Object} annualData - 현재 연차 정보
 * @param {Object} nextPeriod - 다음 연차 기간 정보
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createExpiryNotification3Months = (
  employee,
  annualData,
  nextPeriod,
  todayStr
) => {
  return {
    id: Date.now() + Math.random(),
    title: `📅 연차 기간 만료 예정 알림 (3개월 전)`,
    content: `${employee.name}님의 잔여 연차가 3개월 후 소멸될 예정입니다.본 알림 수신 후 2주 이내에 사용 여부를 관리팀에 회신해 주시기 바랍니다. \n기한 내 회신 및 사용이 없을 경우 연차는 소멸될 수 있습니다.\n\n📅 현재 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n📊 총 연차: ${annualData.totalAnnual}일\n✅ 사용 연차: ${annualData.usedAnnual}일\n🔄 잔여 연차: ${annualData.remainAnnual}일`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '개인', value: employee.name },
    priority: 'low',
    isAutoGenerated: true,
    employeeId: employee.id,
  };
};

/**
 * 연차 만료 예정 알림 생성 (30일 전)
 * @param {Object} employee - 직원 정보
 * @param {Object} annualData - 현재 연차 정보
 * @param {Object} nextPeriod - 다음 연차 기간 정보
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createExpiryNotification30Days = (
  employee,
  annualData,
  nextPeriod,
  todayStr
) => {
  return {
    id: Date.now() + Math.random(),
    title: `📅 연차 기간 만료 예정 알림 (30일 전)`,
    content: `${employee.name}님의 잔여 연차가 1개월 후 소멸될 예정입니다.기간 내 사용해 주시기 바랍니다.\n\n📅 현재 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n📊 총 연차: ${annualData.totalAnnual}일\n✅ 사용 연차: ${annualData.usedAnnual}일\n🔄 잔여 연차: ${annualData.remainAnnual}일`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '개인', value: employee.name },
    priority: 'medium',
    isAutoGenerated: true,
    employeeId: employee.id,
  };
};

/**
 * 연차 만료 임박 알림 생성 (7일 전)
 * @param {Object} employee - 직원 정보
 * @param {Object} annualData - 현재 연차 정보
 * @param {Object} nextPeriod - 다음 연차 기간 정보
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createExpiryNotification7Days = (
  employee,
  annualData,
  nextPeriod,
  todayStr
) => {
  return {
    id: Date.now() + Math.random(),
    title: `⚠️ 연차 기간 만료 임박 알림 (7일 전)`,
    content: `${employee.name}님의 잔여 연차가 7일 후 소멸될 예정입니다.기간 내 사용해 주시기 바랍니다.\n\n📅 현재 연차 기간: ${annualData.annualStart} ~ ${annualData.annualEnd}\n📊 총 연차: ${annualData.totalAnnual}일\n✅ 사용 연차: ${annualData.usedAnnual}일\n🔄 잔여 연차: ${annualData.remainAnnual}일\n\n 📅 새 연차 기간: ${nextPeriod.annualStart} ~ ${nextPeriod.annualEnd}`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '개인', value: employee.name },
    priority: 'high',
    isAutoGenerated: true,
    employeeId: employee.id,
  };
};

/**
 * 관리자용 연차 갱신 보고 알림 생성
 * @param {Array} renewedEmployees - 갱신된 직원 목록
 * @param {number} year - 연도
 * @param {string} todayStr - 오늘 날짜 문자열
 * @returns {Object} 알림 객체
 */
export const createAdminRenewalNotification = (
  renewedEmployees,
  year,
  todayStr
) => {
  const employeeList = renewedEmployees
    .map(
      (r) =>
        `• ${r.employee.name} (${r.employee.department || '미지정'}): 기본 ${
          r.nextPeriod.totalAnnual
        }일 + 이월 ${r.carryOverLeave}일`
    )
    .join('\n');

  return {
    id: Date.now() + Math.random() + 1,
    title: `📋 ${year}년도 연차 기간 자동 갱신 보고`,
    content: `${year}년도 연차가 ${renewedEmployees.length}명의 직원에게 자동 갱신되었습니다.\n\n📊 갱신 내역:\n${employeeList}\n\n관리자는 연차 내역 및 이월분을 검토하시기 바랍니다.`,
    status: '진행중',
    createdAt: todayStr,
    completedAt: null,
    startDate: todayStr,
    endDate: todayStr,
    repeatCycle: '즉시',
    recipients: { type: '관리자', value: '관리자' },
    priority: 'medium',
    isAutoGenerated: true,
  };
};

// ============ leaveNotificationService.js ============
// *[2_관리자 모드] 연차 알림 관리 서비스*

// *[2_관리자 모드] 2.6_연차 갱신 알림 수신자*
/**
 * 연차 갱신 시 알림을 받을 수신자 조회 (대표, 관리팀장)
 * @param {Object} 직원정보 - 연차 갱신 대상 직원 정보
 * @returns {Array} 중복 제거된 수신자 목록
 */
export const get연차갱신알림수신자 = (직원정보) => {
  // useAnnualLeaveManager에서 employees를 closure로 접근
  return [];
};

// *[2_관리자 모드] 2.6_연차 알림 대상자*
/**
 * 직원의 부서/세부부서/직책에 따라 연차 신청/승인/반려 알림을 받을 대상자 조회
 * @param {Array} employees - 직원 배열
 * @param {Object} 직원정보 - 연차 관련 직원 정보
 * @param {Object} 신청자정보 - 연차 신청자 정보 (옵션)
 * @param {string} 처리유형 - 처리 유형 (신청/승인/반려)
 * @returns {Array} 알림 대상자 목록
 */
export const get연차알림대상자 = (
  employees,
  직원정보,
  신청자정보 = null,
  처리유형 = ''
) => {
  const { department: 부서, subDepartment: 세부부서, role: 직책 } = 직원정보;
  let 알림대상자들 = [];

  if (부서 === '대표' && 세부부서 === '대표' && 직책 === '대표') {
    return [];
  }

  if (부서 === '임원' && 세부부서 === '임원' && 직책 === '임원') {
    const 대표 = employees.find(
      (emp) =>
        emp.department === '대표' &&
        emp.subDepartment === '대표' &&
        emp.role === '대표'
    );
    if (대표) 알림대상자들.push(대표);
  } else if (['가공', '관리', '영업'].includes(부서) && 부서 === 세부부서) {
    if (['팀장', '반장', '조장'].includes(직책)) {
      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);
    } else if (직책 === '팀원') {
      const 부서관리자들 = employees.filter(
        (emp) =>
          emp.department === 부서 &&
          emp.subDepartment === 세부부서 &&
          ['팀장', '반장', '조장'].includes(emp.role)
      );
      알림대상자들.push(...부서관리자들);

      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);
    }
  } else if (부서 === '출하' && 세부부서 === '출하') {
    if (['팀장', '반장', '조장'].includes(직책)) {
      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 영업부서전원 = employees.filter(
        (emp) => emp.department === '영업' && emp.subDepartment === '영업'
      );
      알림대상자들.push(...영업부서전원);
    } else if (직책 === '팀원') {
      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 출하관리자들 = employees.filter(
        (emp) =>
          emp.department === '출하' &&
          emp.subDepartment === '출하' &&
          ['팀장', '반장', '조장'].includes(emp.role)
      );
      알림대상자들.push(...출하관리자들);

      const 영업부서전원 = employees.filter(
        (emp) => emp.department === '영업' && emp.subDepartment === '영업'
      );
      알림대상자들.push(...영업부서전원);
    }
  } else if (['생산관리', '품질'].includes(부서) && 부서 === 세부부서) {
    if (['팀장', '반장', '조장'].includes(직책)) {
      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 임원총괄 = employees.find(
        (emp) =>
          emp.department === '임원' &&
          emp.subDepartment === '임원' &&
          emp.role === '임원'
      );
      if (임원총괄) 알림대상자들.push(임원총괄);
    } else if (직책 === '팀원') {
      const 부서관리자들 = employees.filter(
        (emp) =>
          emp.department === 부서 &&
          emp.subDepartment === 세부부서 &&
          ['팀장', '반장', '조장'].includes(emp.role)
      );
      알림대상자들.push(...부서관리자들);

      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 임원총괄 = employees.find(
        (emp) =>
          emp.department === '임원' &&
          emp.subDepartment === '임원' &&
          emp.role === '임원'
      );
      if (임원총괄) 알림대상자들.push(임원총괄);
    }
  } else if (
    부서 === '생산' &&
    [
      '열',
      '표면',
      '구부',
      '인발',
      '교정/절단',
      '검사',
      '금형',
      '공무',
    ].includes(세부부서)
  ) {
    if (['팀장', '반장', '조장'].includes(직책)) {
      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 임원총괄 = employees.find(
        (emp) =>
          emp.department === '임원' &&
          emp.subDepartment === '임원' &&
          emp.role === '임원'
      );
      if (임원총괄) 알림대상자들.push(임원총괄);

      const 생산관리전원 = employees.filter(
        (emp) =>
          emp.department === '생산관리' && emp.subDepartment === '생산관리'
      );
      알림대상자들.push(...생산관리전원);
    } else if (직책 === '팀원') {
      const 세부부서관리자들 = employees.filter(
        (emp) =>
          emp.department === 부서 &&
          emp.subDepartment === 세부부서 &&
          ['팀장', '반장', '조장'].includes(emp.role)
      );
      알림대상자들.push(...세부부서관리자들);

      const 대표 = employees.find(
        (emp) =>
          emp.department === '대표' &&
          emp.subDepartment === '대표' &&
          emp.role === '대표'
      );
      if (대표) 알림대상자들.push(대표);

      const 임원총괄 = employees.find(
        (emp) =>
          emp.department === '임원' &&
          emp.subDepartment === '임원' &&
          emp.role === '임원'
      );
      if (임원총괄) 알림대상자들.push(임원총괄);

      const 생산관리전원 = employees.filter(
        (emp) =>
          emp.department === '생산관리' && emp.subDepartment === '생산관리'
      );
      알림대상자들.push(...생산관리전원);
    }
  }

  const 중복제거알림대상자들 = 알림대상자들.filter(
    (emp, index, self) => index === self.findIndex((e) => e.id === emp.id)
  );

  if (신청자정보 && 처리유형.includes('신청')) {
    return 중복제거알림대상자들.filter((대상자) => 대상자.id !== 신청자정보.id);
  }

  if (신청자정보 && (처리유형.includes('승인') || 처리유형.includes('반려'))) {
    const 신청자포함대상자들 = [...중복제거알림대상자들];
    if (!신청자포함대상자들.find((emp) => emp.id === 신청자정보.id)) {
      신청자포함대상자들.push(신청자정보);
    }
    return 신청자포함대상자들;
  }

  return 중복제거알림대상자들;
};

// *[2_관리자 모드] 2.7_부서 관리자 및 대표이사 찾기*
/**
 * 부서와 세부부서를 기반으로 관리자 직책과 대표이사 조회
 * @param {Array} employees - 직원 배열
 * @param {Array} admins - 관리자 배열
 * @param {string} 직원부서 - 직원의 부서
 * @param {Object} 신청자정보 - 신청자 정보 (옵션)
 * @param {string} 처리유형 - 처리 유형
 * @param {string} 세부부서 - 세부부서 (옵션)
 * @returns {Array} 부서 관리자 및 대표이사 목록
 */
export const get부서관리자및대표이사 = (
  employees,
  admins,
  직원부서,
  신청자정보 = null,
  처리유형 = '',
  세부부서 = null
) => {
  const 관리자직책 = ['팀장', '조장', '반장'];

  const 부서관리자들 = employees.filter((emp) => {
    const 부서일치 = emp.department === 직원부서;
    const 관리자직책일치 = 관리자직책.some((직책) =>
      emp.position?.includes(직책)
    );
    const 세부부서일치 = !세부부서 || emp.subDepartment === 세부부서;

    return 부서일치 && 관리자직책일치 && 세부부서일치;
  });

  const 대표이사 =
    admins.find((admin) => admin.position === '대표') ||
    employees.find(
      (emp) => emp.position === '대표이사' || emp.position === '대표'
    );

  let 알림대상자들 = [...부서관리자들];
  if (대표이사 && !알림대상자들.find((관리자) => 관리자.id === 대표이사.id)) {
    알림대상자들.push(대표이사);
  }

  if (신청자정보 && 처리유형.includes('신청')) {
    알림대상자들 = 알림대상자들.filter((대상자) => 대상자.id !== 신청자정보.id);
  }

  return 알림대상자들;
};

// ============================================================
// [2_관리자 모드] 2.5_연차 관리 - UTILS
// ============================================================

/**
 * 연차 신청 목록 필터링
 * @param {Array} leaveList - 연차 신청 목록
 * @param {Object} leaveSearch - 검색 조건
 * @returns {Array} 필터링된 연차 신청 목록
 */
export const filterLeaveRequests = (leaveList, leaveSearch) => {
  return leaveList.filter((lr) => {
    if (leaveSearch.year || leaveSearch.month || leaveSearch.day) {
      const requestDate = new Date(lr.requestDate);
      if (
        leaveSearch.year &&
        requestDate.getFullYear() !== parseInt(leaveSearch.year)
      ) {
        return false;
      }
      if (
        leaveSearch.month &&
        requestDate.getMonth() + 1 !== parseInt(leaveSearch.month)
      ) {
        return false;
      }
      if (
        leaveSearch.day &&
        requestDate.getDate() !== parseInt(leaveSearch.day)
      ) {
        return false;
      }
    }

    if (leaveSearch.status !== '전체' && lr.status !== leaveSearch.status) {
      return false;
    }

    if (leaveSearch.type !== '전체' && lr.type !== leaveSearch.type) {
      return false;
    }

    if (leaveSearch.keyword) {
      if (
        !lr.employeeId?.includes(leaveSearch.keyword) &&
        !lr.name?.includes(leaveSearch.keyword)
      ) {
        return false;
      }
    }

    return true;
  });
};

/**
 * 연차 신청 목록 정렬
 * @param {Array} leaveList - 연차 신청 목록
 * @param {string} leaveSortField - 정렬 필드
 * @param {string} leaveSortOrder - 정렬 순서 ('asc' or 'desc')
 * @returns {Array} 정렬된 연차 신청 목록
 */
export const sortLeaveRequests = (
  leaveList,
  leaveSortField,
  leaveSortOrder
) => {
  if (!leaveSortField) return leaveList;

  return [...leaveList].sort((a, b) => {
    let aVal, bVal;

    switch (leaveSortField) {
      case 'applyDate':
        aVal = new Date(a.requestDate);
        bVal = new Date(b.requestDate);
        break;
      case 'id':
        aVal = a.employeeId;
        bVal = b.employeeId;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'startDate':
        aVal = new Date(a.startDate);
        bVal = new Date(b.startDate);
        break;
      case 'endDate':
        aVal = new Date(a.endDate);
        bVal = new Date(b.endDate);
        break;
      case 'type':
        aVal = a.type;
        bVal = b.type;
        break;
      case 'reason':
        aVal = a.reason || '개인사정';
        bVal = b.reason || '개인사정';
        break;
      case 'contact':
        aVal = a.contact || '';
        bVal = b.contact || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'leaveDays':
        // 사용일수 계산: 연차는 실제 일수, 반차는 0.5
        if (a.type === '연차') {
          const aStart = new Date(a.startDate);
          const aEnd = new Date(a.endDate);
          aVal = Math.abs((aEnd - aStart) / (1000 * 60 * 60 * 24)) + 1;
        } else if (a.type && a.type.startsWith('반차')) {
          aVal = 0.5;
        } else {
          aVal = 0;
        }

        if (b.type === '연차') {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          bVal = Math.abs((bEnd - bStart) / (1000 * 60 * 60 * 24)) + 1;
        } else if (b.type && b.type.startsWith('반차')) {
          bVal = 0.5;
        } else {
          bVal = 0;
        }
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return leaveSortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return leaveSortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * 직원 연차 계산
 * @param {Object} employee - 직원 정보
 * @param {Array} leaveRequests - 연차 신청 목록
 * @returns {Object} 연차 정보 (총 연차, 사용 연차, 잔여 연차 등)
 */
export const calculateEmployeeAnnualLeave = (employee, leaveRequests) => {
  const hireDate = new Date(employee.hireDate || employee.joinDate);

  if (isNaN(hireDate.getTime())) {
    console.error('Invalid hire date for employee:', employee);
    return {
      annualStart: '',
      annualEnd: '',
      totalAnnual: 0,
      usedAnnual: 0,
      remainAnnual: 0,
      years: 0,
      months: 0,
    };
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  let annualStart = `${currentYear}-${String(hireDate.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(hireDate.getDate()).padStart(2, '0')}`;

  let endDate = new Date(
    currentYear + 1,
    hireDate.getMonth(),
    hireDate.getDate()
  );
  endDate.setDate(endDate.getDate() - 1);
  let annualEnd = `${endDate.getFullYear()}-${String(
    endDate.getMonth() + 1
  ).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const currentAnnualStartDate = new Date(annualStart);
  if (currentDate < currentAnnualStartDate) {
    annualStart = `${currentYear - 1}-${String(
      hireDate.getMonth() + 1
    ).padStart(2, '0')}-${String(hireDate.getDate()).padStart(2, '0')}`;

    endDate = new Date(currentYear, hireDate.getMonth(), hireDate.getDate());
    endDate.setDate(endDate.getDate() - 1);
    annualEnd = `${endDate.getFullYear()}-${String(
      endDate.getMonth() + 1
    ).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  }

  const now = new Date();
  let years = now.getFullYear() - hireDate.getFullYear();
  let months = now.getMonth() - hireDate.getMonth();
  let days = now.getDate() - hireDate.getDate();

  // 일 단위 계산: 현재 일자가 입사일자보다 작으면 한 달을 차감
  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const savedAnnualData = employee.annualLeave;

  let defaultTotalAnnual = 0;

  if (years < 1) {
    const totalMonths = years * 12 + months;
    defaultTotalAnnual = Math.min(totalMonths, 11); // 최대 11개 (1년 미만)
  } else {
    defaultTotalAnnual = 15; // 기본 15일

    const additionalYears = Math.floor((years - 1) / 2);
    defaultTotalAnnual += Math.min(additionalYears, 10); // 최대 10일 추가 (총 25일)
  }

  let usedAnnual = 0;

  // DB 데이터를 최우선으로 사용 (usedLeave 또는 leaveUsed)
  if (employee.usedLeave !== undefined) {
    usedAnnual = employee.usedLeave;
  } else if (employee.leaveUsed !== undefined) {
    usedAnnual = employee.leaveUsed;
  } else if (savedAnnualData && savedAnnualData.used !== undefined) {
    usedAnnual = savedAnnualData.used;
  } else {
    const annualStartDate = new Date(annualStart);
    const annualEndDate = new Date(annualEnd);

    usedAnnual = leaveRequests
      .filter((leave) => {
        const matchesEmployee =
          leave.employeeId === employee.id || leave.name === employee.name;
        const isApproved = leave.status === '승인';
        const leaveType = leave.type || leave.leaveType || '';
        const isAnnualLeave =
          leaveType === '연차' || leaveType.includes('반차');

        if (!matchesEmployee || !isApproved || !isAnnualLeave) return false;

        const leaveStartDate = new Date(leave.startDate);
        const leaveEndDate = new Date(leave.endDate || leave.startDate);

        return (
          (leaveStartDate >= annualStartDate &&
            leaveStartDate <= annualEndDate) ||
          (leaveEndDate >= annualStartDate && leaveEndDate <= annualEndDate) ||
          (leaveStartDate <= annualStartDate && leaveEndDate >= annualEndDate)
        );
      })
      .reduce((sum, leave) => {
        const leaveType = leave.type || leave.leaveType || '';

        // 반차: 0.5일 차감
        if (leaveType.includes('반차')) return sum + 0.5;

        // 경조사, 공가, 휴직: 미차감
        if (
          leaveType === '경조' ||
          leaveType === '공가' ||
          leaveType === '휴직'
        ) {
          return sum;
        }

        // 연차: 실제 사용일수 차감
        if (leaveType === '연차') {
          if (leave.approvedDays) {
            return sum + leave.approvedDays;
          }

          if (leave.startDate && leave.endDate) {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const days = Math.abs((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return sum + days;
          }
        }

        // 외출, 조퇴, 결근, 기타: 1.0일 (관리자 승인 시 일수 직접 지정 가능)
        return sum + (leave.approvedDays || leave.days || 1);
      }, 0);
  }

  const totalAnnual =
    savedAnnualData?.total || employee.totalAnnual || defaultTotalAnnual;

  const carryOverLeave =
    savedAnnualData?.carryOver || employee.carryOverLeave || 0;
  const baseAnnual = savedAnnualData?.baseAnnual || defaultTotalAnnual;

  return {
    annualStart,
    annualEnd,
    years,
    months,
    totalAnnual,
    usedAnnual,
    remainAnnual: totalAnnual - usedAnnual,
    carryOverLeave, // 이월연차
    baseAnnual, // 기본연차 (이월 제외)
  };
};

/**
 * 직원 연차 현황 엑셀 다운로드
 * @param {Array} employees - 직원 목록
 * @param {Function} calculateEmployeeAnnualLeave - 연차 계산 함수
 * @param {Array} leaveRequests - 연차 신청 내역
 */
export const exportEmployeeLeaveStatusToXLSX = (
  employees,
  calculateEmployeeAnnualLeave,
  leaveRequests = []
) => {
  const employeeLeaveData = employees.map((emp) => {
    const annualData = calculateEmployeeAnnualLeave(emp, leaveRequests);
    return {
      사번: emp.employeeNumber || emp.id,
      이름: emp.name,
      직급: emp.position || '사원',
      부서: emp.department || '미분류',
      직책: emp.role || '미분류',
      입사일: emp.hireDate || emp.joinDate || '미등록',
      근속년수: `${annualData.years}년 ${annualData.months}개월`,
      연차시작일: annualData.annualStart,
      연차종료일: annualData.annualEnd,
      기본연차:
        annualData.baseAnnual ||
        annualData.totalAnnual - (annualData.carryOverLeave || 0),
      이월연차: annualData.carryOverLeave || 0,
      총연차: annualData.totalAnnual,
      사용연차: annualData.usedAnnual,
      잔여연차: annualData.remainAnnual,
    };
  });

  const ws = XLSX.utils.json_to_sheet(employeeLeaveData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '직원연차현황');

  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  XLSX.writeFile(wb, `부성스틸(주)_직원연차현황_${yyyy}${mm}${dd}.xlsx`);
};

/**
 * 연차 신청 내역 엑셀 다운로드
 * @param {Array} leaveData - 연차 신청 내역 목록
 * @param {Function} formatDateByLang - 날짜 포맷 함수
 */
export const exportLeaveHistoryToXLSX = (leaveData, formatDateByLang) => {
  const rows = leaveData.map((lv) => ({
    신청일: formatDateByLang(lv.requestDate),
    결재일: lv.approvedAt
      ? formatDateByLang(lv.approvedAt)
      : lv.rejectedAt
      ? formatDateByLang(lv.rejectedAt)
      : '-',
    사번: lv.employeeId,
    이름: lv.name,
    시작일: formatDateByLang(lv.startDate),
    종료일: formatDateByLang(lv.endDate),
    유형: lv.type,
    사유: lv.reason || '개인사정',
    비상연락망: lv.contact || '',
    비고: lv.remark || '-',
    상태: lv.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '연차내역');

  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');

  XLSX.writeFile(wb, `부성스틸(주)_연차내역_${yyyy}${mm}${dd}.xlsx`);
};

// ============================================================
// [2_관리자 모드] 2.5_연차 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 * - useAnnualLeaveEditor: 연차 수정 Hook
 *   - handleEditAnnualLeave: 연차 수정 시작
 *   - handleSaveAnnualLeave: 연차 수정 저장
 *   - handleCancelAnnualLeaveEdit: 연차 수정 취소
 * - useLeaveApproval: 연차 승인/반려 Hook
 *   - handleApproveLeave: 연차 승인
 *   - handleRejectLeave: 연차 반려
 *   - getFilteredLeaveRequests: 연차 신청 목록 필터링
 *   - getSortedLeaveRequests: 연차 신청 목록 정렬
 * - useAnnualLeaveManager: 연차 기간 만료 체크 및 자동 갱신 Hook
 * - getNextAnnualPeriod: 다음 연차 기간 정보 계산
 * - calculateCarryOverLeave: 연차 이월 한도 계산
 * - createAnnualRenewalNotification: 연차 갱신 알림 생성
 * - createExpiryNotification30Days: 연차 만료 예정 알림 생성 (30일 전)
 * - createExpiryNotification7Days: 연차 만료 임박 알림 생성 (7일 전)
 * - createAdminRenewalNotification: 관리자용 연차 갱신 보고 알림 생성
 * - get연차갱신알림수신자: 연차 갱신 알림 수신자 조회
 * - get연차알림대상자: 연차 신청/승인/반려 알림 대상자 조회
 * - get부서관리자및대표이사: 부서 관리자 및 대표이사 조회
 * - filterLeaveRequests: 연차 신청 목록 필터링 함수
 * - sortLeaveRequests: 연차 신청 목록 정렬 함수
 * - calculateEmployeeAnnualLeave: 직원 연차 계산 함수
 * - exportEmployeeLeaveStatusToXLSX: 직원 연차 현황 엑셀 다운로드
 * - exportLeaveHistoryToXLSX: 연차 신청 내역 엑셀 다운로드
 */
