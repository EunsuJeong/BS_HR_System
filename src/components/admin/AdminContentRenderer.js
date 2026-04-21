import React from 'react';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useAuthContext } from '../../contexts/AuthContext';

// Admin Components
import AdminDashboard from './AdminDashboard';
import AdminEmployeeManagement from './AdminEmployeeManagement';
import AdminNoticeManagement from './AdminNoticeManagement';
import AdminNotificationManagement from './AdminNotificationManagement';
import AdminScheduleManagement from './AdminScheduleManagement';
import AdminLeaveManagement from './AdminLeaveManagement';
import AdminSuggestionManagement from './AdminSuggestionManagement';
import AdminAttendanceManagement from './AdminAttendanceManagement';
import AdminPayrollManagement from './AdminPayrollManagement';
import AdminEvaluationManagement from './AdminEvaluationManagement';
import AdminAIChatbot from './AdminAIChatbot';
import AdminSystemManagement from './AdminSystemManagement';

// 공통 상수/유틸 (App.js import와 동일한 출처)
import { STATUS_COLORS } from '../common/common_admin_suggestion';
import {
  COMPANY_STANDARDS,
  getLeaveDays,
  formatDateByLang,
  getDaysInMonth,
  formatDateWithDay,
  getStatusTextColor,
  calculateAnnualLeave,
  getUsedAnnualLeave,
  getTodayDateWithDay,
  getYesterdayDateWithDay,
} from '../common/common_common';
import {
  repeatCycleOptions,
  recipientOptions,
  요일목록,
  getRecipientText,
} from '../common/common_admin_notification';
import { exportPayrollXLSX } from '../common/common_admin_payroll';

// App.js와 동일한 로컬 상수
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

// App.js 모듈 레벨과 동일한 no-op
const devLog = (..._args) => {};

/**
 * AdminContentRenderer
 * App.js의 renderContent switch/case를 분리한 렌더러 컴포넌트.
 * activeTab → useNavigationContext, deptFilter용 currentUser → useAuthContext로 직접 소비.
 * 나머지 모든 상태/핸들러는 App.js에서 props로 전달받는다.
 */
const AdminContentRenderer = ({
  // ─── Dashboard ───
  dashboardDateFilter, setDashboardDateFilter,
  dashboardSelectedDate, setDashboardSelectedDate,
  dashboardStats,
  handleStatusClick, handleNightStatusClick,
  leaveRequests, suggestions, setLeaveManagementTab,
  goalStats, selectedYear, setSelectedYear,
  showGoalDetailsPopup, setShowGoalDetailsPopup,
  workLifeBalanceStats, showWorkLifeBalancePopup, setShowWorkLifeBalancePopup,
  getTodaySafetyAccidents, getThisMonthSafetyAccidents,
  getThisYearSafetyAccidents, getAccidentFreeDays,
  showSafetyAccidentInput, setShowSafetyAccidentInput,
  aiRecommendations, isAnalyzing, generateAiRecommendations,
  refreshDashboardData,
  showAiHistoryPopup, setShowAiHistoryPopup,
  showPromptSettings, setShowPromptSettings,
  availableYears, attendanceSheetData,
  showWorkLifeDetailPopup, setShowWorkLifeDetailPopup,
  workLifeDetailMetric, setWorkLifeDetailMetric,
  workLifeDetailMonth, setWorkLifeDetailMonth,
  selectedViolationMonth, setSelectedViolationMonth,
  stressSortColumn, setStressSortColumn,
  stressSortDirection, setStressSortDirection,
  isStressCalculationExpanded, setIsStressCalculationExpanded,
  overtimeSortConfig, setOvertimeSortConfig,
  leaveSortConfig, setLeaveSortConfig,
  violationSortConfig, setViolationSortConfig,
  getWorkLifeBalanceDataByYear, getViolationDetails,
  send52HourViolationAlert, getWorkLifeDetailData,
  showGoalDetailDataPopup, setShowGoalDetailDataPopup,
  goalDetailMetric, setGoalDetailMetric,
  goalDetailMonth, setGoalDetailMonth,
  getGoalDataByYear, getGoalDetailData,
  getFilteredEmployees, analyzeAttendanceStatusForDashboard,
  isHolidayDate,
  getWorkTypeForDate, calcDailyWage, calculateMonthlyLeaveUsageRate,
  evaluations, notices,
  safetyAccidents, setSafetyAccidents,
  safetyAccidentPage, setSafetyAccidentPage,
  safetyAccidentSearch, setSafetyAccidentSearch,
  aiPromptSettings, setAiPromptSettings,
  handleSafetyAccidentInput, handleEditSafety, handleDeleteSafety,
  handleSaveAccidentEdit, handleCancelAccidentEdit,
  downloadAiHistory, handleAiPromptSave, aiRecommendationHistory,
  showEmployeeListPopup, setShowEmployeeListPopup,
  selectedStatusDate, selectedStatus, selectedStatusEmployees,
  attendanceListSortField, attendanceListSortOrder,
  handleDownloadAttendanceList, handleAttendanceListSort, getSortedAttendanceEmployees,
  // ─── Employee Management ───
  setEmployees,
  employeeSearchFilter, setEmployeeSearchFilter,
  employeeSortField, employeeSortOrder, handleSort,
  handleUpdateEmployee, handleDeleteEmployee,
  showNewEmployeeModal, setShowNewEmployeeModal,
  getSortedEmployees,
  attendanceSheetYear, attendanceSheetMonth,
  // ─── Notice Management ───
  setNotices, noticeSearch, setNoticeSearch,
  adminNoticePage, setAdminNoticePage,
  noticeFiles, setNoticeFiles, noticeFilesRef,
  getFilteredNotices,
  // ─── Notification Management ───
  regularNotificationForm, setRegularNotificationForm,
  realtimeNotificationForm, setRealtimeNotificationForm,
  알림유형, set알림유형, setShowAddNotificationPopup,
  get관리자알림목록, handleEditRegularNotification, handleDeleteRegularNotification,
  notificationLogSearch, setNotificationLogSearch,
  visibleLogCount, handleLoadMoreLogs, handleCollapseLogs,
  getFilteredNotificationLogs, calculateRecipientCount,
  showAddRegularNotificationPopup, setShowAddRegularNotificationPopup,
  showAddRealtimeNotificationPopup, setShowAddRealtimeNotificationPopup,
  showAddNotificationPopup,
  showEditRegularNotificationPopup, setShowEditRegularNotificationPopup,
  showEditRealtimeNotificationPopup, setShowEditRealtimeNotificationPopup,
  showRecurringSettingsModal, setShowRecurringSettingsModal,
  handleAddRegularNotification, handleAddRealtimeNotification,
  openRecurringSettingsModal, closeRecurringSettingsModal, handleRecurringSettingsComplete,
  handleEmployeeSearch, addEmployeeToRecipients,
  removeEmployeeFromRecipients, handleEmployeeToggle,
  handleSaveRegularNotificationEdit, handleSaveRealtimeNotificationEdit,
  handleWeekdayToggle,
  recurringSettings, setRecurringSettings,
  employeeSearchTerm, setEmployeeSearchTerm,
  searchResults, setSearchResults,
  editingRegularNotification, setEditingRegularNotification,
  editingRealtimeNotification, setEditingRealtimeNotification,
  currentFormType, setCurrentFormType,
  // ─── Schedule Management ───
  currentYear, setCurrentYear, currentMonth, setCurrentMonth,
  scheduleEvents, selectedEventDate, setSelectedEventDate,
  selectedEvent, setSelectedEvent, showEventDetail, setShowEventDetail,
  scheduleSearch, setScheduleSearch, scheduleSearchTerm,
  scheduleCurrentPage, setScheduleCurrentPage,
  holidayData, customHolidays, selectedLanguage,
  handleUnifiedAdd, handleAddEvent, handleEditEvent, handleDeleteEvent,
  handleEditHoliday, handleDeleteHoliday,
  getFilteredScheduleEvents,
  loadHolidayData, forceRefreshHolidays, getKoreanHolidays,
  showAddEventPopup, setShowAddEventPopup,
  showEditEventPopup, setShowEditEventPopup,
  showHolidayPopup, setShowHolidayPopup,
  showUnifiedAddPopup, setShowUnifiedAddPopup,
  eventForm, setEventForm, editingEvent,
  holidayForm, setHolidayForm, unifiedForm, setUnifiedForm,
  unifiedAddType, setUnifiedAddType,
  handleSaveEvent, handleCancelEvent,
  handleSaveHoliday, handleCancelHoliday, handleSaveUnified,
  deletedSystemHolidays, restoreSystemHoliday, permanentlyDeleteSystemHoliday,
  showDeletedHolidaysModal, setShowDeletedHolidaysModal,
  // ─── Leave Management ───
  leaveManagementTab,
  leaveSearch, setLeaveSearch,
  calculateEmployeeAnnualLeave,
  annualLeaveSortField, annualLeaveSortOrder, handleAnnualLeaveSort,
  setLeaveRequests, getSortedLeaveRequests, getFilteredLeaveRequests,
  handleLeaveSort, handleApproveLeave, handleRejectLeave,
  showLeaveApprovalPopup, setShowLeaveApprovalPopup,
  leaveApprovalData, setLeaveApprovalData,
  handleLeaveApprovalConfirm, handleConfirmLeave,
  // ─── Suggestion Management ───
  setSuggestions, suggestionSearch, setSuggestionSearch,
  showSuggestionApprovalPopup, setShowSuggestionApprovalPopup,
  suggestionApprovalData, setSuggestionApprovalData,
  getFilteredSuggestions, getSortedSuggestions, handleSuggestionSort,
  handleApproveSuggestion, handleRejectSuggestion,
  handleSuggestionApprovalConfirm,
  suggestionPage, setSuggestionPage, handleConfirmSuggestion,
  // ─── Attendance Management ───
  setAttendanceSheetYear, setAttendanceSheetMonth,
  attendanceSearchFilter, setAttendanceSearchFilter,
  isEditingAttendance, attendanceStats,
  filteredAttendanceEmployees, selectedCells, isDragging, dayMetadata,
  toggleEditingMode, uploadAttendanceXLSX, exportAttendanceXLSX,
  handleAttendancePaste, handleAttendanceKeyDown,
  getDayOfWeek, setWorkTypeForDate, setAttendanceForEmployee,
  handleCellClick, handleCellMouseDown, handleCellMouseEnter, handleCellMouseUp,
  getAttendanceForEmployee, calculateMonthlyStats, preCalculatedStats,
  parseAttendanceFromExcel, clearAttendanceData,
  // ─── Payroll Management ───
  payrollTableData, payrollSearchFilter, setPayrollSearchFilter,
  isPayrollEditMode, setIsPayrollEditMode,
  editingPayrollCell, setEditingPayrollCell,
  initializePayrollTable, handlePayrollFileUpload,
  filteredPayrollData,
  updatePayrollCell, safeFormatNumber, defaultHours, handleEditHours,
  applyDefaultHoursToTable, setPayrollByMonth, setPayrollHashes,
  // ─── Evaluation Management ───
  evaluationData, setEvaluationData,
  evaluationSearch, setEvaluationSearch,
  getEvaluationWithPosition, getFilteredEvaluation,
  getSortedEvaluations, handleEvaluationSort,
  send자동알림,
  // ─── AI Chatbot ───
  modelUsageStatus, chatgptApiKey, claudeApiKey, geminiApiKey,
  chatbotPermissions, chatMessages, chatContainerRef,
  handleSendMessage, generateDownloadFile,
  // ─── System Management ───
  unifiedApiKey, setUnifiedApiKey, showUnifiedApiKey, setShowUnifiedApiKey,
  detectedProvider, availableModels,
  selectedUnifiedModel, setSelectedUnifiedModel, unifiedSaveMessage,
  changePasswordForm, setChangePasswordForm,
  changePasswordError, changePasswordSuccess,
  handleUnifiedAiSave, handlePermissionChange, handleChangePassword,
}) => {
  const { activeTab } = useNavigationContext();
  const { currentUser } = useAuthContext();

  // 부서 기반 데이터 필터링 (App.js와 동일한 로직)
  const deptFilter = (list) => {
    const allowed = currentUser?.allowedDepartments;
    if (!allowed?.length) return list;
    return list.filter(item => allowed.includes(item.department));
  };

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
          dashboardStats={dashboardStats}
          handleStatusClick={handleStatusClick}
          handleNightStatusClick={handleNightStatusClick}
          getStatusTextColor={getStatusTextColor}
          leaveRequests={leaveRequests}
          suggestions={suggestions}
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
          getGoalDataByYear={getGoalDataByYear}
          getGoalDetailData={getGoalDetailData}
          getFilteredEmployees={getFilteredEmployees}
          analyzeAttendanceStatusForDashboard={analyzeAttendanceStatusForDashboard}
          isHolidayDate={isHolidayDate}
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
          aiPromptSettings={aiPromptSettings}
          setAiPromptSettings={setAiPromptSettings}
          handleSafetyAccidentInput={handleSafetyAccidentInput}
          handleEditSafety={handleEditSafety}
          handleDeleteSafety={handleDeleteSafety}
          handleSaveAccidentEdit={handleSaveAccidentEdit}
          handleCancelAccidentEdit={handleCancelAccidentEdit}
          downloadAiHistory={downloadAiHistory}
          handleAiPromptSave={handleAiPromptSave}
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
          setEmployees={setEmployees}
          employeeSearchFilter={employeeSearchFilter}
          setEmployeeSearchFilter={setEmployeeSearchFilter}
          employeeSortField={employeeSortField}
          employeeSortOrder={employeeSortOrder}
          handleSort={handleSort}
          handleUpdateEmployee={handleUpdateEmployee}
          handleDeleteEmployee={handleDeleteEmployee}
          showNewEmployeeModal={showNewEmployeeModal}
          setShowNewEmployeeModal={setShowNewEmployeeModal}
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
          noticeSearch={noticeSearch}
          setNoticeSearch={setNoticeSearch}
          adminNoticePage={adminNoticePage}
          setAdminNoticePage={setAdminNoticePage}
          noticeFiles={noticeFiles}
          setNoticeFiles={setNoticeFiles}
          noticeFilesRef={noticeFilesRef}
          getFilteredNotices={getFilteredNotices}
        />
      );

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
          get관리자알림목록={get관리자알림목록}
          getRecipientText={getRecipientText}
          handleEditRegularNotification={handleEditRegularNotification}
          handleDeleteRegularNotification={handleDeleteRegularNotification}
          notificationLogSearch={notificationLogSearch}
          setNotificationLogSearch={setNotificationLogSearch}
          visibleLogCount={visibleLogCount}
          handleLoadMoreLogs={handleLoadMoreLogs}
          handleCollapseLogs={handleCollapseLogs}
          getFilteredNotificationLogs={getFilteredNotificationLogs}
          calculateRecipientCount={calculateRecipientCount}
          showAddRegularNotificationPopup={showAddRegularNotificationPopup}
          setShowAddRegularNotificationPopup={setShowAddRegularNotificationPopup}
          showAddRealtimeNotificationPopup={showAddRealtimeNotificationPopup}
          setShowAddRealtimeNotificationPopup={setShowAddRealtimeNotificationPopup}
          showAddNotificationPopup={showAddNotificationPopup}
          showEditRegularNotificationPopup={showEditRegularNotificationPopup}
          setShowEditRegularNotificationPopup={setShowEditRegularNotificationPopup}
          showEditRealtimeNotificationPopup={showEditRealtimeNotificationPopup}
          setShowEditRealtimeNotificationPopup={setShowEditRealtimeNotificationPopup}
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
          handleSaveRegularNotificationEdit={handleSaveRegularNotificationEdit}
          handleSaveRealtimeNotificationEdit={handleSaveRealtimeNotificationEdit}
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
          getFilteredScheduleEvents={getFilteredScheduleEvents}
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
          setEmployees={setEmployees}
          leaveSearch={leaveSearch}
          setLeaveSearch={setLeaveSearch}
          COMPANY_STANDARDS={COMPANY_STANDARDS}
          calculateEmployeeAnnualLeave={calculateEmployeeAnnualLeave}
          annualLeaveSortField={annualLeaveSortField}
          annualLeaveSortOrder={annualLeaveSortOrder}
          handleAnnualLeaveSort={handleAnnualLeaveSort}
          leaveRequests={deptFilter(leaveRequests)}
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
          showLeaveApprovalPopup={showLeaveApprovalPopup}
          setShowLeaveApprovalPopup={setShowLeaveApprovalPopup}
          leaveApprovalData={leaveApprovalData}
          setLeaveApprovalData={setLeaveApprovalData}
          handleLeaveApprovalConfirm={handleLeaveApprovalConfirm}
          handleConfirmLeave={handleConfirmLeave}
        />
      );

    //---2.7_관리자 모드_건의 관리---//
    case 'suggestion-management':
      return (
        <AdminSuggestionManagement
          suggestions={deptFilter(suggestions)}
          setSuggestions={setSuggestions}
          suggestionSearch={suggestionSearch}
          setSuggestionSearch={setSuggestionSearch}
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
          handleConfirmSuggestion={handleConfirmSuggestion}
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
          attendanceStats={attendanceStats}
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
          setEvaluationData={setEvaluationData}
          evaluationSearch={evaluationSearch}
          setEvaluationSearch={setEvaluationSearch}
          COMPANY_STANDARDS={COMPANY_STANDARDS}
          STATUS_COLORS={STATUS_COLORS}
          getEvaluationWithPosition={getEvaluationWithPosition}
          getFilteredEvaluation={getFilteredEvaluation}
          getSortedEvaluations={getSortedEvaluations}
          handleEvaluationSort={handleEvaluationSort}
          send자동알림={send자동알림}
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
          chatMessages={chatMessages}
          chatContainerRef={chatContainerRef}
          handleSendMessage={handleSendMessage}
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

export default AdminContentRenderer;
