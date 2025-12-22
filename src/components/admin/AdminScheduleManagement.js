import React from 'react';
import holidayService from '../common/common_common';
import {
  EVENT_TYPES,
  EVENT_TYPE_COLORS,
  createForceRefreshHolidays,
} from '../common/common_admin_schedule';

const AdminScheduleManagement = ({
  currentYear,
  setCurrentYear,
  currentMonth,
  setCurrentMonth,
  scheduleEvents,
  selectedEventDate,
  setSelectedEventDate,
  selectedEvent,
  setSelectedEvent,
  showEventDetail,
  setShowEventDetail,
  scheduleSearch,
  setScheduleSearch,
  scheduleSearchTerm,
  scheduleCurrentPage,
  setScheduleCurrentPage,
  SCHEDULE_PAGE_SIZE,
  holidayData,
  customHolidays,
  selectedLanguage,
  handleUnifiedAdd,
  handleAddEvent,
  handleEditEvent,
  handleDeleteEvent,
  handleEditHoliday,
  handleDeleteHoliday,
  getFilteredScheduleEvents,
  loadHolidayData,
  getKoreanHolidays,
  // New props for popups
  showAddEventPopup,
  setShowAddEventPopup,
  showEditEventPopup,
  setShowEditEventPopup,
  showHolidayPopup,
  setShowHolidayPopup,
  showUnifiedAddPopup,
  setShowUnifiedAddPopup,
  eventForm,
  setEventForm,
  editingEvent,
  holidayForm,
  setHolidayForm,
  unifiedForm,
  setUnifiedForm,
  unifiedAddType,
  setUnifiedAddType,
  handleSaveEvent,
  handleCancelEvent,
  handleSaveHoliday,
  handleCancelHoliday,
  handleSaveUnified,
  deletedSystemHolidays,
  restoreSystemHoliday,
  permanentlyDeleteSystemHoliday,
  showDeletedHolidaysModal,
  setShowDeletedHolidaysModal,
}) => {
  // 공휴일 데이터 강제 새로고침 함수
  const forceRefreshHolidays = createForceRefreshHolidays({
    holidayService,
    loadHolidayData,
    displayYear: currentYear, // 현재 표시 중인 연도 전달
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* 왼쪽: 일정 달력 */}
      <div className="flex-1 min-w-[350px]">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                일정 달력
              </h3>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => handleUnifiedAdd()}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-xs font-medium"
                title="일정/공휴일 추가"
              >
                + 추가
              </button>
              <button
                onClick={forceRefreshHolidays}
                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-xs font-medium"
                title="공휴일 새로고침"
              >
                🔄 새로고침
              </button>
              {deletedSystemHolidays && deletedSystemHolidays.length > 0 && (
                <button
                  onClick={() => setShowDeletedHolidaysModal(true)}
                  className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md text-xs font-medium"
                  title="삭제된 공휴일 복구"
                >
                  ♻️ 복구 ({deletedSystemHolidays.length})
                </button>
              )}
            </div>
          </div>

          {/* 달력 네비게이션 */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newYear = currentYear - 1;
                  setCurrentYear(newYear);
                  loadHolidayData(newYear);
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
              >
                ‹‹ 이전연도
              </button>
              <button
                onClick={() => {
                  if (currentMonth === 1) {
                    const newYear = currentYear - 1;
                    setCurrentMonth(12);
                    setCurrentYear(newYear);
                    loadHolidayData(newYear);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
              >
                ‹ 이전달
              </button>
              <div className="px-4 py-2 text-lg font-bold text-indigo-800">
                {currentYear}년 {currentMonth}월
              </div>
              <button
                onClick={() => {
                  if (currentMonth === 12) {
                    const newYear = currentYear + 1;
                    setCurrentMonth(1);
                    setCurrentYear(newYear);
                    loadHolidayData(newYear);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
              >
                다음달 ›
              </button>
              <button
                onClick={() => {
                  const newYear = currentYear + 1;
                  setCurrentYear(newYear);
                  loadHolidayData(newYear);
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
              >
                다음연도 ››
              </button>
            </div>
          </div>

          {/* 달력 그리드 */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div
                  key={day}
                  className={`p-2 text-center font-semibold bg-gray-50 ${
                    index === 0
                      ? 'text-red-500' // 일요일
                      : index === 6
                      ? 'text-blue-500' // 토요일
                      : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
              {(() => {
                const firstDay = new Date(
                  currentYear,
                  currentMonth - 1,
                  1
                ).getDay();
                const daysInMonth = new Date(
                  currentYear,
                  currentMonth,
                  0
                ).getDate();
                const calendarCells = [];

                // 빈 셀 추가 (월 시작 전)
                for (let i = 0; i < firstDay; i++) {
                  calendarCells.push(
                    <div key={`empty-start-${i}`} className="p-3"></div>
                  );
                }

                // 날짜 셀 추가
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `${currentYear}-${String(
                    currentMonth
                  ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayEvents = getFilteredScheduleEvents().filter(
                    (event) => event.date === dateStr
                  );
                  const today = new Date();
                  const isToday =
                    today.getFullYear() === currentYear &&
                    today.getMonth() + 1 === currentMonth &&
                    today.getDate() === day;

                  // 해당 연도의 공휴일 데이터 가져오기 (API 로드 실패시 백업 데이터 사용)
                  const yearHolidays =
                    holidayData[currentYear] || getKoreanHolidays(currentYear);
                  const holidayKey = `${String(currentMonth).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;

                  // 시스템 공휴일 또는 커스텀 공휴일 확인
                  const systemHoliday =
                    yearHolidays[dateStr] || yearHolidays[holidayKey];
                  const isCustomHoliday = customHolidays[dateStr];
                  let holidayName = isCustomHoliday || systemHoliday || null;

                  // 중복 문자열 제거 (예: "광복절 광복절" -> "광복절")
                  if (holidayName && typeof holidayName === 'string') {
                    const parts = holidayName.split(/\s+/);
                    const uniqueParts = [...new Set(parts)];
                    holidayName = uniqueParts.join(' ');
                  }

                  const isHoliday = !!holidayName; // 커스텀 공휴일만 true

                  // 요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
                  const dayOfWeek = new Date(
                    currentYear,
                    currentMonth - 1,
                    day
                  ).getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;

                  calendarCells.push(
                    <div
                      key={day}
                      className={`p-2 border border-gray-200 min-h-[80px] cursor-pointer hover:bg-gray-50 ${
                        isToday
                          ? 'bg-blue-200 border-blue-700'
                          : isHoliday
                          ? 'bg-red-50 border-red-200'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedEventDate(dateStr);
                        if (isHoliday) {
                          // 공휴일인 경우 관리 옵션 메뉴 표시
                          const action = prompt(
                            `${holidayName} (${dateStr})\n\n1: 일정 추가\n2: 공휴일 수정\n3: 공휴일 삭제\n\n번호를 입력하세요:`
                          );
                          if (action === '1') {
                            handleAddEvent(dateStr);
                          } else if (action === '2') {
                            handleEditHoliday(dateStr, holidayName);
                          } else if (action === '3') {
                            // 시스템 공휴일도 삭제 가능하도록 변경
                            handleDeleteHoliday(dateStr);
                          }
                        } else {
                          // 일반 날짜인 경우 통합 팝업 열기
                          handleUnifiedAdd(dateStr);
                        }
                      }}
                    >
                      <div
                        className={`text-sm mb-1 ${
                          isToday
                            ? 'font-bold text-blue-600'
                            : isHoliday
                            ? 'font-bold text-red-600'
                            : isSunday
                            ? 'text-red-500'
                            : isSaturday
                            ? 'text-blue-500'
                            : ''
                        }`}
                      >
                        {day}
                      </div>
                      {isHoliday && (
                        <div className="text-xs mb-1 break-words text-red-600 font-semibold">
                          {holidayName}
                        </div>
                      )}
                      {(() => {
                        const nonHolidayEvents = dayEvents.filter(
                          (event) => event.type !== '공휴일'
                        );
                        return (
                          <>
                            {nonHolidayEvents.slice(0, 2).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs px-1 py-0.5 rounded mb-1 cursor-pointer hover:opacity-80 ${
                                  EVENT_TYPE_COLORS[event.type] ||
                                  'bg-gray-100 text-gray-800'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 일정 클릭 시 바로 수정 팝업 열기
                                  handleEditEvent(event, handleEditHoliday);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {nonHolidayEvents.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{nonHolidayEvents.length - 2}개 더
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  );
                }

                // 빈 셀 추가 (월 끝 후)
                const totalCells = calendarCells.length;
                const remain = (7 - (totalCells % 7)) % 7;
                for (let i = 0; i < remain; i++) {
                  calendarCells.push(
                    <div key={`empty-end-${i}`} className="p-3"></div>
                  );
                }

                return calendarCells;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 전체 일정 */}
      <div className="flex-1 min-w-[350px] flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">전체 일정</h4>
            {/* 검색 필터 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scheduleSearch.year}
                onChange={(e) =>
                  setScheduleSearch({
                    ...scheduleSearch,
                    year: e.target.value,
                  })
                }
                className="w-20 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="연도"
              />
              <input
                type="text"
                value={scheduleSearch.month}
                onChange={(e) =>
                  setScheduleSearch({
                    ...scheduleSearch,
                    month: e.target.value,
                  })
                }
                className="w-20 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="월"
              />
              <select
                value={scheduleSearch.type}
                onChange={(e) =>
                  setScheduleSearch({
                    ...scheduleSearch,
                    type: e.target.value,
                  })
                }
                className="w-26 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">전체 유형</option>
                <option value="공휴일">공휴일</option>
                <option value="업무">업무</option>
                <option value="행사">행사</option>
                <option value="교육">교육</option>
                <option value="회의">회의</option>
                <option value="휴무">휴무</option>
                <option value="기타">기타</option>
              </select>
              <input
                type="text"
                value={scheduleSearch.titleOrContent}
                onChange={(e) =>
                  setScheduleSearch({
                    ...scheduleSearch,
                    titleOrContent: e.target.value,
                  })
                }
                className="w-80 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="제목 또는 내용 검색"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="space-y-2">
              {(() => {
                // 검색 필터링
                const filteredEvents = getFilteredScheduleEvents().filter(
                  (event) => {
                    // 공휴일 중 커스텀 공휴일이 아닌 것은 제외 (시스템 공휴일 제외)
                    if (event.type === '공휴일' && event.isCustom !== true) {
                      return false;
                    }

                    // 검색 필터링만 적용
                    if (!scheduleSearchTerm) return true;
                    const searchTerm = scheduleSearchTerm.toLowerCase();
                    return (
                      event.title.toLowerCase().includes(searchTerm) ||
                      event.description.toLowerCase().includes(searchTerm)
                    );
                  }
                );

                const sortedEvents = filteredEvents.sort(
                  (a, b) => new Date(b.date) - new Date(a.date)
                );
                const totalPages = Math.ceil(
                  sortedEvents.length / SCHEDULE_PAGE_SIZE
                );
                const startIndex =
                  (scheduleCurrentPage - 1) * SCHEDULE_PAGE_SIZE;
                const endIndex = startIndex + SCHEDULE_PAGE_SIZE;
                const currentPageEvents = sortedEvents.slice(
                  startIndex,
                  endIndex
                );

                if (sortedEvents.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      등록된 일정이 없습니다.
                    </div>
                  );
                }

                return (
                  <>
                    {currentPageEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg mb-2"
                      >
                        <div className="flex-50">
                          <div className="flex items-center space-x-2 mb-1">
                            <span
                              className={`text-xs font-medium rounded px-2 py-0.5 ${
                                EVENT_TYPE_COLORS[event.type] ||
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {event.type}
                            </span>
                            <span className="font-bold text-indigo-700">
                              {event.title}
                            </span>
                            <span className="text-xs text-gray-500">
                              {event.date}
                            </span>
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-500">
                              {event.description}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 ml-3">
                          <button
                            onClick={() =>
                              handleEditEvent(event, handleEditHoliday)
                            }
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-4 gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            className={`px-3 py-1 rounded ${
                              scheduleCurrentPage === i + 1
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            onClick={() => setScheduleCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* 일정 추가 팝업 */}
      {showAddEventPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">일정 추가</h3>
              <button
                onClick={handleCancelEvent}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="일정 제목"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={eventForm.type}
                onChange={(e) =>
                  setEventForm({ ...eventForm, type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="일정 설명 (선택사항)"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24 resize-none"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEvent}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => handleSaveEvent(eventForm, null)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일정 수정 팝업 */}
      {showEditEventPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">일정 수정</h3>
              <button
                onClick={handleCancelEvent}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="일정 제목"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm({ ...eventForm, title: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={eventForm.type}
                onChange={(e) =>
                  setEventForm({ ...eventForm, type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="일정 설명 (선택사항)"
                value={eventForm.description}
                onChange={(e) =>
                  setEventForm({ ...eventForm, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-24 resize-none"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelEvent}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    if (editingEvent) {
                      handleDeleteEvent(editingEvent);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  삭제
                </button>
                <button
                  onClick={() => handleSaveEvent(eventForm, editingEvent)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 공휴일 추가/수정 팝업 */}
      {showHolidayPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {holidayForm.isEdit ? '공휴일 수정' : '공휴일 추가'}
              </h3>
              <button
                onClick={handleCancelHoliday}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="date"
                value={holidayForm.date}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="공휴일명 (예: 회사창립일, 임시휴무일)"
                value={holidayForm.name}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                <strong>주의:</strong> 커스텀 공휴일은 시스템 공휴일과 구별되어
                표시됩니다. 시스템 공휴일을 수정하려면 기존 날짜에 커스텀
                공휴일을 추가하세요.
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelHoliday}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveHoliday}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  {holidayForm.isEdit ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 통합 추가 팝업 (일정/공휴일) */}
      {showUnifiedAddPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">추가</h3>
              <button
                onClick={() => setShowUnifiedAddPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 타입 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  추가 유형
                </label>
                <select
                  value={unifiedAddType}
                  onChange={(e) => setUnifiedAddType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="일정">일정 추가</option>
                  <option value="공휴일">공휴일 추가</option>
                </select>
              </div>

              {/* 날짜 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜
                </label>
                <input
                  type="date"
                  value={unifiedForm.date}
                  onChange={(e) =>
                    setUnifiedForm({ ...unifiedForm, date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {unifiedAddType === '일정' ? (
                <>
                  {/* 일정 입력 필드들 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목
                    </label>
                    <input
                      type="text"
                      placeholder="일정 제목을 입력하세요"
                      value={unifiedForm.title}
                      onChange={(e) =>
                        setUnifiedForm({
                          ...unifiedForm,
                          title: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      일정 유형
                    </label>
                    <select
                      value={unifiedForm.type}
                      onChange={(e) =>
                        setUnifiedForm({ ...unifiedForm, type: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명 (선택사항)
                    </label>
                    <textarea
                      placeholder="일정에 대한 설명을 입력하세요"
                      value={unifiedForm.description}
                      onChange={(e) =>
                        setUnifiedForm({
                          ...unifiedForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg h-20 resize-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* 공휴일 입력 필드들 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      공휴일 이름
                    </label>
                    <input
                      type="text"
                      placeholder="공휴일 이름을 입력하세요"
                      value={unifiedForm.name}
                      onChange={(e) =>
                        setUnifiedForm({ ...unifiedForm, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleSaveUnified}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  추가
                </button>
                <button
                  onClick={() => setShowUnifiedAddPopup(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 삭제된 공휴일 복구 모달 */}
      {showDeletedHolidaysModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  삭제된 시스템 공휴일 복구
                </h3>
                <button
                  onClick={() => setShowDeletedHolidaysModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 삭제한 시스템 공휴일을 다시 복구할 수 있습니다. 복구 버튼을
                  클릭하면 해당 공휴일이 달력에 다시 표시됩니다.
                </p>
              </div>

              {deletedSystemHolidays && deletedSystemHolidays.length > 0 ? (
                <div className="overflow-y-auto max-h-96 border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          날짜
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          공휴일명
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {deletedSystemHolidays.map((date) => {
                        // 원래 공휴일 이름 가져오기 (holidayService에서)
                        const year = parseInt(date.split('-')[0]);
                        const allHolidays = holidayData[year] || {};

                        // 삭제 전 원래 이름 가져오기 (holidayData에서)
                        const shortDate = date.substring(5); // MM-DD 형식
                        const originalName =
                          allHolidays[date] ||
                          allHolidays[shortDate] ||
                          '(공휴일)';

                        return (
                          <tr key={date} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-800">
                              {date}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {originalName}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={async () => {
                                    const success = await restoreSystemHoliday(
                                      date
                                    );
                                    if (success) {
                                      alert(
                                        `✅ "${date}" 공휴일이 복구되었습니다.`
                                      );
                                      // 모달 자동 닫기 (모든 공휴일 복구 시)
                                      if (deletedSystemHolidays.length === 1) {
                                        setShowDeletedHolidaysModal(false);
                                      }
                                    } else {
                                      alert('❌ 복구 중 오류가 발생했습니다.');
                                    }
                                  }}
                                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md text-xs font-medium"
                                >
                                  복구
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `"${date}" 공휴일을 영구 삭제하시겠습니까?\n\n영구 삭제 시 복구할 수 없습니다.`
                                      )
                                    ) {
                                      const success =
                                        await permanentlyDeleteSystemHoliday(
                                          date
                                        );
                                      if (success) {
                                        alert(
                                          `✅ "${date}" 공휴일이 영구 삭제되었습니다.`
                                        );
                                        // 모달 자동 닫기 (모든 공휴일 삭제 시)
                                        if (
                                          deletedSystemHolidays.length === 1
                                        ) {
                                          setShowDeletedHolidaysModal(false);
                                        }
                                      } else {
                                        alert(
                                          '❌ 영구 삭제 중 오류가 발생했습니다.'
                                        );
                                      }
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-xs font-medium"
                                >
                                  완전삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  삭제된 시스템 공휴일이 없습니다.
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeletedHolidaysModal(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScheduleManagement;
