import React, { useState, useEffect } from 'react';
import { Calendar, X, ChevronUp, ChevronDown } from 'lucide-react';
import {
  EVENT_TYPE_COLORS,
  DAYS_KO,
  DAYS_EN,
  getFirstDayOfWeek,
} from '../common/common_staff_attendance';
import { AttendanceAPI } from '../../api/attendance';

/**
 * STAFF ④ 회사 일정 및 근태 컴포넌트
 * 직원 모드에서 회사 일정 캘린더와 근태 정보를 확인하는 컴포넌트
 */
const StaffScheduleAttendance = ({
  currentYear,
  currentMonth,
  goToPrevMonth,
  goToNextMonth,
  getDaysInMonth,
  scheduleEvents,
  holidayData,
  customHolidays,
  getKoreanHolidays,
  currentUser,
  getAttendanceForEmployee,
  analyzeAttendanceStatus,
  getAttendanceDotColor,
  getStatusTextColor,
  getText,
  selectedLanguage,
  handleEditEvent,
  handleDeleteEvent,
  leaveRequests = [],
  getDateKey, // ✅ 날짜 키 생성 함수
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [selectedDateAttendance, setSelectedDateAttendance] = useState(null);
  const [selectedDateLeave, setSelectedDateLeave] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [monthlyAttendance, setMonthlyAttendance] = useState({}); // ✅ 로컬 근태 데이터

  const today = new Date();

  // ✅ DB에서 직접 현재 월의 근태 데이터 로드
  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!currentUser?.id || !currentYear || !currentMonth) return;

      try {
        const response = await AttendanceAPI.getMonthlyData(
          currentYear,
          currentMonth
        );

        if (response.success && response.data) {
          // 데이터를 key-value 형식으로 변환
          const attendanceMap = {};
          response.data.forEach((record) => {
            const key = `${record.employeeId}_${record.date}`;
            attendanceMap[key] = {
              checkIn: record.checkIn || '',
              checkOut: record.checkOut || '',
              shiftType: record.shiftType || null,
              leaveType: record.note || null,
            };
          });

          setMonthlyAttendance(attendanceMap);
        }
      } catch (error) {
        console.error('근태 데이터 로드 실패:', error);
      }
    };

    loadAttendanceData();
  }, [currentUser?.id, currentYear, currentMonth]);

  // 연차 유형에 따른 색상 결정 함수
  const getLeaveTypeColor = (leaveType) => {
    if (!leaveType) return 'text-gray-600';

    // 외출, 조퇴, 결근: 빨간색
    if (leaveType === '외출' || leaveType === '조퇴' || leaveType === '결근') {
      return 'text-red-600';
    }

    // 연차, 반차(오전), 반차(오후), 경조, 공가, 휴직: 오렌지색
    if (
      leaveType === '연차' ||
      leaveType === '반차(오전)' ||
      leaveType === '반차(오후)' ||
      leaveType === '경조' ||
      leaveType === '공가' ||
      leaveType === '휴직'
    ) {
      return 'text-orange-600';
    }

    // 기타: 초록색 (출근과 동일)
    if (leaveType === '기타') {
      return 'text-green-600';
    }

    return 'text-gray-600';
  };

  const loadAttendanceInfo = (day) => {
    // ✅ monthlyAttendance에서 직접 조회
    const dateKey = getDateKey(currentYear, currentMonth, day);
    const employeeKey = `${currentUser?.id}_${dateKey}`;
    const attendance = monthlyAttendance[employeeKey] || {
      checkIn: '',
      checkOut: '',
    };

    // 공휴일 확인 함수
    const isHolidayDateFn = (year, month, day) => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const yearHolidays = holidayData[year] || getKoreanHolidays(year);
      const holidayKey = `${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const isSystemHoliday = yearHolidays[holidayKey] || yearHolidays[dateStr];
      const isCustomHoliday = customHolidays[dateStr];
      return isSystemHoliday || isCustomHoliday;
    };

    // 출결 상태 계산 - 모든 파라미터 전달
    const attStatus = analyzeAttendanceStatus(
      attendance,
      day,
      currentYear,
      currentMonth,
      leaveRequests,
      currentUser?.id,
      isHolidayDateFn
    );

    if (attendance) {
      setSelectedDateAttendance({
        ...attendance,
        status: attStatus, // 계산된 상태 추가
      });
    } else {
      setSelectedDateAttendance({
        status: attStatus, // 상태만 설정
      });
    }

    // 해당 날짜의 연차 정보 가져오기
    const dateStr = `${currentYear}-${String(currentMonth).padStart(
      2,
      '0'
    )}-${String(day).padStart(2, '0')}`;
    const dayLeave = leaveRequests.find((leave) => {
      if (leave.employeeId !== currentUser?.id) return false;
      if (leave.status !== '승인') return false;

      const leaveStartDate = leave.startDate?.split('T')[0] || leave.startDate;
      const leaveEndDate = leave.endDate?.split('T')[0] || leave.endDate;

      return dateStr >= leaveStartDate && dateStr <= leaveEndDate;
    });

    if (dayLeave) {
      setSelectedDateLeave(dayLeave);
    } else {
      setSelectedDateLeave(null);
    }
  };

  // ✅ 근태 데이터가 로드되면 선택된 날짜 정보 다시 로드
  useEffect(() => {
    if (selectedDate) {
      loadAttendanceInfo(selectedDate);
    }
  }, [monthlyAttendance]);

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-green-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-green-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('회사 일정&근태', 'Schedule & Attendance')} (
              {currentYear}년 {currentMonth}월)
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title={
              isExpanded
                ? getText('접기', 'Collapse')
                : getText('펼치기', 'Expand')
            }
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
        {isExpanded && (
          <>
            <div className="flex items-center justify-end mb-3">
              <div className="flex space-x-4 text-xs">
                <button
                  onClick={goToPrevMonth}
                  className="text-2xs text-gray-500 hover:text-gray-700"
                >
                  {getText('이전달', 'Previous')}
                </button>
                <button
                  onClick={goToNextMonth}
                  className="text-2xs text-gray-500 hover:text-gray-700"
                >
                  {getText('다음달', 'Next')}
                </button>
              </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
              {(selectedLanguage === 'ko' ? DAYS_KO : DAYS_EN).map(
                (day, idx) => (
                  <div
                    key={day}
                    className={`text-xs font-medium p-2 ${
                      idx === 0
                        ? 'text-red-400'
                        : idx === 6
                        ? 'text-blue-400'
                        : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {/* 실제 달력 */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {(() => {
                const daysInMonth = getDaysInMonth(currentYear, currentMonth);
                const firstDayOfWeek = getFirstDayOfWeek(
                  currentYear,
                  currentMonth
                );
                const calendarCells = [];
                // 앞쪽 빈칸
                for (let i = 0; i < firstDayOfWeek; i++) {
                  calendarCells.push(
                    <div key={`empty-start-${i}`} className="p-3"></div>
                  );
                }
                // 날짜 셀
                for (let day = 1; day <= daysInMonth; day++) {
                  const isToday =
                    currentYear === today.getFullYear() &&
                    currentMonth === today.getMonth() + 1 && // currentMonth는 1~12
                    day === today.getDate();
                  // 정확한 요일 계산
                  const dayOfWeek = new Date(
                    currentYear,
                    currentMonth - 1,
                    day
                  ).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isSaturday = dayOfWeek === 6;
                  const dateStr = `${currentYear}-${String(
                    currentMonth
                  ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  // 해당 연도의 공휴일 데이터 가져오기 (API 로드 실패시 백업 데이터 사용)
                  const yearHolidays =
                    holidayData[currentYear] || getKoreanHolidays(currentYear);
                  const holidayKey = `${String(currentMonth).padStart(
                    2,
                    '0'
                  )}-${String(day).padStart(2, '0')}`;
                  const isSystemHoliday =
                    yearHolidays[holidayKey] || yearHolidays[dateStr];
                  const isCustomHoliday = customHolidays[dateStr];
                  const isHoliday = isSystemHoliday || isCustomHoliday;

                  // 우선순위: customHolidays > systemHoliday (중복 방지)
                  let holidayName = isCustomHoliday || isSystemHoliday;

                  // 중복 문자열 제거 (예: "광복절 광복절" -> "광복절")
                  if (holidayName && typeof holidayName === 'string') {
                    const parts = holidayName.split(/\s+/);
                    const uniqueParts = [...new Set(parts)];
                    holidayName = uniqueParts.join(' ');
                  }

                  // ✅ 출근부 상태 가져오기 - monthlyAttendance에서 직접 조회
                  const dateKey = getDateKey(currentYear, currentMonth, day);
                  const employeeKey = `${currentUser?.id}_${dateKey}`;
                  const attendance = monthlyAttendance[employeeKey] || {
                    checkIn: '',
                    checkOut: '',
                  };

                  // 공휴일 확인 함수
                  const isHolidayDateFn = (year, month, day) => {
                    const dateStr = `${year}-${String(month).padStart(
                      2,
                      '0'
                    )}-${String(day).padStart(2, '0')}`;
                    const yearHolidays =
                      holidayData[year] || getKoreanHolidays(year);
                    const holidayKey = `${String(month).padStart(
                      2,
                      '0'
                    )}-${String(day).padStart(2, '0')}`;
                    const isSystemHoliday =
                      yearHolidays[holidayKey] || yearHolidays[dateStr];
                    const isCustomHoliday = customHolidays[dateStr];
                    return isSystemHoliday || isCustomHoliday;
                  };

                  // 출결 상태 계산 - 모든 파라미터 전달
                  const attStatus = analyzeAttendanceStatus(
                    attendance,
                    day,
                    currentYear,
                    currentMonth,
                    leaveRequests,
                    currentUser?.id,
                    isHolidayDateFn
                  );

                  // 공휴일 처리: 출근 시 초록, 미출근 시 회색
                  const holidayAttended = ['출근', '지각', '조퇴', '기타', '근무중'].includes(attStatus);
                  const dotColor = isHoliday
                    ? (holidayAttended ? 'bg-green-400' : 'bg-gray-400')
                    : getAttendanceDotColor(attStatus);

                  // 해당 날짜의 일정 이벤트 가져오기
                  const dayEvents = scheduleEvents.filter(
                    (event) => event.date === dateStr
                  );

                  calendarCells.push(
                    <div key={day} className="relative">
                      <div
                        onClick={() => {
                          setSelectedDate(day);
                          // 출퇴근 정보 로드
                          loadAttendanceInfo(day);
                        }}
                        className={`p-3 cursor-pointer rounded-lg transition-colors relative min-h-[60px] ${
                          isToday
                            ? 'bg-blue-500 text-white'
                            : selectedDate === day
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
                        } ${
                          isHoliday
                            ? 'text-red-500 font-bold'
                            : isSaturday
                            ? 'text-blue-400'
                            : isWeekend
                            ? 'text-red-400'
                            : isCustomHoliday
                            ? 'text-red-400'
                            : ''
                        }`}
                        title={
                          isHoliday
                            ? `${holidayName}${
                                isCustomHoliday
                                  ? ' (커스텀 공휴일)'
                                  : ' (공휴일)'
                              }`
                            : ''
                        }
                      >
                        <div className="font-medium">{day}</div>
                        {/* 출근/지각,외출,조퇴,결근/연차,반차(오전),반차(오후),경조,공가,휴직,기타/null 색점 */}
                        <div
                          className={`absolute right-1 top-1 w-2 h-2 rounded-full ${dotColor}`}
                        ></div>

                        {/* 공휴일명 표시 (해당 부분) */}
                        {/*isHoliday && (
                          <div className="text-2xs text-red-600 font-medium leading-tight">
                            {holidayName}
                            {isCustomHoliday && ''}
                          </div>
                        )*/}

                        {/* 일정 이벤트 표시 (공휴일 제외 - 위에서 이미 표시됨) */}
                        {dayEvents
                          .filter((event) => event.category !== '공휴일')
                          .slice(0, 1)
                          .map((event) => (
                            <div
                              key={event.id}
                              className={`text-2xs px-1 py-0.5 rounded mt-1 cursor-pointer hover:opacity-80 ${
                                isToday
                                  ? 'bg-white bg-opacity-20 text-white'
                                  : EVENT_TYPE_COLORS[event.type] ||
                                    'bg-gray-100 text-gray-800'
                              } truncate`}
                              title={`${event.title} (${event.type})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                                setShowEventDetail(true);
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                        {dayEvents.filter(
                          (event) => event.category !== '공휴일'
                        ).length > 1 && (
                          <div
                            className={`text-xs cursor-pointer hover:opacity-80 ${
                              isToday ? 'text-white' : 'text-gray-500'
                            } truncate`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent({
                                title: `${currentYear}-${String(
                                  currentMonth
                                ).padStart(2, '0')}-${String(day).padStart(
                                  2,
                                  '0'
                                )} 일정 목록`,
                                type: '전체 일정',
                                date: `${currentYear}-${String(
                                  currentMonth
                                ).padStart(2, '0')}-${String(day).padStart(
                                  2,
                                  '0'
                                )}`,
                                description: dayEvents
                                  .map(
                                    (event) =>
                                      `• ${event.title} (${event.type})`
                                  )
                                  .join('\n'),
                                isMultipleEvents: true,
                                events: dayEvents,
                              });
                              setShowEventDetail(true);
                            }}
                          >
                            +{dayEvents.length - 1}개 더
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                // 뒷쪽 빈칸
                const totalCells = firstDayOfWeek + daysInMonth;
                const remain = (7 - (totalCells % 7)) % 7;
                for (let i = 0; i < remain; i++) {
                  calendarCells.push(
                    <div key={`empty-end-${i}`} className="p-3"></div>
                  );
                }
                return calendarCells;
              })()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-4 text-2xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 truncate">
                  {getText('근무중', 'Working')}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 truncate">
                  {getText('출근', 'Check-in')}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 truncate">
                  {getText(
                    '지각,외출,조퇴,결근',
                    'Late,Going out,Leaving early, Absence'
                  )}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 truncate">
                  {getText('주말,공휴일', 'Holiday')}
                </span>
              </div>
              <div className="col-span-2 flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full mr-2 flex-shrink-0"></div>
                <span className="text-gray-600 truncate">
                  {getText(
                    '연차,반차,경조,공가,휴직',
                    'Annual/Half-day leave,Condolences'
                  )}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="text-xs font-semibold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">📅</span>
                {getText(
                  `${currentMonth}월 ${selectedDate}일 출결 정보`,
                  `${currentMonth}/${selectedDate} Attendance Details`
                )}
              </h4>

              {selectedDateAttendance || selectedDateLeave ? (
                <div className="space-y-1.5">
                  {/* 출근시간 */}
                  {(() => {
                    const leaveType =
                      selectedDateLeave?.type || selectedDateLeave?.leaveType;

                    // ❌ 연차, 휴직, 결근, 병가 → 출근시간 미표시 (기타는 출근으로 표시)
                    if (
                      [
                        '연차',
                        '휴직',
                        '결근',
                        '병가',
                      ].includes(leaveType)
                    ) {
                      return null;
                    }

                    // 📋 반차(오전) → "반차(오전)" 텍스트 표시
                    if (leaveType === '반차(오전)') {
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {getText('출근시간', 'Check-in Time')}
                          </span>
                          <span className="text-xs font-semibold px-3 text-orange-600">
                            반차(오전)
                          </span>
                        </div>
                      );
                    }

                    // ✅ 경조, 공가 → 출근 시간 있으면 표시, 없으면 휴가 유형 표시
                    if (leaveType === '경조' || leaveType === '공가') {
                      const hasCheckIn = selectedDateAttendance?.checkIn;
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {getText('출근시간', 'Check-in Time')}
                          </span>
                          {hasCheckIn ? (
                            <span className="text-xs font-semibold px-3 text-blue-600">
                              {selectedDateAttendance.checkIn}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-600">
                              {leaveType}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // ✅ 반차(오후), 외출, 조퇴, 기타 → 실제 출근 시간 표시 (없으면 "-")
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">
                          {getText('출근시간', 'Check-in Time')}
                        </span>
                        <span className="text-xs font-semibold px-3 text-blue-600">
                          {selectedDateAttendance?.checkIn || '-'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* 퇴근시간 */}
                  {(() => {
                    const leaveType =
                      selectedDateLeave?.type || selectedDateLeave?.leaveType;

                    // ❌ 연차, 휴직, 결근, 병가 → 퇴근시간 미표시 (기타는 출근으로 표시)
                    if (
                      [
                        '연차',
                        '휴직',
                        '결근',
                        '병가',
                      ].includes(leaveType)
                    ) {
                      return null;
                    }

                    // 📋 반차(오후) → "반차(오후)" 텍스트 표시
                    if (leaveType === '반차(오후)') {
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {getText('퇴근시간', 'Check-out Time')}
                          </span>
                          <span className="text-xs font-semibold px-3 text-orange-600">
                            반차(오후)
                          </span>
                        </div>
                      );
                    }

                    // 🔴 조퇴 → 퇴근시간 있으면 표시, 없으면 "조퇴" 텍스트
                    if (leaveType === '조퇴') {
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {getText('퇴근시간', 'Check-out Time')}
                          </span>
                          <span className="text-xs font-semibold px-3 text-red-600">
                            {selectedDateAttendance?.checkOut || '조퇴'}
                          </span>
                        </div>
                      );
                    }

                    // ✅ 경조, 공가 → 퇴근 시간 있으면 표시, 없으면 휴가 유형 표시
                    if (leaveType === '경조' || leaveType === '공가') {
                      const hasCheckOut = selectedDateAttendance?.checkOut;
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {getText('퇴근시간', 'Check-out Time')}
                          </span>
                          {hasCheckOut ? (
                            <span className="text-xs font-semibold px-3 text-green-600">
                              {selectedDateAttendance.checkOut}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-600">
                              {leaveType}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // ✅ 반차(오전), 외출, 기타 → 실제 퇴근 시간 표시 (없으면 "-")
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">
                          {getText('퇴근시간', 'Check-out Time')}
                        </span>
                        <span className="text-xs font-semibold px-3 text-green-600">
                          {selectedDateAttendance?.checkOut || '-'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* 출결 상태 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      {getText('출결상태', 'Attendance Status')}
                    </span>
                    {(() => {
                      // 공휴일 또는 주말 체크
                      const dayOfWeek = new Date(
                        currentYear,
                        currentMonth - 1,
                        selectedDate
                      ).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      const dateStr = `${currentYear}-${String(
                        currentMonth
                      ).padStart(2, '0')}-${String(selectedDate).padStart(
                        2,
                        '0'
                      )}`;
                      const yearHolidays =
                        holidayData[currentYear] ||
                        getKoreanHolidays(currentYear);
                      const holidayKey = `${String(currentMonth).padStart(
                        2,
                        '0'
                      )}-${String(selectedDate).padStart(2, '0')}`;
                      const isSystemHoliday =
                        yearHolidays[holidayKey] || yearHolidays[dateStr];
                      const isCustomHoliday = customHolidays[dateStr];
                      const isHoliday = isSystemHoliday || isCustomHoliday;

                      // 출결상태 텍스트 결정
                      let statusText;
                      const leaveTypeForStatus =
                        selectedDateLeave?.type || selectedDateLeave?.leaveType;
                      if (selectedDateLeave && leaveTypeForStatus !== '기타') {
                        statusText = leaveTypeForStatus;
                      } else if (leaveTypeForStatus === '기타') {
                        // 기타는 '출근'으로 표시
                        statusText = '출근';
                      } else if (
                        !selectedDateAttendance?.checkIn &&
                        !selectedDateAttendance?.checkOut &&
                        (isWeekend || isHoliday)
                      ) {
                        statusText = '휴일';
                      } else {
                        statusText =
                          selectedDateAttendance?.status ||
                          getText('미출근', 'Not checked in');
                      }

                      // 출결상태 색상 결정
                      let colorClass;
                      if (selectedDateLeave && leaveTypeForStatus !== '기타') {
                        colorClass =
                          getLeaveTypeColor(leaveTypeForStatus) +
                          ' bg-orange-100';
                      } else if (
                        leaveTypeForStatus === '기타' ||
                        statusText === '출근'
                      ) {
                        colorClass = 'text-green-600 bg-green-100';
                      } else if (statusText === '휴일') {
                        colorClass = 'text-gray-600 bg-gray-200';
                      } else if (statusText === '근무중') {
                        colorClass = 'text-blue-600 bg-blue-100';
                      } else if (statusText === '출근') {
                        colorClass = 'text-green-600 bg-green-100';
                      } else if (
                        statusText === '지각' ||
                        statusText === '조퇴' ||
                        statusText === '지각/조퇴' ||
                        statusText === '결근'
                      ) {
                        colorClass = 'text-red-600 bg-red-100';
                      } else {
                        colorClass = 'text-gray-600 bg-gray-200';
                      }

                      return (
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${colorClass}`}
                        >
                          {statusText}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">
                    {getText(
                      '날짜를 클릭하면 출결 정보가 표시됩니다',
                      'Click a date to view attendance details'
                    )}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 일정 상세 팝업 */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-800">
                  일정 상세 정보
                </h3>
                <button
                  onClick={() => {
                    setShowEventDetail(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  날짜
                </label>
                <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  {selectedEvent.date}
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    제목
                  </label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    {selectedEvent.title}
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    일정 유형
                  </label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    {selectedEvent.type}
                  </div>
                </div>
              </div>
              {selectedEvent.description && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-h-[60px] whitespace-pre-wrap text-xs">
                    {selectedEvent.description}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 pt-0">
              {/* 관리자 모드일 때만 수정/삭제 버튼 표시 */}
              {(currentUser?.isAdmin || currentUser?.role === 'admin') && (
                <div className="flex space-x-3 mb-3">
                  <button
                    onClick={() => {
                      setShowEventDetail(false);
                      handleEditEvent(selectedEvent);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      setShowEventDetail(false);
                      setSelectedEvent(null);
                      handleDeleteEvent(selectedEvent);
                    }}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    삭제
                  </button>
                </div>
              )}
              <button
                onClick={() => {
                  setShowEventDetail(false);
                  setSelectedEvent(null);
                }}
                className="w-full px-4 py-2 bg-gray-400 text-white text-xs rounded-lg hover:bg-gray-500"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffScheduleAttendance;
