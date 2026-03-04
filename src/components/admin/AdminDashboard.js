import React, { useState, useEffect } from 'react';
import { Settings, FileText, X, Download, Trash2 } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  getGoalDetailDataUtil,
  getWorkLifeBalanceDataByYearUtil,
  getWorkLifeDetailDataUtil,
} from '../common/common_admin_dashboard';

/**
 * ADMIN ① 대시보드 컴포넌트
 * 관리자 모드에서 출근현황, 승인대기함, 목표달성률, 워라밸 지표, 안전 현황, AI 추천사항을 표시
 * UI만 담당하며 모든 로직과 상태는 props로 받음
 */
const AdminDashboard = ({
  currentUser,
  // 상태값
  dashboardDateFilter,
  setDashboardDateFilter,
  dashboardSelectedDate,
  setDashboardSelectedDate,
  dashboardStats,
  leaveRequests,
  suggestions,
  selectedYear,
  setSelectedYear,
  showGoalDetailsPopup,
  setShowGoalDetailsPopup,
  showWorkLifeBalancePopup,
  setShowWorkLifeBalancePopup,
  showSafetyAccidentInput,
  setShowSafetyAccidentInput,
  aiRecommendations,
  isAnalyzing,
  showAiHistoryPopup,
  setShowAiHistoryPopup,
  showPromptSettings,
  setShowPromptSettings,
  goalStats,
  workLifeBalanceStats,
  activeTab,
  setActiveTab,
  setLeaveManagementTab,
  // 워라밸 팝업 관련
  availableYears,
  attendanceSheetData,
  showWorkLifeDetailPopup,
  setShowWorkLifeDetailPopup,
  workLifeDetailMetric,
  setWorkLifeDetailMetric,
  workLifeDetailMonth,
  setWorkLifeDetailMonth,
  selectedViolationMonth,
  setSelectedViolationMonth,
  stressSortColumn,
  setStressSortColumn,
  stressSortDirection,
  setStressSortDirection,
  isStressCalculationExpanded,
  setIsStressCalculationExpanded,
  overtimeSortConfig,
  setOvertimeSortConfig,
  leaveSortConfig,
  setLeaveSortConfig,
  violationSortConfig,
  setViolationSortConfig,
  // 목표달성률 팝업 관련
  showGoalDetailDataPopup,
  setShowGoalDetailDataPopup,
  goalDetailMetric,
  setGoalDetailMetric,
  goalDetailMonth,
  setGoalDetailMonth,
  employees,
  analyzeAttendanceStatusForDashboard,
  isHolidayDate,
  getWorkTypeForDate,
  calcDailyWage,
  calculateMonthlyLeaveUsageRate,
  getUsedAnnualLeave,
  calculateAnnualLeave,
  getDaysInMonth,
  evaluations,
  notices,
  // 새로운 팝업 관련 props
  safetyAccidents,
  setSafetyAccidents,
  safetyAccidentPage,
  setSafetyAccidentPage,
  safetyAccidentSearch,
  setSafetyAccidentSearch,
  editDate,
  setEditDate,
  editCreatedAt,
  setEditCreatedAt,
  editContent,
  setEditContent,
  editSeverity,
  setEditSeverity,
  aiPromptSettings,
  setAiPromptSettings,
  // 함수
  getTodayDateWithDay,
  getYesterdayDateWithDay,
  getStatusTextColor,
  handleStatusClick,
  handleNightStatusClick,
  getTodaySafetyAccidents,
  getThisMonthSafetyAccidents,
  getThisYearSafetyAccidents,
  getAccidentFreeDays,
  generateAiRecommendations,
  refreshDashboardData,
  getFilteredEmployees,
  getGoalDataByYear,
  getGoalDetailData,
  getWorkLifeBalanceDataByYear,
  getViolationDetails,
  send52HourViolationAlert,
  getWorkLifeDetailData,
  handleSafetyAccidentInput,
  handleEditSafety,
  handleDeleteSafety,
  handleSaveAccidentEdit,
  handleCancelAccidentEdit,
  downloadAiHistory,
  handleAiPromptSave,
  editingAccidentId,
  setEditingAccidentId,
  aiRecommendationHistory,
  // 직원 리스트 팝업 관련
  showEmployeeListPopup,
  setShowEmployeeListPopup,
  selectedStatusDate,
  selectedStatus,
  selectedStatusEmployees,
  attendanceListSortField,
  attendanceListSortOrder,
  formatDateWithDay,
  handleDownloadAttendanceList,
  handleAttendanceListSort,
  getSortedAttendanceEmployees,
}) => {
  // 연도별 목표 데이터 state
  const [yearlyGoalData, setYearlyGoalData] = useState({
    attendance: [],
    tardiness: [],
    absence: [],
    turnover: [],
  });
  const [isLoadingYearlyData, setIsLoadingYearlyData] = useState(false);

  // 목표달성률 상세 팝업용 월별 근태 데이터 state
  const [popupMonthData, setPopupMonthData] = useState([]);

  // 워라밸 팝업용 연도별 근태 데이터 state (차트 및 상세 팝업 모두 사용)
  const [workLifeYearData, setWorkLifeYearData] = useState({});

  // selectedYear 변경 시 데이터 로드
  useEffect(() => {
    const loadYearlyData = async () => {
      if (!getGoalDataByYear) return;

      setIsLoadingYearlyData(true);
      try {
        const data = await getGoalDataByYear(selectedYear);
        setYearlyGoalData(data);
      } catch (error) {
        console.error('연도별 데이터 로드 실패:', error);
        // 에러 시 빈 데이터로 초기화
        setYearlyGoalData({
          attendance: Array(12).fill(null),
          tardiness: Array(12).fill(null),
          absence: Array(12).fill(null),
          turnover: Array(12).fill(null),
        });
      } finally {
        setIsLoadingYearlyData(false);
      }
    };

    loadYearlyData();
  }, [selectedYear, getGoalDataByYear, isHolidayDate]);

  // 팝업이 열릴 때 해당 월의 근태 데이터 로드
  useEffect(() => {
    const loadPopupData = async () => {
      if (!showGoalDetailDataPopup) {
        setPopupMonthData([]);
        return;
      }

      try {
        const BASE_URL =
          process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
        const month = goalDetailMonth + 1;
        const response = await fetch(
          `${BASE_URL}/attendance/monthly/${selectedYear}/${month}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        const data = result.success
          ? result.data
          : Array.isArray(result)
          ? result
          : [];
        setPopupMonthData(data);
      } catch (error) {
        console.error('팝업용 데이터 로드 실패:', error);
        setPopupMonthData([]);
      }
    };

    loadPopupData();
  }, [showGoalDetailDataPopup, selectedYear, goalDetailMonth]);

  // 워라밸 팝업이 열릴 때 연도별 모든 월 데이터 로드 (차트 표시용)
  useEffect(() => {
    const loadWorkLifeYearData = async () => {
      if (!showWorkLifeBalancePopup) {
        setWorkLifeYearData({});
        return;
      }

      const BASE_URL =
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

      // Promise.all로 병렬 처리
      const promises = [];
      for (let month = 1; month <= 12; month++) {
        promises.push(
          fetch(`${BASE_URL}/attendance/monthly/${selectedYear}/${month}`)
            .then((response) => {
              if (!response.ok) return { month, data: [] };
              return response.json().then((result) => ({
                month,
                data: result.success
                  ? result.data
                  : Array.isArray(result)
                  ? result
                  : [],
              }));
            })
            .catch(() => ({ month, data: [] }))
        );
      }

      const results = await Promise.all(promises);
      const yearData = {};
      results.forEach(({ month, data }) => {
        yearData[month] = data;
      });

      setWorkLifeYearData(yearData);
    };

    loadWorkLifeYearData();
  }, [showWorkLifeBalancePopup, selectedYear]);

  return (
    <div className="space-y-4">
      {/* 상단: 오늘 출근현황 + 승인대기함 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* BEGIN ADMIN - 주간/야간 출근현황 분리 */}
        <div className="space-y-4">
          {/* 주간 출근현황 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  {dashboardDateFilter === 'today'
                    ? getTodayDateWithDay()
                    : new Date(dashboardSelectedDate).toLocaleDateString(
                        'ko-KR',
                        {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        }
                      )}{' '}
                  주간 출근현황 (08:30-17:30)
                </h3>
                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                  총 {dashboardStats.totalDayShift}명
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshDashboardData}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1"
                  title="대시보드 데이터 새로고침"
                >
                  🔄 새로고침
                </button>
                <select
                  value={dashboardDateFilter}
                  onChange={(e) => setDashboardDateFilter(e.target.value)}
                  className="px-1 py-1 text-xs border border-blue-300 rounded bg-white text-blue-700"
                >
                  <option value="today">오늘</option>
                  <option value="custom">날짜선택</option>
                </select>
                {dashboardDateFilter === 'custom' && (
                  <input
                    type="date"
                    value={dashboardSelectedDate}
                    onChange={(e) => setDashboardSelectedDate(e.target.value)}
                    className="px-1 py-1 text-xs border border-blue-300 rounded bg-white text-blue-700"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div
                className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleStatusClick('출근')}
              >
                <span className="text-xs text-gray-700">출근</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '출근'
                  )}`}
                >
                  {dashboardStats.present}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleStatusClick('지각')}
              >
                <span className="text-xs text-gray-700">지각</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '지각'
                  )}`}
                >
                  {dashboardStats.late}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleStatusClick('결근')}
              >
                <span className="text-xs text-gray-700">결근</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '결근'
                  )}`}
                >
                  {dashboardStats.absent}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-blue-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleStatusClick('연차')}
              >
                <span className="text-xs text-gray-700">연차</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '연차'
                  )}`}
                >
                  {dashboardStats.leave}명
                </span>
              </div>
            </div>
          </div>

          {/* 야간 출근현황 */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-purple-800">
                  {dashboardDateFilter === 'today'
                    ? `${getYesterdayDateWithDay()} 출근 → ${getTodayDateWithDay()} 야간 근무현황 (19:00-04:00)`
                    : (() => {
                        const selectedDate = new Date(dashboardSelectedDate);
                        const prevDate = new Date(selectedDate);
                        prevDate.setDate(selectedDate.getDate() - 1);
                        return `${prevDate.toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })} 출근 → ${selectedDate.toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })} 야간 근무현황 (19:00-04:00)`;
                      })()}
                </h3>
                <span className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                  총 {dashboardStats.totalNightShift}명
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={dashboardDateFilter}
                  onChange={(e) => setDashboardDateFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-purple-300 rounded bg-white text-purple-700"
                >
                  <option value="today">오늘</option>
                  <option value="custom">날짜선택</option>
                </select>
                {dashboardDateFilter === 'custom' && (
                  <input
                    type="date"
                    value={dashboardSelectedDate}
                    onChange={(e) => setDashboardSelectedDate(e.target.value)}
                    className="px-2 py-1 text-xs border border-purple-300 rounded bg-white text-purple-700"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div
                className="bg-white p-3 rounded-lg border border-purple-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleNightStatusClick('출근')}
              >
                <span className="text-xs text-gray-700">출근</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '출근'
                  )}`}
                >
                  {dashboardStats.nightPresent}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-purple-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleNightStatusClick('지각')}
              >
                <span className="text-xs text-gray-700">지각</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '지각'
                  )}`}
                >
                  {dashboardStats.nightLate}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-purple-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleNightStatusClick('결근')}
              >
                <span className="text-xs text-gray-700">결근</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '결근'
                  )}`}
                >
                  {dashboardStats.nightAbsent}명
                </span>
              </div>
              <div
                className="bg-white p-3 rounded-lg border border-purple-100 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={() => handleNightStatusClick('연차')}
              >
                <span className="text-xs text-gray-700">연차</span>
                <span
                  className={`text-lg font-bold mt-1 ${getStatusTextColor(
                    '연차'
                  )}`}
                >
                  {dashboardStats.nightLeave}명
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* END ADMIN */}

        {/* 승인대기함 */}
        <div className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col justify-between">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            승인대기함
          </h3>
          <div className="flex flex-row gap-4 w-full h-full">
            {/* BEGIN ADMIN - 클릭 네비게이션 추가 */}
            {/* 연차 승인대기 */}
            <div
              className="flex-1 flex flex-col items-center justify-center bg-blue-100 rounded-lg p-6 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => {
                setActiveTab('leave-management');
                setLeaveManagementTab('leave-history');
              }}
            >
              <span className="text-2xl font-bold text-blue-900 mb-1">
                연차
              </span>
              <span className="text-5xl font-extrabold text-blue-700">
                {leaveRequests.filter((lr) =>
                  currentUser?.allowedDepartments?.length
                    ? lr.status === '대기' && currentUser.allowedDepartments.includes(lr.department)
                    : lr.status === '확인'
                ).length}건
              </span>
            </div>
            {/* 건의 사항 승인대기 */}
            <div
              className="flex-1 flex flex-col items-center justify-center bg-blue-100 rounded-lg p-6 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => setActiveTab('suggestion-management')}
            >
              <span className="text-2xl font-bold text-blue-900 mb-1">
                건의 사항
              </span>
              <span className="text-5xl font-extrabold text-blue-700">
                {suggestions.filter((s) =>
                  currentUser?.allowedDepartments?.length
                    ? s.status === '대기' && currentUser.allowedDepartments.includes(s.department)
                    : s.status === '확인'
                ).length}건
              </span>
            </div>
            {/* END ADMIN */}
          </div>
        </div>
      </div>

      {/* 중단: 목표달성률 + 워라밸/안전/교육 현황 + 안전 현황 */}
      <div className={`grid grid-cols-1 ${currentUser?.allowedDepartments?.length ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-4`}>
        {/* 목표달성률 */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">
              이번달 목표달성률 ({new Date().getFullYear()} /{' '}
              {String(new Date().getMonth() + 1).padStart(2, '0')})
            </h3>
            {!currentUser?.allowedDepartments?.length && (
              <button
                onClick={() => {
                  setSelectedYear(new Date().getFullYear());
                  setShowGoalDetailsPopup(true);
                }}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
              >
                더 보기
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">출근률:</span>
              <span className="font-bold text-green-600">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const monthIndex =
                    selectedYear === currentYear ? currentMonth : 11;
                  const rate = yearlyGoalData.attendance?.[monthIndex];
                  return rate !== null && rate !== undefined ? `${rate}%` : '-';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">지각률:</span>
              <span className="font-bold text-yellow-600">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const monthIndex =
                    selectedYear === currentYear ? currentMonth : 11;
                  const rate = yearlyGoalData.tardiness?.[monthIndex];
                  return rate !== null && rate !== undefined ? `${rate}%` : '-';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">결근률:</span>
              <span className="font-bold text-red-600">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const monthIndex =
                    selectedYear === currentYear ? currentMonth : 11;
                  const rate = yearlyGoalData.absence?.[monthIndex];
                  return rate !== null && rate !== undefined ? `${rate}%` : '-';
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">퇴사율:</span>
              <span className="font-bold text-orange-600">
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  const monthIndex =
                    selectedYear === currentYear ? currentMonth : 11;
                  const rate = yearlyGoalData.turnover?.[monthIndex];
                  return rate !== null && rate !== undefined ? `${rate}%` : '-';
                })()}
              </span>
            </div>
          </div>
        </div>
        {/* 워라밸 지표 - 제한 관리자는 비표시 */}
        {!currentUser?.allowedDepartments?.length && <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold">
              이번달 워라밸 지표 ({new Date().getFullYear()} /{' '}
              {String(new Date().getMonth() + 1).padStart(2, '0')})
            </h4>
            <button
              onClick={() => {
                setSelectedYear(new Date().getFullYear());
                setShowWorkLifeBalancePopup(true);
              }}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
            >
              더 보기
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">평균 특근시간</span>
              <span
                className={`font-bold ${
                  workLifeBalanceStats.averageOvertimeHours > 2
                    ? 'text-red-600'
                    : workLifeBalanceStats.averageOvertimeHours > 1
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {workLifeBalanceStats.averageOvertimeHours.toFixed(1)}시간
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">연차 사용률</span>
              <span
                className={`font-bold ${
                  workLifeBalanceStats.leaveUsageRate > 70
                    ? 'text-green-600'
                    : workLifeBalanceStats.leaveUsageRate > 50
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}
              >
                {workLifeBalanceStats.leaveUsageRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">스트레스 지수</span>
              <span
                className={`font-bold ${
                  workLifeBalanceStats.stressIndex > 70
                    ? 'text-red-600'
                    : workLifeBalanceStats.stressIndex > 50
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {workLifeBalanceStats.stressIndex}점
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">
                근로시간 관리 검토 대상 ({new Date().getFullYear()}-
                {String(new Date().getMonth() + 1).padStart(2, '0')})
              </span>
              <span
                className={`font-bold ${
                  workLifeBalanceStats.weekly52HoursViolation > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {workLifeBalanceStats.weekly52HoursViolation}건
              </span>
            </div>
          </div>
        </div>}
        {/* 안전 현황 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold">안전 현황</h4>
            <button
              className="font-bold text-blue-500 text-xs hover:text-blue-600"
              onClick={() => setShowSafetyAccidentInput(true)}
            >
              안전사고 목록/입력
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">금일 안전사고</span>
              <span
                className={`font-bold ${
                  getTodaySafetyAccidents() > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {getTodaySafetyAccidents()}건
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">금월 안전사고</span>
              <span
                className={`font-bold ${
                  getThisMonthSafetyAccidents() > 0
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {getThisMonthSafetyAccidents()}건
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">금년 안전사고</span>
              <span
                className={`font-bold ${
                  getThisYearSafetyAccidents() > 5
                    ? 'text-red-600'
                    : getThisYearSafetyAccidents() > 0
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}
              >
                {getThisYearSafetyAccidents()}건
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">무사고 일수</span>
              <span
                className={`font-bold ${
                  getAccidentFreeDays() > 100
                    ? 'text-green-600'
                    : getAccidentFreeDays() > 30
                    ? 'text-blue-600'
                    : 'text-orange-600'
                }`}
              >
                {getAccidentFreeDays()}일
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 하단: AI 추천사항 - 제한 관리자는 비표시 */}
      {!currentUser?.allowedDepartments?.length && <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-purple-800">
              AI 추천사항
            </h3>
            <div className="flex items-center ml-4 space-x-3 text-xs">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                <span className="text-gray-600">위험</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                <span className="text-gray-600">주의</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                <span className="text-gray-600">추천</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                <span className="text-gray-600">칭찬</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={generateAiRecommendations}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-800 text-sm rounded-lg"
            >
              <span>{isAnalyzing ? '분석 중...' : '🔄 다시 분석'}</span>
            </button>
            <button
              onClick={() => setShowAiHistoryPopup(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm text-blue-800"
            >
              <FileText className="w-4 h-4" />
              <span>기록</span>
            </button>
            <button
              onClick={() => setShowPromptSettings(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg text-sm text-purple-800"
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAnalyzing ? (
            <div className="col-span-2 text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-500">AI 데이터 분석 중...</p>
            </div>
          ) : aiRecommendations.length > 0 ? (
            aiRecommendations.map((rec, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg border border-purple-100"
              >
                <div className="flex items-start">
                  <div
                    className={`w-2 h-2 bg-${rec.color}-500 rounded-full mt-2 mr-3 flex-shrink-0`}
                  ></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-medium text-gray-800">
                        {rec.title}
                      </p>
                      {rec.time && (
                        <p className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {rec.time}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {rec.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8">
              <p className="text-gray-500">
                AI 분석을 실행하시려면 위의 '다시 분석' 버튼을 클릭하세요.
              </p>
            </div>
          )}
        </div>
      </div>}

      {/* 직원 리스트 팝업 */}
      {showEmployeeListPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {selectedStatusDate && (
                  <span className="text-gray-600">
                    {formatDateWithDay(selectedStatusDate)}
                  </span>
                )}
                직원 리스트 [
                <span
                  className={`font-bold ${getStatusTextColor(selectedStatus)}`}
                >
                  {selectedStatus}
                </span>
                ]
              </h3>
              <span className="text-sm text-gray-600 mr-2">
                총 인원수: <b>{selectedStatusEmployees.length}</b>명
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAttendanceList}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"
                >
                  다운로드
                </button>
                <button
                  onClick={() => setShowEmployeeListPopup(false)}
                  className="text-gray-500 hover:text-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    {selectedStatus?.includes('출근') ||
                    selectedStatus?.includes('지각') ? (
                      <>
                        <th className="text-center py-1 px-2">
                          출근시간
                          <button
                            onClick={() => handleAttendanceListSort('time')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'time'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'time'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          사번
                          <button
                            onClick={() => handleAttendanceListSort('id')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'id'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'id'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          이름
                          <button
                            onClick={() => handleAttendanceListSort('name')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'name'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'name'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          직급
                          <button
                            onClick={() => handleAttendanceListSort('position')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'position'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'position'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          부서
                          <button
                            onClick={() =>
                              handleAttendanceListSort('department')
                            }
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'department'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'department'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="text-center py-1 px-2">
                          사번
                          <button
                            onClick={() => handleAttendanceListSort('id')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'id'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'id'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          이름
                          <button
                            onClick={() => handleAttendanceListSort('name')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'name'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'name'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          직급
                          <button
                            onClick={() => handleAttendanceListSort('position')}
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'position'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'position'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        <th className="text-center py-1 px-2">
                          부서
                          <button
                            onClick={() =>
                              handleAttendanceListSort('department')
                            }
                            className={`ml-1 text-xs hover:text-gray-700 ${
                              attendanceListSortField === 'department'
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                          >
                            {attendanceListSortField === 'department'
                              ? attendanceListSortOrder === 'asc'
                                ? '▲'
                                : '▼'
                              : '▼'}
                          </button>
                        </th>
                        {selectedStatus?.includes('연차') && (
                          <th className="text-center py-1 px-2">연차유형</th>
                        )}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getSortedAttendanceEmployees().map((employee, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      {selectedStatus?.includes('출근') ||
                      selectedStatus?.includes('지각') ? (
                        <>
                          <td className="text-center py-1 px-2">
                            {employee.time || '-'}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.id}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.name}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.position || employee.title || '사원'}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.department}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-center py-1 px-2">
                            {employee.id}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.name}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.position || employee.title || '사원'}
                          </td>
                          <td className="text-center py-1 px-2">
                            {employee.department}
                          </td>
                          {selectedStatus?.includes('연차') && (
                            <td className="text-center py-1 px-2">
                              {employee.leaveType || '-'}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 목표달성률 상세 팝업 */}
      {showGoalDetailsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* 고정 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  목표달성률 상세
                </h2>
                <div className="flex items-center mt-2 gap-3">
                  <span className="text-gray-600">연도:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowGoalDetailsPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 스크롤 가능한 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* 그래프 영역 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">출근률</h3>
                      <span className="text-xs text-gray-500 px-2 py-1 rounded">
                        기준: 실제 출근일수 ÷ 근무 예정일수 (95% 이상 양호)
                      </span>
                    </div>
                    <div className="h-40 mb-3 goal-chart-container">
                      <Bar
                        key={`attendance-chart-${selectedYear}-${attendanceSheetData.length}`}
                        data={{
                          labels: [
                            '1월',
                            '2월',
                            '3월',
                            '4월',
                            '5월',
                            '6월',
                            '7월',
                            '8월',
                            '9월',
                            '10월',
                            '11월',
                            '12월',
                          ],
                          datasets: [
                            {
                              label: '출근률(%)',
                              data: yearlyGoalData.attendance || [],
                              backgroundColor: (
                                yearlyGoalData.attendance || []
                              ).map((rate) =>
                                rate === null
                                  ? 'rgba(200, 200, 200, 0.3)'
                                  : 'rgba(34, 197, 94, 0.8)'
                              ),
                              borderColor: (
                                yearlyGoalData.attendance || []
                              ).map((rate) =>
                                rate === null
                                  ? 'rgba(200, 200, 200, 0.5)'
                                  : 'rgba(34, 197, 94, 1)'
                              ),
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                            },
                          },
                          onClick: (event, elements) => {
                            if (elements.length > 0) {
                              const monthIndex = elements[0].index;
                              setGoalDetailMetric('출근률');
                              setGoalDetailMonth(monthIndex);
                              setShowGoalDetailDataPopup(true);
                            }
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">지각률</h3>
                      <span className="text-xs text-gray-500 px-2 py-1 rounded">
                        기준: 지각 횟수 ÷ 총 출근일수 (5% 이하 양호)
                      </span>
                    </div>
                    <div className="h-40 mb-3 goal-chart-container">
                      <Bar
                        key={`tardiness-chart-${selectedYear}-${attendanceSheetData.length}`}
                        data={{
                          labels: [
                            '1월',
                            '2월',
                            '3월',
                            '4월',
                            '5월',
                            '6월',
                            '7월',
                            '8월',
                            '9월',
                            '10월',
                            '11월',
                            '12월',
                          ],
                          datasets: [
                            {
                              label: '지각률(%)',
                              data: yearlyGoalData.tardiness || [],
                              backgroundColor: (
                                yearlyGoalData.tardiness || []
                              ).map((rate) =>
                                rate === null
                                  ? 'rgba(200, 200, 200, 0.3)'
                                  : 'rgba(234, 179, 8, 0.8)'
                              ),
                              borderColor: (yearlyGoalData.tardiness || []).map(
                                (rate) =>
                                  rate === null
                                    ? 'rgba(200, 200, 200, 0.5)'
                                    : 'rgba(234, 179, 8, 1)'
                              ),
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 5,
                              ticks: {
                                stepSize: 1,
                                callback: function (value) {
                                  return value + '%';
                                },
                              },
                            },
                          },
                          onClick: (event, elements) => {
                            if (elements.length > 0) {
                              const monthIndex = elements[0].index;
                              setGoalDetailMetric('지각률');
                              setGoalDetailMonth(monthIndex);
                              setShowGoalDetailDataPopup(true);
                            }
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">결근률</h3>
                      <span className="text-xs text-gray-500 px-2 py-1 rounded">
                        기준: 무단결근일수 ÷ 근무 예정일수 (5% 이하 양호)
                      </span>
                    </div>
                    <div className="h-40 mb-3 goal-chart-container">
                      <Bar
                        key={`absence-chart-${selectedYear}-${attendanceSheetData.length}`}
                        data={{
                          labels: [
                            '1월',
                            '2월',
                            '3월',
                            '4월',
                            '5월',
                            '6월',
                            '7월',
                            '8월',
                            '9월',
                            '10월',
                            '11월',
                            '12월',
                          ],
                          datasets: [
                            {
                              label: '결근률(%)',
                              data: yearlyGoalData.absence || [],
                              backgroundColor: (
                                yearlyGoalData.absence || []
                              ).map((rate) =>
                                rate === null
                                  ? 'rgba(200, 200, 200, 0.3)'
                                  : 'rgba(239, 68, 68, 0.8)'
                              ),
                              borderColor: (yearlyGoalData.absence || []).map(
                                (rate) =>
                                  rate === null
                                    ? 'rgba(200, 200, 200, 0.5)'
                                    : 'rgba(239, 68, 68, 1)'
                              ),
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 5,
                              ticks: {
                                stepSize: 1,
                                callback: function (value) {
                                  return value + '%';
                                },
                              },
                            },
                          },
                          onClick: (event, elements) => {
                            if (elements.length > 0) {
                              const monthIndex = elements[0].index;
                              setGoalDetailMetric('결근률');
                              setGoalDetailMonth(monthIndex);
                              setShowGoalDetailDataPopup(true);
                            }
                          },
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">퇴사율</h3>
                      <span className="text-xs text-gray-500 px-2 py-1 rounded">
                        기준: 월간 퇴사자수 ÷ 월초 재직자수 (5% 이하 양호)
                      </span>
                    </div>
                    <div className="h-40 mb-3 goal-chart-container">
                      <Bar
                        key={`turnover-chart-${selectedYear}-${employees.length}`}
                        data={{
                          labels: [
                            '1월',
                            '2월',
                            '3월',
                            '4월',
                            '5월',
                            '6월',
                            '7월',
                            '8월',
                            '9월',
                            '10월',
                            '11월',
                            '12월',
                          ],
                          datasets: [
                            {
                              label: '퇴사율(%)',
                              data: yearlyGoalData.turnover || [],
                              backgroundColor: (
                                yearlyGoalData.turnover || []
                              ).map((rate) =>
                                rate === null
                                  ? 'rgba(200, 200, 200, 0.3)'
                                  : 'rgba(249, 115, 22, 0.8)'
                              ),
                              borderColor: (yearlyGoalData.turnover || []).map(
                                (rate) =>
                                  rate === null
                                    ? 'rgba(200, 200, 200, 0.5)'
                                    : 'rgba(249, 115, 22, 1)'
                              ),
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 5,
                              ticks: {
                                stepSize: 1,
                                callback: function (value) {
                                  return value + '%';
                                },
                              },
                            },
                          },
                          onClick: (event, elements) => {
                            if (elements.length > 0) {
                              const monthIndex = elements[0].index;
                              setGoalDetailMetric('퇴사율');
                              setGoalDetailMonth(monthIndex);
                              setShowGoalDetailDataPopup(true);
                            }
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 데이터 테이블 */}
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-center">
                    월별 상세 데이터 ({selectedYear}년)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="p-3 text-center font-semibold">
                            구분
                          </th>
                          <th className="p-3 text-center font-semibold">1월</th>
                          <th className="p-3 text-center font-semibold">2월</th>
                          <th className="p-3 text-center font-semibold">3월</th>
                          <th className="p-3 text-center font-semibold">4월</th>
                          <th className="p-3 text-center font-semibold">5월</th>
                          <th className="p-3 text-center font-semibold">6월</th>
                          <th className="p-3 text-center font-semibold">7월</th>
                          <th className="p-3 text-center font-semibold">8월</th>
                          <th className="p-3 text-center font-semibold">9월</th>
                          <th className="p-3 text-center font-semibold">
                            10월
                          </th>
                          <th className="p-3 text-center font-semibold">
                            11월
                          </th>
                          <th className="p-3 text-center font-semibold">
                            12월
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <>
                          <tr className="border-b">
                            <td className="p-3 text-center font-semibold bg-gray-50">
                              출근률
                            </td>
                            {(yearlyGoalData.attendance || []).map(
                              (rate, index) => (
                                <td
                                  key={index}
                                  className={`p-3 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    rate === null
                                      ? 'text-gray-400'
                                      : 'text-green-600'
                                  }`}
                                  onClick={() => {
                                    if (rate !== null) {
                                      setGoalDetailMetric('출근률');
                                      setGoalDetailMonth(index);
                                      setShowGoalDetailDataPopup(true);
                                    }
                                  }}
                                >
                                  {rate === null ? '-' : `${rate}%`}
                                </td>
                              )
                            )}
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 text-center font-semibold bg-gray-50">
                              지각률
                            </td>
                            {(yearlyGoalData.tardiness || []).map(
                              (rate, index) => (
                                <td
                                  key={index}
                                  className={`p-3 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    rate === null
                                      ? 'text-gray-400'
                                      : 'text-yellow-600'
                                  }`}
                                  onClick={() => {
                                    if (rate !== null) {
                                      setGoalDetailMetric('지각률');
                                      setGoalDetailMonth(index);
                                      setShowGoalDetailDataPopup(true);
                                    }
                                  }}
                                >
                                  {rate === null ? '-' : `${rate}%`}
                                </td>
                              )
                            )}
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 text-center font-semibold bg-gray-50">
                              결근률
                            </td>
                            {(yearlyGoalData.absence || []).map(
                              (rate, index) => (
                                <td
                                  key={index}
                                  className={`p-3 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    rate === null
                                      ? 'text-gray-400'
                                      : 'text-red-600'
                                  }`}
                                  onClick={() => {
                                    if (rate !== null) {
                                      setGoalDetailMetric('결근률');
                                      setGoalDetailMonth(index);
                                      setShowGoalDetailDataPopup(true);
                                    }
                                  }}
                                >
                                  {rate === null ? '-' : `${rate}%`}
                                </td>
                              )
                            )}
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 text-center font-semibold bg-gray-50">
                              퇴사율
                            </td>
                            {(yearlyGoalData.turnover || []).map(
                              (rate, index) => (
                                <td
                                  key={index}
                                  className={`p-3 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    rate === null
                                      ? 'text-gray-400'
                                      : 'text-orange-600'
                                  }`}
                                  onClick={() => {
                                    if (rate !== null) {
                                      setGoalDetailMetric('퇴사율');
                                      setGoalDetailMonth(index);
                                      setShowGoalDetailDataPopup(true);
                                    }
                                  }}
                                >
                                  {rate === null ? '-' : `${rate}%`}
                                </td>
                              )
                            )}
                          </tr>
                        </>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 목표달성률 상세 데이터 팝업 (날짜별 직원 상태) */}
      {showGoalDetailDataPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* 고정 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {goalDetailMetric} 상세 - {selectedYear}년{' '}
                  {goalDetailMonth + 1}월
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  날짜별 직원 출퇴근 상태
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  총 인원수:{' '}
                  {getFilteredEmployees(employees, goalDetailMonth).length}명
                </p>
                <button
                  onClick={() => setShowGoalDetailDataPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 스크롤 가능한 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // 팝업용 getAttendanceForEmployee 함수 생성
                const popupGetAttendanceForEmployee = (
                  employeeId,
                  year,
                  month,
                  day
                ) => {
                  const dateKey = `${year}-${String(month).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const record = popupMonthData.find(
                    (r) =>
                      r.employeeId === employeeId && r.date.startsWith(dateKey)
                  );
                  return record
                    ? {
                        checkIn: record.checkIn || '',
                        checkOut: record.checkOut || '',
                      }
                    : { checkIn: '', checkOut: '' };
                };

                // getGoalDetailDataUtil 직접 호출
                const detailData = getGoalDetailDataUtil(
                  selectedYear,
                  goalDetailMonth,
                  goalDetailMetric,
                  employees,
                  popupGetAttendanceForEmployee,
                  analyzeAttendanceStatusForDashboard,
                  isHolidayDate,
                  leaveRequests
                );

                if (detailData.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      해당 월에 {goalDetailMetric} 데이터가 없습니다.
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {detailData.map((record, index) => {
                      const textColor =
                        goalDetailMetric === '출근률'
                          ? 'text-green-800'
                          : goalDetailMetric === '지각률'
                          ? 'text-yellow-800'
                          : goalDetailMetric === '결근률'
                          ? 'text-red-800'
                          : goalDetailMetric === '퇴사율'
                          ? 'text-orange-800'
                          : 'text-gray-800';

                      return (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-sm"
                        >
                          <span className={`font-semibold ${textColor}`}>
                            {record.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 고정 푸터 */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGoalDetailDataPopup(false)}
                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 워라밸 지표 상세 팝업 */}
      {showWorkLifeBalancePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* 고정 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  워라밸 지표 상세
                </h2>
                <div className="flex items-center mt-2 gap-3">
                  <span className="text-gray-600">연도:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWorkLifeBalancePopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 스크롤 가능한 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // workLifeYearData를 사용해서 커스텀 getAttendanceForEmployee 생성
                const customGetAttendanceForEmployee = (
                  employeeId,
                  year,
                  month,
                  day
                ) => {
                  const monthData = workLifeYearData[month] || [];
                  const dateKey = `${year}-${String(month).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const record = monthData.find(
                    (r) =>
                      r.employeeId === employeeId && r.date.startsWith(dateKey)
                  );
                  return record
                    ? {
                        checkIn: record.checkIn || '',
                        checkOut: record.checkOut || '',
                      }
                    : { checkIn: '', checkOut: '' };
                };

                // getWorkLifeBalanceDataByYearUtil 직접 호출 (실제 함수 사용)
                const workLifeData =
                  Object.keys(workLifeYearData).length > 0
                    ? getWorkLifeBalanceDataByYearUtil(
                        selectedYear,
                        employees,
                        getDaysInMonth,
                        customGetAttendanceForEmployee,
                        calcDailyWage,
                        calculateMonthlyLeaveUsageRate,
                        getUsedAnnualLeave,
                        calculateAnnualLeave,
                        safetyAccidents,
                        suggestions,
                        evaluations,
                        notices,
                        leaveRequests
                      )
                    : {
                        overtime: Array(12).fill(0),
                        leaveUsage: Array(12).fill(0),
                        violations: Array(12).fill(0),
                        stressIndex: Array(12).fill(0),
                      };

                return (
                  <div className="space-y-6">
                    {/* 평균 특근시간 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">평균 특근시간</h3>
                        <span className="text-xs text-gray-500 px-2 py-1 rounded">
                          기준: 총 특근시간 ÷ 전체 직원수 (10시간 이하 양호)
                        </span>
                      </div>
                      <div className="h-40 mb-4 worklife-chart-container">
                        <Line
                          key={`overtime-chart-${selectedYear}-${
                            Object.keys(workLifeYearData).length
                          }`}
                          data={{
                            labels: [
                              '1월',
                              '2월',
                              '3월',
                              '4월',
                              '5월',
                              '6월',
                              '7월',
                              '8월',
                              '9월',
                              '10월',
                              '11월',
                              '12월',
                            ],
                            datasets: [
                              {
                                label: '특근시간',
                                data: workLifeData.overtime,
                                borderColor: 'rgba(59, 130, 246, 1)',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                pointBackgroundColor: workLifeData.overtime.map(
                                  (hours) =>
                                    hours === null
                                      ? 'rgba(200, 200, 200, 0.5)'
                                      : hours <= 10
                                      ? 'rgba(34, 197, 94, 1)'
                                      : 'rgba(239, 68, 68, 1)'
                                ),
                                pointBorderColor: workLifeData.overtime.map(
                                  (hours) =>
                                    hours === null
                                      ? 'rgba(200, 200, 200, 0.5)'
                                      : hours <= 10
                                      ? 'rgba(34, 197, 94, 1)'
                                      : 'rgba(239, 68, 68, 1)'
                                ),
                                pointRadius: 6,
                                tension: 0.1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 70,
                              },
                            },
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const monthIndex = elements[0].index;
                                setWorkLifeDetailMetric('평균 특근시간');
                                setWorkLifeDetailMonth(monthIndex);
                                setShowWorkLifeDetailPopup(true);
                              }
                            },
                          }}
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 text-center">1월</th>
                              <th className="p-2 text-center">2월</th>
                              <th className="p-2 text-center">3월</th>
                              <th className="p-2 text-center">4월</th>
                              <th className="p-2 text-center">5월</th>
                              <th className="p-2 text-center">6월</th>
                              <th className="p-2 text-center">7월</th>
                              <th className="p-2 text-center">8월</th>
                              <th className="p-2 text-center">9월</th>
                              <th className="p-2 text-center">10월</th>
                              <th className="p-2 text-center">11월</th>
                              <th className="p-2 text-center">12월</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {workLifeData.overtime.map((hours, index) => (
                                <td
                                  key={index}
                                  className={`p-2 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    hours === null
                                      ? 'text-gray-400'
                                      : hours <= 10
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                  onClick={() => {
                                    if (hours !== null) {
                                      setWorkLifeDetailMetric('평균 특근시간');
                                      setWorkLifeDetailMonth(index);
                                      setShowWorkLifeDetailPopup(true);
                                    }
                                  }}
                                >
                                  {hours === null
                                    ? '-'
                                    : `${hours.toFixed(1)}시간`}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 연차 사용률 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          연차 사용률 (누적)
                        </h3>
                        <span className="text-xs text-gray-500 px-2 py-1 rounded">
                          기준: 월별 누적 사용일수 ÷ 연간 총 연차일수 (100%
                          목표)
                        </span>
                      </div>
                      <div className="h-40 mb-4 worklife-chart-container">
                        <Line
                          key={`leaveusage-chart-${selectedYear}-${leaveRequests.length}`}
                          data={(() => {
                            const data =
                              getWorkLifeBalanceDataByYear(selectedYear);

                            // 누적 데이터 계산
                            const cumulativeData = [];
                            let cumulative = 0;
                            for (let i = 0; i < 12; i++) {
                              if (data.leaveUsage[i] !== null) {
                                cumulative = data.leaveUsage[i]; // 이미 누적된 값
                                cumulativeData.push(cumulative);
                              } else {
                                cumulativeData.push(null);
                              }
                            }

                            return {
                              labels: [
                                '1월',
                                '2월',
                                '3월',
                                '4월',
                                '5월',
                                '6월',
                                '7월',
                                '8월',
                                '9월',
                                '10월',
                                '11월',
                                '12월',
                              ],
                              datasets: [
                                {
                                  label: '누적 연차 사용률(%)',
                                  data: cumulativeData,
                                  borderColor: 'rgba(34, 197, 94, 1)',
                                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                  borderWidth: 2,
                                  fill: true,
                                  tension: 0.3,
                                  pointBackgroundColor: cumulativeData.map(
                                    (rate) =>
                                      rate === null
                                        ? 'rgba(200, 200, 200, 0.5)'
                                        : rate >= 100
                                        ? 'rgba(34, 197, 94, 1)'
                                        : rate >= 70
                                        ? 'rgba(251, 191, 36, 1)'
                                        : 'rgba(239, 68, 68, 1)'
                                  ),
                                  pointBorderColor: '#fff',
                                  pointBorderWidth: 2,
                                  pointRadius: 4,
                                  pointHoverRadius: 6,
                                },
                                {
                                  label: '목표선 (100%)',
                                  data: Array(12).fill(100),
                                  borderColor: 'rgba(147, 197, 253, 0.5)',
                                  borderWidth: 2,
                                  borderDash: [5, 5],
                                  fill: false,
                                  pointRadius: 0,
                                  pointHoverRadius: 0,
                                },
                              ],
                            };
                          })()}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                  font: {
                                    size: 11,
                                  },
                                  usePointStyle: true,
                                },
                              },
                              tooltip: {
                                callbacks: {
                                  label: function (context) {
                                    if (context.datasetIndex === 0) {
                                      return `누적: ${context.parsed.y}%`;
                                    }
                                    return `목표: ${context.parsed.y}%`;
                                  },
                                },
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                  stepSize: 20,
                                  callback: function (value) {
                                    return value + '%';
                                  },
                                },
                              },
                            },
                            onClick: (event, elements) => {
                              if (
                                elements.length > 0 &&
                                elements[0].datasetIndex === 0
                              ) {
                                const monthIndex = elements[0].index;
                                setWorkLifeDetailMetric('연차 사용률');
                                setWorkLifeDetailMonth(monthIndex);
                                setShowWorkLifeDetailPopup(true);
                              }
                            },
                          }}
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 text-center">1월</th>
                              <th className="p-2 text-center">2월</th>
                              <th className="p-2 text-center">3월</th>
                              <th className="p-2 text-center">4월</th>
                              <th className="p-2 text-center">5월</th>
                              <th className="p-2 text-center">6월</th>
                              <th className="p-2 text-center">7월</th>
                              <th className="p-2 text-center">8월</th>
                              <th className="p-2 text-center">9월</th>
                              <th className="p-2 text-center">10월</th>
                              <th className="p-2 text-center">11월</th>
                              <th className="p-2 text-center">12월</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {(() => {
                                const data =
                                  getWorkLifeBalanceDataByYear(selectedYear);
                                return data.leaveUsage.map((rate, index) => (
                                  <td
                                    key={index}
                                    className={`p-2 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                      rate === null
                                        ? 'text-gray-400'
                                        : rate >= 70
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                    onClick={() => {
                                      if (rate !== null) {
                                        setWorkLifeDetailMetric('연차 사용률');
                                        setWorkLifeDetailMonth(index);
                                        setShowWorkLifeDetailPopup(true);
                                      }
                                    }}
                                  >
                                    {rate === null ? '-' : `${rate}%`}
                                  </td>
                                ));
                              })()}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 스트레스 지수 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">스트레스 지수</h3>
                      </div>
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 relative transition-all duration-300">
                        <button
                          onClick={() =>
                            setIsStressCalculationExpanded(
                              !isStressCalculationExpanded
                            )
                          }
                          className="absolute top-2 right-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                          title={
                            isStressCalculationExpanded
                              ? '계산방법 접기'
                              : '계산방법 펼치기'
                          }
                        >
                          <span
                            className={`inline-block transition-transform duration-200 ${
                              isStressCalculationExpanded
                                ? 'rotate-180'
                                : 'rotate-0'
                            }`}
                          >
                            {isStressCalculationExpanded ? '▲' : '▼'}
                          </span>
                          <span className="ml-1">
                            {isStressCalculationExpanded ? '접기' : '펼치기'}
                          </span>
                        </button>
                        <h4 className="font-semibold text-blue-800 mb-2 pr-16">
                          스트레스 지수 계산 방법
                        </h4>
                        <div
                          className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isStressCalculationExpanded
                              ? 'max-h-96 opacity-100 mt-2'
                              : 'max-h-0 opacity-0 mt-0'
                          }`}
                        >
                          <div className="text-sm text-blue-700 space-y-1">
                            <p className="font-semibold mb-1">
                              총 100점 = 주별 평균 근무시간(30점) +
                              연차사용률(20점) + 정시퇴근율(20점) +
                              건의사항(10점) + 야간/연속근무(10점) +
                              근태안정성(10점)
                            </p>
                            <p>
                              • [주별 평균 근무시간 (총 30점)] 해당 월의 주별
                              평균 근무시간 <br />
                              40시간 미만: 0점 (정상) / 40시간 이상 ~ 46시간
                              미만: 10점 (주의) / 46시간 이상 ~ 52시간 미만:
                              20점 (경고) / 52시간 이상: 30점 (위험)
                            </p>
                            <p>
                              • [연차사용률 (총 20점)] 연초 ~ 현재월까지 누적
                              연차 사용률 <br />
                              80% 이상: 0점 (매우 양호) / 60% 이상 ~ 80% 미만:
                              5점 (양호) / 40% 이상 ~ 60% 미만: 10점 (보통) /
                              20% 이상 ~ 40% 미만: 15점 (주의) / 20% 미만: 20점
                              (위험)
                            </p>
                            <p>
                              • [정시퇴근율 (총 20점)] 주간 18:00, 야간 04:30
                              이전 퇴근 비율 <br />
                              80% 이상: 0점 (매우 양호) / 60% 이상 ~ 80% 미만:
                              5점 (양호) / 40% 이상 ~ 60% 미만: 10점 (보통) /
                              20% 이상~40% 미만: 15점 (주의) / 20% 미만: 20점
                              (위험)
                            </p>
                            <p>
                              • [건의사항 (총 10점)] 해당월 건의사항 승인률{' '}
                              <br />
                              75% 이상: 0점 (매우 양호) / 50% 이상 ~ 75% 미만:
                              3점 (양호) / 25% 이상 ~ 50% 미만: 7점 (주의) / 25%
                              미만: 10점 (위험) / 건의사항 없음: 0점 (패널티
                              없음)
                            </p>
                            <p>
                              • [야간/연속근무 (총 10점)] <br />
                              주간/야간 근무자가 야간 15회 이상일시: +5점 (야간
                              근무자는 대상 제외) / 연속근무가 7일 이상일 시:
                              +5점
                            </p>
                            <p>
                              • [근태안정성 (총 10점)] <br />
                              해당 월 기준으로 지각 3회 이상: +5점 / 결근 1회
                              이상 +5점
                            </p>
                            <p className="font-semibold mt-2">
                              • 범위 : 0~20점 (매우양호) / 21~40점 (양호) /
                              41~60점 (보통) / 61~80점 (주의) / 81~100점 (위험)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="h-40 mb-4 worklife-chart-container">
                        <Line
                          key={`stress-chart-${selectedYear}-${
                            Object.keys(workLifeYearData).length
                          }`}
                          data={{
                            labels: [
                              '1월',
                              '2월',
                              '3월',
                              '4월',
                              '5월',
                              '6월',
                              '7월',
                              '8월',
                              '9월',
                              '10월',
                              '11월',
                              '12월',
                            ],
                            datasets: [
                              {
                                label: '스트레스 지수',
                                data: workLifeData.stressIndex,
                                borderColor: 'rgba(175, 119, 228, 1)',
                                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                                pointBackgroundColor:
                                  workLifeData.stressIndex.map((stress) =>
                                    stress === null
                                      ? 'rgba(200, 200, 200, 0.5)'
                                      : stress <= 50
                                      ? 'rgba(34, 197, 94, 1)'
                                      : 'rgba(239, 68, 68, 1)'
                                  ),
                                pointBorderColor: workLifeData.stressIndex.map(
                                  (stress) =>
                                    stress === null
                                      ? 'rgba(200, 200, 200, 0.5)'
                                      : stress <= 50
                                      ? 'rgba(34, 197, 94, 1)'
                                      : 'rgba(239, 68, 68, 1)'
                                ),
                                pointRadius: 6,
                                tension: 0.1,
                                fill: true,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 100,
                              },
                            },
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const monthIndex = elements[0].index;
                                setWorkLifeDetailMetric('스트레스 지수');
                                setWorkLifeDetailMonth(monthIndex);
                                setShowWorkLifeDetailPopup(true);
                              }
                            },
                          }}
                        />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 text-center">1월</th>
                              <th className="p-2 text-center">2월</th>
                              <th className="p-2 text-center">3월</th>
                              <th className="p-2 text-center">4월</th>
                              <th className="p-2 text-center">5월</th>
                              <th className="p-2 text-center">6월</th>
                              <th className="p-2 text-center">7월</th>
                              <th className="p-2 text-center">8월</th>
                              <th className="p-2 text-center">9월</th>
                              <th className="p-2 text-center">10월</th>
                              <th className="p-2 text-center">11월</th>
                              <th className="p-2 text-center">12월</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {workLifeData.stressIndex.map((score, index) => (
                                <td
                                  key={index}
                                  className={`p-2 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    score === null
                                      ? 'text-gray-400'
                                      : score <= 50
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                  onClick={() => {
                                    if (score !== null) {
                                      setWorkLifeDetailMetric('스트레스 지수');
                                      setWorkLifeDetailMonth(index);
                                      setShowWorkLifeDetailPopup(true);
                                    }
                                  }}
                                >
                                  {score === null ? '-' : `${score}점`}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* 주 52시간 위반 */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                          {selectedYear}-
                          {String(new Date().getMonth() + 1).padStart(2, '0')}{' '}
                          근로시간 관리 검토 대상
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {(() => {
                          const currentMonthViolations = getViolationDetails(
                            selectedYear,
                            new Date().getMonth()
                          );

                          // 위반 총 시간 계산
                          const totalViolationHours =
                            currentMonthViolations.reduce(
                              (sum, v) => sum + (parseFloat(v.hours) || 0),
                              0
                            );

                          // 위반 기간 (주 수) 계산
                          const weeksSet = new Set();
                          currentMonthViolations.forEach((v) => {
                            if (v.weeks) {
                              // "8/4 ~ 8/10, 8/11 ~ 8/17" 형식을 파싱
                              const weekParts = v.weeks
                                .split(',')
                                .map((w) => w.trim());
                              weekParts.forEach((w) => weeksSet.add(w));
                            }
                          });
                          const totalWeeks = weeksSet.size;

                          // 위반 직원 수
                          const totalEmployees = currentMonthViolations.length;

                          return (
                            <>
                              <div className="bg-white rounded p-3 text-center">
                                <div className="text-2xl font-bold text-red-600">
                                  {Math.round(totalViolationHours * 10) / 10}
                                  시간
                                </div>
                                <div className="text-sm text-gray-600">
                                  관리 검토 대상 총 시간
                                </div>
                              </div>
                              <div className="bg-white rounded p-3 text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                  {totalWeeks}주
                                </div>
                                <div className="text-sm text-gray-600">
                                  관리 검토 대상 기간
                                </div>
                              </div>
                              <div className="bg-white rounded p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600">
                                  {totalEmployees}명
                                </div>
                                <div className="text-sm text-gray-600">
                                  관리 검토 대상 직원
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="h-40 mb-4 worklife-chart-container">
                        <Bar
                          key={`violations-chart-${selectedYear}-${
                            Object.keys(workLifeYearData).length
                          }`}
                          data={{
                            labels: [
                              '1월',
                              '2월',
                              '3월',
                              '4월',
                              '5월',
                              '6월',
                              '7월',
                              '8월',
                              '9월',
                              '10월',
                              '11월',
                              '12월',
                            ],
                            datasets: [
                              {
                                label: '위반 건수',
                                data: workLifeData.violations,
                                backgroundColor: workLifeData.violations.map(
                                  (count) =>
                                    count === null
                                      ? 'rgba(200, 200, 200, 0.3)'
                                      : count === 0
                                      ? 'rgba(34, 197, 94, 0.8)'
                                      : 'rgba(239, 68, 68, 0.8)'
                                ),
                                borderColor: workLifeData.violations.map(
                                  (count) =>
                                    count === null
                                      ? 'rgba(200, 200, 200, 0.5)'
                                      : count === 0
                                      ? 'rgba(34, 197, 94, 1)'
                                      : 'rgba(239, 68, 68, 1)'
                                ),
                                borderWidth: 1,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: false,
                              },
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                max: 60,
                                ticks: {
                                  stepSize: 10,
                                },
                              },
                            },
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const monthIndex = elements[0].index;
                                if (workLifeData.violations[monthIndex] > 0) {
                                  setWorkLifeDetailMetric('주 52시간 위반');
                                  setWorkLifeDetailMonth(monthIndex);
                                  setShowWorkLifeDetailPopup(true);
                                }
                              }
                            },
                          }}
                        />
                      </div>
                      <div className="overflow-x-auto mb-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="p-2 text-center">1월</th>
                              <th className="p-2 text-center">2월</th>
                              <th className="p-2 text-center">3월</th>
                              <th className="p-2 text-center">4월</th>
                              <th className="p-2 text-center">5월</th>
                              <th className="p-2 text-center">6월</th>
                              <th className="p-2 text-center">7월</th>
                              <th className="p-2 text-center">8월</th>
                              <th className="p-2 text-center">9월</th>
                              <th className="p-2 text-center">10월</th>
                              <th className="p-2 text-center">11월</th>
                              <th className="p-2 text-center">12월</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {workLifeData.violations.map((count, index) => (
                                <td
                                  key={index}
                                  className={`p-2 text-center font-semibold cursor-pointer hover:bg-blue-50 ${
                                    count === null
                                      ? 'text-gray-400'
                                      : count === 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                  onClick={() => {
                                    if (count !== null && count > 0) {
                                      setWorkLifeDetailMetric('주 52시간 위반');
                                      setWorkLifeDetailMonth(index);
                                      setShowWorkLifeDetailPopup(true);
                                    }
                                  }}
                                  title={
                                    count > 0
                                      ? '클릭하여 위반 직원 상세 보기'
                                      : ''
                                  }
                                >
                                  {count === null ? '-' : `${count}건`}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {selectedViolationMonth !== null && (
                        <div className="bg-white rounded p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              {selectedViolationMonth + 1}월 위반 직원 상세
                              <button
                                onClick={() => setSelectedViolationMonth(null)}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                              >
                                <X className="w-4 h-4 inline" />
                              </button>
                            </h4>
                            <button
                              onClick={() => {
                                // 테스트용 알림 발송 (첫 번째 위반 직원 기준)
                                const employees = getViolationDetails(
                                  selectedYear,
                                  selectedViolationMonth
                                );
                                if (employees.length > 0) {
                                  const employee = employees[0];
                                  send52HourViolationAlert(
                                    employee.name,
                                    employee.hours,
                                    'violation'
                                  );
                                  alert(
                                    `${employee.name}님에게 52시간 위반 알림을 발송했습니다.`
                                  );
                                }
                              }}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                              알림 테스트
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="p-2 text-left w-20">직원명</th>
                                  <th className="p-2 text-left w-24">부서</th>
                                  <th className="p-2 text-left w-20">
                                    위반시간
                                  </th>
                                  <th className="p-2 text-left w-auto">
                                    위반주차
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {getViolationDetails(
                                  selectedYear,
                                  selectedViolationMonth
                                ).map((employee, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="p-2 w-20">
                                      {employee.name}
                                    </td>
                                    <td className="p-2 w-24">
                                      {employee.dept}
                                    </td>
                                    <td className="p-2 w-20 text-red-600 font-semibold">
                                      {employee.hours}시간
                                    </td>
                                    <td className="p-2 w-auto text-sm">
                                      {employee.weeks}
                                    </td>
                                  </tr>
                                ))}
                                {getViolationDetails(
                                  selectedYear,
                                  selectedViolationMonth
                                ).length === 0 && (
                                  <tr>
                                    <td
                                      colSpan="4"
                                      className="p-4 text-center text-gray-500"
                                    >
                                      해당 월에 위반 직원이 없습니다.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 워라밸 지표 월별 상세 팝업 */}
      {showWorkLifeDetailPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* 고정 헤더 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {workLifeDetailMetric} - {selectedYear}년{' '}
                  {workLifeDetailMonth + 1}월 상세
                </h2>
              </div>
              <button
                onClick={() => setShowWorkLifeDetailPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 스크롤 가능한 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // workLifeYearData에서 해당 월 데이터를 가져와서 커스텀 getAttendanceForEmployee 생성
                const monthData =
                  workLifeYearData[workLifeDetailMonth + 1] || [];

                const detailPopupGetAttendanceForEmployee = (
                  employeeId,
                  year,
                  month,
                  day
                ) => {
                  const dateKey = `${year}-${String(month).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const record = monthData.find(
                    (r) =>
                      r.employeeId === employeeId && r.date.startsWith(dateKey)
                  );
                  return record
                    ? {
                        checkIn: record.checkIn || '',
                        checkOut: record.checkOut || '',
                      }
                    : { checkIn: '', checkOut: '' };
                };

                return (
                  <>
                    {workLifeDetailMetric === '평균 특근시간' && (
                      <div>
                        <div className="mb-4 text-sm text-gray-600">
                          {selectedYear}년 {workLifeDetailMonth + 1}월 직원별
                          특근 총 시간입니다.
                        </div>
                        <div className="overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-200">
                              <tr className="bg-gray-200">
                                <th className="p-3 text-center font-semibold">
                                  급여형태
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: 'employeeName',
                                      direction:
                                        overtimeSortConfig.key ===
                                          'employeeName' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  직원명{' '}
                                  {overtimeSortConfig.key ===
                                    'employeeName' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: 'value',
                                      direction:
                                        overtimeSortConfig.key === 'value' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  특근 총 시간{' '}
                                  {overtimeSortConfig.key === 'value' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '조출',
                                      direction:
                                        overtimeSortConfig.key === '조출' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  조출{' '}
                                  {overtimeSortConfig.key === '조출' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '연장',
                                      direction:
                                        overtimeSortConfig.key === '연장' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  연장{' '}
                                  {overtimeSortConfig.key === '연장' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '심야',
                                      direction:
                                        overtimeSortConfig.key === '심야' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  심야{' '}
                                  {overtimeSortConfig.key === '심야' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '연장+심야',
                                      direction:
                                        overtimeSortConfig.key ===
                                          '연장+심야' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  연장+심야{' '}
                                  {overtimeSortConfig.key === '연장+심야' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '특근',
                                      direction:
                                        overtimeSortConfig.key === '특근' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  특근{' '}
                                  {overtimeSortConfig.key === '특근' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '특근+연장',
                                      direction:
                                        overtimeSortConfig.key ===
                                          '특근+연장' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  특근+연장{' '}
                                  {overtimeSortConfig.key === '특근+연장' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '특근+심야',
                                      direction:
                                        overtimeSortConfig.key ===
                                          '특근+심야' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  특근+심야{' '}
                                  {overtimeSortConfig.key === '특근+심야' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setOvertimeSortConfig({
                                      key: '특근+연장+심야',
                                      direction:
                                        overtimeSortConfig.key ===
                                          '특근+연장+심야' &&
                                        overtimeSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  특근+연장+심야{' '}
                                  {overtimeSortConfig.key ===
                                    '특근+연장+심야' && (
                                    <span>
                                      {overtimeSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // getWorkLifeDetailDataUtil 직접 호출하여 workLifeDetailMonthData 사용
                                const detailData = getWorkLifeDetailDataUtil(
                                  selectedYear,
                                  workLifeDetailMonth,
                                  '평균 특근시간',
                                  employees,
                                  getDaysInMonth,
                                  detailPopupGetAttendanceForEmployee,
                                  isHolidayDate,
                                  leaveRequests,
                                  calcDailyWage,
                                  calculateAnnualLeave,
                                  safetyAccidents,
                                  suggestions,
                                  evaluations,
                                  notices,
                                  getWorkTypeForDate
                                );
                                if (detailData.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan="12"
                                        className="p-4 text-center text-gray-500"
                                      >
                                        해당 월에 특근 기록이 없습니다.
                                      </td>
                                    </tr>
                                  );
                                }

                                // 정렬 로직 적용 (기본: 특근 총 시간 내림차순)
                                const sortedData = [...detailData].sort(
                                  (a, b) => {
                                    const sortKey =
                                      overtimeSortConfig.key || 'value';
                                    const sortDirection =
                                      overtimeSortConfig.direction || 'desc';

                                    const aValue = a[sortKey];
                                    const bValue = b[sortKey];

                                    if (sortKey === 'employeeName') {
                                      // 문자열 정렬
                                      return sortDirection === 'asc'
                                        ? aValue.localeCompare(bValue)
                                        : bValue.localeCompare(aValue);
                                    } else {
                                      // 숫자 정렬
                                      return sortDirection === 'asc'
                                        ? aValue - bValue
                                        : bValue - aValue;
                                    }
                                  }
                                );

                                return sortedData.map((item, index) => (
                                  <tr
                                    key={index}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 text-center">
                                      {item.payType}
                                    </td>
                                    <td className="p-3 text-center">
                                      {item.employeeName}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-blue-600">
                                      {item.value}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.조출}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.연장}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.심야}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item['연장+심야']}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.특근}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item['특근+연장']}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item['특근+심야']}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item['특근+연장+심야']}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {workLifeDetailMetric === '연차 사용률' && (
                      <div>
                        <div className="mb-4 text-sm text-gray-600">
                          {selectedYear}년 {workLifeDetailMonth + 1}월 직원별
                          연차 사용일입니다.
                        </div>
                        <div className="overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-200">
                              <tr className="bg-gray-200">
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setLeaveSortConfig({
                                      key: 'employeeName',
                                      direction:
                                        leaveSortConfig.key ===
                                          'employeeName' &&
                                        leaveSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  직원명{' '}
                                  {leaveSortConfig.key === 'employeeName' && (
                                    <span>
                                      {leaveSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setLeaveSortConfig({
                                      key: 'date',
                                      direction:
                                        leaveSortConfig.key === 'date' &&
                                        leaveSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  사용일자{' '}
                                  {leaveSortConfig.key === 'date' && (
                                    <span>
                                      {leaveSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setLeaveSortConfig({
                                      key: 'value',
                                      direction:
                                        leaveSortConfig.key === 'value' &&
                                        leaveSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  연차 사용일{' '}
                                  {leaveSortConfig.key === 'value' && (
                                    <span>
                                      {leaveSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setLeaveSortConfig({
                                      key: 'leaveType',
                                      direction:
                                        leaveSortConfig.key === 'leaveType' &&
                                        leaveSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  연차유형{' '}
                                  {leaveSortConfig.key === 'leaveType' && (
                                    <span>
                                      {leaveSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // getWorkLifeDetailDataUtil 직접 호출하여 workLifeDetailMonthData 사용
                                let detailData = getWorkLifeDetailDataUtil(
                                  selectedYear,
                                  workLifeDetailMonth,
                                  '연차 사용률',
                                  employees,
                                  getDaysInMonth,
                                  detailPopupGetAttendanceForEmployee,
                                  isHolidayDate,
                                  leaveRequests,
                                  calcDailyWage,
                                  calculateAnnualLeave,
                                  safetyAccidents,
                                  suggestions,
                                  evaluations,
                                  notices,
                                  getWorkTypeForDate
                                );

                                // Apply sorting (기본: 사용일자 오름차순)
                                const sortKey = leaveSortConfig.key || 'date';
                                const sortDirection =
                                  leaveSortConfig.direction || 'asc';

                                detailData = [...detailData].sort((a, b) => {
                                  let aVal = a[sortKey];
                                  let bVal = b[sortKey];

                                  // Handle numeric comparison for value field
                                  if (sortKey === 'value') {
                                    aVal = Number(aVal);
                                    bVal = Number(bVal);
                                    return sortDirection === 'asc'
                                      ? aVal - bVal
                                      : bVal - aVal;
                                  }

                                  // String comparison for other fields
                                  if (sortDirection === 'asc') {
                                    return String(aVal).localeCompare(
                                      String(bVal)
                                    );
                                  } else {
                                    return String(bVal).localeCompare(
                                      String(aVal)
                                    );
                                  }
                                });

                                if (detailData.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="p-4 text-center text-gray-500"
                                      >
                                        해당 월에 연차 사용 기록이 없습니다.
                                      </td>
                                    </tr>
                                  );
                                }
                                const totalDays = detailData.reduce(
                                  (sum, item) => sum + item.value,
                                  0
                                );
                                return (
                                  <>
                                    {detailData.map((item, index) => (
                                      <tr
                                        key={index}
                                        className="border-b hover:bg-gray-50"
                                      >
                                        <td className="p-3 text-center">
                                          {item.employeeName}
                                        </td>
                                        <td className="p-3 text-center text-gray-700">
                                          {item.date}
                                        </td>
                                        <td className="p-3 text-center font-semibold text-green-600">
                                          {item.value}일
                                        </td>
                                        <td className="p-3 text-center text-gray-700">
                                          {item.leaveType}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-blue-50 font-bold">
                                      <td
                                        colSpan="2"
                                        className="p-3 text-center text-gray-800"
                                      >
                                        총 합계
                                      </td>
                                      <td
                                        colSpan="2"
                                        className="p-3 text-center text-blue-600"
                                      >
                                        {totalDays}일
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {workLifeDetailMetric === '주 52시간 위반' && (
                      <div>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {selectedYear}-
                            {String(workLifeDetailMonth + 1).padStart(2, '0')}{' '}
                            주 52시간 위반 목록
                          </h3>
                          <div className="text-xs text-gray-600">
                            ※ 동일 직원이라도 주차가 다르면 별도 행으로
                            표시됩니다.
                          </div>
                        </div>
                        <div className="overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-200">
                              <tr className="bg-gray-200">
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setViolationSortConfig({
                                      key: 'employeeName',
                                      direction:
                                        violationSortConfig.key ===
                                          'employeeName' &&
                                        violationSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  직원명{' '}
                                  {violationSortConfig.key ===
                                    'employeeName' && (
                                    <span>
                                      {violationSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setViolationSortConfig({
                                      key: 'weekPeriod',
                                      direction:
                                        violationSortConfig.key ===
                                          'weekPeriod' &&
                                        violationSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  해당 주 기간{' '}
                                  {violationSortConfig.key === 'weekPeriod' && (
                                    <span>
                                      {violationSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    setViolationSortConfig({
                                      key: 'violationHours',
                                      direction:
                                        violationSortConfig.key ===
                                          'violationHours' &&
                                        violationSortConfig.direction === 'asc'
                                          ? 'desc'
                                          : 'asc',
                                    });
                                  }}
                                >
                                  위반 시간{' '}
                                  {violationSortConfig.key ===
                                    'violationHours' && (
                                    <span>
                                      {violationSortConfig.direction === 'asc'
                                        ? '▲'
                                        : '▼'}
                                    </span>
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // getWorkLifeDetailDataUtil 직접 호출하여 workLifeDetailMonthData 사용
                                let detailData = getWorkLifeDetailDataUtil(
                                  selectedYear,
                                  workLifeDetailMonth,
                                  '주 52시간 위반',
                                  employees,
                                  getDaysInMonth,
                                  detailPopupGetAttendanceForEmployee,
                                  isHolidayDate,
                                  leaveRequests,
                                  calcDailyWage,
                                  calculateAnnualLeave,
                                  safetyAccidents,
                                  suggestions,
                                  evaluations,
                                  notices,
                                  getWorkTypeForDate
                                );

                                // Apply sorting (기본: 위반시간 내림차순)
                                const sortKey =
                                  violationSortConfig.key || 'violationHours';
                                const sortDirection =
                                  violationSortConfig.direction || 'desc';

                                detailData = [...detailData].sort((a, b) => {
                                  let aVal = a[sortKey];
                                  let bVal = b[sortKey];

                                  // Handle numeric comparison for violationHours field
                                  if (sortKey === 'violationHours') {
                                    aVal = Number(aVal);
                                    bVal = Number(bVal);
                                    return sortDirection === 'asc'
                                      ? aVal - bVal
                                      : bVal - aVal;
                                  }

                                  // String comparison for other fields
                                  if (sortDirection === 'asc') {
                                    return String(aVal).localeCompare(
                                      String(bVal)
                                    );
                                  } else {
                                    return String(bVal).localeCompare(
                                      String(aVal)
                                    );
                                  }
                                });

                                if (detailData.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan="3"
                                        className="p-4 text-center text-gray-500"
                                      >
                                        해당 월에 주 52시간 위반 기록이
                                        없습니다.
                                      </td>
                                    </tr>
                                  );
                                }
                                return detailData.map((item, index) => (
                                  <tr
                                    key={index}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 text-center">
                                      {item.employeeName}
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.weekPeriod}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-red-600">
                                      {(() => {
                                        const totalHours = Number(
                                          item.violationHours
                                        );
                                        const hours = Math.floor(totalHours);
                                        const minutes = Math.round(
                                          (totalHours - hours) * 60
                                        );
                                        return minutes > 0
                                          ? `${hours}시간 ${minutes}분`
                                          : `${hours}시간`;
                                      })()}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {workLifeDetailMetric === '스트레스 지수' && (
                      <div>
                        <div className="mb-4 text-sm text-gray-600">
                          {selectedYear}년 {workLifeDetailMonth + 1}월 직원별
                          스트레스 지수입니다.
                        </div>
                        <div className="overflow-auto max-h-[600px]">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-200">
                              <tr className="bg-gray-200">
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === 'employeeName') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('employeeName');
                                      setStressSortDirection('asc');
                                    }
                                  }}
                                >
                                  직원명{' '}
                                  {stressSortColumn === 'employeeName' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === 'department') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('department');
                                      setStressSortDirection('asc');
                                    }
                                  }}
                                >
                                  부서{' '}
                                  {stressSortColumn === 'department' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === 'position') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('position');
                                      setStressSortDirection('asc');
                                    }
                                  }}
                                >
                                  직급{' '}
                                  {stressSortColumn === 'position' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === 'value') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('value');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  스트레스
                                  <br />
                                  지수{' '}
                                  {stressSortColumn === 'value' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '근무시간') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('근무시간');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  근무
                                  <br />
                                  시간{' '}
                                  {stressSortColumn === '근무시간' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '연차사용률') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('연차사용률');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  연차
                                  <br />
                                  사용률{' '}
                                  {stressSortColumn === '연차사용률' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '정시퇴근율') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('정시퇴근율');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  정시
                                  <br />
                                  퇴근율{' '}
                                  {stressSortColumn === '정시퇴근율' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '건의사항승인률') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('건의사항승인률');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  건의사항
                                  <br />
                                  승인률{' '}
                                  {stressSortColumn === '건의사항승인률' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '야간/연속근무') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('야간/연속근무');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  야간
                                  <br />
                                  /연속근무{' '}
                                  {stressSortColumn === '야간/연속근무' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                                <th
                                  className="p-3 text-center font-semibold cursor-pointer hover:bg-gray-300"
                                  onClick={() => {
                                    if (stressSortColumn === '근태안정') {
                                      setStressSortDirection(
                                        stressSortDirection === 'asc'
                                          ? 'desc'
                                          : 'asc'
                                      );
                                    } else {
                                      setStressSortColumn('근태안정');
                                      setStressSortDirection('desc');
                                    }
                                  }}
                                >
                                  근태
                                  <br />
                                  안정성{' '}
                                  {stressSortColumn === '근태안정' &&
                                    (stressSortDirection === 'asc' ? '▲' : '▼')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // getWorkLifeDetailDataUtil 직접 호출하여 workLifeDetailMonthData 사용
                                const detailData = getWorkLifeDetailDataUtil(
                                  selectedYear,
                                  workLifeDetailMonth,
                                  '스트레스 지수',
                                  employees,
                                  getDaysInMonth,
                                  detailPopupGetAttendanceForEmployee,
                                  isHolidayDate,
                                  leaveRequests,
                                  calcDailyWage,
                                  calculateAnnualLeave,
                                  safetyAccidents,
                                  suggestions,
                                  evaluations,
                                  notices,
                                  getWorkTypeForDate
                                );

                                // 정렬 적용
                                if (detailData.length > 0) {
                                  detailData.sort((a, b) => {
                                    let aValue = a[stressSortColumn];
                                    let bValue = b[stressSortColumn];

                                    // 문자열 정렬 (직원명, 부서, 직급)
                                    if (
                                      typeof aValue === 'string' &&
                                      typeof bValue === 'string'
                                    ) {
                                      if (stressSortDirection === 'asc') {
                                        return aValue.localeCompare(
                                          bValue,
                                          'ko'
                                        );
                                      } else {
                                        return bValue.localeCompare(
                                          aValue,
                                          'ko'
                                        );
                                      }
                                    }

                                    // 숫자 정렬 (점수들)
                                    if (stressSortDirection === 'asc') {
                                      return aValue - bValue;
                                    } else {
                                      return bValue - aValue;
                                    }
                                  });
                                }

                                if (detailData.length === 0) {
                                  return (
                                    <tr>
                                      <td
                                        colSpan="10"
                                        className="p-4 text-center text-gray-500"
                                      >
                                        해당 월에 스트레스 데이터가 없습니다.
                                      </td>
                                    </tr>
                                  );
                                }

                                return detailData.map((item, index) => (
                                  <tr
                                    key={index}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="p-3 text-center">
                                      {item.employeeName}
                                    </td>
                                    <td className="p-3 text-center">
                                      {item.department}
                                    </td>
                                    <td className="p-3 text-center">
                                      {item.position}
                                    </td>
                                    <td className="p-3 text-center font-semibold text-red-600">
                                      {item.value}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.근무시간}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.연차사용률}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.정시퇴근율}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.건의사항승인률}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item['야간/연속근무']}점
                                    </td>
                                    <td className="p-3 text-center text-gray-700">
                                      {item.근태안정}점
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 안전사고 목록/입력 팝업 */}
      {showSafetyAccidentInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">안전사고 목록/입력</h3>
              <button
                onClick={() => setShowSafetyAccidentInput(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleSafetyAccidentInput(
                  formData.get('date'),
                  formData.get('description'),
                  formData.get('severity')
                );
                e.target.reset(); // Clear form after successful submission
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사고 일자
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {/* 등록일시 입력란 제거: 사고 저장 시 createdAt = new Date().toISOString() 등 자동 할당 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    사고 내용
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="사고 내용을 입력하세요..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    심각도
                  </label>
                  <select
                    name="severity"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="경미">경미</option>
                    <option value="보통">보통</option>
                    <option value="심각">심각</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowSafetyAccidentInput(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  저장
                </button>
              </div>
            </form>

            {/* 안전사고 목록 */}
            <div className="mt-6 border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-base font-semibold text-gray-800">
                  등록된 안전사고 목록
                </h4>
                {/* 검색 필드 */}
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="연도"
                    value={safetyAccidentSearch.year}
                    onChange={(e) =>
                      setSafetyAccidentSearch({
                        ...safetyAccidentSearch,
                        year: e.target.value,
                      })
                    }
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="월"
                    value={safetyAccidentSearch.month}
                    onChange={(e) =>
                      setSafetyAccidentSearch({
                        ...safetyAccidentSearch,
                        month: e.target.value,
                      })
                    }
                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={safetyAccidentSearch.severity}
                    onChange={(e) =>
                      setSafetyAccidentSearch({
                        ...safetyAccidentSearch,
                        severity: e.target.value,
                      })
                    }
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    <option value="경미">경미</option>
                    <option value="보통">보통</option>
                    <option value="심각">심각</option>
                  </select>
                  <input
                    type="text"
                    placeholder="사고내용"
                    value={safetyAccidentSearch.content}
                    onChange={(e) =>
                      setSafetyAccidentSearch({
                        ...safetyAccidentSearch,
                        content: e.target.value,
                      })
                    }
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() =>
                      setSafetyAccidentSearch({
                        year: '',
                        month: '',
                        severity: '',
                        content: '',
                      })
                    }
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    초기화
                  </button>
                </div>
              </div>
              {safetyAccidents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 안전사고가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr className="bg-gray-100">
                        <th className="text-center py-1 px-2">날짜</th>
                        <th className="text-center py-1 px-2">심각도</th>
                        <th className="text-center py-1 px-2">사고 내용</th>
                        <th className="text-center py-1 px-2">등록일시</th>
                        <th className="text-center py-1 px-2">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // 검색 필터링
                        let filtered = safetyAccidents.filter((accident) => {
                          // date 필드 안전성 체크
                          if (
                            !accident?.date ||
                            typeof accident.date !== 'string'
                          ) {
                            return false;
                          }

                          // 연도 필터
                          if (
                            safetyAccidentSearch.year &&
                            !accident.date.startsWith(safetyAccidentSearch.year)
                          ) {
                            return false;
                          }
                          // 월 필터
                          if (safetyAccidentSearch.month) {
                            const accidentMonth = accident.date.split('-')[1];
                            if (
                              accidentMonth !==
                              String(safetyAccidentSearch.month).padStart(
                                2,
                                '0'
                              )
                            ) {
                              return false;
                            }
                          }
                          // 심각도 필터
                          if (
                            safetyAccidentSearch.severity &&
                            accident.severity !== safetyAccidentSearch.severity
                          ) {
                            return false;
                          }
                          // 사고내용 필터
                          if (
                            safetyAccidentSearch.content &&
                            accident.description &&
                            !accident.description
                              .toLowerCase()
                              .includes(
                                safetyAccidentSearch.content.toLowerCase()
                              )
                          ) {
                            return false;
                          }
                          return true;
                        });

                        return filtered
                          .sort((a, b) => {
                            // ✅ 등록일시 기준 최신순 정렬 (createdAt 내림차순)
                            const dateA = new Date(a.createdAt || a.date);
                            const dateB = new Date(b.createdAt || b.date);
                            return dateB - dateA;
                          })
                          .slice(
                            (safetyAccidentPage - 1) * 15,
                            safetyAccidentPage * 15
                          )
                          .map((accident, idx) => {
                            const isEditing = editingAccidentId === accident.id;
                            return (
                              <tr
                                key={accident.id || idx}
                                className="hover:bg-gray-50"
                              >
                                <td className="text-center px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      className="border px-2 py-1 w-28"
                                      value={editDate}
                                      onChange={(e) =>
                                        setEditDate(e.target.value)
                                      }
                                    />
                                  ) : (
                                    accident.date
                                  )}
                                </td>
                                <td className="text-center px-4 py-2">
                                  {isEditing ? (
                                    <select
                                      className="border px-2 py-1 w-24"
                                      value={editSeverity}
                                      onChange={(e) =>
                                        setEditSeverity(e.target.value)
                                      }
                                    >
                                      <option value="경미">경미</option>
                                      <option value="보통">보통</option>
                                      <option value="심각">심각</option>
                                    </select>
                                  ) : (
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        accident.severity === '심각'
                                          ? 'bg-red-100 text-red-800'
                                          : accident.severity === '보통'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-green-100 text-green-800'
                                      }`}
                                    >
                                      {accident.severity}
                                    </span>
                                  )}
                                </td>
                                <td className="text-center px-4 py-2">
                                  {isEditing ? (
                                    <input
                                      className="border px-2 py-1 w-40"
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                    />
                                  ) : (
                                    accident.description
                                  )}
                                </td>
                                <td className="text-center px-4 py-2 text-gray-500">
                                  {isEditing ? (
                                    <input
                                      type="datetime-local"
                                      className="border px-2 py-1 w-40"
                                      value={editCreatedAt}
                                      onChange={(e) =>
                                        setEditCreatedAt(e.target.value)
                                      }
                                    />
                                  ) : accident.createdAt ? (
                                    new Date(accident.createdAt).toLocaleString(
                                      'ko-KR',
                                      {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      }
                                    )
                                  ) : (
                                    new Date(
                                      accident.reportedAt || accident.date
                                    ).toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  )}
                                </td>
                                <td className="text-center flex justify-center gap-2 px-4 py-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
                                        onClick={() =>
                                          handleSaveAccidentEdit(
                                            accident.id,
                                            {
                                              editDate,
                                              editCreatedAt,
                                              editContent,
                                              editSeverity,
                                            },
                                            {
                                              setEditingAccidentId,
                                              setEditDate,
                                              setEditCreatedAt,
                                              setEditContent,
                                              setEditSeverity,
                                            }
                                          )
                                        }
                                      >
                                        저장
                                      </button>
                                      <button
                                        className="px-2 py-1 text-xs bg-gray-300 text-gray-800 rounded"
                                        onClick={() =>
                                          handleCancelAccidentEdit({
                                            setEditingAccidentId,
                                            setEditDate,
                                            setEditCreatedAt,
                                            setEditContent,
                                            setEditSeverity,
                                          })
                                        }
                                      >
                                        취소
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                        onClick={() =>
                                          handleEditSafety(accident, {
                                            setEditingAccidentId,
                                            setEditDate,
                                            setEditCreatedAt,
                                            setEditContent,
                                            setEditSeverity,
                                          })
                                        }
                                      >
                                        수정
                                      </button>
                                      <button
                                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs mr-1 hover:bg-red-200"
                                        onClick={() =>
                                          handleDeleteSafety(accident)
                                        }
                                      >
                                        삭제
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                      })()}
                    </tbody>
                  </table>
                  {/* 페이지네이션 */}
                  {(() => {
                    // 검색 필터링된 결과 수
                    const filteredCount = safetyAccidents.filter((accident) => {
                      // date 필드 안전성 체크
                      if (
                        !accident?.date ||
                        typeof accident.date !== 'string'
                      ) {
                        return false;
                      }

                      if (
                        safetyAccidentSearch.year &&
                        !accident.date.startsWith(safetyAccidentSearch.year)
                      ) {
                        return false;
                      }
                      if (safetyAccidentSearch.month) {
                        const accidentMonth = accident.date.split('-')[1];
                        if (
                          accidentMonth !==
                          String(safetyAccidentSearch.month).padStart(2, '0')
                        ) {
                          return false;
                        }
                      }
                      if (
                        safetyAccidentSearch.severity &&
                        accident.severity !== safetyAccidentSearch.severity
                      ) {
                        return false;
                      }
                      if (
                        safetyAccidentSearch.content &&
                        accident.description &&
                        !accident.description
                          .toLowerCase()
                          .includes(safetyAccidentSearch.content.toLowerCase())
                      ) {
                        return false;
                      }
                      return true;
                    }).length;

                    if (filteredCount <= 15) return null;

                    return (
                      <div className="flex justify-center mt-4 gap-1">
                        {Array.from({
                          length: Math.ceil(filteredCount / 15),
                        }).map((_, i) => (
                          <button
                            key={i}
                            className={`px-3 py-1 rounded ${
                              safetyAccidentPage === i + 1
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            onClick={() => setSafetyAccidentPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 추천사항 기록 팝업 */}
      {showAiHistoryPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">AI 추천사항 기록</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        '모든 AI 추천사항 기록을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.'
                      )
                    ) {
                      localStorage.removeItem('aiRecommendationHistory');
                      setAiRecommendationHistory([]);
                      alert('✅ 모든 기록이 삭제되었습니다.');
                    }
                  }}
                  disabled={aiRecommendationHistory.length === 0}
                  className="flex items-center space-x-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>기록 삭제</span>
                </button>
                <button
                  onClick={downloadAiHistory}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>다운로드</span>
                </button>
                <button
                  onClick={() => setShowAiHistoryPopup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              {aiRecommendationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    저장된 AI 추천사항 기록이 없습니다.
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    AI 분석을 실행하면 기록이 자동으로 저장됩니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiRecommendationHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-blue-600">
                          {entry.title}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                          <div className="text-xs font-medium text-gray-900">
                            {entry.date}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.time}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {entry.recommendations?.map((rec, index) => (
                            <div
                              key={index}
                              className="border border-gray-100 rounded p-3"
                            >
                              <div className="flex items-start mb-2">
                                <div
                                  className={`w-2 h-2 bg-${rec.color}-500 rounded-full mt-2 mr-2 flex-shrink-0`}
                                ></div>
                                <div>
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    {rec.type}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {rec.title}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {rec.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )) || (
                            <div className="col-span-4 text-sm text-gray-600 whitespace-pre-line">
                              {entry.content}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI 프롬프트 설정 팝업 */}
      {showPromptSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">AI 프롬프트 설정</h3>
              <button
                onClick={() => setShowPromptSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleAiPromptSave(formData.get('prompt'));
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    분석 프롬프트
                  </label>
                  <textarea
                    name="prompt"
                    rows={4}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    defaultValue={aiPromptSettings}
                    placeholder="AI가 HR 데이터를 분석할 때 사용할 프롬프트를 입력하세요..."
                  />
                </div>
                <div className="text-xs text-gray-500">
                  이 프롬프트는 AI가 회사의 HR 데이터를 분석하여 추천사항을
                  생성할 때 사용됩니다.
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPromptSettings(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    저장
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// *[2_관리자 모드] 2.1_대시보드 유틸리티 함수들*

export default AdminDashboard;
