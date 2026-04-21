import { useState, useEffect, useCallback } from 'react';
import { AttendanceAPI } from '../api/attendance';
import EmployeeAPI from '../api/employee';
import LeaveAPI from '../api/leave';
import { SafetyAccidentAPI } from '../api/safety';
import {
  useDashboardAttendance,
  useDashboardCalculations,
  useDashboardActions,
  useDashboardStats,
} from '../components/common/common_admin_dashboard';
import {
  calculateEmployeeAnnualLeave as calculateEmployeeAnnualLeaveUtil,
  formatDateByLang,
} from '../components/common/common_common';
import { formatDateToString } from '../utils/dateUtils';

/**
 * *[2_관리자 모드] 대시보드 통합 컨트롤러 훅*
 *
 * 담당:
 *  - 대시보드 전용 state 31개
 *  - useDashboardAttendance / useDashboardCalculations / useDashboardStats / useDashboardActions
 *  - 대시보드 전용 useEffect (초기 근태 로드, 날짜 변경, AI 자동분석, AI 히스토리, 탭 진입 새로고침, 60분 자동갱신)
 *  - refreshDashboardData, handleAiPromptSave
 *
 * App.js에서 받아야 하는 공유 상태/함수 목록은 파라미터 목록 참고
 */
const useDashboardController = ({
  // ─── Context ───
  currentUser,
  activeTab,
  API_BASE_URL,
  devLog,

  // ─── 공유 데이터 (읽기 전용) ───
  employees,
  leaveRequests,
  safetyAccidents,
  setSafetyAccidents,
  suggestions,
  evaluations,
  notices,
  admins,

  // ─── 공유 근태 시트 상태 (쌍방향) ───
  attendanceSheetData,
  setAttendanceSheetData,
  attendanceSheetYear,
  attendanceSheetMonth,
  setAttendanceSheetYear,
  setAttendanceSheetMonth,

  // ─── 공유 setters (refreshDashboardData 에서 사용) ───
  setEmployees,
  setLeaveRequests,

  // ─── 공유 계산 함수 ───
  analyzeAttendanceStatusForDashboard,
  getAttendanceForEmployee,
  isHolidayDate,
  calculateMonthlyStats,
  getMonthlyAnnualLeave,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  calcDailyWage,
  getDaysInMonth,
  categorizeWorkTime,
  getWorkTypeForDate,
  send자동알림,

  // ─── AI ───
  unifiedApiKey,
  geminiApiKey,
  chatgptApiKey,
  claudeApiKey,
  getActiveAiKey,
}) => {
  /* ─────────────────────────────────────────
     STATE — 대시보드 날짜/필터
  ───────────────────────────────────────── */
  const [dashboardDateFilter, setDashboardDateFilter] = useState('today');
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState(
    formatDateToString(new Date())
  );
  // eslint-disable-next-line no-unused-vars
  const [dashboardStats, setDashboardStats] = useState(null); // 레거시 state

  /* ─────────────────────────────────────────
     STATE — 대시보드 근태 기록
  ───────────────────────────────────────── */
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [attendanceSummaries, setAttendanceSummaries] = useState([]);

  /* ─────────────────────────────────────────
     STATE — 워라밸 & 목표 팝업
  ───────────────────────────────────────── */
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears] = useState([
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ]);
  const [showGoalDetailsPopup, setShowGoalDetailsPopup] = useState(false);
  const [showWorkLifeBalancePopup, setShowWorkLifeBalancePopup] = useState(false);
  const [showWorkLifeDetailPopup, setShowWorkLifeDetailPopup] = useState(false);
  const [workLifeDetailMetric, setWorkLifeDetailMetric] = useState(null);
  const [workLifeDetailMonth, setWorkLifeDetailMonth] = useState(null);
  const [selectedViolationMonth, setSelectedViolationMonth] = useState(null);
  const [showGoalDetailDataPopup, setShowGoalDetailDataPopup] = useState(false);
  const [goalDetailMetric, setGoalDetailMetric] = useState(null);
  const [goalDetailMonth, setGoalDetailMonth] = useState(null);

  /* ─────────────────────────────────────────
     STATE — 스트레스/정렬 설정
  ───────────────────────────────────────── */
  const [stressSortColumn, setStressSortColumn] = useState('value');
  const [stressSortDirection, setStressSortDirection] = useState('desc');
  const [isStressCalculationExpanded, setIsStressCalculationExpanded] = useState(false);
  const [overtimeSortConfig, setOvertimeSortConfig] = useState({ field: null, order: 'asc' });
  const [leaveSortConfig, setLeaveSortConfig] = useState({ field: null, order: 'asc' });
  const [violationSortConfig, setViolationSortConfig] = useState({ field: null, order: 'asc' });

  /* ─────────────────────────────────────────
     STATE — AI 관련
  ───────────────────────────────────────── */
  // localStorage 우선 로드 (lazy init)
  const [aiPromptSettings, setAiPromptSettings] = useState(() => {
    const saved = localStorage.getItem('aiPromptSettings');
    if (saved === null) return '';

    // 과거/혼합 저장 포맷(문자열 또는 JSON 객체) 모두 수용
    try {
      const parsed = JSON.parse(saved);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        return parsed.dashboard || parsed.dashboardRecommendation || '';
      }
    } catch (_e) {
      // plain string 저장값
    }

    return saved;
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [showAiHistoryPopup, setShowAiHistoryPopup] = useState(false);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [aiRecommendationHistory, setAiRecommendationHistory] = useState([]);

  /* ─────────────────────────────────────────
     STATE — 안전사고 UI
  ───────────────────────────────────────── */
  const [showSafetyAccidentInput, setShowSafetyAccidentInput] = useState(false);
  const [safetyAccidentPage, setSafetyAccidentPage] = useState(1);
  const [safetyAccidentSearch, setSafetyAccidentSearch] = useState({
    year: '',
    month: '',
    severity: '',
    content: '',
  });

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 초기 출근현황 로드
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadDashboardAttendance = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const response = await AttendanceAPI.getMonthlyData(year, month);
        if (response && response.data) {
          setAttendanceRecords(response.data);
        }
      } catch (e) {
        //  console.error('근태 연동 실패', e);
      }
    };
    loadDashboardAttendance();
  }, [API_BASE_URL, activeTab]);

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 날짜 변경 시 해당 월 근태 데이터 로드
  ───────────────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'dashboard' && dashboardSelectedDate) {
      const selectedDate = new Date(dashboardSelectedDate);
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth() + 1;
      if (
        selectedYear !== attendanceSheetYear ||
        selectedMonth !== attendanceSheetMonth
      ) {
        setAttendanceSheetYear(selectedYear);
        setAttendanceSheetMonth(selectedMonth);
      }
    }
  }, [activeTab, dashboardSelectedDate, attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     훅 — useDashboardAttendance
  ───────────────────────────────────────── */
  // *[2_관리자 모드] 2.1_대시보드 - 출근 상태 관리*
  const {
    showEmployeeListPopup,
    setShowEmployeeListPopup,
    selectedStatus,
    setSelectedStatus,
    selectedStatusEmployees,
    setSelectedStatusEmployees,
    selectedStatusDate,
    setSelectedStatusDate,
    attendanceListSortField,
    setAttendanceListSortField,
    attendanceListSortOrder,
    setAttendanceListSortOrder,
    getEmployeesByStatus,
    getPopupList,
    handleStatusClick,
    handleNightStatusClick,
    handleAttendanceListSort,
    getSortedAttendanceEmployees,
    handleDownloadAttendanceList,
  } = useDashboardAttendance({
    employees,
    dashboardDateFilter,
    dashboardSelectedDate,
    getAttendanceForEmployee,
    analyzeAttendanceStatusForDashboard,
    attendanceRecords,
    attendanceSheetData,
    devLog,
    isHolidayDate,
  });

  /* ─────────────────────────────────────────
     훅 — useDashboardCalculations
  ───────────────────────────────────────── */
  // *[2_관리자 모드] 2.1_대시보드 계산 함수 훅*
  const {
    getFilteredEmployees,
    calculateAttendanceRate,
    calculateLateRate,
    calculateAbsentRate,
    calculateTurnoverRate,
    calculateAverageOvertimeHours,
    calculateLeaveUsageRate,
    calculateMonthlyLeaveUsageRate,
    calculateWeekly52HoursViolation,
    calculateStressIndex,
  } = useDashboardCalculations({
    employees,
    isHolidayDate,
    getAttendanceForEmployee,
    analyzeAttendanceStatusForDashboard,
    calculateMonthlyStats,
    leaveRequests,
    getMonthlyAnnualLeave,
    calcDailyWage,
    getUsedAnnualLeave,
    calculateAnnualLeave,
    safetyAccidents,
    suggestions,
    evaluations,
    notices,
  });

  /* ─────────────────────────────────────────
     훅 — useDashboardStats
  ───────────────────────────────────────── */
  // *[2_관리자 모드] 2.1_대시보드 - 통계 관리 훅*
  const { dashboardStatsReal, goalStats, workLifeBalanceStats } = useDashboardStats({
    employees,
    dashboardDateFilter,
    dashboardSelectedDate,
    attendanceSheetData,
    getAttendanceForEmployee,
    analyzeAttendanceStatusForDashboard,
    devLog,
    calculateAttendanceRate,
    calculateLateRate,
    calculateAbsentRate,
    calculateTurnoverRate,
    calculateAverageOvertimeHours,
    calculateLeaveUsageRate,
    calculateWeekly52HoursViolation,
    calculateStressIndex,
    leaveRequests,
    isHolidayDate,
  });

  /* ─────────────────────────────────────────
     훅 — useDashboardActions
  ───────────────────────────────────────── */
  // *[2_관리자 모드] 2.1_대시보드 - 액션 관리 훅*
  const {
    generateAiRecommendations,
    downloadAiHistory,
    getWorkLifeBalanceDataByYear,
    getViolationDetails,
    send52HourViolationAlert,
    getWorkLifeDetailData,
    getGoalDataByYear,
    getGoalDetailData,
  } = useDashboardActions({
    employees,
    aiRecommendations,
    setAiRecommendations,
    setIsAnalyzing,
    isAnalyzing,
    aiRecommendationHistory,
    setAiRecommendationHistory,
    getAttendanceForEmployee,
    calcDailyWage,
    leaveRequests,
    send자동알림,
    devLog,
    getFilteredEmployees,
    analyzeAttendanceStatusForDashboard,
    getDaysInMonth,
    calculateMonthlyLeaveUsageRate,
    getUsedAnnualLeave,
    calculateAnnualLeave,
    categorizeWorkTime,
    isHolidayDate,
    getWorkTypeForDate,
    API_BASE_URL,
    aiPromptSettings,
    dashboardStats: dashboardStatsReal,
    suggestions,
    notices,
    admins,
    safetyAccidents,
    evaluations,
  });

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 AI 추천 자동 분석
  ───────────────────────────────────────── */
  // ✅ 로그인 시에만 AI 추천사항 실행 (새로고침 시에는 실행하지 않음)
  useEffect(() => {
    const currentApiKey =
      unifiedApiKey ||
      getActiveAiKey(unifiedApiKey, geminiApiKey, chatgptApiKey, claudeApiKey);

    // ✅ sessionStorage에서 로그인 직후인지 확인
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');

    if (
      currentUser?.isAdmin &&
      activeTab === 'dashboard' &&
      currentApiKey &&
      !isAnalyzing &&
      justLoggedIn === 'true' // ✅ 로그인 직후에만 실행
    ) {
      // ✅ 플래그 제거 (한 번만 실행)
      sessionStorage.removeItem('justLoggedIn');
      generateAiRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentUser,
    activeTab,
    unifiedApiKey,
    geminiApiKey,
    chatgptApiKey,
    claudeApiKey,
    isAnalyzing,
  ]);

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 AI 추천 히스토리 초기 로딩
  ───────────────────────────────────────── */
  useEffect(() => {
    const loadAiHistory = async () => {
      if (currentUser?.isAdmin) {
        try {
          const historyResponse = await fetch(`${API_BASE_URL}/ai/recommendations`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            setAiRecommendationHistory(
              historyData.slice(0, 10).map((item) => ({
                id: item._id || item.id,
                type: 'ai-analysis',
                title: item.title,
                content: item.content,
                date: item.date,
                time: item.time,
                createdAt: item.createdAt || item.timestamp,
                recommendations: item.recommendations,
              }))
            );
            devLog('✅ AI 추천사항 히스토리 로딩 완료:', historyData.length, '건');
          }
        } catch (error) {
          devLog('⚠️ AI 추천사항 히스토리 로딩 실패:', error);
        }
      }
    };
    loadAiHistory();
  }, [currentUser?.id]); // [4차 패치] [currentUser] → [currentUser?.id]: 루프 재실행 방지

  /* ─────────────────────────────────────────
     CALLBACK — 대시보드 수동 새로고침
  ───────────────────────────────────────── */
  const refreshDashboardData = useCallback(async () => {
    if (currentUser?.isAdmin) {
      try {
        devLog('🔄 대시보드 데이터 갱신 시작');

        // 1. 현재 월의 근태 데이터 다시 로드
        if (attendanceSheetYear && attendanceSheetMonth) {
          const attendanceData = await AttendanceAPI.getMonthlyData(
            attendanceSheetYear,
            attendanceSheetMonth
          );
          if (attendanceData && attendanceData.length > 0) {
            const formattedData = {};
            attendanceData.forEach((record) => {
              const key = `${record.employeeId}_${record.year}_${record.month}_${record.day}`;
              formattedData[key] = {
                checkIn: record.checkIn || '',
                checkOut: record.checkOut || '',
                status: record.status || '',
                isLate: record.isLate || false,
                shift: record.shift || '',
              };
            });
            setAttendanceSheetData(formattedData);
            devLog('✅ 근태 데이터 갱신 완료');
          }
        }

        // 2. 직원 데이터 다시 로드
        const dbEmployees = await EmployeeAPI.list();
        if (dbEmployees && dbEmployees.length > 0) {
          const formattedEmployees = dbEmployees.map((emp) => {
            const baseEmp = {
              id: emp.employeeId,
              name: emp.name,
              password: emp.password || emp.phone?.slice(-4) || '0000',
              phone: emp.phone,
              department: emp.department,
              subDepartment: emp.subDepartment || '',
              position: emp.position,
              role: emp.role,
              joinDate: formatDateToString(emp.joinDate),
              leaveDate:
                emp.leaveDate && emp.leaveDate !== '1970-01-01T00:00:00.000Z'
                  ? formatDateToString(emp.leaveDate)
                  : '',
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규',
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin,
              leaveUsed: emp.leaveUsed,
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const annualData = calculateEmployeeAnnualLeaveUtil(baseEmp, leaveRequests);
            return {
              ...baseEmp,
              leaveYearStart: annualData.annualStart,
              leaveYearEnd: annualData.annualEnd,
              totalAnnualLeave: annualData.totalAnnual,
              usedAnnualLeave: annualData.usedAnnual,
              remainingAnnualLeave: annualData.remainAnnual,
            };
          });
          setEmployees(formattedEmployees);
          devLog('✅ 직원 데이터 갱신 완료');
        }

        // 3. 연차 데이터 다시 로드
        const dbLeaves = await LeaveAPI.list();
        if (dbLeaves && dbLeaves.length > 0) {
          const formattedLeaves = dbLeaves.map((leave) => ({
            id: leave._id,
            employeeId: leave.employeeId,
            employeeName: leave.employeeName,
            name: leave.employeeName || leave.name,
            department: leave.department,
            leaveType: leave.leaveType,
            type: leave.leaveType || leave.type,
            startDate: formatDateByLang(leave.startDate),
            endDate: formatDateByLang(leave.endDate),
            days: leave.requestedDays,
            requestedDays: leave.requestedDays,
            reason: leave.reason,
            contact: leave.contact,
            status: leave.status,
            requestDate: formatDateByLang(leave.requestDate || leave.createdAt),
            approvedAt: leave.approvedAt,
            approver: leave.approver,
            approverName: leave.approverName,
            approvedDays: leave.approvedDays,
            rejectedAt: leave.rejectedAt,
            rejectedBy: leave.rejectedBy,
            rejectedByName: leave.rejectedByName,
            rejectionReason: leave.rejectionReason,
            startTime: leave.startTime || null,
            endTime: leave.endTime || null,
          }));
          setLeaveRequests(formattedLeaves);
          devLog('✅ 연차 데이터 갱신 완료');
        } else {
          setLeaveRequests([]);
          devLog('✅ 연차 데이터 갱신 완료 (0건)');
        }

        // 4. 안전사고 데이터 다시 로드
        const accidents = await SafetyAccidentAPI.list();
        if (accidents && Array.isArray(accidents)) {
          setSafetyAccidents(accidents.map((a) => ({ ...a, id: a._id || a.id })));
          devLog('✅ 안전사고 데이터 갱신 완료');
        }

        devLog('🎉 대시보드 데이터 갱신 완료');
      } catch (error) {
        console.error('❌ 대시보드 데이터 갱신 실패:', error);
      }
    }
  }, [currentUser, attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 탭 진입 시 데이터 갱신
  ───────────────────────────────────────── */
  useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'dashboard') {
      refreshDashboardData();
    }
  }, [activeTab, currentUser, refreshDashboardData]);

  /* ─────────────────────────────────────────
     EFFECT — 대시보드 출근현황 60분 자동 갱신
  ───────────────────────────────────────── */
  useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'dashboard') {
      const interval = setInterval(async () => {
        try {
          devLog('⏰ [60분 자동 갱신] 출근현황 데이터 갱신 시작');
          if (attendanceSheetYear && attendanceSheetMonth) {
            const attendanceData = await AttendanceAPI.getMonthlyData(
              attendanceSheetYear,
              attendanceSheetMonth
            );
            if (attendanceData && attendanceData.length > 0) {
              const formattedData = {};
              attendanceData.forEach((record) => {
                const key = `${record.employeeId}_${record.year}_${record.month}_${record.day}`;
                formattedData[key] = {
                  checkIn: record.checkIn || '',
                  checkOut: record.checkOut || '',
                  status: record.status || '',
                  isLate: record.isLate || false,
                  shift: record.shift || '',
                };
              });
              setAttendanceSheetData(formattedData);
              devLog('✅ [60분 자동 갱신] 출근현황 데이터 갱신 완료');
            }
          }
        } catch (error) {
          console.error('❌ [60분 자동 갱신] 출근현황 데이터 갱신 실패:', error);
        }
      }, 60 * 60 * 1000); // 60분
      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser, attendanceSheetYear, attendanceSheetMonth]);

  /* ─────────────────────────────────────────
     FUNCTION — AI 프롬프트 저장
  ───────────────────────────────────────── */
  const handleAiPromptSave = async (prompt) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: {
            dashboard:
              typeof prompt === 'string' ? prompt : prompt.dashboard || '',
            chatbot: typeof prompt === 'string' ? '' : prompt.chatbot || '',
            analysis: typeof prompt === 'string' ? '' : prompt.analysis || '',
          },
        }),
      });

      if (!response.ok) throw new Error('프롬프트 저장 실패');

      localStorage.setItem(
        'aiPromptSettings',
        typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
      );
      setAiPromptSettings(prompt);
      setShowPromptSettings(false);
      alert('AI 프롬프트가 저장되었습니다.');
      devLog('✅ AI 프롬프트 저장 완료');
    } catch (error) {
      devLog('❌ AI 프롬프트 저장 실패:', error);
      alert('AI 프롬프트 저장에 실패했습니다.');
    }
  };

  /* ─────────────────────────────────────────
     RETURN
  ───────────────────────────────────────── */
  return {
    // 날짜/필터
    dashboardDateFilter, setDashboardDateFilter,
    dashboardSelectedDate, setDashboardSelectedDate,

    // Stats (useDashboardStats)
    dashboardStatsReal,
    goalStats,
    workLifeBalanceStats,

    // 연도/팝업
    selectedYear, setSelectedYear,
    availableYears,
    showGoalDetailsPopup, setShowGoalDetailsPopup,
    showWorkLifeBalancePopup, setShowWorkLifeBalancePopup,
    showWorkLifeDetailPopup, setShowWorkLifeDetailPopup,
    workLifeDetailMetric, setWorkLifeDetailMetric,
    workLifeDetailMonth, setWorkLifeDetailMonth,
    selectedViolationMonth, setSelectedViolationMonth,
    showGoalDetailDataPopup, setShowGoalDetailDataPopup,
    goalDetailMetric, setGoalDetailMetric,
    goalDetailMonth, setGoalDetailMonth,

    // 스트레스/정렬
    stressSortColumn, setStressSortColumn,
    stressSortDirection, setStressSortDirection,
    isStressCalculationExpanded, setIsStressCalculationExpanded,
    overtimeSortConfig, setOvertimeSortConfig,
    leaveSortConfig, setLeaveSortConfig,
    violationSortConfig, setViolationSortConfig,

    // AI
    aiPromptSettings, setAiPromptSettings,
    isAnalyzing,
    aiRecommendations,
    showAiHistoryPopup, setShowAiHistoryPopup,
    showPromptSettings, setShowPromptSettings,
    aiRecommendationHistory,

    // 안전사고 UI
    showSafetyAccidentInput, setShowSafetyAccidentInput,
    safetyAccidentPage, setSafetyAccidentPage,
    safetyAccidentSearch, setSafetyAccidentSearch,

    // useDashboardAttendance
    showEmployeeListPopup, setShowEmployeeListPopup,
    selectedStatus, setSelectedStatus,
    selectedStatusEmployees, setSelectedStatusEmployees,
    selectedStatusDate, setSelectedStatusDate,
    attendanceListSortField, setAttendanceListSortField,
    attendanceListSortOrder, setAttendanceListSortOrder,
    getEmployeesByStatus, getPopupList,
    handleStatusClick, handleNightStatusClick,
    handleAttendanceListSort, getSortedAttendanceEmployees,
    handleDownloadAttendanceList,

    // useDashboardCalculations
    getFilteredEmployees,
    calculateAttendanceRate,
    calculateLateRate,
    calculateAbsentRate,
    calculateTurnoverRate,
    calculateAverageOvertimeHours,
    calculateLeaveUsageRate,
    calculateMonthlyLeaveUsageRate,
    calculateWeekly52HoursViolation,
    calculateStressIndex,

    // useDashboardActions
    generateAiRecommendations,
    downloadAiHistory,
    getWorkLifeBalanceDataByYear,
    getViolationDetails,
    send52HourViolationAlert,
    getWorkLifeDetailData,
    getGoalDataByYear,
    getGoalDetailData,

    // 대시보드 함수
    refreshDashboardData,
    handleAiPromptSave,
  };
};

export default useDashboardController;
