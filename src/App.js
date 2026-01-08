/* eslint-disable no-undef */
/* ================================
   [1_공통] 부성스틸 인사관리시스템 - App.js
================================ */

//---[1_공통] 1.0_프로그램 구조---//
// *[1_공통] 프로그램 구성*
// - [1_공통]: 로그인, 언어, AI, 알림, 공휴일 관리
// - [2_관리자 모드]: 대시보드, 직원관리, 공지관리, 알림관리, 일정관리, 연차관리, 건의관리, 근태관리, 급여관리, 평가관리, AI챗봇, 시스템관리
// - [3_일반직원 모드]: 사원정보, 공지사항, 알림사항, 회사일정/근태, 연차신청/내역, 급여내역, 건의사항, 직원평가

//---[1_공통] 1.1_라이브러리 Import---//
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  BarChart3,
  Bell,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { io } from 'socket.io-client';
import apiClient from './api/client';
import {
  AttendanceAPI,
  AttendanceStatsAPI,
  AttendanceSheetAPI,
  AttendanceSummaryAPI,
} from './api/attendance';
import EmployeeAPI from './api/employee';
import AdminAPI from './api/admin';
import LeaveAPI from './api/leave';
import { NoticeAPI, SuggestionAPI, NotificationAPI } from './api/communication';
import { ScheduleAPI } from './api/system';
import { SafetyAccidentAPI } from './api/safety';
import HolidayAPI from './api/holiday';
import EvaluationAPI from './api/evaluation';
import PayrollAPI from './api/payroll';
import holidayService from './components/common/common_common';
import {
  get연차갱신알림수신자,
  get연차알림대상자,
  get부서관리자및대표이사,
} from './components/common/common_admin_leave';
import {
  get건의사항알림대상자,
  useSuggestionApproval,
  STATUS_COLORS,
} from './components/common/common_admin_suggestion';
import {
  useScheduleManagement,
  useHolidayManagement,
  getFilteredScheduleEvents,
} from './components/common/common_admin_schedule';
import { useEmployeeManagement } from './components/common/common_admin_employee';
// import { useSuggestionApproval } from './hooks/hooks_admin_suggestion'; // 병합됨: common_admin_suggestion
// import { useEvaluationManagement } from './hooks/hooks_admin_evaluation'; // 병합됨: common_admin_evaluation
import { useEvaluationManagement } from './components/common/common_admin_evaluation';
// import { useStaffLeave } from './hooks/hooks_staff_leave'; // 병합됨: common_staff_leave
import { useStaffLeave } from './components/common/common_staff_leave';
// import { useStaffSuggestion } from './hooks/hooks_staff_suggestion'; // 병합됨: common_staff_suggestion
import { useStaffSuggestion } from './components/common/common_staff_suggestion';
import { getAttendanceDotColor } from './components/common/common_staff_attendance';
// import { useStaffSalary } from './hooks/hooks_staff_salary'; // 병합됨: common_staff_payroll
// import { maskSalary, generateSalaryHistory as generateSalaryHistoryUtil } from './utils/utils_staff_salary'; // 병합됨: common_staff_payroll
import {
  useStaffSalary,
  maskSalary,
  generateSalaryHistoryImpl as generateSalaryHistoryUtil,
} from './components/common/common_staff_payroll';
import {
  diffYMD,
  calculateAnnualLeave,
  getMonthlyAnnualLeave as getMonthlyAnnualLeaveUtil,
  getUsedAnnualLeave as getUsedAnnualLeaveUtil,
  getLeaveDays,
  calculateEmployeeAnnualLeave as calculateEmployeeAnnualLeaveUtil,
  generateEmployees,
  getDateKey,
  isHolidayDate,
  getDaysInMonth,
  getDayOfWeek,
  getTodayDateWithDay,
  getYesterdayDateWithDay,
  getStatusTextColor,
  formatDateWithDay,
  formatDateByLang,
  getDatePlaceholder,
  analyzeAttendanceStatus as analyzeAttendanceStatusBase,
  PAYROLL_INCOME_ITEMS,
  PAYROLL_DEDUCTION_ITEMS,
  categorizeWorkTime as categorizeWorkTimeBase,
  excludeBreakTimes as excludeBreakTimesBase,
  roundDownToHalfHour,
  EXCLUDE_EXTRA_RANKS,
  calcDailyWage as calcDailyWageBase,
  calcMonthlyWage as calcMonthlyWageBase,
  timeToMinutes,
  useAiChat,
  useMonthNavigation,
} from './components/common/common_common';
// import CommonAIService from './components/common/CommonAIService'; // 병합됨: common_admin_ai
import CommonAIService from './components/common/common_admin_ai';
import CommonDownloadService, {
  exportOrganizationToXLSX,
} from './components/common/common_common_downloadservice';
import CommonLogin from './components/common/CommonLogin';
import AdminMain from './components/admin/AdminMain';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminEmployeeManagement from './components/admin/AdminEmployeeManagement';
import AdminAttendanceManagement from './components/admin/AdminAttendanceManagement';
import AdminScheduleManagement from './components/admin/AdminScheduleManagement';
import AdminPayrollManagement from './components/admin/AdminPayrollManagement';
import AdminLeaveManagement from './components/admin/AdminLeaveManagement';
import AdminEvaluationManagement from './components/admin/AdminEvaluationManagement';
import AdminNoticeManagement from './components/admin/AdminNoticeManagement';
import AdminNotificationManagement from './components/admin/AdminNotificationManagement';
import AdminSuggestionManagement from './components/admin/AdminSuggestionManagement';
import AdminSystemManagement from './components/admin/AdminSystemManagement';
import AdminAIChatbot from './components/admin/AdminAIChatbot';
import StaffMain from './components/staff/StaffMain';
import StaffEmployeeInfo from './components/staff/StaffEmployeeInfo';
import StaffAnnualLeave from './components/staff/StaffAnnualLeave';
import StaffNotice from './components/staff/StaffNotice';
import StaffNotification from './components/staff/StaffNotification';
import StaffScheduleAttendance from './components/staff/StaffScheduleAttendance';
import StaffSalary from './components/staff/StaffSalary';
import StaffSuggestion from './components/staff/StaffSuggestion';
import StaffEvaluation from './components/staff/StaffEvaluation';
import {
  createCompanyWageRules,
  EXCLUDE_TIME,
  COMPANY_STANDARDS,
} from './components/common/common_common';
import {
  useEmployeeState,
  useScheduledNoticePublisher,
  useAdminFilters,
  useEmployeeSearch,
  useNotificationRecipients,
  useSortHandlers,
} from './components/common/common_common';
import {
  useNotificationHandlers,
  shouldReceiveNotification,
  repeatCycleOptions,
  recipientOptions,
  getRecipientText,
  요일목록,
  get관리자알림목록,
  get통합알림리스트,
  calculateRecipientCount,
  getFilteredNotificationLogs,
  send자동알림 as send자동알림Service,
} from './components/common/common_admin_notification';
// import { useStaffPWAInitializer } from './hooks/hooks_staff_common'; // 병합됨: common_staff_common
import { useStaffPWAInitializer } from './components/common/common_staff_common';
import {
  useMidnightScheduler,
  useStorageSync,
  useSystemSettings,
  useMenuStateReset,
  useAuth,
  useLanguage,
} from './components/common/common_common';
import { useAnnualLeaveManager } from './components/common/common_admin_leave';
import {
  usePayrollManagement,
  usePayrollFilter,
  exportPayrollXLSX,
} from './components/common/common_admin_payroll';
// import { logSystemEvent, getActiveAiKey, getActiveProvider } from './utils/utils_admin_system'; // 병합됨: common_admin_system
import {
  useAttendanceFilter,
  useAttendanceManagement,
  useAttendanceCellSelection,
  useAttendanceClipboard,
  useFilteredAttendanceStats,
  AttendanceExcelParser,
} from './components/common/common_admin_attendance';
// import { useSystemManagement, useModelSelection } from './hooks/hooks_admin_system'; // 병합됨: common_admin_system
import {
  useEmployeeNotifications,
  useNotificationRecurring,
  useAdminNotifications,
  useNotificationLogState,
} from './components/common/common_admin_notification';
// Filters imported from respective common files
import { filterEvaluations } from './components/common/common_admin_evaluation';
import { filterSuggestions } from './components/common/common_admin_suggestion';
import { filterLeaveRequests } from './components/common/common_admin_leave';
import {
  filterNotices,
  useNoticeState,
} from './components/common/common_admin_notice';
// Sorts imported from respective common files
import { sortLeaveRequests } from './components/common/common_admin_leave';
import { sortSuggestions } from './components/common/common_admin_suggestion';
import { sortEvaluations } from './components/common/common_admin_evaluation';
import { sortEmployees } from './components/common/common_admin_employee';
import {
  useNoticeManagement,
  filterNotices as filterNoticesFromNotice,
} from './components/common/common_admin_notification';
// import useAIRecommendations, { useChatbotPermissions, useAISettings } from './hooks/hooks_admin_ai'; // 병합됨: common_admin_ai
import {
  useAIRecommendations,
  useChatbotPermissions,
  useAISettings,
} from './components/common/common_admin_ai';
import {
  useAnnualLeaveEditor,
  useLeaveApproval,
} from './components/common/common_admin_leave';
// import { useAttendanceCellSelection, useAttendanceClipboard } from './hooks/hooks_admin_attendance.js'; // 병합됨: common_admin_attendance
import {
  useSafetyManagement,
  useDashboardAttendance,
  useDashboardCalculations,
  useDashboardActions,
  useDashboardStats,
  send52HourViolationAlert as send52HourViolationAlertUtil,
} from './components/common/common_admin_dashboard.js';
// import { useSystemStatus } from './hooks/hooks_admin_system.js'; // 병합됨: common_admin_system
import {
  useSystemManagement,
  useModelSelection,
  useSystemStatus,
  logSystemEvent,
  getActiveAiKey,
  getActiveProvider,
} from './components/common/common_admin_system';
import {
  requestFCMPermission,
  onForegroundMessage,
  showLocalNotification,
} from './firebase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

//---[1_공통] 1.2_상수 및 유틸리티---//
// *[1_공통] 1.2.1_개발 로그 유틸*
const __DEV__ = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  //  if (__DEV__) console.log(...args);
};

// *[1_공통] 1.2.2_날짜 변환 유틸* (KST 기준)
// Date 객체를 YYYY-MM-DD 문자열로 변환 (로컬 시간대 기준)
const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// *[1_공통] 1.2.2_API 상수*
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// *[1_공통] 1.2.3_AI 서비스 상수*
const FAIL_MSG = CommonAIService.FAIL_MSG;
const ALL_MODELS = CommonAIService.ALL_MODELS;
const ALLOW_MODEL_LIST = CommonAIService.ALLOW_MODEL_LIST;
const MODEL_DISPLAY_NAMES = CommonAIService.MODEL_DISPLAY_NAMES;

//---[1_공통] 1.3_메인 컴포넌트---//
const HRManagementSystem = () => {
  //---[1_공통] 1.3.1_컴포넌트 내부 유틸리티---//
  // *[1_공통] 1.3.1.1_숫자 포맷팅 함수*
  const safeFormatNumber = (value) => {
    if (value === null || value === undefined || value === '' || isNaN(value)) {
      return '0';
    }
    const num = Number(value);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  //---[1_공통] 1.3.2_공휴일 관리 STATE---//
  // *[1_공통] 1.3.2.1_공휴일 데이터*
  const [holidayData, setHolidayData] = useState({});
  const [holidayLoadingStatus, setHolidayLoadingStatus] = useState({});

  // *[1_공통] 1.3.2.2_커스텀 공휴일*
  const [customHolidays, setCustomHolidays] = useState({});
  const [showHolidayPopup, setShowHolidayPopup] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    isEdit: false,
    originalDate: '',
  });

  // *[1_공통] 1.3.2.2.1_시스템 공휴일 수정/삭제 관리*
  const [deletedSystemHolidays, setDeletedSystemHolidays] = useState([]);
  const [editedSystemHolidays, setEditedSystemHolidays] = useState({});
  const [showDeletedHolidaysModal, setShowDeletedHolidaysModal] =
    useState(false);
  const [
    permanentlyDeletedSystemHolidays,
    setPermanentlyDeletedSystemHolidays,
  ] = useState([]);

  // *[1_공통] 1.3.2.3_공휴일 데이터 로드 함수 (DB 기반)*
  const loadHolidayData = React.useCallback(
    async (year) => {
      // 방어 코드: year가 유효한 숫자인지 확인
      if (!year || isNaN(year) || year < 2000 || year > 2100) {
        return {};
      }

      if (holidayData[year] || holidayLoadingStatus[year]) {
        return holidayData[year];
      }

      setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'loading' }));

      try {
        devLog(`🔄 [DB] ${year}년 공휴일 데이터 로딩 중...`);

        // DB에서 공휴일 데이터 로드
        const response = await HolidayAPI.getYearHolidays(year);
        let holidays = response.data || {};

        devLog(
          `✅ [DB] ${year}년 공휴일 ${
            Object.keys(holidays).length / 2
          }일 로드 완료`
        );

        // 삭제된 시스템 공휴일 제외
        const deleted = JSON.parse(
          localStorage.getItem('deletedSystemHolidays') || '[]'
        );
        deleted.forEach((date) => {
          const shortDate = date.substring(5); // MM-DD
          delete holidays[date];
          delete holidays[shortDate];
        });

        // 영구 삭제된 시스템 공휴일도 제외
        const permanentlyDeleted = JSON.parse(
          localStorage.getItem('permanentlyDeletedSystemHolidays') || '[]'
        );
        permanentlyDeleted.forEach((date) => {
          const shortDate = date.substring(5); // MM-DD
          delete holidays[date];
          delete holidays[shortDate];
        });

        // 수정된 시스템 공휴일 적용
        const edited = JSON.parse(
          localStorage.getItem('editedSystemHolidays') || '{}'
        );
        Object.entries(edited).forEach(([date, name]) => {
          const shortDate = date.substring(5); // MM-DD
          holidays[date] = name;
          holidays[shortDate] = name;
        });

        setHolidayData((prev) => ({ ...prev, [year]: holidays }));
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'loaded' }));

        return holidays;
      } catch (error) {
        devLog(
          `❌ [DB] ${year}년 공휴일 데이터 로드 실패, 로컬 폴백 사용:`,
          error.message
        );
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: 'error' }));

        // 폴백: HolidayService의 로컬 데이터 사용
        const basicHolidays = holidayService.getBasicHolidays(year);
        setHolidayData((prev) => ({ ...prev, [year]: basicHolidays }));
        return basicHolidays;
      }
    },
    [holidayData, holidayLoadingStatus]
  );

  // *[1_공통] 1.3.2.4_공휴일 시스템 초기화 useEffect (DB 기반)*
  useEffect(() => {
    const initializeHolidaySystem = async () => {
      try {
        const currentYear = new Date().getFullYear();

        const priorityYears = [currentYear - 1, currentYear, currentYear + 1];
        devLog('🚀 [DB] 우선순위 공휴일 데이터 로드 시작:', priorityYears);

        await Promise.all(priorityYears.map((year) => loadHolidayData(year)));
        devLog('✅ [DB] 우선순위 공휴일 데이터 로드 완료');

        // 확장 연도 범위 로드는 이제 불필요 (DB에 50년치 저장됨)
        // setTimeout(async () => {
        //   try {
        //     devLog('📅 확장 연도 범위 백그라운드 로드 시작...');
        //     await holidayService.loadExtendedYearRange(currentYear, 30);
        //     devLog('🎉 확장 연도 범위 로드 완료 (±30년)');
        //   } catch (error) {
        //     devLog('⚠️ 확장 연도 범위 로드 실패:', error);
        //   }
        // }, 2000);

        // 주기적 업데이트도 DB 기반이므로 불필요
        // holidayService.startPeriodicUpdate(24);

        // 개발 환경에서 데이터 품질 검증도 이제 불필요
        // if (process.env.NODE_ENV === 'development') {
        //   setTimeout(async () => {
        //     await holidayService.validateDataQuality(
        //       currentYear - 1,
        //       currentYear + 1
        //     );
        //   }, 5000);
        // }
      } catch (error) {
        devLog('❌ 공휴일 시스템 초기화 실패:', error);

        const currentYear = new Date().getFullYear();
        await loadHolidayData(currentYear);
      }
    };

    initializeHolidaySystem();

    // 자정 자동 업데이트 이벤트 리스너 등록
    const handleHolidayUpdate = async (event) => {
      const { years } = event.detail;
      // devLog(
      //   '📢 [자정] 공휴일 업데이트 감지, App.js holidayData 재로드 중...',
      //   years
      // );

      // 업데이트된 연도들의 데이터를 다시 로드
      for (const year of years) {
        await loadHolidayData(year);
      }

      // devLog('✅ [자정] App.js holidayData 재로드 완료');
    };

    window.addEventListener('holidayDataUpdated', handleHolidayUpdate);

    return () => {
      holidayService.stopPeriodicUpdate();
      window.removeEventListener('holidayDataUpdated', handleHolidayUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // *[1_공통] 1.3.2.5_공휴일 데이터 가져오기 (레거시 호환)*
  const getKoreanHolidays = (year) => {
    return holidayData[year] || {};
  };

  // *[1_공통] 1.3.2.6_공휴일 강제 새로고침*
  const forceRefreshHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const yearsToRefresh = [currentYear - 1, currentYear, currentYear + 1];

    try {
      // devLog('🔄 공휴일 데이터 강제 새로고침 시작...');

      yearsToRefresh.forEach((year) => {
        holidayService.clearCache(year);
        setHolidayLoadingStatus((prev) => ({ ...prev, [year]: null }));
      });

      const refreshPromises = yearsToRefresh.map(async (year) => {
        const holidays = await loadHolidayData(year);
        return { year, holidays };
      });

      await Promise.all(refreshPromises);

      // devLog('✅ 공휴일 데이터 강제 새로고침 완료');

      return true;
    } catch (error) {
      // devLog('❌ 공휴일 데이터 강제 새로고침 실패:', error);
      return false;
    }
  };

  // *[1_공통] 1.3.2.7_시스템 공휴일 복구*
  const restoreSystemHoliday = async (dateToRestore) => {
    try {
      // localStorage에서 삭제된 공휴일 목록 가져오기
      const deleted = JSON.parse(
        localStorage.getItem('deletedSystemHolidays') || '[]'
      );

      // 해당 날짜를 삭제 목록에서 제거
      const updatedDeleted = deleted.filter((date) => date !== dateToRestore);
      localStorage.setItem(
        'deletedSystemHolidays',
        JSON.stringify(updatedDeleted)
      );

      // 상태 업데이트
      setDeletedSystemHolidays(updatedDeleted);

      // 해당 연도의 공휴일 데이터 다시 로드
      const year = parseInt(dateToRestore.split('-')[0]);
      holidayService.clearCache(year);
      setHolidayLoadingStatus((prev) => ({ ...prev, [year]: null }));
      await loadHolidayData(year);

      // devLog(`✅ 시스템 공휴일 복구 완료: ${dateToRestore}`);
      return true;
    } catch (error) {
      // devLog(`❌ 시스템 공휴일 복구 실패:`, error);
      return false;
    }
  };

  // *[1_공통] 1.3.2.8_시스템 공휴일 영구 삭제*
  const permanentlyDeleteSystemHoliday = async (dateToDelete) => {
    try {
      // 1. deletedSystemHolidays에서 제거
      const deleted = JSON.parse(
        localStorage.getItem('deletedSystemHolidays') || '[]'
      );
      const updatedDeleted = deleted.filter((date) => date !== dateToDelete);
      localStorage.setItem(
        'deletedSystemHolidays',
        JSON.stringify(updatedDeleted)
      );
      setDeletedSystemHolidays(updatedDeleted);

      // 2. permanentlyDeletedSystemHolidays에 추가
      const permanentlyDeleted = JSON.parse(
        localStorage.getItem('permanentlyDeletedSystemHolidays') || '[]'
      );
      if (!permanentlyDeleted.includes(dateToDelete)) {
        permanentlyDeleted.push(dateToDelete);
        localStorage.setItem(
          'permanentlyDeletedSystemHolidays',
          JSON.stringify(permanentlyDeleted)
        );
        setPermanentlyDeletedSystemHolidays(permanentlyDeleted);
      }

      // 3. editedSystemHolidays에서도 제거 (있다면)
      const edited = JSON.parse(
        localStorage.getItem('editedSystemHolidays') || '{}'
      );
      if (edited[dateToDelete]) {
        delete edited[dateToDelete];
        localStorage.setItem('editedSystemHolidays', JSON.stringify(edited));
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  //---[1_공통] 1.3.3_사용자 및 로그인 STATE---//
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);

  // *[1_공통] 관리자 데이터 DB에서 로드*
  useEffect(() => {
    const loadAdminsFromDB = async () => {
      try {
        const dbAdmins = await AdminAPI.list();
        setAdmins(dbAdmins);
      } catch (error) {
        console.error('❌ [관리자 로드] DB 관리자 로드 실패:', error);
        setAdmins([]);
      } finally {
        setAdminsLoading(false);
      }
    };

    loadAdminsFromDB();
  }, []);

  // *[1_공통] 직원 및 연차 데이터 DB에서 로드*
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. 직원 데이터 로드
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            // 연차 계산은 나중에 leaveRequests 로드 후 다시 계산
            return baseEmp;
          });
          setEmployees(formattedEmployees);
          devLog(
            '✅ [초기 로드] 직원 데이터 로드 완료:',
            dbEmployees.length,
            '명'
          );
        }

        // 2. 연차 데이터 로드
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
            days: leave.days,
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
          }));
          setLeaveRequests(formattedLeaves);
          devLog(
            '✅ [초기 로드] 연차 데이터 로드 완료:',
            dbLeaves.length,
            '건'
          );
        } else {
          setLeaveRequests([]);
          devLog('✅ [초기 로드] 연차 데이터 로드 완료: 0건');
        }

        // 3. 직원 데이터 재계산 (연차 정보 포함)
        if (dbEmployees && dbEmployees.length > 0) {
          const updatedEmployees = dbEmployees.map((emp) => {
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const formattedLeaves = dbLeaves
              ? dbLeaves.map((leave) => ({
                  id: leave._id,
                  employeeId: leave.employeeId,
                  employeeName: leave.employeeName,
                  name: leave.employeeName || leave.name,
                  department: leave.department,
                  leaveType: leave.leaveType,
                  type: leave.leaveType || leave.type,
                  startDate: formatDateByLang(leave.startDate),
                  endDate: formatDateByLang(leave.endDate),
                  days: leave.days,
                  reason: leave.reason,
                  contact: leave.contact,
                  status: leave.status,
                  requestDate: formatDateByLang(
                    leave.requestDate || leave.createdAt
                  ),
                  approvedAt: leave.approvedAt,
                  approver: leave.approver,
                  approverName: leave.approverName,
                  approvedDays: leave.approvedDays,
                  rejectedAt: leave.rejectedAt,
                  rejectedBy: leave.rejectedBy,
                  rejectedByName: leave.rejectedByName,
                  rejectionReason: leave.rejectionReason,
                }))
              : [];
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              formattedLeaves
            );
            return {
              ...baseEmp,
              leaveYearStart: annualData.annualStart,
              leaveYearEnd: annualData.annualEnd,
              totalAnnualLeave: annualData.totalAnnual,
              usedAnnualLeave: annualData.usedAnnual,
              remainingAnnualLeave: annualData.remainAnnual,
            };
          });
          setEmployees(updatedEmployees);
          devLog('✅ [초기 로드] 직원 연차 정보 계산 완료');
        }
      } catch (error) {
        console.error('❌ [초기 로드] 데이터 로드 실패:', error);
        setEmployees([]);
        setLeaveRequests([]);
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // *[2_관리자 모드] 2.2_직원 관리 - 신규 직원 등록 모달*
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    department: '',
    subDepartment: '',
    role: '',
    workType: '주간',
    contractType: '정규직',
    payType: '연봉',
    annualSalary: '',
    hourlyWage: '',
    joinDate: formatDateToString(new Date()),
  });

  const [currentUser, setCurrentUser] = useState(() => {
    // F5 새로고침 시에는 유지, 창 닫기 시에는 로그아웃
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // *[1_공통] 1.3.4.1_급여 내역 생성 wrapper*
  const generateSalaryHistory = (
    joinDate,
    employeeId = currentUser?.id,
    customPayrollData = null
  ) => {
    return generateSalaryHistoryUtil(
      customPayrollData || payrollByMonth,
      currentUser,
      PAYROLL_INCOME_ITEMS,
      PAYROLL_DEDUCTION_ITEMS
    );
  };

  //---[1_공통] 1.3.6_날짜 및 근태 STATE---//
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // *[1_공통] 1.3.6.1_근태 상태 분석 함수* (CommonWorkTimeStandards.js로 이동됨)
  // Wrapper 함수: year, month 파라미터 추가하여 월별 조회 지원
  const analyzeAttendanceStatus = (attendance, day, year, month) => {
    // year, month가 전달되지 않으면 현재 년월 사용
    const targetYear = year !== undefined ? year : currentYear;
    const targetMonth = month !== undefined ? month : currentMonth;

    return analyzeAttendanceStatusBase(
      attendance,
      day,
      targetYear,
      targetMonth,
      leaveRequests,
      currentUser?.id,
      isHolidayDate
    );
  };

  // *[1_공통] 1.3.6.2_시간 파싱 유틸* (CommonWorkTimeStandards.js로 이동됨)
  // parseTime은 이미 import되어 직접 사용 가능

  //---[1_공통] 1.3.7_급여 및 근무시간 규칙---//
  // *[1_공통] 1.3.7.1_급여 규칙 생성*
  const COMPANY_WAGE_RULES = createCompanyWageRules(EXCLUDE_TIME);

  // *[1_공통] 1.3.7.2_공휴일 판정*
  const isHoliday = (date) => {
    const dateStr = typeof date === 'string' ? date : formatDateToString(date);
    const dateObj = new Date(dateStr);

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    // year 유효성 추가 검증
    if (isNaN(year) || year < 2000 || year > 2100) {
      return false;
    }

    // 수동 휴일 선택 체크 (근태관리 평일/휴일 셀렉트)
    const dateKey = getDateKey(year, month, day);
    if (workTypeSettings[dateKey] === 'holiday') {
      return true;
    }

    if (customHolidays[dateStr]) {
      return true;
    }

    const yearHolidays = holidayData[year];
    if (yearHolidays) {
      const [, monthStr, dayStr] = dateStr.split('-');
      const shortKey = `${monthStr}-${dayStr}`;

      if (yearHolidays[dateStr] || yearHolidays[shortKey]) {
        return true;
      }
    }

    if (!yearHolidays && !holidayLoadingStatus[year]) {
      loadHolidayData(year);
    }

    return false;
  };

  // *[1_공통] 1.3.7.3_일일 급여 계산*
  const calcDailyWage = (
    startTime,
    endTime,
    workType,
    date,
    baseWage = COMPANY_WAGE_RULES.baseWage
  ) => {
    return calcDailyWageBase(
      startTime,
      endTime,
      workType,
      date,
      baseWage,
      isHoliday,
      COMPANY_WAGE_RULES
    );
  };

  // *[1_공통] 1.3.7.4_근무시간 분류*
  const categorizeWorkTime = (checkIn, checkOut, employee, date) => {
    return categorizeWorkTimeBase(
      checkIn,
      checkOut,
      employee,
      date,
      isHoliday,
      excludeBreakTimesBase,
      roundDownToHalfHour,
      EXCLUDE_EXTRA_RANKS,
      EXCLUDE_TIME
    );
  };

  // *[1_공통] 1.3.7.5_월간 급여 계산*
  const calcMonthlyWage = (
    attendanceRecords,
    baseWage = COMPANY_WAGE_RULES.baseWage
  ) => {
    return calcMonthlyWageBase(attendanceRecords, baseWage, calcDailyWage);
  };

  /* ================================
   [2_관리자 모드]
================================ */
  //---[2_관리자 모드] 2.5_일정 관리 STATE---//
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [showAddEventPopup, setShowAddEventPopup] = useState(false);

  // *[2_관리자 모드] 2.10_평가 데이터 상태 (DB 연동)*
  const [evaluationData, setEvaluationData] = useState([]);

  const [showEditEventPopup, setShowEditEventPopup] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    type: '업무',
    description: '',
  });
  const [showUnifiedAddPopup, setShowUnifiedAddPopup] = useState(false);
  const [unifiedAddType, setUnifiedAddType] = useState('일정');
  const [unifiedForm, setUnifiedForm] = useState({
    title: '',
    date: '',
    type: '업무',
    description: '',
    name: '',
  });
  const [selectedEventDate, setSelectedEventDate] = useState(null);
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState(1);
  const [scheduleSearchTerm, setScheduleSearchTerm] = useState('');
  const SCHEDULE_PAGE_SIZE = 15;
  const EVENT_TYPES = ['업무', '행사', '교육', '회의', '휴무', '기타'];

  const EVENT_TYPE_COLORS = {
    업무: 'bg-green-100 text-green-800',
    행사: 'bg-purple-100 text-purple-800',
    교육: 'bg-blue-100 text-blue-800',
    회의: 'bg-orange-100 text-orange-800',
    휴무: 'bg-red-100 text-red-800',
    공휴일: 'bg-red-100 text-red-800',
    기타: 'bg-gray-100 text-gray-800',
  };

  //---[2_관리자 모드] 2.6_연차 관리 STATE---//
  const [leaveManagementTab, setLeaveManagementTab] =
    useState('employee-leave'); // 'employee-leave' 또는 'leave-history'
  const [editingAnnualLeave, setEditingAnnualLeave] = useState(null);
  const [editAnnualData, setEditAnnualData] = useState({});
  const [leaveHistoryPage, setLeaveHistoryPage] = useState(1); // 연차 내역 페이지네이션

  //---[2_관리자 모드] 2.7_건의 관리 STATE---//
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionInput, setSuggestionInput] = useState('구매');
  const [showSuggestionApplyPopup, setShowSuggestionApplyPopup] =
    useState(false);
  const [suggestionPage, setSuggestionPage] = useState(1);

  //---[2_관리자 모드] 2.10_평가 관리 STATE---//
  const [evaluations, setEvaluations] = useState([]);
  const [notices, setNotices] = useState([]);
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [evaluationPage, setEvaluationPage] = useState(1);

  // *[2_관리자 모드] 2.10.1_평가 관리 편집 상태*
  const [editingEvaluationId, setEditingEvaluationId] = useState(null);
  const [editingEvaluationData, setEditingEvaluationData] = useState({});

  // *[2_관리자 모드] 2.10.2_안전사고 편집 상태*
  const [editingAccidentId, setEditingAccidentId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSeverity, setEditSeverity] = useState('경미');

  // *[2_관리자 모드] 2.10.3_평가 입력 폼*
  const [evaluationForm, setEvaluationForm] = useState({
    year: new Date().getFullYear(),
    employeeId: '',
    name: '',
    position: '',
    department: '',
    grade: 'A',
    content: '',
    status: '예정',
  });

  //---[2_관리자 모드] 2.4_알림 관리 STATE---//
  const [regularNotifications, setRegularNotifications] = useState([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState([]);
  const [notificationLogs, setNotificationLogs] = useState([]);

  // *[2_관리자 모드] 2.4_알림 로그 state (점진적 더보기)*
  const {
    visibleLogCount,
    setVisibleLogCount,
    handleLoadMoreLogs,
    handleCollapseLogs,
  } = useNotificationLogState();

  // *[2_관리자 모드] 2.4.1_알림 로그 검색*
  const [notificationLogSearch, setNotificationLogSearch] = useState({
    year: '',
    month: '',
    recipient: '',
    titleOrContent: '',
    type: '',
  });

  // *[2_관리자 모드] 2.4.2_일정 검색 (관리자 모드)*
  const [scheduleSearch, setScheduleSearch] = useState({
    year: '',
    month: '',
    type: '',
    titleOrContent: '',
  });

  // *[2_관리자 모드] 2.4.3_알림 팝업 상태*
  const [showAddRegularNotificationPopup, setShowAddRegularNotificationPopup] =
    useState(false);
  const [
    showAddRealtimeNotificationPopup,
    setShowAddRealtimeNotificationPopup,
  ] = useState(false);
  const [showAddNotificationPopup, setShowAddNotificationPopup] =
    useState(false);
  const [알림유형, set알림유형] = useState('정기');

  // *[2_관리자 모드] 2.4.4_알림 편집 팝업 상태*
  const [
    showEditRegularNotificationPopup,
    setShowEditRegularNotificationPopup,
  ] = useState(false);
  const [
    showEditRealtimeNotificationPopup,
    setShowEditRealtimeNotificationPopup,
  ] = useState(false);
  const [editingRegularNotification, setEditingRegularNotification] =
    useState(null);
  const [editingRealtimeNotification, setEditingRealtimeNotification] =
    useState(null);

  // *[2_관리자 모드] 2.4.5_알림 폼 데이터*
  const [regularNotificationForm, setRegularNotificationForm] = useState({
    title: '',
    content: '',
    status: '진행중',
    startDate: '',
    endDate: '',
    repeatCycle: '특정일',
    recipients: { type: '전체', value: '전체직원', selectedEmployees: [] },
  });
  const [realtimeNotificationForm, setRealtimeNotificationForm] = useState({
    title: '',
    content: '',
    status: '진행중',
    startDate: '',
    endDate: '',
    repeatCycle: '특정일',
    recipients: { type: '전체', value: '전체직원', selectedEmployees: [] },
  });

  // *[2_관리자 모드] 2.4.6_반복 설정 모달*
  const [showRecurringSettingsModal, setShowRecurringSettingsModal] =
    useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    반복주기_숫자: 1,
    반복주기_단위: '일',
    반복시작일: '',
    반복종료일: '',
    반복시간: '09:00',
    반복요일: [],
    반복일자: 1,
    반복월: 1,
  });
  const [currentFormType, setCurrentFormType] = useState('');

  //---[2_관리자 모드] 2.0_공통사항 STATE---//
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'dashboard';
  });

  // *[2_관리자 모드] 2.0.1_스크롤 ref*
  const contentScrollRef = useRef(null);
  const saveStatsRef = useRef(null);

  // *[2_관리자 모드] 2.0.2_탭 변경 함수*
  const handleTabChange = (tabId) => {
    // 근태관리 탭에서 나갈 때 통계 저장
    if (activeTab === 'attendance' && tabId !== 'attendance') {
      if (saveStatsRef.current) {
        saveStatsRef.current();
      } else {
        console.warn('[handleTabChange] ⚠️ saveStatsRef.current가 null입니다!');
      }
    }

    setActiveTab(tabId);
    localStorage.setItem('activeTab', tabId);
  };

  // *[2_관리자 모드] 2.0.3_스크롤 최상단 복귀 useEffect*
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo(0, 0);
      devLog('📜 스크롤 최상단 복귀:', activeTab);
    } else {
      window.scrollTo(0, 0);
    }
  }, [activeTab]);

  // *[2_관리자 모드] 2.0.4_탭별 상태 초기화 useEffect*
  useEffect(() => {
    if (activeTab !== 'notification-management') {
      setNotificationLogSearch({
        year: '',
        month: '',
        titleOrContent: '',
        type: '',
      });
    }

    if (activeTab !== 'schedule-management') {
      setScheduleSearch({
        year: '',
        month: '',
        type: '',
        titleOrContent: '',
      });
    }

    // 근태 관리 탭 진입 시 현재 월로 리셋
    if (activeTab === 'attendance-management') {
      const now = new Date();
      setAttendanceSheetYear(now.getFullYear());
      setAttendanceSheetMonth(now.getMonth() + 1);
      setAttendanceSearchFilter({
        department: '전체',
        position: '전체',
        name: '',
        workType: '전체',
        payType: '전체',
      });
    } else {
      setAttendanceSearchFilter({
        department: '전체',
        position: '전체',
        name: '',
        workType: '전체',
        payType: '전체',
      });
    }

    if (activeTab !== 'payroll-management') {
      setPayrollSearchFilter({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        name: '',
        department: '전체 부서',
        position: '전체',
        workType: '전체',
      });
    }
  }, [activeTab]);

  /* ================================
   [3_일반직원 모드]
================================ */
  //---[3_일반직원 모드] 3.5_연차 신청 STATE---//
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: '연차',
    reason: '',
    contact: '',
  });
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveFormPreview, setLeaveFormPreview] = useState(null);

  //---[3_일반직원 모드] 3.7_건의 사항 STATE---//
  const [applyTitle, setApplyTitle] = useState('');
  const [applyContent, setApplyContent] = useState('');
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editingSuggestionRemark, setEditingSuggestionRemark] = useState('');

  // *[2_관리자 모드] 2.7_건의 관리 - 건의 내역 전체 수정 STATE*
  const [editingSuggestionRow, setEditingSuggestionRow] = useState(null);
  const [editingSuggestionData, setEditingSuggestionData] = useState({});

  //---[2_관리자 모드] 2.1_대시보드 STATE---//
  // *[2_관리자 모드] 2.1.1_대시보드 날짜 필터*
  const [dashboardDateFilter, setDashboardDateFilter] = useState('today');
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState(
    formatDateToString(new Date())
  );
  const [dashboardStats, setDashboardStats] = useState(null);

  // *[2_관리자 모드] 2.1.2_근태 기록*
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // *[2_관리자 모드] 2.1.3_직원 목록 팝업 관련*
  // (useDashboardAttendance hook으로 분리됨)

  // *[2_관리자 모드] 2.1.4_급여 비밀번호 팝업*
  // *[2_관리자 모드] 2.1.5_안전사고 관리*
  const [safetyAccidents, setSafetyAccidents] = useState([]);
  const [safetyAccidentPage, setSafetyAccidentPage] = useState(1);
  const [safetyAccidentSearch, setSafetyAccidentSearch] = useState({
    year: '',
    month: '',
    severity: '',
    content: '',
  });
  const [showSafetyAccidentInput, setShowSafetyAccidentInput] = useState(false);

  // *[2_관리자 모드] 2.1.6_근태 요약 관리*
  const [attendanceSummaries, setAttendanceSummaries] = useState([]);

  // *[2_관리자 모드] 2.1.6_워라밸 및 목표 관리*
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ]);
  const [showGoalDetailsPopup, setShowGoalDetailsPopup] = useState(false);
  const [showWorkLifeBalancePopup, setShowWorkLifeBalancePopup] =
    useState(false);
  const [showWorkLifeDetailPopup, setShowWorkLifeDetailPopup] = useState(false);
  const [workLifeDetailMetric, setWorkLifeDetailMetric] = useState(null);
  const [workLifeDetailMonth, setWorkLifeDetailMonth] = useState(null);
  const [selectedViolationMonth, setSelectedViolationMonth] = useState(null);
  const [stressSortColumn, setStressSortColumn] = useState('value'); // 스트레스 지수 정렬 컬럼
  const [stressSortDirection, setStressSortDirection] = useState('desc'); // 스트레스 지수 정렬 방향
  const [showGoalDetailDataPopup, setShowGoalDetailDataPopup] = useState(false);
  const [goalDetailMetric, setGoalDetailMetric] = useState(null);
  const [goalDetailMonth, setGoalDetailMonth] = useState(null);

  // *[2_관리자 모드] 2.1.7_정렬 설정*
  const [overtimeSortConfig, setOvertimeSortConfig] = useState({
    field: null,
    order: 'asc',
  });
  const [leaveSortConfig, setLeaveSortConfig] = useState({
    field: null,
    order: 'asc',
  });
  const [violationSortConfig, setViolationSortConfig] = useState({
    field: null,
    order: 'asc',
  });

  // *[2_관리자 모드] 2.1.8_AI 관련 상태*
  const [aiPromptSettings, setAiPromptSettings] = useState({
    employeeEvaluation: '',
    performanceAnalysis: '',
    workLifeBalance: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [showAiHistoryPopup, setShowAiHistoryPopup] = useState(false);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [aiRecommendationHistory, setAiRecommendationHistory] = useState([]);

  // *[2_관리자 모드] 2.1.9_AI 모델 타입 정의*
  const modelTypes = {
    chatgpt: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    ],
    claude: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    gemini: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
    ],
  };

  // *[2_관리자 모드] 2.1.10_대시보드 출근현황 연동 useEffect*
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

  // *[2_관리자 모드] 2.1.11_알림 로그 초기화 useEffect*
  useEffect(() => {
    if (
      activeTab === 'dashboard' ||
      activeTab === 'notice-management' ||
      activeTab === 'schedule-management' ||
      activeTab === 'payroll-management'
    ) {
      setNotificationLogSearch({
        year: '',
        month: '',
        recipient: '',
        titleOrContent: '',
        type: '',
      });
    }
  }, [activeTab]);

  //---[1_공통] 1.3.8_알림 만료 관리---//
  // *[1_공통] 1.3.8.1_팝업 초기화 useEffect*
  useEffect(() => {
    if (currentUser?.id) {
      clearPopupState();
      setShowNoticePopup(false);
    }
  }, [currentUser?.id]);

  // *[1_공통] 1.3.8.2_만료 알림 정리 함수*
  const cleanupExpiredNotifications = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setRegularNotifications((prev) =>
      prev.filter((n) => {
        if (isExpired5Days(n.createdAt)) return false;

        if (n.endDate) {
          const endDate = new Date(n.endDate);
          endDate.setHours(23, 59, 59, 999);

          if (endDate < today) return false;
        }

        return true;
      })
    );

    setRealtimeNotifications((prev) =>
      prev.filter((n) => !isExpired5Days(n.createdAt))
    );
  };

  // *[1_공통] 1.3.8.3_정기 알림 만료 판정*
  const isRegularExpired = (n) => {
    if (!n?.endDate) return false;
    const del = new Date(n.endDate);
    del.setDate(del.getDate() + 1); // 종료 다음날
    del.setHours(0, 0, 0, 0); // 00:00 기준
    return new Date() >= del;
  };

  // *[1_공통] 1.3.8.4_알림 로그 3년 체크*
  const isLogOlderThan3Years = (createdAt) => {
    if (!createdAt) return false;
    try {
      const logDate = new Date(createdAt);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      return logDate < threeYearsAgo;
    } catch (e) {
      return false;
    }
  };

  // *[1_공통] 1.3.8.5_알림 로그 3년 삭제*
  const cleanupOldLogs = () => {
    setNotificationLogs((prev) =>
      prev.filter((log) => !isLogOlderThan3Years(log.createdAt))
    );
  };

  // *[1_공통] 1.3.8.6_만료 알림 정리*
  const cleanupExpiredRegulars = () => {
    try {
      const now = new Date().toLocaleString('ko-KR');

      setRegularNotifications((prev) => {
        const expired = prev.filter((n) => isRegularExpired(n));
        const active = prev.filter((n) => !isRegularExpired(n));

        if (expired.length > 0) {
          const expiredLogs = expired.map((n) => ({
            id: `expire_${n.id}`,
            type: '정기알림',
            title: n.title,
            status: '만료됨',
            createdAt: now,
          }));

          setNotificationLogs((prevLogs) => [...expiredLogs, ...prevLogs]);
        }

        return active;
      });

      cleanupOldLogs();
    } catch (e) {
      console.error('만료 정기알림 정리 오류', e);
    }
  };

  // *[3_일반직원 모드] 3.1_일반직원 STATE*
  const {
    showNoticePopup,
    setShowNoticePopup,
    selectedNotice,
    setSelectedNotice,
    staffNoticePage,
    setStaffNoticePage,
    employeeNotifications,
    setEmployeeNotifications,
    readNotifications,
    setReadNotifications,
    readAnnouncements,
    setReadAnnouncements,
    expandedAnnouncement,
    setExpandedAnnouncement,
    showEventDetail,
    setShowEventDetail,
    selectedEvent,
    setSelectedEvent,
  } = useEmployeeState(currentUser);

  // *[2_관리자 모드] 2.4_알림 핸들러 생성*
  const {
    handleAddRegularNotification,
    handleAddRealtimeNotification,
    handleCompleteRealtimeNotification,
    handleDeleteRegularNotification,
    handleDeleteRealtimeNotification,
    handleEditRegularNotification,
    handleEditRealtimeNotification,
    handleSaveRegularNotificationEdit,
    handleSaveRealtimeNotificationEdit,
    isExpired5Days,
    updateEmployeeNotifications,
  } = useNotificationHandlers({
    regularNotifications,
    setRegularNotifications,
    realtimeNotifications,
    setRealtimeNotifications,
    regularNotificationForm,
    setRegularNotificationForm,
    realtimeNotificationForm,
    setRealtimeNotificationForm,
    notificationLogs,
    setNotificationLogs,
    employeeNotifications,
    setEmployeeNotifications,
    setShowAddRegularNotificationPopup,
    setShowAddRealtimeNotificationPopup,
    editingRegularNotification,
    setEditingRegularNotification,
    editingRealtimeNotification,
    setEditingRealtimeNotification,
    setShowEditRegularNotificationPopup,
    setShowEditRealtimeNotificationPopup,
    currentUser,
    shouldReceiveNotification,
    devLog,
  });

  // *[2_관리자 모드] 2.4_알림 로그 DB 로드*
  useEffect(() => {
    const loadNotificationLogs = async () => {
      try {
        const { NotificationAPI } = await import('./api/communication');
        const loadedLogs = await NotificationAPI.list(); // 직접 데이터 반환

        if (Array.isArray(loadedLogs) && loadedLogs.length > 0) {
          // 알림 로그에 추가
          setNotificationLogs(loadedLogs);

          // 실시간 알림 필터링 (notificationType === '실시간' 또는 '시스템')
          const realtimeLogsToActivate = loadedLogs.filter(
            (log) =>
              (log.notificationType === '실시간' ||
                log.notificationType === '시스템') &&
              (log.repeatCycle === '즉시' || !log.repeatCycle)
          );

          // 알림 로그를 실시간 알림 형식으로 변환
          const convertedRealtimeNotifications = realtimeLogsToActivate.map(
            (log) => {
              return {
                ...log,
                _id: log._id,
                id: log._id || log.id || Date.now() + Math.random(),
                status:
                  log.notificationType === '시스템'
                    ? '진행중'
                    : log.status || '진행중',
                isAutoGenerated: log.notificationType === '시스템',
              };
            }
          );

          if (convertedRealtimeNotifications.length > 0) {
            setRealtimeNotifications(convertedRealtimeNotifications);
          }

          // 정기 알림 필터링
          const regularLogsToActivate = loadedLogs.filter(
            (log) => log.notificationType === '정기' && log.status === '진행중'
          );

          if (regularLogsToActivate.length > 0) {
            const convertedRegularNotifications = regularLogsToActivate.map(
              (log) => ({
                ...log,
                id: log._id || log.id || Date.now() + Math.random(),
              })
            );
            setRegularNotifications(convertedRegularNotifications);
          }
        }
      } catch (error) {
        console.error('❌ 알림 로그 DB 로드 실패:', error);
      }
    };

    loadNotificationLogs();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // *[1_공통] 1.3.8.7_공휴일 및 알림 초기화 useEffect* (초기 로드만 수행, 이후에는 캐시 사용)
  useEffect(() => {
    // 1. 먼저 공휴일 데이터 로드 (초기 로드만)
    const loadData = async () => {
      const currentYear = new Date().getFullYear();

      // 시스템 공휴일 로드
      await loadHolidayData(currentYear);

      // 2. localStorage에서 시스템 공휴일 수정/삭제 목록 로드 (레거시 지원)
      const savedDeleted = localStorage.getItem('deletedSystemHolidays');
      if (savedDeleted) {
        setDeletedSystemHolidays(JSON.parse(savedDeleted));
      }

      const savedEdited = localStorage.getItem('editedSystemHolidays');
      if (savedEdited) {
        setEditedSystemHolidays(JSON.parse(savedEdited));
      }

      const savedPermanentlyDeleted = localStorage.getItem(
        'permanentlyDeletedSystemHolidays'
      );
      if (savedPermanentlyDeleted) {
        setPermanentlyDeletedSystemHolidays(
          JSON.parse(savedPermanentlyDeleted)
        );
      }

      // 3. DB에서 커스텀 공휴일 로드
      try {
        devLog('🔄 [DB] 커스텀 공휴일 로드 중...');

        // 현재 년도 ±1년 범위의 커스텀 공휴일 로드
        const startYear = currentYear - 1;
        const endYear = currentYear + 1;
        const response = await HolidayAPI.getYearsHolidays(startYear, endYear);

        if (response.success && response.data) {
          // 모든 년도의 커스텀 공휴일을 합쳐서 단일 객체로 변환
          const allCustomHolidays = {};
          Object.values(response.data).forEach((yearHolidays) => {
            Object.entries(yearHolidays).forEach(([date, name]) => {
              // YYYY-MM-DD 형식만 추가 (MM-DD 형식은 제외)
              if (date.includes('-') && date.split('-').length === 3) {
                allCustomHolidays[date] = name;
              }
            });
          });

          setCustomHolidays(allCustomHolidays);
          devLog(
            `✅ [DB] 커스텀 공휴일 ${
              Object.keys(allCustomHolidays).length
            }건 로드 완료`
          );
        }
      } catch (error) {
        devLog('❌ [DB] 커스텀 공휴일 로드 실패:', error);

        // 폴백: localStorage에서 로드
        const savedCustomHolidays = localStorage.getItem('customHolidays');
        if (savedCustomHolidays) {
          try {
            const parsed = JSON.parse(savedCustomHolidays);
            setCustomHolidays(parsed);
            devLog(
              `💾 [localStorage] 커스텀 공휴일 ${
                Object.keys(parsed).length
              }건 로드 (폴백)`
            );
          } catch (e) {
            devLog('⚠️ localStorage 파싱 실패:', e);
          }
        }
      }

      // 4. DB에서 평가 데이터 로드
      try {
        devLog('🔄 [DB] 평가 데이터 로드 중...');
        const evaluations = await EvaluationAPI.list();
        if (evaluations && Array.isArray(evaluations)) {
          setEvaluationData(evaluations);
          devLog(`✅ [DB] 평가 데이터 ${evaluations.length}건 로드 완료`);
        }
      } catch (error) {
        devLog('❌ [DB] 평가 데이터 로드 실패:', error);
        setEvaluationData([]);
      }

      // 5. DB에서 알림 데이터 로드
      try {
        devLog('🔄 [DB] 알림 데이터 로드 중...');
        const notifications = await NotificationAPI.list();
        if (notifications && Array.isArray(notifications)) {
          // MongoDB의 _id를 id로 매핑
          const mappedNotifications = notifications.map((n) => ({
            ...n,
            id: n._id || n.id,
          }));

          // 알림 유형별로 분리
          const regularList = mappedNotifications.filter(
            (n) => n.notificationType === '정기'
          );
          const realtimeList = mappedNotifications.filter(
            (n) => n.notificationType === '실시간'
          );
          const systemList = mappedNotifications.filter(
            (n) => n.notificationType === '시스템'
          );

          setRegularNotifications(regularList);
          setRealtimeNotifications(realtimeList);

          // 알림 로그는 정기 + 실시간 + 시스템 모두 포함
          const allLogs = [...regularList, ...realtimeList, ...systemList].map(
            (n) => ({
              id: n.id,
              type: n.notificationType,
              title: n.title,
              content: n.content,
              recipients: n.recipients?.value || '전체직원',
              repeatType: n.repeatCycle,
              createdAt: n.createdAt,
              completedAt: n.completedAt,
            })
          );
          setNotificationLogs(allLogs);

          devLog(
            `✅ [DB] 알림 로드 완료: 정기=${regularList.length}, 실시간=${realtimeList.length}, 시스템=${systemList.length}, 로그=${allLogs.length}`
          );
        }
      } catch (error) {
        devLog('❌ [DB] 알림 데이터 로드 실패:', error);
        setRegularNotifications([]);
        setRealtimeNotifications([]);
        setNotificationLogs([]);
      }

      // 6. DB에서 안전사고 데이터 로드
      try {
        devLog('🔄 [DB] 안전사고 데이터 로드 중...');
        const accidents = await SafetyAccidentAPI.list();
        if (accidents && Array.isArray(accidents)) {
          // MongoDB의 _id를 id로 매핑
          const mappedAccidents = accidents.map((a) => ({
            ...a,
            id: a._id || a.id,
          }));

          setSafetyAccidents(mappedAccidents);
          devLog(
            `✅ [DB] 안전사고 데이터 ${mappedAccidents.length}건 로드 완료`
          );
        } else {
          setSafetyAccidents([]);
        }
      } catch (error) {
        console.error('❌ [DB] 안전사고 데이터 로드 실패:', error);
        devLog('❌ [DB] 안전사고 데이터 로드 실패:', error);
        setSafetyAccidents([]);
      }

      // 7. DB에서 근태 요약 데이터 로드
      try {
        devLog('🔄 [DB] 근태 요약 데이터 로드 중...');
        const summaries = await AttendanceSummaryAPI.list();

        if (summaries && Array.isArray(summaries)) {
          const mappedSummaries = summaries.map((s) => ({
            ...s,
            id: s._id || s.id,
          }));

          setAttendanceSummaries(mappedSummaries);
          devLog(
            `✅ [DB] 근태 요약 데이터 ${mappedSummaries.length}건 로드 완료`
          );
        }
      } catch (error) {
        console.error('❌ [DB] 근태 요약 데이터 로드 실패:', error);
        devLog('❌ [DB] 근태 요약 데이터 로드 실패:', error);
        setAttendanceSummaries([]);
      }

      updateEmployeeNotifications();
      cleanupExpiredNotifications();
    };

    loadData();

    const cleanupInterval = setInterval(() => {
      cleanupExpiredNotifications();
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []); // currentYear 의존성 제거 - 초기 로드만 수행

  // *[1_공통] 1.3.8.8_만료 알림 초기 정리 useEffect*
  useEffect(() => {
    cleanupExpiredRegulars();
  }, []);

  // *[2_관리자 모드] 2.9.1_급여 키 정규화 useEffect*
  useEffect(() => {
    normalizePayrollKeys();
  }, []);

  //---[3_일반직원 모드] 3.0_공통사항---//
  // *[3_일반직원 모드] 3.0.1_PWA+FCM 초기화*
  // (src/hooks/useStaffPWAInitializer.js로 분리됨)
  useStaffPWAInitializer(currentUser);

  // *[2_관리자 모드] 2.4.7_자정 스케줄러 (만료 정기알림 정리)*
  // (src/hooks/useMidnightScheduler.js로 분리됨)
  useMidnightScheduler(cleanupExpiredRegulars);

  // *[1_공통] 1.3.9_탭 간 동기화*
  // (src/hooks/useStorageSync.js로 분리됨)
  useStorageSync({
    setScheduleEvents,
    setCustomHolidays,
    setEvaluationData,
  });

  // *[2_관리자 모드] 2.4.8_알림 실시간 업데이트*
  useEffect(() => {
    const timer = setTimeout(() => {
      updateEmployeeNotifications();
    }, 300);

    return () => clearTimeout(timer);
  }, [regularNotifications, realtimeNotifications]);

  // *[2_관리자 모드] 2.3.1_예약 공지 자동 게시*
  // (src/hooks/useScheduledNoticePublisher.js로 분리됨)
  useScheduledNoticePublisher(setNotices);

  // *[2_관리자 모드] 2.6.0_연차 계산 wrapper (utils/leaveCalculations.js로 분리됨)*
  const calculateEmployeeAnnualLeave = (employee) => {
    return calculateEmployeeAnnualLeaveUtil(employee, leaveRequests);
  };

  // *[2_관리자 모드] 2.5_연차 갱신 알림 수신자 래퍼 함수*
  const get연차갱신알림수신자Wrapper = (직원정보) =>
    get연차갱신알림수신자(employees, 직원정보);

  // *[2_관리자 모드] 2.6.1_연차 기간 만료 체크 및 자동 갱신*
  // (src/hooks/useAnnualLeaveManager.js로 분리됨)
  useAnnualLeaveManager({
    employees,
    setEmployees,
    realtimeNotifications,
    setRealtimeNotifications,
    setNotificationLogs,
    calculateEmployeeAnnualLeave,
    get연차갱신알림수신자: get연차갱신알림수신자Wrapper,
    devLog,
  });

  // *[1_공통] 직원 연차 데이터 동기화*
  // leaveRequests 변경 시 (연차 승인/반려/수정) 또는 employees 변경 시 동기화
  useEffect(() => {
    const syncEmployeeLeaveData = () => {
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) => {
          const annualData = calculateEmployeeAnnualLeaveUtil(
            emp,
            leaveRequests
          );
          return {
            ...emp,
            leaveYearStart: annualData.annualStart,
            leaveYearEnd: annualData.annualEnd,
            totalAnnualLeave: annualData.totalAnnual,
            usedAnnualLeave: annualData.usedAnnual,
            remainingAnnualLeave: annualData.remainAnnual,
            lastLeaveSync: new Date().toISOString(),
          };
        })
      );
    };

    // 연차 요청 변경 시 동기화
    syncEmployeeLeaveData();
  }, [leaveRequests]);

  // *[1_공통] 연차 데이터 즉시 동기화 (employees 또는 leaveRequests 변경 시)*
  useEffect(() => {
    if (employees.length > 0 && leaveRequests.length >= 0) {
      devLog(
        '🔄 연차 데이터 동기화 시작 (employees 또는 leaveRequests 변경 감지)'
      );
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) => {
          const annualData = calculateEmployeeAnnualLeaveUtil(
            emp,
            leaveRequests
          );
          return {
            ...emp,
            leaveYearStart: annualData.annualStart,
            leaveYearEnd: annualData.annualEnd,
            totalAnnualLeave: annualData.totalAnnual,
            usedAnnualLeave: annualData.usedAnnual,
            remainingAnnualLeave: annualData.remainAnnual,
            carryOverLeave: annualData.carryOverLeave || 0,
            baseAnnual: annualData.baseAnnual || annualData.totalAnnual,
            lastLeaveSync: new Date().toISOString(),
          };
        })
      );
    }
  }, [leaveRequests, devLog]); // employees는 의존성에서 제외 (무한 루프 방지)

  // *[1_공통] 매일 자정 연차 데이터 동기화*
  useEffect(() => {
    const syncAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      const timer = setTimeout(() => {
        devLog('🕛 자정 연차 데이터 동기화 시작');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) => {
            const annualData = calculateEmployeeAnnualLeaveUtil(
              emp,
              leaveRequests
            );

            // ✅ 연차기간 갱신 시 잔여연차를 이월연차로 이동
            let newCarryOverLeave =
              annualData.carryOverLeave || emp.carryOverLeave || 0;

            // 오늘이 연차 기간 시작일인지 확인
            if (annualData.annualStart === today) {
              // 이전 잔여연차가 있으면 이월연차로 이동
              const previousRemain = emp.remainingAnnualLeave || 0;
              if (previousRemain > 0) {
                newCarryOverLeave = previousRemain;
                devLog(
                  `📆 [연차기간 갱신] ${emp.name}: 잔여연차 ${previousRemain}일 → 이월연차로 이동`
                );
              }
            }

            return {
              ...emp,
              leaveYearStart: annualData.annualStart,
              leaveYearEnd: annualData.annualEnd,
              totalAnnualLeave: annualData.totalAnnual,
              usedAnnualLeave: annualData.usedAnnual,
              remainingAnnualLeave: annualData.remainAnnual,
              carryOverLeave: newCarryOverLeave,
              baseAnnual: annualData.baseAnnual || annualData.totalAnnual,
              lastLeaveSync: new Date().toISOString(),
            };
          })
        );

        // 다음 자정을 위해 재귀 호출
        syncAtMidnight();
      }, timeUntilMidnight);

      return () => clearTimeout(timer);
    };

    const cleanup = syncAtMidnight();
    return cleanup;
  }, [leaveRequests, devLog]);

  // *[1_공통] 로그인한 사용자의 연차 데이터 업데이트*
  // employees 데이터가 변경되거나 leaveRequests가 변경되면 currentUser도 업데이트
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      // employeeId 또는 id 필드로 직원 찾기
      const employeeIdToFind = currentUser.employeeId || currentUser.id;

      const updatedUser = employees.find(
        (emp) =>
          emp.id === employeeIdToFind ||
          emp.employeeNumber === employeeIdToFind ||
          emp.id === currentUser.id
      );

      if (updatedUser) {
        // ✅ 연차 정보 실시간 계산 (DB 데이터와 항상 동기화)
        const annualData = calculateEmployeeAnnualLeaveUtil(
          updatedUser,
          leaveRequests
        );

        // 모든 직원 정보를 동기화 (사원 정보, 연차 정보 등)
        const syncedUser = {
          ...updatedUser,
          employeeId: updatedUser.id, // employeeId 필드도 함께 유지
          isAdmin: false,
          // 연차 정보 추가
          leaveYearStart: annualData.annualStart,
          leaveYearEnd: annualData.annualEnd,
          totalAnnualLeave: annualData.totalAnnual,
          usedAnnualLeave: annualData.usedAnnual,
          remainingAnnualLeave: annualData.remainAnnual,
          carryOverLeave: annualData.carryOverLeave || 0,
          baseAnnual: annualData.baseAnnual || annualData.totalAnnual,
        };
        setCurrentUser(syncedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(syncedUser));
      }
    }
  }, [
    employees,
    leaveRequests,
    currentUser?.id,
    currentUser?.employeeId,
    currentUser?.role,
  ]);

  // *[1_공통] 매일 자정 currentUser 동기화 (관리자 모드에서 직원 정보 수정 시 일반직원 모드 사원 정보에 자동 반영)*
  useMidnightScheduler(() => {
    if (currentUser && currentUser.role !== 'admin') {
      const employeeIdToFind = currentUser.employeeId || currentUser.id;

      const updatedUser = employees.find(
        (emp) =>
          emp.id === employeeIdToFind ||
          emp.employeeNumber === employeeIdToFind ||
          emp.id === currentUser.id
      );
      if (updatedUser) {
        const syncedUser = {
          ...updatedUser,
          isAdmin: false,
        };
        setCurrentUser(syncedUser);
        localStorage.setItem('currentUser', JSON.stringify(syncedUser));
        devLog('🔄 [자정 스케줄러] currentUser 동기화 완료:', syncedUser.name);
      }
    }
  });

  //---[2_관리자 모드] 2.8_근태 관리 STATE---//
  const [attendanceSheetYear, setAttendanceSheetYear] = useState(
    new Date().getFullYear()
  );
  const [attendanceSheetMonth, setAttendanceSheetMonth] = useState(
    new Date().getMonth() + 1
  );
  const [attendanceSheetData, setAttendanceSheetData] = useState({});
  const [attendanceSheetStatsCache, setAttendanceSheetStatsCache] = useState(
    {}
  ); // AttendanceSheet DB 통계 캐시
  const [attendanceData, setAttendanceData] = useState([]);
  const attendanceStatsCache = useRef(new Map());
  const prevYearMonthRef = useRef({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  // attendanceSheetData의 실제 변경을 감지하기 위한 키 목록
  const attendanceDataKeysCount = useMemo(
    () => Object.keys(attendanceSheetData).length,
    [attendanceSheetData]
  );

  // 컴포넌트 마운트 시 최근 근태 데이터가 있는 월로 자동 설정
  useEffect(() => {
    const findAndSetLatestMonth = async () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();

      // 현재 월부터 거꾸로 12개월 확인
      for (let i = 0; i < 12; i++) {
        const checkDate = new Date(currentYear, currentDate.getMonth() - i, 1);
        const year = checkDate.getFullYear();
        const month = checkDate.getMonth() + 1;

        try {
          const response = await fetch(
            `${API_BASE_URL}/attendance/monthly/${year}/${month}`
          );
          if (response.ok) {
            const result = await response.json();
            const data = result.success
              ? result.data
              : Array.isArray(result)
              ? result
              : [];

            if (data.length > 0) {
              devLog(
                `✅ [초기 로드] 최근 근태 데이터 발견: ${year}년 ${month}월 (${data.length}건)`
              );
              setAttendanceSheetYear(year);
              setAttendanceSheetMonth(month);
              return;
            }
          }
        } catch (err) {
          // 에러 무시하고 다음 월 확인
          continue;
        }
      }

      devLog('⚠️ [초기 로드] 최근 근태 데이터를 찾을 수 없어 현재 월 유지');
    };

    findAndSetLatestMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // attendanceSheetData 변경 시 캐시 무효화 (실제 데이터 변경 시만)
  useEffect(() => {
    attendanceStatsCache.current.clear();
    devLog('📊 근태 합계 캐시 무효화 (데이터 변경됨)');
  }, [attendanceDataKeysCount, attendanceSheetYear, attendanceSheetMonth]);

  // 월/년 변경 시 이전 데이터 통계 저장
  useEffect(() => {
    const prev = prevYearMonthRef.current;
    const changed =
      prev.year !== attendanceSheetYear || prev.month !== attendanceSheetMonth;

    if (
      changed &&
      saveStatsRef.current &&
      Object.keys(attendanceSheetData).length > 0
    ) {
      saveStatsRef.current();
    }

    prevYearMonthRef.current = {
      year: attendanceSheetYear,
      month: attendanceSheetMonth,
    };
  }, [attendanceSheetYear, attendanceSheetMonth, attendanceSheetData]);

  // AttendanceStats DB에서 월별 통계 로드 (연도/월 변경 시 즉시 로드)
  useEffect(() => {
    const loadMonthlyStats = async () => {
      if (!attendanceSheetYear || !attendanceSheetMonth) {
        return;
      }

      try {
        const response = await AttendanceStatsAPI.getMonthlyStats(
          attendanceSheetYear,
          attendanceSheetMonth
        );

        if (response.success && response.data && response.data.length > 0) {
          // 통계 데이터를 캐시에 저장
          attendanceStatsCache.current.clear();
          response.data.forEach((stat) => {
            const key = stat.employeeId;
            attendanceStatsCache.current.set(key, {
              totalWorkDays: stat.workDays || 0,
              annualLeave: stat.annualLeaveDays || 0,
              absence: stat.absentDays || 0,
              late: stat.lateDays || 0,
              earlyLeave: stat.earlyLeaveDays || 0,
              outing: 0,
              totalHours: stat.totalWorkMinutes
                ? stat.totalWorkMinutes / 60
                : 0,
              regularHours: stat.regularHours || 0,
              earlyHours: stat.earlyHours || 0,
              overtimeHours: stat.overtimeHours || 0,
              holidayHours: stat.holidayHours || 0,
              nightHours: stat.nightHours || 0,
              overtimeNightHours: 0,
              earlyHolidayHours: 0,
              holidayOvertimeHours: 0,
            });
          });
        }
      } catch (error) {
        console.error('[AttendanceStats] ❌ 통계 로드 실패:', error);
      }
    };

    loadMonthlyStats();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  // 월/년 변경 시 서버에서 근태 데이터 자동 로드
  useEffect(() => {
    const loadMonthlyAttendanceData = async () => {
      if (!attendanceSheetYear || !attendanceSheetMonth) {
        return;
      }

      // 앱 시작 시 자동 로드 (activeTab 체크 제거)
      // 이유: 대시보드의 주간/야간 출근현황이 초기 로드 시 데이터가 필요함

      try {
        // 📌 야간 근무자 월 경계 문제 해결: 이전 달 + 현재 달 + 다음 달 총 3개월 데이터 로드
        const months = [];

        // 이전 달 계산
        let prevYear = attendanceSheetYear;
        let prevMonth = attendanceSheetMonth - 1;
        if (prevMonth < 1) {
          prevMonth = 12;
          prevYear -= 1;
        }
        months.push({ year: prevYear, month: prevMonth });

        // 현재 달
        months.push({ year: attendanceSheetYear, month: attendanceSheetMonth });

        // 다음 달 계산
        let nextYear = attendanceSheetYear;
        let nextMonth = attendanceSheetMonth + 1;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }
        months.push({ year: nextYear, month: nextMonth });

        // 3개월 데이터를 병렬로 로드
        const responses = await Promise.all(
          months.map(({ year, month }) =>
            AttendanceAPI.getMonthlyData(year, month)
          )
        );

        // 모든 월의 데이터를 하나로 병합
        const newAttendanceData = {};
        let totalRecords = 0;

        responses.forEach((response, idx) => {
          const { year, month } = months[idx];

          if (response.success && response.data) {
            totalRecords += response.data.length;

            response.data.forEach((record, index) => {
              const key = `${record.employeeId}_${record.date}`;

              // 백엔드에서 이미 checkIn/checkOut을 문자열로 변환해서 보내줌
              const checkInTime = record.checkIn || '';
              const checkOutTime = record.checkOut || '';

              // 1순위: 출근 시간으로 자동 판정
              let shiftType = null;
              if (checkInTime && checkInTime.includes(':')) {
                const [hours, minutes] = checkInTime.split(':').map(Number);
                if (!isNaN(hours) && !isNaN(minutes)) {
                  const totalMinutes = hours * 60 + minutes;
                  shiftType =
                    totalMinutes >= 240 && totalMinutes <= 1050
                      ? '주간'
                      : '야간';
                }
              }

              // 2순위: 출근 시간이 없거나 판정 실패한 경우 서버의 shiftType 사용
              if (!shiftType) {
                shiftType = record.shiftType;
              }

              newAttendanceData[key] = {
                checkIn: checkInTime,
                checkOut: checkOutTime,
                shiftType: shiftType || null,
                leaveType: record.note || null, // note 필드가 leaveType으로 사용됨
              };
            });
          }
        });

        // ✅ 기존 데이터와 병합 (이미 로드된 데이터는 유지, 새 데이터만 추가/업데이트)
        setAttendanceSheetData((prevData) => {
          const mergedData = {
            ...prevData,
            ...newAttendanceData,
          };

          return mergedData;
        });
      } catch (error) {
        console.error('[근태 데이터 로드] ❌ 데이터 로드 실패:', error);
      }
    };

    loadMonthlyAttendanceData();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  // *[2_관리자 모드] 대시보드 날짜 변경 시 해당 월 근태 데이터 로드*
  useEffect(() => {
    if (activeTab === 'dashboard' && dashboardSelectedDate) {
      const selectedDate = new Date(dashboardSelectedDate);
      const selectedYear = selectedDate.getFullYear();
      const selectedMonth = selectedDate.getMonth() + 1;

      // 현재 로드된 월과 다른 경우에만 로드
      if (
        selectedYear !== attendanceSheetYear ||
        selectedMonth !== attendanceSheetMonth
      ) {
        setAttendanceSheetYear(selectedYear);
        setAttendanceSheetMonth(selectedMonth);
      }
    }
  }, [
    activeTab,
    dashboardSelectedDate,
    attendanceSheetYear,
    attendanceSheetMonth,
  ]);

  // *[3_일반직원 모드] 회사 일정/근태 탭 월 변경 시 근태 데이터 로드*
  useEffect(() => {
    // 일반 직원이고 로그인 상태일 때만 (activeTab 체크 제거 - 백그라운드 로드 허용)
    if (currentUser && !currentUser.isAdmin && currentUser.role !== 'admin') {
      // currentYear/currentMonth와 attendanceSheetYear/Month가 다르면 업데이트
      if (
        currentYear !== attendanceSheetYear ||
        currentMonth !== attendanceSheetMonth
      ) {
        setAttendanceSheetYear(currentYear);
        setAttendanceSheetMonth(currentMonth);
      }
    }
  }, [currentUser, currentYear, currentMonth]); // attendanceSheetYear/Month 제거 - 무한루프 방지

  // *[2_관리자 모드] 2.8_근태 데이터 관리 함수들*
  const getAttendanceForEmployee = useCallback(
    (employeeId, year, month, day) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;

      const attendanceData = attendanceSheetData[employeeKey] || {
        checkIn: '',
        checkOut: '',
      };

      // 해당 날짜의 승인된 연차 정보 찾기
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const leaveRecord = leaveRequests.find(
        (leave) =>
          leave.employeeId === employeeId &&
          leave.startDate <= dateStr &&
          leave.endDate >= dateStr &&
          leave.status === '승인'
      );

      // 연차 정보가 있으면 추가
      if (leaveRecord) {
        return {
          ...attendanceData,
          leaveType: leaveRecord.type, // 연차 유형 추가
        };
      }

      return attendanceData;
    },
    [attendanceSheetData, leaveRequests]
  );

  const setAttendanceForEmployee = useCallback(
    (employeeId, year, month, day, data) => {
      const dateKey = getDateKey(year, month, day);
      const employeeKey = `${employeeId}_${dateKey}`;
      setAttendanceSheetData((prev) => {
        // Determine shift type based on checkIn time
        const employee = employees.find((emp) => emp.id === employeeId);
        let autoShiftType = null;

        // Use the new checkIn from data, or fall back to existing checkIn
        const checkInTime =
          data.checkIn !== undefined
            ? data.checkIn
            : prev[employeeKey]?.checkIn;

        if (employee && checkInTime) {
          const targetSubdepartments = [
            '열',
            '표면',
            '구부',
            '인발',
            '교정·절단',
            '검사',
          ];
          if (
            employee.department === '생산' &&
            targetSubdepartments.includes(employee.subDepartment) &&
            employee.salaryType === '시급'
          ) {
            // Automatically determine shift type based on check-in time
            const [hours, minutes] = checkInTime.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              autoShiftType =
                totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }
        }

        const newData = {
          ...prev,
          [employeeKey]: {
            checkIn: '',
            checkOut: '',
            ...prev[employeeKey],
            ...data,
            ...(autoShiftType && { shiftType: autoShiftType }),
          },
        };
        return newData;
      });
    },
    [setAttendanceSheetData, employees]
  );

  // setCheckInTime과 setCheckOutTime은 useAttendanceManagement에서 가져옴 (주간/야간 자동 판정 포함)
  // *[2_관리자 모드] 2.8_근태 데이터 초기화*
  const clearAttendanceData = useCallback(() => {
    if (
      window.confirm(
        '⚠️ 모든 근태 데이터를 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, localStorage와 메모리의 모든 근태 데이터가 삭제됩니다.\n\nDB의 데이터는 유지되며, 페이지를 새로고침하면 DB에서 다시 로드됩니다.'
      )
    ) {
      // 근태 데이터는 state로만 관리 (localStorage 불필요)
      setAttendanceSheetData({});
      alert(
        '✅ 근태 데이터 초기화가 완료되었습니다.\n\n페이지를 새로고침하면 DB에서 최신 데이터를 다시 불러옵니다.'
      );
    }
  }, [setAttendanceSheetData]);

  const analyzeAttendanceStatusForDashboard = useCallback(
    (
      attendance,
      year,
      month,
      day,
      employeeWorkType = '주간',
      employeeLeaveType = null,
      employeeId = null
    ) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      const dayOfWeek = new Date(year, month - 1, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isPublicHoliday = isHolidayDate(year, month, day);

      if (employeeLeaveType === '휴직') {
        return null;
      }

      // 주말/공휴일 처리
      if (isWeekend || isPublicHoliday) {
        if (attendance?.checkIn) {
          return '출근';
        }
        return null;
      }

      // 1순위: 실제 출퇴근 기록이 있는 경우
      if (attendance?.checkIn || attendance?.checkOut) {
        // 외출/조퇴 타입은 출근으로 처리
        if (attendance?.type === '외출' || attendance?.type === '조퇴') {
          return '출근';
        }

        // 출근만 있고 퇴근 없으면 근무중
        if (attendance.checkIn && !attendance.checkOut) {
          return '근무중';
        }

        // 출퇴근 둘 다 있으면 시간 체크
        if (attendance.checkIn && attendance.checkOut) {
          const checkInTime = timeToMinutes(attendance.checkIn);
          const checkOutTime = timeToMinutes(attendance.checkOut);

          let status = '출근';
          let lateStart, lateEnd, earlyLeaveThreshold;

          if (employeeWorkType === '야간') {
            lateStart = timeToMinutes('19:00') + 1; // 19:01
            lateEnd = timeToMinutes('03:00'); // 03:00 (다음날)
            earlyLeaveThreshold = timeToMinutes('03:50');
          } else {
            lateStart = timeToMinutes('08:30') + 1; // 08:31
            lateEnd = timeToMinutes('15:00'); // 15:00
            earlyLeaveThreshold = timeToMinutes('17:20');
          }

          // 📌 반차(오전) 확인: 반차(오전)이면 지각 판정 스킵
          const isHalfDayMorning =
            employeeLeaveType === '반차(오전)' ||
            (employeeId &&
              leaveRequests.find((leave) => {
                if (leave.status !== '승인') return false;
                if (leave.employeeId !== employeeId) return false;
                if (leave.type !== '반차(오전)') return false;
                const startDate = leave.startDate.split('T')[0];
                const endDate = leave.endDate.split('T')[0];
                return dateStr >= startDate && dateStr <= endDate;
              }));

          // 📌 지각 판단: 주간 08:31~15:00, 야간 19:01~03:00 (단, 반차(오전)은 제외)
          if (!isHalfDayMorning) {
            if (employeeWorkType === '야간') {
              // 야간: 19:01 이후 또는 03:00 이전 출근 시 지각
              if (
                checkInTime >= lateStart ||
                (checkInTime > 0 && checkInTime <= lateEnd)
              ) {
                status = '지각';
              }
            } else {
              // 주간: 08:31~15:00 사이 출근 시 지각
              if (checkInTime >= lateStart && checkInTime < lateEnd) {
                status = '지각';
              }
            }
          }

          if (checkOutTime < earlyLeaveThreshold) {
            status = status === '지각' ? '지각/조퇴' : '조퇴';
          }

          return status;
        }

        // 퇴근만 있는 경우 (체크인 없음)
        return '출근';
      }

      // 2순위: 출퇴근 기록이 없는 경우 - 연차/반차 확인
      if (
        employeeLeaveType === '반차(오전)' ||
        employeeLeaveType === '반차(오후)'
      ) {
        return '연차';
      }

      // 승인된 연차 확인 (employeeId로 필터링)
      if (employeeId) {
        const leaveRecord = leaveRequests.find((leave) => {
          if (leave.status !== '승인') return false;
          if (leave.employeeId !== employeeId) return false;

          // ISO 형식을 YYYY-MM-DD로 변환하여 비교
          const startDate = leave.startDate.split('T')[0];
          const endDate = leave.endDate.split('T')[0];

          return dateStr >= startDate && dateStr <= endDate;
        });

        if (leaveRecord) {
          // 📌 연차 유형에 따라 구분: '결근'은 결근으로, 나머지는 연차로
          if (leaveRecord.type === '결근') {
            return '결근';
          } else {
            return '연차';
          }
        }
      }

      // 3순위: 출퇴근 기록도 없고 연차도 없으면 결근
      return '결근';
    },
    [leaveRequests]
  );

  const calculateMonthlyStats = useCallback(
    (employeeId) => {
      // AttendanceSheet DB 통계가 있으면 우선 사용
      if (attendanceSheetStatsCache[employeeId]) {
        const dbStats = attendanceSheetStatsCache[employeeId];
        return {
          totalWorkDays: dbStats.totalWorkDays || 0,
          totalHours: dbStats.totalWorkHours || 0,
          totalOvertimeHours: dbStats.totalOvertimeHours || 0,
          totalNightHours: dbStats.totalNightHours || 0,
          totalHolidayHours: dbStats.totalHolidayHours || 0,
          annualLeave: dbStats.leaveCount || 0,
          absence: dbStats.absentCount || 0,
          late: dbStats.lateCount || 0,
          regularHours:
            dbStats.totalWorkHours -
            (dbStats.totalOvertimeHours || 0) -
            (dbStats.totalHolidayHours || 0),
          earlyHours: 0,
          overtimeHours: dbStats.totalOvertimeHours || 0,
          holidayHours: dbStats.totalHolidayHours || 0,
          nightHours: dbStats.totalNightHours || 0,
          overtimeNightHours: 0,
          earlyHolidayHours: 0,
          holidayOvertimeHours: 0,
          earlyLeave: 0,
          outing: 0,
        };
      }

      // AttendanceSheet에 없으면 로컬 계산 (기존 로직)
      const cacheKey = `${employeeId}-${attendanceSheetYear}-${attendanceSheetMonth}`;
      if (attendanceStatsCache.current.has(cacheKey)) {
        return attendanceStatsCache.current.get(cacheKey);
      }

      const daysInMonth = getDaysInMonth(
        attendanceSheetYear,
        attendanceSheetMonth
      );
      let totalWorkDays = 0;
      let annualLeave = 0;
      let absence = 0;
      let late = 0;
      let earlyLeave = 0;
      let outing = 0;

      let totalHours = 0;
      let regularHours = 0;
      let earlyHours = 0;
      let overtimeHours = 0;
      let holidayHours = 0;
      let nightHours = 0;
      let overtimeNightHours = 0;
      let earlyHolidayHours = 0;
      let holidayOvertimeHours = 0;

      const employee = employees.find((emp) => emp.id === employeeId);

      // employee를 찾지 못한 경우 빈 결과 반환
      if (!employee) {
        const emptyResult = {
          totalWorkDays: 0,
          annualLeave: 0,
          absence: 0,
          late: 0,
          earlyLeave: 0,
          outing: 0,
          totalHours: 0,
          regularHours: 0,
          earlyHours: 0,
          overtimeHours: 0,
          holidayHours: 0,
          nightHours: 0,
          overtimeNightHours: 0,
          earlyHolidayHours: 0,
          holidayOvertimeHours: 0,
        };
        attendanceStatsCache.current.set(cacheKey, emptyResult);
        return emptyResult;
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const attendance = getAttendanceForEmployee(
          employeeId,
          attendanceSheetYear,
          attendanceSheetMonth,
          day
        );
        const dateStr = `${attendanceSheetYear}-${String(
          attendanceSheetMonth
        ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 연차 정보가 있으면 근무시간 계산에서 제외
        if (attendance.leaveType) {
          // 연차, 반차, 경조, 공가, 휴직, 결근, 외출, 조퇴 등은 근무시간에 포함하지 않음
          // 단, totalWorkDays나 다른 통계는 별도 처리
          if (
            attendance.leaveType === 'annual' ||
            attendance.checkIn === '연차' ||
            attendance.checkOut === '연차'
          ) {
            annualLeave++;
          }
          continue; // 근무시간 계산 건너뛰기
        }

        if (attendance.checkIn && attendance.checkOut) {
          totalWorkDays++;

          // 1순위: 출근 시간으로 자동 판정
          let shiftType = null;
          if (attendance.checkIn && attendance.checkIn.includes(':')) {
            const [hours, minutes] = attendance.checkIn.split(':').map(Number);
            if (!isNaN(hours) && !isNaN(minutes)) {
              const totalMinutes = hours * 60 + minutes;
              shiftType =
                totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
            }
          }

          // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
          if (!shiftType) {
            shiftType =
              attendance.shiftType ||
              employee.workType ||
              employee.workShift ||
              employee.근무형태 ||
              '주간';
          }

          // specialWorkHours가 있으면 특근으로 직접 처리
          if (
            attendance.specialWorkHours &&
            parseFloat(attendance.specialWorkHours) > 0
          ) {
            const specialHours = parseFloat(attendance.specialWorkHours);
            holidayHours += specialHours;
            totalHours += specialHours;
          } else {
            // specialWorkHours가 없으면 일반 분류 로직 사용
            const employeeForCalc = { ...employee, workType: shiftType };

            const categorized = categorizeWorkTime(
              attendance.checkIn,
              attendance.checkOut,
              employeeForCalc,
              dateStr
            );

            regularHours += categorized.기본 || 0;
            earlyHours += categorized.조출 || 0;
            overtimeHours += categorized.연장 || 0;
            nightHours += categorized.심야 || 0;
            overtimeNightHours += categorized['연장+심야'] || 0;

            // 특근 관련 (특근, 특근+심야를 합산)
            holidayHours +=
              (categorized.특근 || 0) + (categorized['특근+심야'] || 0);

            // 조출+특근 관련 (조출+특근, 특근+조출을 합산)
            earlyHolidayHours +=
              (categorized['조출+특근'] || 0) + (categorized['특근+조출'] || 0);

            // 특근+연장 관련 (특근+연장, 특근+연장+심야를 합산)
            holidayOvertimeHours +=
              (categorized['특근+연장'] || 0) +
              (categorized['특근+연장+심야'] || 0);

            const dailyTotal = Object.values(categorized).reduce(
              (sum, hours) => sum + (hours || 0),
              0
            );
            totalHours += dailyTotal;
          }

          // 위에서 계산한 shiftType을 사용하여 지각/조퇴 판정
          if (shiftType === '야간') {
            // 야간 근무자: 19:01 이후 출근이 지각 (기본 근무 시작: 19:00)
            if (attendance.checkIn > '19:00') {
              late++;
            }

            const checkOutTime = attendance.checkOut;
            if (checkOutTime >= '00:00' && checkOutTime < '04:00') {
              earlyLeave++;
            }
          } else {
            // 주간 근무자: 08:31 이후 출근이 지각 (기본 근무 시작: 08:30)
            if (attendance.checkIn > '08:30') {
              late++;
            }
            if (attendance.checkOut < '17:00') {
              earlyLeave++;
            }
          }
        } else if (attendance.type === 'annual') {
          annualLeave++;
        } else if (attendance.type === 'absence') {
          absence++;
        } else if (attendance.type === 'outing') {
          outing++;
        }
      }

      const result = {
        totalWorkDays,
        annualLeave,
        absence,
        late,
        earlyLeave,
        outing,
        totalHours,
        regularHours,
        earlyHours,
        overtimeHours,
        holidayHours,
        nightHours,
        overtimeNightHours,
        earlyHolidayHours,
        holidayOvertimeHours,
      };

      attendanceStatsCache.current.set(cacheKey, result);
      return result;
    },
    [
      attendanceSheetYear,
      attendanceSheetMonth,
      employees,
      getAttendanceForEmployee,
      categorizeWorkTime,
      attendanceSheetStatsCache,
    ]
  );

  const [attendanceSearchFilter, setAttendanceSearchFilter] = useState({
    department: '전체',
    position: '전체',
    name: '',
    workType: '전체',
    payType: '전체',
  });
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [workTypeSettings, setWorkTypeSettings] = useState({}); // 일별 근무구분 설정 (평일/휴일)
  const [isStressCalculationExpanded, setIsStressCalculationExpanded] =
    useState(false);

  //---[2_관리자 모드] 2.3_공지 관리 STATE---//
  const [noticeForm, setNoticeForm] = useState({
    id: null,
    title: '',
    content: '',
    isScheduled: false,
    scheduledDate: '',
    scheduledTime: '09:00',
  });
  const [editingNoticeId, setEditingNoticeId] = useState(null);

  //---[2_관리자 모드] 2.2_직원 관리 STATE---//
  const [employeeSearchFilter, setEmployeeSearchFilter] = useState({
    joinDate: '',
    department: '',
    status: '',
    name: '',
    position: '',
    role: '',
    payType: '',
    subDepartment: '',
  });

  // *[2_관리자 모드] 2.7.1_건의 관리 검색 필터*
  const [suggestionSearchFilter, setSuggestionSearchFilter] = useState({
    joinDate: '',
    department: '',
    name: '',
  });
  const [showSuggestionApprovalPopup, setShowSuggestionApprovalPopup] =
    useState(false);
  const [suggestionApprovalData, setSuggestionApprovalData] = useState({
    id: null,
    type: '', // 'approve' or 'reject'
    remark: '',
  });

  // *[2_관리자 모드] 2.6_연차 관리 - 비고 관련 STATE*
  const [editingLeave, setEditingLeave] = useState(null);
  const [editingLeaveRemark, setEditingLeaveRemark] = useState('');

  // *[2_관리자 모드] 2.6_연차 관리 - 연차 내역 전체 수정 STATE*
  const [editingLeaveHistoryRow, setEditingLeaveHistoryRow] = useState(null);
  const [editingLeaveHistoryData, setEditingLeaveHistoryData] = useState({});
  const [showLeaveApprovalPopup, setShowLeaveApprovalPopup] = useState(false);
  const [leaveApprovalData, setLeaveApprovalData] = useState({
    id: null,
    type: '', // 'approve' or 'reject'
    remark: '',
  });

  // *[2_관리자 모드] 2.1.11_사용자 알림 표시*
  const showUserNotification = (type, title, message, duration = 5000) => {
    const notification = {
      id: Date.now(),
      type, // 'success', 'warning', 'error', 'info'
      title,
      message,
      timestamp: new Date().toISOString(),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // 최대 5개

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, duration);
  };

  // *[2_관리자 모드] 2.4_알림 관련 래퍼 함수*
  const get관리자알림목록Wrapper = () =>
    get관리자알림목록(regularNotifications);
  const get통합알림리스트Wrapper = () =>
    get통합알림리스트(regularNotifications, realtimeNotifications, devLog);
  const calculateRecipientCountWrapper = (log) =>
    calculateRecipientCount(log, employees);
  const getFilteredNotificationLogsWrapper = () =>
    getFilteredNotificationLogs(notificationLogs, notificationLogSearch);

  // *[2_관리자 모드] 2.5_일정/연차/건의사항 관련 래퍼 함수*
  const getFilteredScheduleEventsWrapper = () => {
    return getFilteredScheduleEvents(
      scheduleEvents,
      holidayData,
      scheduleSearch
    );
  };
  const get연차알림대상자Wrapper = (
    직원정보,
    신청자정보 = null,
    처리유형 = ''
  ) => get연차알림대상자(employees, 직원정보, 신청자정보, 처리유형);
  const get건의사항알림대상자Wrapper = (
    직원정보,
    신청자정보 = null,
    처리유형 = '',
    건의유형 = ''
  ) =>
    get건의사항알림대상자(employees, 직원정보, 신청자정보, 처리유형, 건의유형);

  // *[2_관리자 모드] 2.7_부서 관리자 및 자동 알림 관련 래퍼 함수*
  const get부서관리자및대표이사Wrapper = (
    직원부서,
    신청자정보 = null,
    처리유형 = '',
    세부부서 = null
  ) =>
    get부서관리자및대표이사(
      employees,
      admins,
      직원부서,
      신청자정보,
      처리유형,
      세부부서
    );

  // *[2_관리자 모드] 2.4_자동 알림 발송*
  const send자동알림 = (알림정보) =>
    send자동알림Service({
      알림정보,
      notificationLogs,
      setNotificationLogs,
      setRealtimeNotifications,
      isExpired5Days,
      updateEmployeeNotifications,
      get연차알림대상자: get연차알림대상자Wrapper,
      get건의사항알림대상자: get건의사항알림대상자Wrapper,
      get부서관리자및대표이사: get부서관리자및대표이사Wrapper,
      devLog,
    });

  //---[2_관리자 모드] 2.9_급여 관리 STATE---//
  // (src/hooks/usePayrollManagement.js 및 src/utils/payrollUtils.js로 분리됨)
  const {
    payrollSearchFilter,
    setPayrollSearchFilter,
    payrollValidationErrors,
    setPayrollValidationErrors,
    payrollHashes,
    setPayrollHashes,
    payrollByMonth,
    setPayrollByMonth,
    payrollTableData,
    setPayrollTableData,
    editingPayrollCell,
    setEditingPayrollCell,
    isPayrollEditMode,
    setIsPayrollEditMode,
    defaultHours,
    setDefaultHours,
    handleEditHours,
    applyDefaultHoursToTable,
    initializePayrollTable,
    updatePayrollCell,
    calculatePayrollTotals,
    syncPayrollWithEmployeeSalary,
    syncEmployeesWithPayroll,
    normalizePayrollKeys,
    handlePayrollFileUpload,
    parsePayrollDataFromExcel,
    createMissingPayrollItems,
    ensureMonthlyPayrollData,
  } = usePayrollManagement({
    employees,
    setEmployees,
    logSystemEvent,
    devLog,
    showUserNotification,
    send자동알림,
    currentUser,
  });

  // *[2_관리자 모드] 2.9.11_급여대장 초기화*
  useEffect(() => {
    if (payrollTableData.length === 0 && employees.length > 0) {
      initializePayrollTable();
    }
  }, [employees, payrollTableData.length]);

  // *[2_관리자 모드] 2.9.12_직원 데이터 동기화*
  useEffect(() => {
    if (employees.length > 0 && payrollTableData.length > 0) {
      syncEmployeesWithPayroll();
    }
  }, [employees]);

  // *[2_관리자 모드] 2.10.6_평가 데이터 직급 매칭*
  const getEvaluationWithPosition = (evaluationData) => {
    return evaluationData.map((perf) => {
      const employee = employees.find((emp) => emp.id === perf.employeeId);
      return {
        ...perf,
        position: employee ? employee.position : '미확인',
      };
    });
  };

  // *[2_관리자 모드] 2.8.1_근태 필터링된 직원 목록*
  // (src/hooks/useAttendanceFilter.js로 분리됨)
  const filteredAttendanceEmployees = useAttendanceFilter(
    employees,
    attendanceSearchFilter,
    attendanceData,
    attendanceSheetYear,
    attendanceSheetMonth,
    holidayData,
    customHolidays
  );

  // *[2_관리자 모드] 2.8.1.1_필터링된 직원 기준 근태 통계 계산*
  // (getWorkTypeForDate가 필요하므로 useAttendanceManagement 이후로 이동됨)

  // *[2_관리자 모드] 2.8.2_호환성 함수*
  const getFilteredAttendanceEmployees = () => {
    return filteredAttendanceEmployees;
  };

  // *[2_관리자 모드] 2.9.13_급여대장 필터링된 데이터*
  // (src/hooks/usePayrollFilter.js로 분리됨)
  const filteredPayrollData = usePayrollFilter(
    payrollTableData,
    payrollSearchFilter
  );

  //---[3_일반직원 모드] 3.6_급여 내역 STATE---//
  //---[2_관리자 모드] 2.12_시스템 관리 STATE---//
  const {
    geminiApiKey,
    setGeminiApiKey,
    chatgptApiKey,
    setChatgptApiKey,
    claudeApiKey,
    setClaudeApiKey,
    selectedAiModel,
    setSelectedAiModel,
    aiConfig,
    setAiConfig,
    unifiedApiKey,
    setUnifiedApiKey,
    detectedProvider,
    setDetectedProvider,
    availableModels,
    setAvailableModels,
    selectedUnifiedModel,
    setSelectedUnifiedModel,
    unifiedSaveMessage,
    setUnifiedSaveMessage,
    showUnifiedApiKey,
    setShowUnifiedApiKey,
    detectProviderFromKey,
    handleUnifiedAiSave,
    aiMessages,
    setAiMessages,
    aiInput,
    setAiInput,
    aiMessagesEndRef,
    selectedModel,
    setSelectedModel,
    modelOptions,
    setModelOptions,
    aiRecommendation,
    setAiRecommendation,
    getSafeModelOrBlock,
    saveKey,
  } = useSystemManagement(devLog);

  // *[2_관리자 모드] 2.12.10_모델 선택 관리*
  const {
    selectedModelType,
    setSelectedModelType,
    modelUsageStatus,
    setModelUsageStatus,
    apiConnectionStatus,
    setApiConnectionStatus,
    dynamicModelTypes,
    setDynamicModelTypes,
  } = useModelSelection();

  // *[2_관리자 모드] 2.11.1_챗봇 권한 STATE*
  const { chatbotPermissions, setChatbotPermissions } = useChatbotPermissions();

  // *[2_관리자 모드] 2.11_시스템 로깅 및 회사 데이터 조회 Wrapper*
  const logSystemEventWrapper = useCallback(
    (type, message, details = {}, priority = 'INFO') => {
      return logSystemEvent(
        type,
        message,
        details,
        priority,
        currentUser,
        devLog,
        triggerAdminNotification
      );
    },
    [currentUser]
  );

  // *[2_관리자 모드] 계산 함수들*
  const calculateMonthlyAttendanceRate = () => {
    return calculateMonthlyAttendanceRateService(
      employees,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard
    );
  };

  const calculateCompanyStats = () => {
    return calculateCompanyStatsService(
      employees,
      leaveRequests,
      evaluations,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard
    );
  };

  const getCompanyDataWrapper = useCallback(async () => {
    return await getCompanyData({
      employees,
      getAttendanceForEmployee,
      analyzeAttendanceStatusForDashboard,
      attendanceSheetData,
      notices,
      leaveRequests,
      evaluations,
      suggestions,
      safetyAccidents,
      calculateMonthlyAttendanceRate,
      calculateCompanyStats,
      chatbotPermissions,
      currentUser,
      logSystemEvent: logSystemEventWrapper,
      updateSystemStatus,
      devLog,
    });
  }, [
    employees,
    getAttendanceForEmployee,
    analyzeAttendanceStatusForDashboard,
    attendanceSheetData,
    notices,
    leaveRequests,
    evaluations,
    suggestions,
    safetyAccidents,
    calculateMonthlyAttendanceRate,
    calculateCompanyStats,
    chatbotPermissions,
    currentUser,
    logSystemEventWrapper,
  ]);

  // *[2_관리자 모드] 2.11_채팅 스크롤 ref*
  const chatContainerRef = useRef(null);

  // *[2_관리자 모드] 2.11.2_채팅 자동 스크롤*
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // *[1_공통] 시스템 설정*
  const {
    showLanguageSelection,
    setShowLanguageSelection,
    selectedLanguage,
    setSelectedLanguage,
    showChangePasswordPopup,
    setShowChangePasswordPopup,
    changePasswordForm,
    setChangePasswordForm,
    changePasswordError,
    setChangePasswordError,
    changePasswordSuccess,
    setChangePasswordSuccess,
    sidebarOpen,
    setSidebarOpen,
    fontSize,
    setFontSize,
  } = useSystemSettings();

  // *[1_공통] 전역 Socket.io 실시간 업데이트*
  React.useEffect(() => {
    if (!currentUser) return;

    const socket = io(SERVER_URL, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      devLog('🔌 [전역 Socket] 연결됨');
    });

    // 직원 실시간 업데이트
    socket.on('employee-created', async (data) => {
      devLog(`✨ [실시간] 직원 등록됨: ${data.name}`);
      try {
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              leaveRequests
            );
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
        }
      } catch (error) {
        console.error('❌ [실시간] 직원 데이터 갱신 실패:', error);
      }
    });

    socket.on('employee-updated', async (data) => {
      devLog(`✏️ [실시간] 직원 수정됨: ${data.name}`);
      try {
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              leaveRequests
            );
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
        }
      } catch (error) {
        console.error('❌ [실시간] 직원 데이터 갱신 실패:', error);
      }
    });

    socket.on('employee-deleted', async (data) => {
      devLog(`🗑️ [실시간] 직원 삭제됨: ${data.name}`);
      try {
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              leaveRequests
            );
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
        }
      } catch (error) {
        console.error('❌ [실시간] 직원 데이터 갱신 실패:', error);
      }
    });

    // 알림 실시간 업데이트
    socket.on('notification-created', async (data) => {
      devLog(`✨ [실시간] 알림 등록됨: ${data.title}`);
      try {
        const regularResponse = await NotificationAPI.list('정기');
        if (regularResponse && regularResponse.length > 0) {
          setRegularNotifications(regularResponse);
        }
        const realtimeResponse = await NotificationAPI.list('실시간');
        if (realtimeResponse && realtimeResponse.length > 0) {
          setRealtimeNotifications(realtimeResponse);
        }
      } catch (error) {
        console.error('❌ [실시간] 알림 데이터 갱신 실패:', error);
      }
    });

    socket.on('notification-updated', async (data) => {
      devLog(`✏️ [실시간] 알림 수정됨: ${data.title}`);
      try {
        const regularResponse = await NotificationAPI.list('정기');
        if (regularResponse && regularResponse.length > 0) {
          setRegularNotifications(regularResponse);
        }
        const realtimeResponse = await NotificationAPI.list('실시간');
        if (realtimeResponse && realtimeResponse.length > 0) {
          setRealtimeNotifications(realtimeResponse);
        }
      } catch (error) {
        console.error('❌ [실시간] 알림 데이터 갱신 실패:', error);
      }
    });

    socket.on('notification-deleted', async (data) => {
      devLog(`🗑️ [실시간] 알림 삭제됨: ${data.notificationId}`);
      try {
        const regularResponse = await NotificationAPI.list('정기');
        if (regularResponse && regularResponse.length > 0) {
          setRegularNotifications(regularResponse);
        }
        const realtimeResponse = await NotificationAPI.list('실시간');
        if (realtimeResponse && realtimeResponse.length > 0) {
          setRealtimeNotifications(realtimeResponse);
        }
      } catch (error) {
        console.error('❌ [실시간] 알림 데이터 갱신 실패:', error);
      }
    });

    // 건의사항 실시간 업데이트
    socket.on('suggestion-created', async (data) => {
      devLog(`✨ [실시간] 건의사항 등록됨: ${data.title}`);
      if (!currentUser || !currentUser.id) {
        devLog('⚠️ currentUser 정보 없음 - 건의사항 업데이트 스킵');
        return;
      }
      try {
        const isAdmin =
          currentUser.isAdmin === true || currentUser.role === 'admin';
        const dbSuggestions = await SuggestionAPI.list(
          isAdmin ? null : currentUser.id,
          isAdmin ? 'admin' : null
        );
        if (dbSuggestions && dbSuggestions.length > 0) {
          const formattedSuggestions = dbSuggestions.map((suggestion) => ({
            id: suggestion._id,
            _id: suggestion._id,
            employeeId: suggestion.employeeId,
            name: suggestion.name || '',
            department: suggestion.department || '',
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content,
            status: suggestion.status,
            remark: suggestion.remark || '',
            approver: suggestion.approver,
            approvalDate: formatDateByLang(suggestion.approvalDate),
            applyDate:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
            createdAt: suggestion.createdAt,
            date:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
          }));
          setSuggestions(formattedSuggestions);
        }
      } catch (error) {
        console.error('❌ [실시간] 건의사항 데이터 갱신 실패:', error);
      }
    });

    socket.on('suggestion-updated', async (data) => {
      devLog(`✏️ [실시간] 건의사항 수정됨: ${data.title}`);
      if (!currentUser || !currentUser.id) {
        devLog('⚠️ currentUser 정보 없음 - 건의사항 업데이트 스킵');
        return;
      }
      try {
        const isAdmin =
          currentUser.isAdmin === true || currentUser.role === 'admin';
        const dbSuggestions = await SuggestionAPI.list(
          isAdmin ? null : currentUser.id,
          isAdmin ? 'admin' : null
        );
        if (dbSuggestions && dbSuggestions.length > 0) {
          const formattedSuggestions = dbSuggestions.map((suggestion) => ({
            id: suggestion._id,
            _id: suggestion._id,
            employeeId: suggestion.employeeId,
            name: suggestion.name || '',
            department: suggestion.department || '',
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content,
            status: suggestion.status,
            remark: suggestion.remark || '',
            approver: suggestion.approver,
            approvalDate: formatDateByLang(suggestion.approvalDate),
            applyDate:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
            createdAt: suggestion.createdAt,
            date:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
          }));
          setSuggestions(formattedSuggestions);
        }
      } catch (error) {
        console.error('❌ [실시간] 건의사항 데이터 갱신 실패:', error);
      }
    });

    socket.on('suggestion-deleted', async (data) => {
      devLog(`🗑️ [실시간] 건의사항 삭제됨: ${data.suggestionId}`);
      if (!currentUser || !currentUser.id) {
        devLog('⚠️ currentUser 정보 없음 - 건의사항 업데이트 스킵');
        return;
      }
      try {
        const isAdmin =
          currentUser.isAdmin === true || currentUser.role === 'admin';
        const dbSuggestions = await SuggestionAPI.list(
          isAdmin ? null : currentUser.id,
          isAdmin ? 'admin' : null
        );
        if (dbSuggestions && dbSuggestions.length > 0) {
          const formattedSuggestions = dbSuggestions.map((suggestion) => ({
            id: suggestion._id,
            _id: suggestion._id,
            employeeId: suggestion.employeeId,
            name: suggestion.name || '',
            department: suggestion.department || '',
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content,
            status: suggestion.status,
            remark: suggestion.remark || '',
            approver: suggestion.approver,
            approvalDate: formatDateByLang(suggestion.approvalDate),
            applyDate:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
            createdAt: suggestion.createdAt,
            date:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
          }));
          setSuggestions(formattedSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error('❌ [실시간] 건의사항 데이터 갱신 실패:', error);
      }
    });

    // 연차 실시간 업데이트
    socket.on('leave-created', async (data) => {
      devLog(
        `✨ [실시간] 연차 신청됨: ${data.employeeName} - ${data.leaveType}`
      );
      try {
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
            days: leave.days,
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
          }));
          setLeaveRequests(formattedLeaves);
        }
      } catch (error) {
        console.error('❌ [실시간] 연차 데이터 갱신 실패:', error);
      }
    });

    socket.on('leave-updated', async (data) => {
      devLog(
        `✏️ [실시간] 연차 수정됨: ${data.employeeName} - ${data.leaveType}`
      );
      try {
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
            days: leave.days,
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
          }));
          setLeaveRequests(formattedLeaves);
        }
      } catch (error) {
        console.error('❌ [실시간] 연차 데이터 갱신 실패:', error);
      }
    });

    socket.on('leave-status-changed', async (data) => {
      devLog(
        `🔄 [실시간] 연차 상태 변경됨: ${data.employeeName} - ${data.status}`
      );
      try {
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
            days: leave.days,
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
          }));
          setLeaveRequests(formattedLeaves);
        }
      } catch (error) {
        console.error('❌ [실시간] 연차 데이터 갱신 실패:', error);
      }
    });

    // 근태 실시간 업데이트
    socket.on('attendance-bulk-saved', async (data) => {
      devLog(
        `✨ [실시간] 근태 대량 저장됨: ${data.year}년 ${data.month}월 (추가: ${data.inserted}건, 수정: ${data.updated}건)`
      );

      // 현재 보고 있는 연월과 일치하면 데이터 갱신
      if (
        data.year === attendanceSheetYear &&
        data.month === attendanceSheetMonth
      ) {
        try {
          const response = await AttendanceAPI.getMonthlyData(
            data.year,
            data.month
          );
          if (response && response.data) {
            setAttendanceSheetData(response.data);
            devLog(
              `✅ [실시간] 근태 데이터 갱신 완료: ${data.year}년 ${data.month}월`
            );
          }
        } catch (error) {
          console.error('❌ [실시간] 근태 데이터 갱신 실패:', error);
        }
      }
    });

    socket.on('attendance-monthly-saved', async (data) => {
      devLog(
        `✨ [실시간] 근태 월별 저장됨: ${data.year}년 ${data.month}월 (${data.successCount}건 성공)`
      );

      // 현재 보고 있는 연월과 일치하면 데이터 갱신
      if (
        data.year === attendanceSheetYear &&
        data.month === attendanceSheetMonth
      ) {
        try {
          const response = await AttendanceAPI.getMonthlyData(
            data.year,
            data.month
          );
          if (response && response.data) {
            setAttendanceSheetData(response.data);
            devLog(
              `✅ [실시간] 근태 데이터 갱신 완료: ${data.year}년 ${data.month}월`
            );
          }
        } catch (error) {
          console.error('❌ [실시간] 근태 데이터 갱신 실패:', error);
        }
      }
    });

    socket.on('attendance-checked-in', (data) => {
      devLog(
        `✨ [실시간] 출근 등록됨: ${data.employeeId}${
          data.isLate ? ' (지각)' : ''
        }`
      );
    });

    socket.on('attendance-checked-out', (data) => {
      devLog(
        `✨ [실시간] 퇴근 등록됨: ${data.employeeId} (근무시간: ${data.workMinutes}분)`
      );
    });

    socket.on('attendance-updated', (data) => {
      devLog(`✏️ [실시간] 근태 수정됨: ${data.employeeId}`);
    });

    socket.on('attendance-deleted', (data) => {
      devLog(`🗑️ [실시간] 근태 삭제됨: ${data.employeeId}`);
    });

    // 급여 실시간 업데이트
    socket.on('payroll-bulk-uploaded', async (data) => {
      devLog(
        `✨ [실시간] 급여 대량 업로드됨: ${data.year}년 ${data.month}월 (추가: ${data.inserted}건, 수정: ${data.updated}건)`
      );

      // 업로드된 연월의 급여 데이터 갱신
      try {
        const response = await PayrollAPI.getMonthlyData(data.year, data.month);
        if (response && response.data) {
          const yearMonth = `${data.year}-${String(data.month).padStart(
            2,
            '0'
          )}`;
          setPayrollByMonth((prev) => ({
            ...prev,
            [yearMonth]: response.data,
          }));
          devLog(
            `✅ [실시간] 급여 데이터 갱신 완료: ${data.year}년 ${data.month}월`
          );
        }
      } catch (error) {
        console.error('❌ [실시간] 급여 데이터 갱신 실패:', error);
      }
    });

    socket.on('payroll-created', async (data) => {
      devLog(
        `✨ [실시간] 급여 생성됨: ${data.employeeId} (${data.year}년 ${data.month}월)`
      );

      // 생성된 급여의 연월 데이터 갱신
      try {
        const response = await PayrollAPI.getMonthlyData(data.year, data.month);
        if (response && response.data) {
          const yearMonth = `${data.year}-${String(data.month).padStart(
            2,
            '0'
          )}`;
          setPayrollByMonth((prev) => ({
            ...prev,
            [yearMonth]: response.data,
          }));
          devLog(
            `✅ [실시간] 급여 데이터 갱신 완료: ${data.year}년 ${data.month}월`
          );
        }
      } catch (error) {
        console.error('❌ [실시간] 급여 데이터 갱신 실패:', error);
      }
    });

    socket.on('payroll-updated', async (data) => {
      devLog(
        `✏️ [실시간] 급여 수정됨: ${data.employeeId} (${data.year}년 ${data.month}월)`
      );

      // 수정된 급여의 연월 데이터 갱신
      try {
        const response = await PayrollAPI.getMonthlyData(data.year, data.month);
        if (response && response.data) {
          const yearMonth = `${data.year}-${String(data.month).padStart(
            2,
            '0'
          )}`;
          setPayrollByMonth((prev) => ({
            ...prev,
            [yearMonth]: response.data,
          }));
          devLog(
            `✅ [실시간] 급여 데이터 갱신 완료: ${data.year}년 ${data.month}월`
          );
        }
      } catch (error) {
        console.error('❌ [실시간] 급여 데이터 갱신 실패:', error);
      }
    });

    socket.on('payroll-deleted', async (data) => {
      devLog(
        `🗑️ [실시간] 급여 삭제됨: ${data.employeeId} (${data.year}년 ${data.month}월)`
      );

      // 삭제된 급여의 연월 데이터 갱신
      try {
        const response = await PayrollAPI.getMonthlyData(data.year, data.month);
        if (response && response.data) {
          const yearMonth = `${data.year}-${String(data.month).padStart(
            2,
            '0'
          )}`;
          setPayrollByMonth((prev) => ({
            ...prev,
            [yearMonth]: response.data,
          }));
          devLog(
            `✅ [실시간] 급여 데이터 갱신 완료: ${data.year}년 ${data.month}월`
          );
        }
      } catch (error) {
        console.error('❌ [실시간] 급여 데이터 갱신 실패:', error);
      }
    });

    // 평가 실시간 업데이트
    socket.on('evaluation-created', async (data) => {
      devLog(
        `✨ [실시간] 평가 생성됨: ${data.name} (${data.year}년 - ${data.grade}등급)`
      );
      try {
        const evaluations = await EvaluationAPI.list();
        if (evaluations && Array.isArray(evaluations)) {
          setEvaluationData(evaluations);
        }
      } catch (error) {
        console.error('❌ [실시간] 평가 데이터 갱신 실패:', error);
      }
    });

    socket.on('evaluation-updated', async (data) => {
      devLog(
        `✏️ [실시간] 평가 수정됨: ${data.name} (${data.year}년 - ${data.grade}등급)`
      );
      try {
        const evaluations = await EvaluationAPI.list();
        if (evaluations && Array.isArray(evaluations)) {
          setEvaluationData(evaluations);
        }
      } catch (error) {
        console.error('❌ [실시간] 평가 데이터 갱신 실패:', error);
      }
    });

    socket.on('evaluation-deleted', async (data) => {
      devLog(`🗑️ [실시간] 평가 삭제됨: ${data.name} (${data.year}년)`);
      try {
        const evaluations = await EvaluationAPI.list();
        if (evaluations && Array.isArray(evaluations)) {
          setEvaluationData(evaluations);
        }
      } catch (error) {
        console.error('❌ [실시간] 평가 데이터 갱신 실패:', error);
      }
    });

    // 안전사고 실시간 업데이트
    socket.on('safety-accident-created', async (data) => {
      devLog(`✨ [실시간] 안전사고 등록됨: ${data.date} (${data.severity})`);
      try {
        const accidents = await SafetyAccidentAPI.list();
        if (accidents && Array.isArray(accidents)) {
          const mappedAccidents = accidents.map((a) => ({
            ...a,
            id: a._id || a.id,
          }));
          setSafetyAccidents(mappedAccidents);
        }
      } catch (error) {
        console.error('❌ [실시간] 안전사고 데이터 갱신 실패:', error);
      }
    });

    socket.on('safety-accident-updated', async (data) => {
      devLog(`✏️ [실시간] 안전사고 수정됨: ${data.date} (${data.severity})`);
      try {
        const accidents = await SafetyAccidentAPI.list();
        if (accidents && Array.isArray(accidents)) {
          const mappedAccidents = accidents.map((a) => ({
            ...a,
            id: a._id || a.id,
          }));
          setSafetyAccidents(mappedAccidents);
        }
      } catch (error) {
        console.error('❌ [실시간] 안전사고 데이터 갱신 실패:', error);
      }
    });

    socket.on('safety-accident-deleted', async (data) => {
      devLog(`🗑️ [실시간] 안전사고 삭제됨: ${data.date}`);
      try {
        const accidents = await SafetyAccidentAPI.list();
        if (accidents && Array.isArray(accidents)) {
          const mappedAccidents = accidents.map((a) => ({
            ...a,
            id: a._id || a.id,
          }));
          setSafetyAccidents(mappedAccidents);
        } else {
          setSafetyAccidents([]);
        }
      } catch (error) {
        console.error('❌ [실시간] 안전사고 데이터 갱신 실패:', error);
      }
    });

    // 일정 실시간 업데이트
    socket.on('schedule-created', async (data) => {
      devLog(`✨ [실시간] 일정 생성됨: ${data.title} (${data.date})`);
      try {
        const response = await ScheduleAPI.list();
        const schedules = response?.data || response || [];
        if (Array.isArray(schedules) && schedules.length > 0) {
          const formattedSchedules = schedules.map((schedule) => ({
            id: schedule._id || schedule.id,
            title: schedule.title,
            date: schedule.date?.split('T')[0] || schedule.date,
            startDate: schedule.startDate?.split('T')[0],
            endDate: schedule.endDate?.split('T')[0],
            type: schedule.type,
            category: schedule.category,
            isCustom: schedule.isCustom || false,
            description: schedule.description,
            color: schedule.color,
            createdBy: schedule.createdBy,
            participants: schedule.participants || [],
          }));
          setScheduleEvents(formattedSchedules);
        }
      } catch (error) {
        console.error('❌ [실시간] 일정 데이터 갱신 실패:', error);
      }
    });

    socket.on('schedule-updated', async (data) => {
      devLog(`✏️ [실시간] 일정 수정됨: ${data.title} (${data.date})`);
      try {
        const response = await ScheduleAPI.list();
        const schedules = response?.data || response || [];
        if (Array.isArray(schedules) && schedules.length > 0) {
          const formattedSchedules = schedules.map((schedule) => ({
            id: schedule._id || schedule.id,
            title: schedule.title,
            date: schedule.date?.split('T')[0] || schedule.date,
            startDate: schedule.startDate?.split('T')[0],
            endDate: schedule.endDate?.split('T')[0],
            type: schedule.type,
            category: schedule.category,
            isCustom: schedule.isCustom || false,
            description: schedule.description,
            color: schedule.color,
            createdBy: schedule.createdBy,
            participants: schedule.participants || [],
          }));
          setScheduleEvents(formattedSchedules);
        }
      } catch (error) {
        console.error('❌ [실시간] 일정 데이터 갱신 실패:', error);
      }
    });

    socket.on('schedule-deleted', async (data) => {
      devLog(`🗑️ [실시간] 일정 삭제됨: ${data.title}`);
      try {
        const response = await ScheduleAPI.list();
        const schedules = response?.data || response || [];
        if (Array.isArray(schedules) && schedules.length > 0) {
          const formattedSchedules = schedules.map((schedule) => ({
            id: schedule._id || schedule.id,
            title: schedule.title,
            date: schedule.date?.split('T')[0] || schedule.date,
            startDate: schedule.startDate?.split('T')[0],
            endDate: schedule.endDate?.split('T')[0],
            type: schedule.type,
            category: schedule.category,
            isCustom: schedule.isCustom || false,
            description: schedule.description,
            color: schedule.color,
            createdBy: schedule.createdBy,
            participants: schedule.participants || [],
          }));
          setScheduleEvents(formattedSchedules);
        } else {
          setScheduleEvents([]);
        }
      } catch (error) {
        console.error('❌ [실시간] 일정 데이터 갱신 실패:', error);
      }
    });

    // ✅ 휴일 실시간 업데이트 리스너
    socket.on('holiday-created', async (data) => {
      devLog(`✨ [실시간] 휴일 생성됨: ${data.title} (${data.date})`);
      try {
        const startYear = currentYear - 1;
        const endYear = currentYear + 1;
        const response = await HolidayAPI.getYearsHolidays(startYear, endYear);

        if (response.success && response.data) {
          const allCustomHolidays = {};
          Object.values(response.data).forEach((yearHolidays) => {
            Object.entries(yearHolidays).forEach(([date, name]) => {
              if (date.includes('-') && date.split('-').length === 3) {
                allCustomHolidays[date] = name;
              }
            });
          });
          setCustomHolidays(allCustomHolidays);
          devLog(`✅ [실시간] 휴일 데이터 갱신 완료`);
        }
      } catch (error) {
        console.error('❌ [실시간] 휴일 데이터 갱신 실패:', error);
      }
    });

    socket.on('holiday-updated', async (data) => {
      devLog(`✏️ [실시간] 휴일 수정됨: ${data.title} (${data.date})`);
      try {
        const startYear = currentYear - 1;
        const endYear = currentYear + 1;
        const response = await HolidayAPI.getYearsHolidays(startYear, endYear);

        if (response.success && response.data) {
          const allCustomHolidays = {};
          Object.values(response.data).forEach((yearHolidays) => {
            Object.entries(yearHolidays).forEach(([date, name]) => {
              if (date.includes('-') && date.split('-').length === 3) {
                allCustomHolidays[date] = name;
              }
            });
          });
          setCustomHolidays(allCustomHolidays);
          devLog(`✅ [실시간] 휴일 데이터 갱신 완료`);
        }
      } catch (error) {
        console.error('❌ [실시간] 휴일 데이터 갱신 실패:', error);
      }
    });

    socket.on('holiday-deleted', async (data) => {
      devLog(`🗑️ [실시간] 휴일 삭제됨: ${data.title}`);
      try {
        const startYear = currentYear - 1;
        const endYear = currentYear + 1;
        const response = await HolidayAPI.getYearsHolidays(startYear, endYear);

        if (response.success && response.data) {
          const allCustomHolidays = {};
          Object.values(response.data).forEach((yearHolidays) => {
            Object.entries(yearHolidays).forEach(([date, name]) => {
              if (date.includes('-') && date.split('-').length === 3) {
                allCustomHolidays[date] = name;
              }
            });
          });
          setCustomHolidays(allCustomHolidays);
          devLog(`✅ [실시간] 휴일 데이터 갱신 완료`);
        }
      } catch (error) {
        console.error('❌ [실시간] 휴일 데이터 갱신 실패:', error);
      }
    });

    socket.on('disconnect', () => {
      devLog('🔌 [전역 Socket] 연결 해제됨');
    });

    return () => {
      socket.removeAllListeners();
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [currentUser, leaveRequests]);

  // *[1_공통] 언어 및 다국어*
  const { handleLanguageSelect, getText, getLeaveTypeText } = useLanguage({
    selectedLanguage,
    setSelectedLanguage,
    setShowLanguageSelection,
    setCurrentYear,
    setCurrentMonth,
  });

  // *[1_공통] 인증 및 비밀번호 변경*
  const {
    handleLogin,
    handleChangePassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
  } = useAuth({
    loginForm,
    admins,
    employees,
    setCurrentUser,
    setLoginError,
    setSelectedLanguage,
    setShowLanguageSelection,
    handleTabChange,
    setCurrentYear,
    setCurrentMonth,
    getText,
    changePasswordForm,
    currentUser,
    setEmployees,
    setAdmins,
    setChangePasswordError,
    setChangePasswordSuccess,
    setChangePasswordForm,
    API_BASE_URL,
    setPayrollByMonth,
    setDashboardDateFilter,
    setDashboardSelectedDate,
    formatDateToString,
  });

  // *[2_관리자 모드] 관리자 필터/정렬/검색*
  const {
    employeeSortField,
    setEmployeeSortField,
    employeeSortOrder,
    setEmployeeSortOrder,
    leaveSortField,
    setLeaveSortField,
    leaveSortOrder,
    setLeaveSortOrder,
    suggestionSortField,
    setSuggestionSortField,
    suggestionSortOrder,
    setSuggestionSortOrder,
    evaluationSortField,
    setEvaluationSortField,
    evaluationSortOrder,
    setEvaluationSortOrder,
    renderCount,
    setRenderCount,
    renderPerSecond,
    setRenderPerSecond,
    renderCountRef,
    lastRenderTimeRef,
    annualLeaveSortField,
    setAnnualLeaveSortField,
    annualLeaveSortOrder,
    setAnnualLeaveSortOrder,
    leaveSearch,
    setLeaveSearch,
    suggestionSearch,
    setSuggestionSearch,
    evaluationSearch,
    setEvaluationSearch,
    editingEmpId,
    setEditingEmpId,
    editForm,
    setEditForm,
  } = useAdminFilters();

  // *[2_관리자 모드] 2.3_공지 관리 State* (관리자 공지사항 페이지네이션)
  const {
    noticeSearch,
    setNoticeSearch,
    noticeFiles,
    setNoticeFiles,
    noticeFilesRef,
    adminNoticePage,
    setAdminNoticePage,
  } = useNoticeState();

  // *[3_일반직원 모드] 일반직원 푸시 알림 및 읽음 상태 관리*
  const {
    markNotificationAsRead,
    markNoticeAsRead,
    getUnreadNotificationCount,
    getUnreadNoticeCount,
  } = useEmployeeNotifications({
    currentUser,
    notices,
    employeeNotifications,
    setEmployeeNotifications,
    payrollByMonth,
    setPayrollByMonth,
    showLocalNotification,
    regularNotifications,
    realtimeNotifications,
    notificationLogs,
    readNotifications,
    setReadNotifications,
    readAnnouncements,
    setReadAnnouncements,
    updateEmployeeNotifications,
    devLog,
  });

  // *[2_관리자 모드] 2.8_근태 관리 - 엑셀 데이터 파싱*
  const parseAttendanceFromExcel = (data, onComplete) => {
    const parser = new AttendanceExcelParser({
      attendanceSheetYear,
      attendanceSheetMonth,
      setAttendanceSheetYear,
      setAttendanceSheetMonth,
      employees,
      setCheckInTime,
      setCheckOutTime,
      devLog,
    });

    parser.parse(data, onComplete);
  };

  // *[2_관리자 모드] 근태 데이터 관리*
  const {
    dayMetadata,
    uploadAttendanceXLSX,
    exportAttendanceXLSX,
    handleAttendanceKeyDown,
    getWorkTypeForDate,
    setWorkTypeForDate,
    setCheckInTime,
    setCheckOutTime,
    saveCalculatedStatsToSheet,
    preCalculatedStats,
    saveAttendanceToDb,
  } = useAttendanceManagement({
    attendanceSheetYear,
    attendanceSheetMonth,
    attendanceSheetData,
    setAttendanceSheetData,
    setAttendanceSheetYear,
    setAttendanceSheetMonth,
    loadHolidayData,
    devLog,
    workTypeSettings,
    setWorkTypeSettings,
    employees,
    customHolidays,
    holidayData,
    getKoreanHolidays,
    parseAttendanceFromExcel,
    CommonDownloadService,
    getAttendanceForEmployee,
    calculateMonthlyStats,
    filteredAttendanceEmployees,
    categorizeWorkTime,
    setAttendanceData,
    analyzeAttendanceStatusForDashboard,
    send52HourViolationAlert: send52HourViolationAlertUtil,
    setRegularNotifications,
    setNotificationLogs,
  });

  // saveCalculatedStatsToSheet를 ref에 할당
  useEffect(() => {
    saveStatsRef.current = saveCalculatedStatsToSheet;
  }, [saveCalculatedStatsToSheet]);

  // filteredAttendanceStats는 getWorkTypeForDate가 필요하므로 useAttendanceManagement 이후에 계산
  const filteredAttendanceStats = useFilteredAttendanceStats(
    filteredAttendanceEmployees,
    calculateMonthlyStats,
    attendanceSheetYear,
    attendanceSheetMonth,
    getDaysInMonth,
    getAttendanceForEmployee,
    getWorkTypeForDate,
    preCalculatedStats
  );

  // *[2_관리자 모드] 2.12_AI 모델 초기화*
  React.useEffect(() => {
    devLog('🔄 초기화 시작...');

    const modelType = localStorage.getItem('selectedModelType') || '';
    const savedUsageStatus = localStorage.getItem('modelUsageStatus');

    devLog('📂 로컬 스토리지에서 로드된 데이터:');
    devLog('- modelType:', modelType);
    devLog('- savedUsageStatus:', savedUsageStatus);

    setSelectedModelType(modelType);

    if (savedUsageStatus) {
      const parsedStatus = JSON.parse(savedUsageStatus);
      devLog('✅ 저장된 모델 사용 상태 복구:', parsedStatus);
      setModelUsageStatus(parsedStatus);
    } else {
      devLog('⚠️ 저장된 모델 상태 없음, 기본값 설정');

      const initialUsageStatus = {
        chatgpt: false,
        claude: false,
        gemini: false,
      };
      const currentModel = localStorage.getItem('selectedAiModel') || 'chatgpt';
      devLog('- 기본 모델 선택:', currentModel);
      initialUsageStatus[currentModel] = true;
      setModelUsageStatus(initialUsageStatus);
      localStorage.setItem(
        'modelUsageStatus',
        JSON.stringify(initialUsageStatus)
      );
      devLog('✅ 초기 모델 상태 설정 완료:', initialUsageStatus);
    }

    const promptSettings =
      localStorage.getItem('aiPromptSettings') ||
      '회사 HR 데이터를 분석하여 실용적인 개선 방안을 제안해주세요.';
    setAiPromptSettings(promptSettings);

    devLog('🎯 초기화 완료');
  }, []);

  // *[1_공통] 연차 데이터 DB에서 먼저 로드* (직원 연차 계산을 위해)
  const [leavesLoaded, setLeavesLoaded] = React.useState(false);

  // *[1_공통] 직원 데이터 DB에서 로드*
  React.useEffect(() => {
    const loadEmployeesFromDB = async () => {
      try {
        setEmployeesLoading(true);
        devLog('🔄 DB에서 직원 데이터 로딩 시작...');

        // 연차 데이터가 먼저 로드될 때까지 대기
        if (!leavesLoaded) {
          devLog('⏳ 연차 데이터 로딩 대기 중...');
          return;
        }

        const dbEmployees = await EmployeeAPI.list();

        if (dbEmployees && dbEmployees.length > 0) {
          // DB 데이터를 프론트엔드 형식으로 변환 (연차 정보 포함)
          const formattedEmployees = dbEmployees.map((emp) => {
            const baseEmp = {
              id: emp.employeeId,
              name: emp.name,
              password: emp.password || emp.phone?.slice(-4) || '0000', // DB password 우선 사용
              phone: emp.phone,
              department: emp.department,
              subDepartment: emp.subDepartment || '',
              position: emp.position,
              role: emp.role,
              joinDate: formatDateToString(emp.joinDate),
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };

            // 연차 정보 계산 (leaveRequests가 이미 로드되어 있다면)
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              leaveRequests
            );

            // ✅ DB에서 받은 usedLeave 값 우선 사용 (강력 새로고침 시에도 정확한 값 유지)
            const usedLeaveFromDB =
              emp.usedLeave !== undefined ? emp.usedLeave : emp.leaveUsed;
            const finalUsedLeave =
              usedLeaveFromDB !== undefined && usedLeaveFromDB !== null
                ? usedLeaveFromDB
                : annualData.usedAnnual;

            return {
              ...baseEmp,
              leaveYearStart: annualData.annualStart,
              leaveYearEnd: annualData.annualEnd,
              totalAnnualLeave: annualData.totalAnnual,
              usedAnnualLeave: finalUsedLeave, // DB 값 우선 사용
              remainingAnnualLeave: annualData.totalAnnual - finalUsedLeave,
            };
          });
          setEmployees(formattedEmployees);
          devLog(
            `✅ DB에서 직원 ${formattedEmployees.length}명 로드 완료 (연차 정보 포함)`
          );
        } else {
          // DB에 데이터가 없으면 하드코딩 사용
          devLog('⚠️ DB 데이터 없음 - 하드코딩 데이터 사용');
          setEmployees(generateEmployees());
        }
      } catch (error) {
        console.error('❌ DB 직원 로드 실패:', error);
        // API 실패 시 하드코딩 데이터로 폴백
        devLog('⚠️ API 실패 - 하드코딩 데이터로 폴백');
        setEmployees(generateEmployees());
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployeesFromDB();
  }, [leavesLoaded]);

  // *[1_공통] 직원 데이터 6시간 주기 갱신*
  const lastRefreshRef = React.useRef(0);

  React.useEffect(() => {
    const REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6시간 (밀리초)

    const checkAndRefreshEmployees = async () => {
      const lastRefresh = lastRefreshRef.current;
      const now = Date.now();

      if (!lastRefresh || now - lastRefresh >= REFRESH_INTERVAL) {
        devLog('🔄 직원 데이터 6시간 주기 갱신 실행');
        try {
          const dbEmployees = await EmployeeAPI.list();
          if (dbEmployees && dbEmployees.length > 0) {
            const formattedEmployees = dbEmployees.map((emp) => {
              const baseEmp = {
                id: emp.employeeId,
                name: emp.name,
                password: emp.password || emp.phone?.slice(-4) || '0000', // DB password 우선 사용
                phone: emp.phone,
                department: emp.department,
                subDepartment: emp.subDepartment || '',
                position: emp.position,
                role: emp.role,
                joinDate: formatDateToString(emp.joinDate),
                workType: emp.workType,
                payType: emp.salaryType,
                contractType: emp.contractType || '정규직', // 계약형태
                status: emp.status,
                address: emp.address,
                // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
                leaveUsed: emp.leaveUsed,
                // ✅ 호환성을 위한 매핑 필드
                usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
              };

              // 연차 정보 계산
              const annualData = calculateEmployeeAnnualLeaveUtil(
                baseEmp,
                leaveRequests
              );

              // ✅ DB에서 받은 usedLeave 값 우선 사용 (강력 새로고침 시에도 정확한 값 유지)
              const usedLeaveFromDB =
                emp.usedLeave !== undefined ? emp.usedLeave : emp.leaveUsed;
              const finalUsedLeave =
                usedLeaveFromDB !== undefined && usedLeaveFromDB !== null
                  ? usedLeaveFromDB
                  : annualData.usedAnnual;

              return {
                ...baseEmp,
                leaveYearStart: annualData.annualStart,
                leaveYearEnd: annualData.annualEnd,
                totalAnnualLeave: annualData.totalAnnual,
                usedAnnualLeave: finalUsedLeave, // DB 값 우선 사용
                remainingAnnualLeave: annualData.totalAnnual - finalUsedLeave,
              };
            });
            setEmployees(formattedEmployees);
          } else {
            setEmployees(generateEmployees());
          }
        } catch (error) {
          console.error('갱신 실패:', error);
          setEmployees(generateEmployees());
        }
        // 관리자 데이터는 DB에서 자동 로드되므로 리프레시 불필요
        lastRefreshRef.current = now;
        devLog(
          `✅ 직원 데이터 갱신 완료 (다음 갱신: ${new Date(
            now + REFRESH_INTERVAL
          ).toLocaleString()})`
        );
      }
    };

    // 초기 체크
    checkAndRefreshEmployees();

    // 6시간마다 체크
    const intervalId = setInterval(checkAndRefreshEmployees, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  // *[1_공통] 연차 데이터 DB에서 로드*
  React.useEffect(() => {
    const loadLeavesFromDB = async () => {
      try {
        devLog('🔄 DB에서 연차 데이터 로딩 시작...');
        const dbLeaves = await LeaveAPI.list();

        if (dbLeaves && dbLeaves.length > 0) {
          // DB 데이터를 프론트엔드 형식으로 변환
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
            days: leave.days,
            reason: leave.reason,
            contact: leave.contact,
            status: leave.status,
            requestDate: formatDateByLang(leave.requestDate || leave.createdAt),
            // 승인 정보
            approvedAt: leave.approvedAt,
            approver: leave.approver,
            approverName: leave.approverName,
            approvedDays: leave.approvedDays,
            // 반려 정보
            rejectedAt: leave.rejectedAt,
            rejectedBy: leave.rejectedBy,
            rejectedByName: leave.rejectedByName,
            rejectionReason: leave.rejectionReason,
          }));
          setLeaveRequests(formattedLeaves);
          devLog(`✅ DB에서 연차 ${formattedLeaves.length}건 로드 완료`);
        } else {
          devLog('⚠️ DB에 연차 데이터 없음');
          setLeaveRequests([]);
        }
      } catch (error) {
        console.error('❌ DB 연차 로드 실패:', error);
        devLog('⚠️ 연차 API 실패 - 빈 배열 사용');
        setLeaveRequests([]);
      } finally {
        setLeavesLoaded(true);
        devLog('✅ 연차 데이터 로딩 완료 - 직원 데이터 로딩 시작 가능');
      }
    };

    loadLeavesFromDB();
  }, []);

  // *[1_공통] 공지사항 데이터 DB에서 로드 및 Socket.io 실시간 업데이트*
  React.useEffect(() => {
    const loadNoticesFromDB = async () => {
      try {
        devLog('🔄 DB에서 공지사항 데이터 로딩 시작...');
        // 관리자 모드에서는 예약된 공지도 포함
        const includeScheduled = currentUser?.role === 'admin';
        const dbNotices = await NoticeAPI.list(includeScheduled);

        if (dbNotices && dbNotices.length > 0) {
          const formattedNotices = dbNotices.map((notice) => {
            // attachments가 문자열 배열인 경우 객체 배열로 변환 (하위호환성)
            let attachments = notice.attachments || [];
            if (attachments.length > 0 && typeof attachments[0] === 'string') {
              attachments = attachments.map((fileName) => ({
                name: fileName,
                url: '',
                size: '',
              }));
            }

            return {
              id: notice._id,
              _id: notice._id,
              title: notice.title,
              content: notice.content,
              author: notice.author,
              authorId: notice.authorId,
              category: notice.category,
              priority: notice.priority,
              files: attachments,
              attachments: attachments,
              date: notice.createdAt
                ? new Date(notice.createdAt).toISOString().slice(0, 10)
                : '',
              createdAt: notice.createdAt,
              updatedAt: notice.updatedAt,
              views: notice.views || 0,
              viewCount: notice.viewCount || 0, // ✅ 조회수 (고유 직원 수)
              viewedBy: notice.viewedBy || [], // ✅ 조회한 직원 ID 목록
              isImportant: notice.isImportant || false,
              isScheduled: notice.isScheduled || false,
              scheduledDateTime: notice.scheduledDateTime,
            };
          });
          setNotices(formattedNotices);
          devLog(`✅ DB에서 공지사항 ${formattedNotices.length}건 로드 완료`);
        } else {
          devLog('⚠️ DB에 공지사항 데이터 없음');
          setNotices([]);
        }
      } catch (error) {
        console.error('❌ DB 공지사항 로드 실패:', error);
        devLog('⚠️ 공지사항 API 실패 - 빈 배열 사용');
        setNotices([]);
      }
    };

    // 즉시 로드
    loadNoticesFromDB();

    // Socket.io 연결 설정 (실시간 업데이트용)
    const socket = io(SERVER_URL, {
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['polling', 'websocket'],
    });

    socket.on('connect', () => {
      devLog('🔌 Socket.io 연결됨 - 실시간 업데이트 활성화');
    });

    // 예약 공지사항 자동 게시
    socket.on('notice-published', (data) => {
      devLog(
        `📢 예약 공지사항 ${data.count}건이 자동 게시되었습니다. 공지사항을 다시 로드합니다.`
      );
      loadNoticesFromDB();
    });

    // 공지사항 실시간 업데이트
    socket.on('notice-created', (data) => {
      devLog(`✨ 공지사항 등록됨: ${data.title}`);
      loadNoticesFromDB();
    });

    socket.on('notice-updated', (data) => {
      devLog(`✏️ 공지사항 수정됨: ${data.title}`);
      loadNoticesFromDB();
    });

    socket.on('notice-deleted', (data) => {
      devLog(`🗑️ 공지사항 삭제됨: ${data.noticeId}`);
      loadNoticesFromDB();
    });

    socket.on('disconnect', () => {
      devLog('🔌 Socket.io 연결 해제됨');
    });

    // cleanup: Socket 연결 해제
    return () => {
      socket.removeAllListeners();
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [currentUser]);

  // *[1_공통] 건의사항 데이터 DB에서 로드*
  React.useEffect(() => {
    const loadSuggestionsFromDB = async () => {
      if (!currentUser || !currentUser.id) {
        devLog('⚠️ currentUser 정보 없음 - 건의사항 로드 스킵');
        return;
      }

      try {
        devLog('🔄 DB에서 건의사항 데이터 로딩 시작...');
        // 관리자는 전체 조회, 일반 직원은 본인 것만 조회
        // 관리자 계정만 건의관리 접근 가능 (isAdmin = true)
        const isAdmin =
          currentUser.isAdmin === true || currentUser.role === 'admin';
        const dbSuggestions = await SuggestionAPI.list(
          isAdmin ? null : currentUser.id,
          isAdmin ? 'admin' : null
        );

        if (dbSuggestions && dbSuggestions.length > 0) {
          const formattedSuggestions = dbSuggestions.map((suggestion) => ({
            id: suggestion._id,
            _id: suggestion._id,
            employeeId: suggestion.employeeId,
            name: suggestion.name || '',
            department: suggestion.department || '',
            type: suggestion.type,
            title: suggestion.title,
            content: suggestion.content,
            status: suggestion.status,
            remark: suggestion.remark || '',
            approver: suggestion.approver,
            approvalDate: formatDateByLang(suggestion.approvalDate),
            applyDate:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
            createdAt: suggestion.createdAt,
            date:
              suggestion.applyDate ||
              (suggestion.createdAt
                ? new Date(suggestion.createdAt).toISOString().slice(0, 10)
                : ''),
          }));
          setSuggestions(formattedSuggestions);
          devLog(
            `✅ DB에서 건의사항 ${formattedSuggestions.length}건 로드 완료`
          );
        } else {
          devLog('⚠️ DB에 건의사항 데이터 없음');
          setSuggestions([]);
        }
      } catch (error) {
        console.error('❌ [건의사항 로드] DB 건의사항 로드 실패:', error);
        console.error(
          '❌ [건의사항 로드] 에러 상세:',
          error.message,
          error.stack
        );
        devLog('⚠️ 건의사항 API 실패 - 빈 배열 사용');
        setSuggestions([]);
      }
    };

    loadSuggestionsFromDB();
  }, [currentUser]);

  // *[1_공통] 일정 데이터 DB에서 로드*
  React.useEffect(() => {
    const loadSchedulesFromDB = async () => {
      try {
        devLog('🔄 [일정] DB에서 일정 데이터 로딩 시작...');
        const response = await ScheduleAPI.list();

        // API 응답 형태 체크
        const schedules = response?.data || response || [];

        if (Array.isArray(schedules) && schedules.length > 0) {
          const formattedSchedules = schedules.map((schedule) => ({
            id: schedule._id || schedule.id,
            title: schedule.title,
            date: schedule.date?.split('T')[0] || schedule.date,
            startDate: schedule.startDate?.split('T')[0],
            endDate: schedule.endDate?.split('T')[0],
            type: schedule.type,
            category: schedule.category, // 공휴일 구분을 위한 category 필드 추가
            isCustom: schedule.isCustom || false, // 커스텀 공휴일 여부
            description: schedule.description,
            color: schedule.color,
            createdBy: schedule.createdBy,
            participants: schedule.participants || [],
          }));
          setScheduleEvents(formattedSchedules);

          // 공휴일 디버깅
          const holidays = formattedSchedules.filter(
            (s) => s.category === '공휴일'
          );
          devLog(
            `✅ [일정] DB에서 일정 ${formattedSchedules.length}건 로드 완료 (공휴일: ${holidays.length}건)`
          );

          // 2025년 8월 공휴일 체크
          const august2025Holidays = holidays.filter((h) =>
            h.startDate?.includes('2025-08')
          );
          if (august2025Holidays.length > 0) {
            devLog(
              '🎌 [2025년 8월 공휴일]',
              august2025Holidays
                .map((h) => `${h.startDate} - ${h.title}`)
                .join(', ')
            );
          }
        } else {
          devLog('⚠️ [일정] DB에 일정 데이터 없음');
          setScheduleEvents([]);
        }
      } catch (error) {
        console.error('❌ [일정] DB 일정 로드 실패:', error);
        devLog('⚠️ [일정] API 실패 - 빈 배열 사용');
        setScheduleEvents([]);
      }
    };

    loadSchedulesFromDB();
  }, []);

  // *[2_관리자 모드] 2.1_대시보드 AI 추천 자동 분석*
  // ✅ 로그인 시에만 AI 추천사항 실행 (새로고침 시에는 실행하지 않음)
  React.useEffect(() => {
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

  // *[2_관리자 모드] 2.1_대시보드 AI 추천 히스토리 초기 로딩* (첫 로그인 시에만)
  React.useEffect(() => {
    const loadAiHistory = async () => {
      if (currentUser?.isAdmin) {
        try {
          const historyResponse = await fetch(
            `${API_BASE_URL}/ai/recommendations`
          );
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
            devLog(
              '✅ AI 추천사항 히스토리 로딩 완료:',
              historyData.length,
              '건'
            );
          }
        } catch (error) {
          devLog('⚠️ AI 추천사항 히스토리 로딩 실패:', error);
        }
      }
    };

    loadAiHistory();
  }, [currentUser]);

  // *[2_관리자 모드] 2.1_대시보드 수동 새로고침 함수*
  const refreshDashboardData = React.useCallback(async () => {
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
              workType: emp.workType,
              payType: emp.salaryType,
              contractType: emp.contractType || '정규직', // 계약형태
              status: emp.status,
              address: emp.address,
              lastLogin: emp.lastLogin, // 마지막 로그인 시각
              // ✅ DB 원본 필드 유지 (calculateEmployeeAnnualLeave에서 사용)
              leaveUsed: emp.leaveUsed,
              // ✅ 호환성을 위한 매핑 필드
              usedLeave: emp.usedLeave ?? emp.leaveUsed ?? 0,
            };
            const annualData = calculateEmployeeAnnualLeaveUtil(
              baseEmp,
              leaveRequests
            );
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
            days: leave.days,
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
          const mappedAccidents = accidents.map((a) => ({
            ...a,
            id: a._id || a.id,
          }));
          setSafetyAccidents(mappedAccidents);
          devLog('✅ 안전사고 데이터 갱신 완료');
        }

        devLog('🎉 대시보드 데이터 갱신 완료');
      } catch (error) {
        console.error('❌ 대시보드 데이터 갱신 실패:', error);
      }
    }
  }, [currentUser, attendanceSheetYear, attendanceSheetMonth]);

  // *[2_관리자 모드] 2.1_대시보드 탭 진입 시 데이터 갱신*
  React.useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'dashboard') {
      refreshDashboardData();
    }
  }, [activeTab, currentUser, refreshDashboardData]);

  // *[2_관리자 모드] 2.1_대시보드 출근현황 60분 자동 갱신* (탭 활성 시만)
  React.useEffect(() => {
    if (currentUser?.isAdmin && activeTab === 'dashboard') {
      const interval = setInterval(async () => {
        try {
          devLog('⏰ [60분 자동 갱신] 출근현황 데이터 갱신 시작');

          // 현재 월의 근태 데이터만 다시 로드
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
          console.error(
            '❌ [60분 자동 갱신] 출근현황 데이터 갱신 실패:',
            error
          );
        }
      }, 60 * 60 * 1000); // 60분

      return () => clearInterval(interval);
    }
  }, [activeTab, currentUser, attendanceSheetYear, attendanceSheetMonth]);

  // *[2_관리자 모드] 2.4_반복 설정 관리*
  const {
    openRecurringSettingsModal,
    closeRecurringSettingsModal,
    handleRecurringSettingsComplete,
    generateRecurringText,
    handleWeekdayToggle,
  } = useNotificationRecurring({
    regularNotificationForm,
    setRegularNotificationForm,
    realtimeNotificationForm,
    setRealtimeNotificationForm,
    recurringSettings,
    setRecurringSettings,
    showRecurringSettingsModal,
    setShowRecurringSettingsModal,
    currentFormType,
    setCurrentFormType,
  });

  // *[2_관리자 모드] 2.4_직원 검색 관리*
  const {
    employeeSearchTerm,
    setEmployeeSearchTerm,
    searchResults,
    setSearchResults,
    handleEmployeeSearch,
  } = useEmployeeSearch(employees);

  // *[2_관리자 모드] 2.0.5_메뉴 변경시 상태 초기화 (src/hooks/useMenuStateReset.js)*
  useMenuStateReset({
    activeTab,
    setLeaveSearch,
    setSuggestionSearch,
    setNoticeSearch,
    setEvaluationSearch,
    setEmployeeSearchFilter,
    setEmployeeSearchTerm,
    setSearchResults,
    setEditingEmpId,
    setEditForm,
    setEditingNoticeId,
    setNoticeForm,
    setNoticeFiles,
    setEmployeeSortField,
    setEmployeeSortOrder,
    setLeaveSortField,
    setLeaveSortOrder,
    setSuggestionSortField,
    setSuggestionSortOrder,
    setAnnualLeaveSortField,
    setAnnualLeaveSortOrder,
    setEditingAnnualLeave,
    setEditAnnualData,
  });

  // *[2_관리자 모드] 2.4_수신자 관리 훅*
  const {
    addEmployeeToRecipients,
    removeEmployeeFromRecipients,
    handleEmployeeToggle,
  } = useNotificationRecipients({
    setRegularNotificationForm,
    setRealtimeNotificationForm,
    setEmployeeSearchTerm,
    setSearchResults,
  });

  // *[2_관리자 모드] 2.12_AI 설정 관리 훅*
  const {
    syncAiConfigToBackend,
    handleModelChange,
    handleModelTypeChange,
    handlePermissionChange,
    testApiConnection,
  } = useAISettings({
    API_BASE_URL,
    selectedAiModel,
    selectedModelType,
    setSelectedAiModel,
    setSelectedModelType,
    setModelUsageStatus,
    setAiConfig,
    setApiConnectionStatus,
    modelTypes,
    geminiApiKey,
    chatgptApiKey,
    claudeApiKey,
    chatbotPermissions,
    setChatbotPermissions,
    devLog,
  });

  // *[2_관리자 모드] 2.12_관리자 알림 관리 훅*
  const {
    adminNotifications,
    setAdminNotifications,
    triggerAdminNotification,
    getNotificationTitle,
  } = useAdminNotifications({
    currentUser,
    logSystemEvent,
  });

  // *[2_관리자 모드] 2.10_안전관리 훅*
  const {
    saveSafetyAccidents,
    getTodaySafetyAccidents,
    getThisMonthSafetyAccidents,
    getThisYearSafetyAccidents,
    getAccidentFreeDays,
    checkAccidentFreeNotification,
    handleSafetyAccidentInput,
    handleEditSafety,
    handleSaveAccidentEdit,
    handleCancelAccidentEdit,
    handleDeleteSafety,
  } = useSafetyManagement({
    safetyAccidents,
    setSafetyAccidents,
    setRealtimeNotifications,
    setNotificationLogs,
    devLog,
  });

  // *[2_관리자 모드] 2.5_일정관리 훅*
  const {
    handleAddEvent,
    handleUnifiedAdd,
    handleSaveUnified,
    handleEditEvent,
    handleDeleteEvent,
    handleSaveEvent,
    handleCancelEvent,
  } = useScheduleManagement({
    scheduleEvents,
    setScheduleEvents,
    customHolidays,
    setCustomHolidays,
    selectedEventDate,
    setShowAddEventPopup,
    setEventForm,
    setShowUnifiedAddPopup,
    setUnifiedForm,
    setUnifiedAddType,
    setEditingEvent,
    setShowEditEventPopup,
    unifiedAddType,
    unifiedForm,
    holidayData,
    setHolidayData,
  });

  // *[2_관리자 모드] 2.5_일정관리 - 공휴일 관리 훅*
  const {
    handleAddHoliday,
    handleEditHoliday,
    handleSaveHoliday,
    handleDeleteHoliday,
    handleCancelHoliday,
  } = useHolidayManagement({
    customHolidays,
    setCustomHolidays,
    holidayForm,
    setHolidayForm,
    setSelectedHolidayDate,
    setShowHolidayPopup,
    setWorkTypeSettings,
    attendanceSheetData,
    setAttendanceSheetData,
    employees,
    holidayData,
    setHolidayData,
  });

  // *[2_관리자 모드] 2.6_연차관리 - 연차 수정 훅*
  const {
    handleEditAnnualLeave,
    handleSaveAnnualLeave,
    handleCancelAnnualLeaveEdit,
  } = useAnnualLeaveEditor({
    calculateEmployeeAnnualLeave,
    setEditingAnnualLeave,
    setEditAnnualData,
    editAnnualData,
    setEmployees,
    setLeaveRequests,
    devLog,
  });

  // *[2_관리자 모드] 2.2_직원관리 훅*
  const {
    handleSort,
    handleUpdateEmployee,
    handleDeleteEmployee,
    getSortedEmployees,
    handleRegisterEmployee,
  } = useEmployeeManagement({
    employeeSortField,
    setEmployeeSortField,
    employeeSortOrder,
    setEmployeeSortOrder,
    employees,
    setEmployees,
    setLeaveRequests,
    setAttendanceData,
    setSuggestions,
    setEvaluationData,
    setEvaluations,
  });

  // *[2_관리자 모드] 2.6_연차관리 - 연차 승인/반려 훅*
  const { handleApproveLeave, handleRejectLeave, handleLeaveApprovalConfirm } =
    useLeaveApproval({
      leaveRequests,
      setLeaveRequests,
      employees,
      send자동알림,
      currentUser,
      devLog,
      leaveApprovalData,
      setLeaveApprovalData,
      setShowLeaveApprovalPopup,
    });

  // *[2_관리자 모드] 2.7_건의관리 - 건의사항 승인/반려 훅*
  const {
    handleApproveSuggestion,
    handleRejectSuggestion,
    handleSuggestionApprovalConfirm,
  } = useSuggestionApproval({
    suggestions,
    setSuggestions,
    suggestionApprovalData,
    setSuggestionApprovalData,
    setShowSuggestionApprovalPopup,
    employees,
    send자동알림,
    currentUser,
  });

  // *[2_관리자 모드] 정렬 핸들러 훅*
  const {
    handleLeaveSort,
    handleSuggestionSort,
    handleEvaluationSort,
    handleAnnualLeaveSort,
  } = useSortHandlers({
    leaveSortField,
    setLeaveSortField,
    leaveSortOrder,
    setLeaveSortOrder,
    suggestionSortField,
    setSuggestionSortField,
    suggestionSortOrder,
    setSuggestionSortOrder,
    evaluationSortField,
    setEvaluationSortField,
    evaluationSortOrder,
    setEvaluationSortOrder,
    annualLeaveSortField,
    setAnnualLeaveSortField,
    annualLeaveSortOrder,
    setAnnualLeaveSortOrder,
  });

  // *[2_관리자 모드] 2.10_평가관리 훅*
  const {
    handleEvaluationSubmit,
    handleEvaluationEdit,
    handleEvaluationSave,
    handleEvaluationDelete,
  } = useEvaluationManagement({
    evaluationForm,
    setEvaluationForm,
    evaluationData,
    setEvaluationData,
    setShowEvaluationForm,
    editingEvaluationId,
    setEditingEvaluationId,
    editingEvaluationData,
    setEditingEvaluationData,
    employees,
    send자동알림,
    currentUser,
  });

  // *[1_공통] 사용자 권한 체크 래퍼*
  const checkUserPermission = (action, targetData = null) => {
    return checkUserPermissionUtil(
      currentUser,
      action,
      targetData,
      logSystemEvent
    );
  };

  // *[2_관리자 모드] 2.12_시스템 관리 - 시스템 상태*
  // (useSystemStatus hook으로 분리됨)
  const {
    systemStatus,
    setSystemStatus,
    statusConfig,
    updateSystemStatus,
    notifications,
    setNotifications,
    showPermissionModal,
    setShowPermissionModal,
    permissionModalData,
    setPermissionModalData,
    showPermissionDeniedModal,
    executeWithPermissionCheck,
  } = useSystemStatus({
    checkUserPermission,
    showUserNotification,
    logSystemEvent,
  });

  // *[2_관리자 모드] 2.1_월별 출근율 계산*
  // *[1_공통] 파일 다운로드 생성*
  const generateDownloadFile = (data, filename, type = 'excel') => {
    return CommonDownloadService.generateDownloadFile(
      data,
      filename,
      type,
      chatbotPermissions
    );
  };

  // *[2_관리자 모드] 2.12_AI 프롬프트 저장*
  const handleAiPromptSave = async (prompt) => {
    try {
      // 서버에 저장
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

      if (!response.ok) {
        throw new Error('프롬프트 저장 실패');
      }

      // 로컬에도 저장
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

  // *[2_관리자 모드] 2.1_대시보드 - 공휴일 체크 함수 (scheduleEvents 기반)*
  const isHolidayDateWithData = useCallback(
    (year, month, day) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const dateStrShort = `${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;

      // 1. customHolidays 체크 (수동으로 추가된 휴일)
      if (customHolidays[dateStr]) {
        return true;
      }

      // 2. holidayData 체크 (시스템 공휴일: 설날, 광복절, 추석 등)
      const yearHolidays = holidayData[year] || {};
      if (yearHolidays[dateStr] || yearHolidays[dateStrShort]) {
        return true;
      }

      // 3. scheduleEvents에서 category가 '공휴일'인 이벤트 체크
      const isHoliday = scheduleEvents.some((event) => {
        if (event.category !== '공휴일') {
          return false;
        }

        // startDate가 해당 날짜와 일치하는지 확인
        const eventStartDate = event.startDate?.substring(0, 10); // YYYY-MM-DD 형식
        return eventStartDate === dateStr;
      });

      return isHoliday;
    },
    [customHolidays, holidayData, scheduleEvents]
  );

  // *[2_관리자 모드] 2.1_대시보드 - 출근 상태 관리*
  // (useDashboardAttendance hook으로 분리됨)
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
    isHolidayDate: isHolidayDateWithData,
  });

  // *[2_관리자 모드] 2.1_안전관리 - 무사고 알림 체크*
  useEffect(() => {
    checkAccidentFreeNotification();
  }, [safetyAccidents]); // 안전사고 상태가 변경될 때마다 체크

  // *[2_관리자 모드] 2.10_평가 관리 - 평가 목록 필터링*
  const getFilteredEvaluation = (evaluationList) => {
    return filterEvaluations(evaluationList, evaluationSearch);
  };

  // *[2_관리자 모드] 2.3_공지 관리 - 공지 목록 필터링*
  const getFilteredNotices = (noticeList) => {
    return filterNotices(noticeList, noticeSearch);
  };

  // *[2_관리자 모드] 2.7_건의 관리 - 건의사항 목록 필터링*
  const getFilteredSuggestions = (suggestionList) => {
    return filterSuggestions(suggestionList, suggestionSearch);
  };

  // *[2_관리자 모드] 2.6_연차 관리 - 연차 신청 목록 필터링*
  const getFilteredLeaveRequests = (leaveList) => {
    return filterLeaveRequests(leaveList, leaveSearch);
  };

  // *[2_관리자 모드] 2.6_연차 관리 - 연차 신청 목록 정렬*
  const getSortedLeaveRequests = (leaveList) => {
    return sortLeaveRequests(leaveList, leaveSortField, leaveSortOrder);
  };

  // *[2_관리자 모드] 2.7_건의 관리 - 건의사항 목록 정렬*
  const getSortedSuggestions = (suggestionList) => {
    return sortSuggestions(
      suggestionList,
      suggestionSortField,
      suggestionSortOrder
    );
  };

  // *[2_관리자 모드] 2.10_평가 관리 - 평가 목록 정렬*
  const getSortedEvaluations = (evaluationList) => {
    return sortEvaluations(
      evaluationList,
      evaluationSortField,
      evaluationSortOrder
    );
  };

  // *[1_공통] 월별 연차 개수 계산*
  const getMonthlyAnnualLeave = (employeeId, targetYear, targetMonth) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (!employee || !employee.joinDate) return 0;
    return getMonthlyAnnualLeaveUtil(
      employee.joinDate,
      targetYear,
      targetMonth
    );
  };

  // *[1_공통] 사용한 연차 개수 계산*
  const getUsedAnnualLeave = (employeeId) => {
    return getUsedAnnualLeaveUtil(employeeId, leaveRequests);
  };

  // *[3_일반직원 모드] 3.5_연차 신청/내역 - 총 연차/사용 연차/잔여 연차*
  const totalAnnualLeave = currentUser
    ? calculateAnnualLeave(currentUser.joinDate)
    : 0;
  const usedAnnualLeave =
    currentUser && currentUser.id ? getUsedAnnualLeave(currentUser.id) : 0;
  const remainAnnualLeave = totalAnnualLeave - usedAnnualLeave;

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
    isHolidayDate: isHolidayDateWithData,
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

  // *[2_관리자 모드] 2.1_대시보드 - 통계 관리 훅*
  const { dashboardStatsReal, goalStats, workLifeBalanceStats } =
    useDashboardStats({
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
      isHolidayDate: isHolidayDateWithData,
    });

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
    isHolidayDate: isHolidayDateWithData,
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

  // *[1_공통] AI 챗봇 쿼리 처리 훅*
  const { handleAiQuery } = useAiChat({
    aiInput,
    setAiInput,
    setAiMessages,
    currentUser,
    devLog,
    getActiveAiKey,
    getActiveProvider,
    unifiedApiKey,
    geminiApiKey,
    chatgptApiKey,
    claudeApiKey,
    detectedProvider,
    selectedAiModel,
    attendanceData,
    employees,
    getUsedAnnualLeave,
    calculateAnnualLeave,
    leaveRequests,
    payrollTableData,
    evaluationData,
    notices,
    suggestions,
    safetyAccidents,
    API_BASE_URL,
    FAIL_MSG,
    selectedModel,
    chatbotPermissions,
    logSystemEvent,
    onDataUpdate: () => {
      // 데이터 업데이트 시 화면 새로고침
      devLog('✅ AI 챗봇에 의한 데이터 수정 완료');
    },
  });

  // *[3_일반직원 모드] 3.5_연차 신청/내역 - 연차 관리 훅*
  const { handleCancelLeave, handleLeaveFormChange, handleLeaveRequest } =
    useStaffLeave({
      leaveForm,
      setLeaveForm,
      setLeaveFormError,
      setLeaveFormPreview,
      leaveRequests,
      setLeaveRequests,
      currentUser,
      remainAnnualLeave,
      isHolidayDate,
      send자동알림,
      getText,
    });

  // *[3_일반직원 모드] 3.7_건의 사항 - 건의사항 관리 훅*
  const { handleSuggestionApply, handleSuggestionSubmit } = useStaffSuggestion({
    suggestionInput,
    setSuggestionInput,
    setApplyTitle,
    setApplyContent,
    setShowSuggestionApplyPopup,
    applyTitle,
    applyContent,
    currentUser,
    setSuggestions,
    send자동알림,
    setSuggestionPage,
    getText,
  });

  // *[2_관리자 모드] 2.3_공지 관리 - 공지 파일 관리 훅*
  const {
    handleNoticeFileUpload,
    handleRemoveNoticeFile,
    handleNoticePasteImage,
  } = useNoticeManagement({
    noticeFiles,
    setNoticeFiles,
    noticeFilesRef,
    noticeForm,
    setNoticeForm,
  });

  // *[2_관리자 모드] 2.8_근태 관리 - 셀 선택 관리 훅*
  const {
    selectedCells,
    setSelectedCells,
    isDragging,
    dragStartCell,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    toggleEditingMode: originalToggleEditingMode,
    getCellId,
    isCellSelected,
    getCellRange,
  } = useAttendanceCellSelection({
    isEditingAttendance,
    setIsEditingAttendance,
    getFilteredAttendanceEmployees,
    devLog,
  });

  // toggleEditingMode 래퍼 - 편집완료 시 DB에 저장
  const toggleEditingMode = async () => {
    const wasEditing = isEditingAttendance;
    originalToggleEditingMode();

    // 편집 모드를 끝낼 때 (편집완료 버튼 클릭 시) DB에 저장
    if (wasEditing) {
      setTimeout(async () => {
        const result = await saveAttendanceToDb();
        if (result.success) {
          // DB 저장 성공
        } else {
          console.error('[편집완료] DB 저장 실패:', result.message);
          alert(`DB 저장 중 오류가 발생했습니다: ${result.message}`);
        }
      }, 500);
    }
  };

  // *[2_관리자 모드] 2.8_근태 관리 - 페이지 로드 시 DB에서 데이터 불러오기*
  useEffect(() => {
    const loadAttendanceFromDb = async () => {
      try {
        if (!attendanceSheetYear || !attendanceSheetMonth) {
          return;
        }

        const response = await AttendanceAPI.getMonthlyData(
          attendanceSheetYear,
          attendanceSheetMonth
        );

        if (response.success && response.data) {
          // API 응답을 attendanceSheetData 형식으로 변환
          const loadedData = {};
          response.data.forEach((record) => {
            const key = `${record.employeeId}_${record.date}`;
            loadedData[key] = {
              checkIn: record.checkIn || '',
              checkOut: record.checkOut || '',
              shiftType: record.shiftType || null,
              leaveType: record.leaveType || null,
            };
          });

          // DB 데이터만 사용 (localStorage 불필요)
          setAttendanceSheetData(loadedData);
        } else {
          setAttendanceSheetData({});
        }
      } catch (error) {
        console.error('[loadAttendanceFromDb] 에러:', error);
        setAttendanceSheetData({});
      }
    };

    loadAttendanceFromDb();
  }, [attendanceSheetYear, attendanceSheetMonth]);

  // *[2_관리자 모드] 2.8_근태 관리 - 클립보드 관리 훅*
  const { handleAttendanceCopy, handleAttendancePaste } =
    useAttendanceClipboard({
      selectedCells,
      setSelectedCells,
      employees,
      attendanceSheetYear,
      attendanceSheetMonth,
      getFilteredAttendanceEmployees,
      getAttendanceForEmployee,
      setCheckInTime,
      setCheckOutTime,
      setAttendanceForEmployee,
      getDaysInMonth,
      getDayOfWeek,
      isHolidayDate,
      preCalculatedStats: attendanceStatsCache.current,
      calculateMonthlyStats,
      devLog,
    });

  // *[1_공통] 월 네비게이션 훅*
  const { goToPrevMonth, goToNextMonth } = useMonthNavigation({
    currentMonth,
    setCurrentMonth,
    currentYear,
    setCurrentYear,
    loadHolidayData,
  });

  // *[3_일반직원 모드] 3.5_연차 신청/내역 - 연차 폼 미리보기 useEffect*
  React.useEffect(() => {
    if (
      currentUser &&
      currentUser.id &&
      leaveForm.startDate &&
      leaveForm.endDate &&
      leaveForm.type &&
      leaveForm.reason &&
      leaveForm.contact
    ) {
      const now = new Date();
      setLeaveFormPreview({
        ...leaveForm,
        status: '작성중',
        employeeId: currentUser.id,
        requestDate: now.toISOString().slice(0, 10),
        requestDateTime: now.toISOString(),
      });
    } else {
      setLeaveFormPreview(null);
    }
  }, [leaveForm, currentUser]);

  // *[1_공통] 팝업 상태 초기화*
  const clearPopupState = () => {
    // 팝업 상태는 React state로만 관리 (localStorage 불필요)
  };

  // *[1_공통] 로그아웃 처리*
  const handleLogout = () => {
    setCurrentUser(null);

    sessionStorage.removeItem('currentUser');

    localStorage.removeItem('activeTab');

    clearPopupState();
    setLoginForm({ id: '', password: '' });
    setShowPassword(false); // 비밀번호 표시 상태 초기화
    setActiveTab('dashboard');

    setShowNoticePopup(false);
  };

  // *[1_공통] 새로고침 처리 (직원 모드용)*
  const handleRefresh = () => {
    window.location.reload();
  };

  // *[1_공통] 일반직원 모드 자동 새로고침 (5분마다)*
  React.useEffect(() => {
    // 일반직원 모드일 때만 작동
    if (currentUser && !currentUser.isAdmin) {
      const autoRefreshInterval = setInterval(() => {
        console.log('🔄 [자동 새로고침] 5분 경과 - 페이지를 새로고침합니다.');
        window.location.reload();
      }, 12 * 60 * 1000); // 12분 = 720,000ms

      // cleanup: 컴포넌트 언마운트 또는 로그아웃 시 interval 정리
      return () => {
        clearInterval(autoRefreshInterval);
      };
    }
  }, [currentUser]);

  // *[1_공통] 폰트 크기 변경*
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('userFontSize', size);
  };

  // *[1_공통] 근태 데이터 초기 로딩* - 제거됨 (필요시 월별 조회 사용)

  // *[1_공통] 월별 근태 데이터 조회 (유틸 함수 래퍼)*
  const getMonthlyAttendanceData = (dataObj, m) => {
    return getMonthlyAttendanceDataUtil(dataObj, m, employees);
  };

  /* ================================
   [1_공통] 공통 - 로그인 및 언어선택
================================ */
  /* 인증 흐름: 로그인 화면 → 언어 선택 화면 (직원만) */
  /* 코드 위치: components/common/CommonLogin.js */
  const loginLanguageComponent = (
    <CommonLogin
      currentUser={currentUser}
      showLanguageSelection={showLanguageSelection}
      loginForm={loginForm}
      setLoginForm={setLoginForm}
      loginError={loginError}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      handleLogin={handleLogin}
      handleLanguageSelect={handleLanguageSelect}
    />
  );

  if (!currentUser || showLanguageSelection) {
    return loginLanguageComponent;
  }

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3 },
    { id: 'employee-management', label: '직원 관리', icon: Users },
    { id: 'notice-management', label: '공지 관리', icon: FileText },
    { id: 'notification-management', label: '알림 관리', icon: Bell },
    { id: 'schedule-management', label: '일정 관리', icon: Calendar },
    { id: 'leave-management', label: '연차 관리', icon: Calendar },
    { id: 'suggestion-management', label: '건의 관리', icon: MessageSquare },
    { id: 'attendance-management', label: '근태 관리', icon: Clock },
    { id: 'payroll-management', label: '급여 관리', icon: DollarSign },
    { id: 'evaluation-management', label: '평가 관리', icon: TrendingUp },
    { id: 'ai-chat', label: 'AI 챗봇', icon: MessageSquare },
    { id: 'system', label: '시스템 관리', icon: Settings },
  ];

  /* ========== RENDER CONTENT - 메뉴별 화면 렌더링 ========== */
  const renderContent = () => {
    switch (activeTab) {
      //---2.1_관리자 모드_대시보드---//
      case 'dashboard':
        return (
          <AdminDashboard
            dashboardDateFilter={dashboardDateFilter}
            setDashboardDateFilter={setDashboardDateFilter}
            dashboardSelectedDate={dashboardSelectedDate}
            setDashboardSelectedDate={setDashboardSelectedDate}
            getTodayDateWithDay={getTodayDateWithDay}
            getYesterdayDateWithDay={getYesterdayDateWithDay}
            dashboardStats={dashboardStatsReal}
            handleStatusClick={handleStatusClick}
            handleNightStatusClick={handleNightStatusClick}
            getStatusTextColor={getStatusTextColor}
            leaveRequests={leaveRequests}
            suggestions={suggestions}
            setActiveTab={setActiveTab}
            setLeaveManagementTab={setLeaveManagementTab}
            goalStats={goalStats}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showGoalDetailsPopup={showGoalDetailsPopup}
            setShowGoalDetailsPopup={setShowGoalDetailsPopup}
            workLifeBalanceStats={workLifeBalanceStats}
            showWorkLifeBalancePopup={showWorkLifeBalancePopup}
            setShowWorkLifeBalancePopup={setShowWorkLifeBalancePopup}
            getTodaySafetyAccidents={getTodaySafetyAccidents}
            getThisMonthSafetyAccidents={getThisMonthSafetyAccidents}
            getThisYearSafetyAccidents={getThisYearSafetyAccidents}
            getAccidentFreeDays={getAccidentFreeDays}
            showSafetyAccidentInput={showSafetyAccidentInput}
            setShowSafetyAccidentInput={setShowSafetyAccidentInput}
            aiRecommendations={aiRecommendations}
            isAnalyzing={isAnalyzing}
            generateAiRecommendations={generateAiRecommendations}
            refreshDashboardData={refreshDashboardData}
            showAiHistoryPopup={showAiHistoryPopup}
            setShowAiHistoryPopup={setShowAiHistoryPopup}
            showPromptSettings={showPromptSettings}
            setShowPromptSettings={setShowPromptSettings}
            activeTab={activeTab}
            availableYears={availableYears}
            attendanceSheetData={attendanceSheetData}
            showWorkLifeDetailPopup={showWorkLifeDetailPopup}
            setShowWorkLifeDetailPopup={setShowWorkLifeDetailPopup}
            workLifeDetailMetric={workLifeDetailMetric}
            setWorkLifeDetailMetric={setWorkLifeDetailMetric}
            workLifeDetailMonth={workLifeDetailMonth}
            setWorkLifeDetailMonth={setWorkLifeDetailMonth}
            selectedViolationMonth={selectedViolationMonth}
            setSelectedViolationMonth={setSelectedViolationMonth}
            stressSortColumn={stressSortColumn}
            setStressSortColumn={setStressSortColumn}
            stressSortDirection={stressSortDirection}
            setStressSortDirection={setStressSortDirection}
            isStressCalculationExpanded={isStressCalculationExpanded}
            setIsStressCalculationExpanded={setIsStressCalculationExpanded}
            overtimeSortConfig={overtimeSortConfig}
            setOvertimeSortConfig={setOvertimeSortConfig}
            leaveSortConfig={leaveSortConfig}
            setLeaveSortConfig={setLeaveSortConfig}
            violationSortConfig={violationSortConfig}
            setViolationSortConfig={setViolationSortConfig}
            getWorkLifeBalanceDataByYear={getWorkLifeBalanceDataByYear}
            getViolationDetails={getViolationDetails}
            send52HourViolationAlert={send52HourViolationAlert}
            getWorkLifeDetailData={getWorkLifeDetailData}
            showGoalDetailDataPopup={showGoalDetailDataPopup}
            setShowGoalDetailDataPopup={setShowGoalDetailDataPopup}
            goalDetailMetric={goalDetailMetric}
            setGoalDetailMetric={setGoalDetailMetric}
            goalDetailMonth={goalDetailMonth}
            setGoalDetailMonth={setGoalDetailMonth}
            employees={employees}
            getGoalDataByYear={getGoalDataByYear}
            getGoalDetailData={getGoalDetailData}
            getFilteredEmployees={getFilteredEmployees}
            analyzeAttendanceStatusForDashboard={
              analyzeAttendanceStatusForDashboard
            }
            isHolidayDate={isHolidayDateWithData}
            getWorkTypeForDate={getWorkTypeForDate}
            calcDailyWage={calcDailyWage}
            calculateMonthlyLeaveUsageRate={calculateMonthlyLeaveUsageRate}
            getUsedAnnualLeave={getUsedAnnualLeave}
            calculateAnnualLeave={calculateAnnualLeave}
            getDaysInMonth={getDaysInMonth}
            evaluations={evaluations}
            notices={notices}
            safetyAccidents={safetyAccidents}
            setSafetyAccidents={setSafetyAccidents}
            safetyAccidentPage={safetyAccidentPage}
            setSafetyAccidentPage={setSafetyAccidentPage}
            safetyAccidentSearch={safetyAccidentSearch}
            setSafetyAccidentSearch={setSafetyAccidentSearch}
            editDate={editDate}
            setEditDate={setEditDate}
            editCreatedAt={editCreatedAt}
            setEditCreatedAt={setEditCreatedAt}
            editContent={editContent}
            setEditContent={setEditContent}
            editSeverity={editSeverity}
            setEditSeverity={setEditSeverity}
            aiPromptSettings={aiPromptSettings}
            setAiPromptSettings={setAiPromptSettings}
            handleSafetyAccidentInput={handleSafetyAccidentInput}
            handleEditSafety={handleEditSafety}
            handleDeleteSafety={handleDeleteSafety}
            handleSaveAccidentEdit={handleSaveAccidentEdit}
            handleCancelAccidentEdit={handleCancelAccidentEdit}
            downloadAiHistory={downloadAiHistory}
            handleAiPromptSave={handleAiPromptSave}
            editingAccidentId={editingAccidentId}
            setEditingAccidentId={setEditingAccidentId}
            aiRecommendationHistory={aiRecommendationHistory}
            showEmployeeListPopup={showEmployeeListPopup}
            setShowEmployeeListPopup={setShowEmployeeListPopup}
            selectedStatusDate={selectedStatusDate}
            selectedStatus={selectedStatus}
            selectedStatusEmployees={selectedStatusEmployees}
            attendanceListSortField={attendanceListSortField}
            attendanceListSortOrder={attendanceListSortOrder}
            formatDateWithDay={formatDateWithDay}
            handleDownloadAttendanceList={handleDownloadAttendanceList}
            handleAttendanceListSort={handleAttendanceListSort}
            getSortedAttendanceEmployees={getSortedAttendanceEmployees}
          />
        );

      //---2.2_관리자 모드_직원 관리---//
      case 'employee-management':
        return (
          <AdminEmployeeManagement
            employees={employees}
            setEmployees={setEmployees}
            employeeSearchFilter={employeeSearchFilter}
            setEmployeeSearchFilter={setEmployeeSearchFilter}
            employeeSortField={employeeSortField}
            employeeSortOrder={employeeSortOrder}
            handleSort={handleSort}
            editingEmpId={editingEmpId}
            setEditingEmpId={setEditingEmpId}
            editForm={editForm}
            setEditForm={setEditForm}
            handleUpdateEmployee={handleUpdateEmployee}
            handleDeleteEmployee={handleDeleteEmployee}
            showNewEmployeeModal={showNewEmployeeModal}
            setShowNewEmployeeModal={setShowNewEmployeeModal}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            getSortedEmployees={getSortedEmployees}
            attendanceSheetData={attendanceSheetData}
            attendanceSheetYear={attendanceSheetYear}
            attendanceSheetMonth={attendanceSheetMonth}
          />
        );

      //---2.3_관리자 모드_공지 관리---//
      case 'notice-management':
        return (
          <AdminNoticeManagement
            notices={notices}
            setNotices={setNotices}
            noticeForm={noticeForm}
            setNoticeForm={setNoticeForm}
            noticeSearch={noticeSearch}
            setNoticeSearch={setNoticeSearch}
            adminNoticePage={adminNoticePage}
            setAdminNoticePage={setAdminNoticePage}
            editingNoticeId={editingNoticeId}
            setEditingNoticeId={setEditingNoticeId}
            noticeFiles={noticeFiles}
            setNoticeFiles={setNoticeFiles}
            noticeFilesRef={noticeFilesRef}
            handleNoticeFileUpload={handleNoticeFileUpload}
            handleRemoveNoticeFile={handleRemoveNoticeFile}
            handleNoticePasteImage={handleNoticePasteImage}
            getFilteredNotices={getFilteredNotices}
            currentUser={currentUser}
          />
        );
        break;
      //---2.4_관리자 모드_알림 관리---//
      case 'notification-management':
        return (
          <AdminNotificationManagement
            regularNotificationForm={regularNotificationForm}
            setRegularNotificationForm={setRegularNotificationForm}
            realtimeNotificationForm={realtimeNotificationForm}
            setRealtimeNotificationForm={setRealtimeNotificationForm}
            알림유형={알림유형}
            set알림유형={set알림유형}
            setShowAddNotificationPopup={setShowAddNotificationPopup}
            get관리자알림목록={get관리자알림목록Wrapper}
            getRecipientText={getRecipientText}
            handleEditRegularNotification={handleEditRegularNotification}
            handleDeleteRegularNotification={handleDeleteRegularNotification}
            activeTab={activeTab}
            notificationLogSearch={notificationLogSearch}
            setNotificationLogSearch={setNotificationLogSearch}
            visibleLogCount={visibleLogCount}
            handleLoadMoreLogs={handleLoadMoreLogs}
            handleCollapseLogs={handleCollapseLogs}
            getFilteredNotificationLogs={getFilteredNotificationLogsWrapper}
            calculateRecipientCount={calculateRecipientCountWrapper}
            showAddRegularNotificationPopup={showAddRegularNotificationPopup}
            setShowAddRegularNotificationPopup={
              setShowAddRegularNotificationPopup
            }
            showAddRealtimeNotificationPopup={showAddRealtimeNotificationPopup}
            setShowAddRealtimeNotificationPopup={
              setShowAddRealtimeNotificationPopup
            }
            showAddNotificationPopup={showAddNotificationPopup}
            showEditRegularNotificationPopup={showEditRegularNotificationPopup}
            setShowEditRegularNotificationPopup={
              setShowEditRegularNotificationPopup
            }
            showEditRealtimeNotificationPopup={
              showEditRealtimeNotificationPopup
            }
            setShowEditRealtimeNotificationPopup={
              setShowEditRealtimeNotificationPopup
            }
            showRecurringSettingsModal={showRecurringSettingsModal}
            setShowRecurringSettingsModal={setShowRecurringSettingsModal}
            handleAddRegularNotification={handleAddRegularNotification}
            handleAddRealtimeNotification={handleAddRealtimeNotification}
            openRecurringSettingsModal={openRecurringSettingsModal}
            closeRecurringSettingsModal={closeRecurringSettingsModal}
            handleRecurringSettingsComplete={handleRecurringSettingsComplete}
            handleEmployeeSearch={handleEmployeeSearch}
            addEmployeeToRecipients={addEmployeeToRecipients}
            removeEmployeeFromRecipients={removeEmployeeFromRecipients}
            handleEmployeeToggle={handleEmployeeToggle}
            handleSaveRegularNotificationEdit={
              handleSaveRegularNotificationEdit
            }
            handleSaveRealtimeNotificationEdit={
              handleSaveRealtimeNotificationEdit
            }
            handleWeekdayToggle={handleWeekdayToggle}
            recurringSettings={recurringSettings}
            setRecurringSettings={setRecurringSettings}
            employeeSearchTerm={employeeSearchTerm}
            setEmployeeSearchTerm={setEmployeeSearchTerm}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            editingRegularNotification={editingRegularNotification}
            setEditingRegularNotification={setEditingRegularNotification}
            editingRealtimeNotification={editingRealtimeNotification}
            setEditingRealtimeNotification={setEditingRealtimeNotification}
            currentFormType={currentFormType}
            setCurrentFormType={setCurrentFormType}
            repeatCycleOptions={repeatCycleOptions}
            recipientOptions={recipientOptions}
            요일목록={요일목록}
            employees={employees}
          />
        );
      //---2.5_관리자 모드_일정 관리---//
      case 'schedule-management':
        return (
          <AdminScheduleManagement
            currentYear={currentYear}
            setCurrentYear={setCurrentYear}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            scheduleEvents={scheduleEvents}
            selectedEventDate={selectedEventDate}
            setSelectedEventDate={setSelectedEventDate}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            showEventDetail={showEventDetail}
            setShowEventDetail={setShowEventDetail}
            scheduleSearch={scheduleSearch}
            setScheduleSearch={setScheduleSearch}
            scheduleSearchTerm={scheduleSearchTerm}
            scheduleCurrentPage={scheduleCurrentPage}
            setScheduleCurrentPage={setScheduleCurrentPage}
            SCHEDULE_PAGE_SIZE={SCHEDULE_PAGE_SIZE}
            EVENT_TYPE_COLORS={EVENT_TYPE_COLORS}
            holidayData={holidayData}
            customHolidays={customHolidays}
            selectedLanguage={selectedLanguage}
            handleUnifiedAdd={handleUnifiedAdd}
            handleAddEvent={handleAddEvent}
            handleEditEvent={handleEditEvent}
            handleDeleteEvent={handleDeleteEvent}
            handleEditHoliday={handleEditHoliday}
            handleDeleteHoliday={handleDeleteHoliday}
            getFilteredScheduleEvents={getFilteredScheduleEventsWrapper}
            loadHolidayData={loadHolidayData}
            forceRefreshHolidays={forceRefreshHolidays}
            getKoreanHolidays={getKoreanHolidays}
            showAddEventPopup={showAddEventPopup}
            setShowAddEventPopup={setShowAddEventPopup}
            showEditEventPopup={showEditEventPopup}
            setShowEditEventPopup={setShowEditEventPopup}
            showHolidayPopup={showHolidayPopup}
            setShowHolidayPopup={setShowHolidayPopup}
            showUnifiedAddPopup={showUnifiedAddPopup}
            setShowUnifiedAddPopup={setShowUnifiedAddPopup}
            eventForm={eventForm}
            setEventForm={setEventForm}
            editingEvent={editingEvent}
            holidayForm={holidayForm}
            setHolidayForm={setHolidayForm}
            unifiedForm={unifiedForm}
            setUnifiedForm={setUnifiedForm}
            unifiedAddType={unifiedAddType}
            setUnifiedAddType={setUnifiedAddType}
            handleSaveEvent={handleSaveEvent}
            handleCancelEvent={handleCancelEvent}
            handleSaveHoliday={handleSaveHoliday}
            handleCancelHoliday={handleCancelHoliday}
            handleSaveUnified={handleSaveUnified}
            EVENT_TYPES={EVENT_TYPES}
            deletedSystemHolidays={deletedSystemHolidays}
            restoreSystemHoliday={restoreSystemHoliday}
            permanentlyDeleteSystemHoliday={permanentlyDeleteSystemHoliday}
            showDeletedHolidaysModal={showDeletedHolidaysModal}
            setShowDeletedHolidaysModal={setShowDeletedHolidaysModal}
          />
        );

      //---2.6_관리자 모드_연차 관리---//
      case 'leave-management':
        return (
          <AdminLeaveManagement
            leaveManagementTab={leaveManagementTab}
            setLeaveManagementTab={setLeaveManagementTab}
            employees={employees}
            setEmployees={setEmployees}
            leaveSearch={leaveSearch}
            setLeaveSearch={setLeaveSearch}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            calculateEmployeeAnnualLeave={calculateEmployeeAnnualLeave}
            editingAnnualLeave={editingAnnualLeave}
            setEditingAnnualLeave={setEditingAnnualLeave}
            editAnnualData={editAnnualData}
            setEditAnnualData={setEditAnnualData}
            annualLeaveSortField={annualLeaveSortField}
            annualLeaveSortOrder={annualLeaveSortOrder}
            handleAnnualLeaveSort={handleAnnualLeaveSort}
            leaveRequests={leaveRequests}
            setLeaveRequests={setLeaveRequests}
            getSortedLeaveRequests={getSortedLeaveRequests}
            getFilteredLeaveRequests={getFilteredLeaveRequests}
            formatDateByLang={formatDateByLang}
            devLog={devLog}
            handleLeaveSort={handleLeaveSort}
            getLeaveDays={getLeaveDays}
            STATUS_COLORS={STATUS_COLORS}
            handleApproveLeave={handleApproveLeave}
            handleRejectLeave={handleRejectLeave}
            leaveHistoryPage={leaveHistoryPage}
            setLeaveHistoryPage={setLeaveHistoryPage}
            editingLeave={editingLeave}
            setEditingLeave={setEditingLeave}
            editingLeaveRemark={editingLeaveRemark}
            setEditingLeaveRemark={setEditingLeaveRemark}
            showLeaveApprovalPopup={showLeaveApprovalPopup}
            setShowLeaveApprovalPopup={setShowLeaveApprovalPopup}
            leaveApprovalData={leaveApprovalData}
            setLeaveApprovalData={setLeaveApprovalData}
            handleLeaveApprovalConfirm={handleLeaveApprovalConfirm}
            editingLeaveHistoryRow={editingLeaveHistoryRow}
            setEditingLeaveHistoryRow={setEditingLeaveHistoryRow}
            editingLeaveHistoryData={editingLeaveHistoryData}
            setEditingLeaveHistoryData={setEditingLeaveHistoryData}
          />
        );

      //---2.7_관리자 모드_건의 관리---//
      case 'suggestion-management':
        return (
          <AdminSuggestionManagement
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            suggestionSearch={suggestionSearch}
            setSuggestionSearch={setSuggestionSearch}
            editingSuggestion={editingSuggestion}
            setEditingSuggestion={setEditingSuggestion}
            editingSuggestionRemark={editingSuggestionRemark}
            setEditingSuggestionRemark={setEditingSuggestionRemark}
            showSuggestionApprovalPopup={showSuggestionApprovalPopup}
            setShowSuggestionApprovalPopup={setShowSuggestionApprovalPopup}
            suggestionApprovalData={suggestionApprovalData}
            setSuggestionApprovalData={setSuggestionApprovalData}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            STATUS_COLORS={STATUS_COLORS}
            formatDateByLang={formatDateByLang}
            getFilteredSuggestions={getFilteredSuggestions}
            getSortedSuggestions={getSortedSuggestions}
            handleSuggestionSort={handleSuggestionSort}
            handleApproveSuggestion={handleApproveSuggestion}
            handleRejectSuggestion={handleRejectSuggestion}
            handleSuggestionApprovalConfirm={handleSuggestionApprovalConfirm}
            suggestionPage={suggestionPage}
            setSuggestionPage={setSuggestionPage}
            editingSuggestionRow={editingSuggestionRow}
            setEditingSuggestionRow={setEditingSuggestionRow}
            editingSuggestionData={editingSuggestionData}
            setEditingSuggestionData={setEditingSuggestionData}
          />
        );

      //---2.8_관리자 모드_근태 관리---//
      case 'attendance-management':
        return (
          <AdminAttendanceManagement
            attendanceSheetYear={attendanceSheetYear}
            setAttendanceSheetYear={setAttendanceSheetYear}
            attendanceSheetMonth={attendanceSheetMonth}
            setAttendanceSheetMonth={setAttendanceSheetMonth}
            attendanceSearchFilter={attendanceSearchFilter}
            setAttendanceSearchFilter={setAttendanceSearchFilter}
            isEditingAttendance={isEditingAttendance}
            attendanceStats={filteredAttendanceStats}
            filteredAttendanceEmployees={filteredAttendanceEmployees}
            selectedCells={selectedCells}
            isDragging={isDragging}
            dayMetadata={dayMetadata}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            toggleEditingMode={toggleEditingMode}
            uploadAttendanceXLSX={uploadAttendanceXLSX}
            exportAttendanceXLSX={exportAttendanceXLSX}
            handleAttendancePaste={handleAttendancePaste}
            handleAttendanceKeyDown={handleAttendanceKeyDown}
            getDaysInMonth={getDaysInMonth}
            attendanceSheetData={attendanceSheetData}
            getDayOfWeek={getDayOfWeek}
            getWorkTypeForDate={getWorkTypeForDate}
            setWorkTypeForDate={setWorkTypeForDate}
            setAttendanceForEmployee={setAttendanceForEmployee}
            handleCellClick={handleCellClick}
            handleCellMouseDown={handleCellMouseDown}
            handleCellMouseEnter={handleCellMouseEnter}
            handleCellMouseUp={handleCellMouseUp}
            getAttendanceForEmployee={getAttendanceForEmployee}
            calculateMonthlyStats={calculateMonthlyStats}
            preCalculatedStats={preCalculatedStats}
            loadHolidayData={loadHolidayData}
            holidayData={holidayData}
            customHolidays={customHolidays}
            getKoreanHolidays={getKoreanHolidays}
            parseAttendanceFromExcel={parseAttendanceFromExcel}
            clearAttendanceData={clearAttendanceData}
          />
        );

      //---2.9_관리자 모드_급여 관리---//
      case 'payroll-management':
        return (
          <AdminPayrollManagement
            payrollTableData={payrollTableData}
            payrollSearchFilter={payrollSearchFilter}
            setPayrollSearchFilter={setPayrollSearchFilter}
            isPayrollEditMode={isPayrollEditMode}
            setIsPayrollEditMode={setIsPayrollEditMode}
            editingPayrollCell={editingPayrollCell}
            setEditingPayrollCell={setEditingPayrollCell}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            initializePayrollTable={initializePayrollTable}
            handlePayrollFileUpload={handlePayrollFileUpload}
            exportPayrollXLSX={() =>
              exportPayrollXLSX(
                payrollTableData,
                payrollSearchFilter,
                safeFormatNumber
              )
            }
            getFilteredPayrollData={() => filteredPayrollData}
            updatePayrollCell={updatePayrollCell}
            safeFormatNumber={safeFormatNumber}
            defaultHours={defaultHours}
            handleEditHours={handleEditHours}
            applyDefaultHoursToTable={applyDefaultHoursToTable}
            setPayrollByMonth={setPayrollByMonth}
            setPayrollHashes={setPayrollHashes}
          />
        );

      //---2.10_관리자 모드_평가 관리---//
      case 'evaluation-management':
        return (
          <AdminEvaluationManagement
            evaluationData={evaluationData}
            evaluationSearch={evaluationSearch}
            setEvaluationSearch={setEvaluationSearch}
            evaluationForm={evaluationForm}
            setEvaluationForm={setEvaluationForm}
            evaluationTab={'employee'} // Removed - unused tab state
            editingEvaluationId={editingEvaluationId}
            editingEvaluationData={editingEvaluationData}
            setEditingEvaluationData={setEditingEvaluationData}
            employees={employees}
            COMPANY_STANDARDS={COMPANY_STANDARDS}
            STATUS_COLORS={STATUS_COLORS}
            getEvaluationWithPosition={getEvaluationWithPosition}
            getFilteredEvaluation={getFilteredEvaluation}
            getSortedEvaluations={getSortedEvaluations}
            handleEvaluationSort={handleEvaluationSort}
            handleEvaluationSubmit={handleEvaluationSubmit}
            handleEvaluationEdit={handleEvaluationEdit}
            handleEvaluationSave={handleEvaluationSave}
            handleEvaluationDelete={handleEvaluationDelete}
            evaluationPage={evaluationPage}
            setEvaluationPage={setEvaluationPage}
          />
        );

      //---2.11_관리자 모드_AI 챗봇---//
      case 'ai-chat':
        return (
          <AdminAIChatbot
            modelUsageStatus={modelUsageStatus}
            chatgptApiKey={chatgptApiKey}
            claudeApiKey={claudeApiKey}
            geminiApiKey={geminiApiKey}
            chatbotPermissions={chatbotPermissions}
            chatMessages={aiMessages}
            chatInput={aiInput}
            setChatInput={setAiInput}
            chatContainerRef={chatContainerRef}
            setActiveTab={setActiveTab}
            handleSendMessage={handleAiQuery}
            generateDownloadFile={generateDownloadFile}
          />
        );

      //---2.12_관리자 모드_시스템 관리---//
      case 'system':
        return (
          <AdminSystemManagement
            unifiedApiKey={unifiedApiKey}
            setUnifiedApiKey={setUnifiedApiKey}
            showUnifiedApiKey={showUnifiedApiKey}
            setShowUnifiedApiKey={setShowUnifiedApiKey}
            detectedProvider={detectedProvider}
            availableModels={availableModels}
            selectedUnifiedModel={selectedUnifiedModel}
            setSelectedUnifiedModel={setSelectedUnifiedModel}
            unifiedSaveMessage={unifiedSaveMessage}
            chatbotPermissions={chatbotPermissions}
            changePasswordForm={changePasswordForm}
            setChangePasswordForm={setChangePasswordForm}
            changePasswordError={changePasswordError}
            changePasswordSuccess={changePasswordSuccess}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            handleUnifiedAiSave={handleUnifiedAiSave}
            handlePermissionChange={handlePermissionChange}
            handleChangePassword={handleChangePassword}
          />
        );

      default:
        return (
          <div className="text-center text-gray-500 mt-8">
            준비중인 기능입니다.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentUser && currentUser?.isAdmin ? (
        /* ================================
   [2_관리자 모드] 관리자 모드 UI 시작
================================ */
        /* 관리자 모드 메인 레이아웃 (사이드바 + 콘텐츠 영역) */
        /* 시스템 상태 표시바, 사용자 알림, 권한 거부 모달 포함 */
        /* 코드 위치: components/admin/AdminMain.
        js */
        <AdminMain
          currentUser={currentUser}
          menuItems={menuItems}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          setCurrentMonth={setCurrentMonth}
          setCurrentYear={setCurrentYear}
          setSelectedDate={() => {}} // Removed - unused state
          setLeaveManagementTab={setLeaveManagementTab}
          handleLogout={handleLogout}
          getText={getText}
          renderContent={renderContent}
          systemStatus={systemStatus}
          adminNotifications={adminNotifications}
          notifications={notifications}
          showPermissionModal={showPermissionModal}
          setShowPermissionModal={setShowPermissionModal}
          permissionModalData={permissionModalData}
        />
      ) : currentUser && !currentUser?.isAdmin ? (
        /* ================================
   [3_일반직원 모드] 직원 모드 UI 시작
================================ */
        <div className="min-h-screen bg-gray-50 employee-mode-content">
          <StaffMain
            currentUser={currentUser}
            fontSize={fontSize}
            handleFontSizeChange={handleFontSizeChange}
            getText={getText}
            setShowLanguageSelection={setShowLanguageSelection}
            setShowChangePasswordPopup={setShowChangePasswordPopup}
            handleLogout={handleLogout}
            handleRefresh={handleRefresh}
          />

          <div className="p-4 space-y-4">
            {/* //---3.1_일반직원 모드_사원정보 (UI)---// */}
            <StaffEmployeeInfo currentUser={currentUser} getText={getText} />
            {/* //---3.2_일반직원 모드_공지사항 (UI)---// */}
            <StaffNotice
              currentUser={currentUser}
              notices={notices}
              setNotices={setNotices}
              getText={getText}
              devLog={devLog}
              readAnnouncements={readAnnouncements}
              markNoticeAsRead={markNoticeAsRead}
              getUnreadNoticeCount={getUnreadNoticeCount}
              selectedLanguage={selectedLanguage}
            />
            {/* //---3.3_일반직원 모드_알림 사항 (UI)---// */}
            <StaffNotification
              currentUser={currentUser}
              getText={getText}
              selectedLanguage={selectedLanguage}
            />
            {/* //---3.4_일반직원 모드_회사 일정 (UI)---// */}
            <StaffScheduleAttendance
              currentYear={currentYear}
              currentMonth={currentMonth}
              goToPrevMonth={goToPrevMonth}
              goToNextMonth={goToNextMonth}
              getDaysInMonth={getDaysInMonth}
              scheduleEvents={scheduleEvents}
              holidayData={holidayData}
              customHolidays={customHolidays}
              getKoreanHolidays={getKoreanHolidays}
              currentUser={currentUser}
              getAttendanceForEmployee={getAttendanceForEmployee}
              analyzeAttendanceStatus={analyzeAttendanceStatus}
              getAttendanceDotColor={getAttendanceDotColor}
              getStatusTextColor={getStatusTextColor}
              getText={getText}
              selectedLanguage={selectedLanguage}
              handleEditEvent={handleEditEvent}
              handleDeleteEvent={handleDeleteEvent}
              leaveRequests={leaveRequests}
              getDateKey={getDateKey}
            />
            {/* //---3.5_일반직원 모드_연차 신청/건의 사항 (UI)---// */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StaffAnnualLeave
                currentUser={currentUser}
                leaveRequests={leaveRequests}
                setLeaveRequests={setLeaveRequests}
                leaveForm={leaveForm}
                setLeaveForm={setLeaveForm}
                leaveFormError={leaveFormError}
                setLeaveFormError={setLeaveFormError}
                leaveFormPreview={leaveFormPreview}
                setLeaveFormPreview={setLeaveFormPreview}
                handleLeaveFormChange={handleLeaveFormChange}
                handleLeaveRequest={handleLeaveRequest}
                handleCancelLeave={handleCancelLeave}
                getUsedAnnualLeave={getUsedAnnualLeave}
                getLeaveDays={getLeaveDays}
                formatDateByLang={formatDateByLang}
                fontSize={fontSize}
                getDatePlaceholder={getDatePlaceholder}
                getLeaveTypeText={getLeaveTypeText}
                getText={getText}
                selectedLanguage={selectedLanguage}
              />

              {/* //---3.7_일반직원 모드_건의 사항 (UI)---// */}
              <StaffSuggestion
                suggestions={suggestions}
                setSuggestions={setSuggestions}
                currentUser={currentUser}
                getText={getText}
                selectedLanguage={selectedLanguage}
                send자동알림={send자동알림}
                handleSuggestionApply={handleSuggestionApply}
                handleSuggestionSubmit={handleSuggestionSubmit}
                suggestionInput={suggestionInput}
                setSuggestionInput={setSuggestionInput}
                showSuggestionApplyPopup={showSuggestionApplyPopup}
                setShowSuggestionApplyPopup={setShowSuggestionApplyPopup}
                applyTitle={applyTitle}
                setApplyTitle={setApplyTitle}
                applyContent={applyContent}
                fontSize={fontSize}
                setApplyContent={setApplyContent}
                suggestionPage={suggestionPage}
                setSuggestionPage={setSuggestionPage}
              />
            </div>
            {/* //---3.6_일반직원 모드_급여 내역/직원 평가 (UI)---// */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StaffSalary
                currentUser={currentUser}
                generateSalaryHistory={generateSalaryHistory}
                getText={getText}
                selectedLanguage={selectedLanguage}
                fontSize={fontSize}
                payrollByMonth={payrollByMonth}
              />

              {/* //---3.8_일반직원 모드_직원 평가 (UI)---// */}
              <StaffEvaluation
                currentUser={currentUser}
                evaluationData={evaluationData}
                getText={getText}
                selectedLanguage={selectedLanguage}
                fontSize={fontSize}
              />

              {/* 비밀번호 변경 팝업 */}
              {showChangePasswordPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-4 flex flex-col">
                    <div className="p-6 pb-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-ㅠㅁㄴㄷ font-semibold text-gray-800">
                          {getText('비밀번호 변경', 'Change Password')}
                        </h3>
                        <button
                          onClick={() => {
                            setShowChangePasswordPopup(false);
                            setChangePasswordForm({
                              current: '',
                              new: '',
                              confirm: '',
                            });
                            setChangePasswordError('');
                            setChangePasswordSuccess('');
                            setShowCurrentPassword(false);
                            setShowNewPassword(false);
                            setShowConfirmPassword(false);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder={getText(
                            '현재 비밀번호',
                            'Current Password'
                          )}
                          value={changePasswordForm.current}
                          onChange={(e) =>
                            setChangePasswordForm((f) => ({
                              ...f,
                              current: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder={getText('새 비밀번호', 'New Password')}
                          value={changePasswordForm.new}
                          onChange={(e) =>
                            setChangePasswordForm((f) => ({
                              ...f,
                              new: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={getText(
                            '새 비밀번호 확인',
                            'Confirm New Password'
                          )}
                          value={changePasswordForm.confirm}
                          onChange={(e) =>
                            setChangePasswordForm((f) => ({
                              ...f,
                              confirm: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {changePasswordError && (
                        <div className="text-red-500 text-xs">
                          {changePasswordError}
                        </div>
                      )}
                      {changePasswordSuccess && (
                        <div className="text-green-600 text-m font-medium">
                          {changePasswordSuccess}
                        </div>
                      )}
                      <button
                        onClick={handleChangePassword}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        {getText('변경하기', 'Change')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HRManagementSystem;
