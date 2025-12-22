import React from 'react';
import { Edit, Upload, Download } from 'lucide-react';

const AdminAttendanceManagement = ({
  attendanceSheetYear,
  setAttendanceSheetYear,
  attendanceSheetMonth,
  setAttendanceSheetMonth,
  attendanceSearchFilter,
  setAttendanceSearchFilter,
  isEditingAttendance,
  attendanceStats,
  filteredAttendanceEmployees,
  selectedCells,
  isDragging,
  dayMetadata,
  COMPANY_STANDARDS,
  toggleEditingMode,
  uploadAttendanceXLSX,
  exportAttendanceXLSX,
  handleAttendancePaste,
  handleAttendanceKeyDown,
  getDaysInMonth,
  getDayOfWeek,
  getWorkTypeForDate,
  setWorkTypeForDate,
  setAttendanceForEmployee,
  handleCellClick,
  handleCellMouseDown,
  handleCellMouseEnter,
  handleCellMouseUp,
  getAttendanceForEmployee,
  calculateMonthlyStats,
  loadHolidayData,
  holidayData,
  customHolidays,
  getKoreanHolidays,
  attendanceSheetData = {},
}) => {
  const daysInCurrentMonth = getDaysInMonth(
    attendanceSheetYear,
    attendanceSheetMonth
  );

  // 해당 월에 주간/야간 시프트가 모두 있는 직원인지 확인 (주중에만)
  const hasShiftWork = (employeeId) => {
    const shiftTypes = new Set();
    const daysInMonth = new Date(
      attendanceSheetYear,
      attendanceSheetMonth,
      0
    ).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      // 주말 체크 (0=일요일, 6=토요일)
      const dayOfWeek = getDayOfWeek(
        attendanceSheetYear,
        attendanceSheetMonth,
        day
      );
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // 공휴일 체크
      const dateKey = `${attendanceSheetYear}-${String(
        attendanceSheetMonth
      ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateKeyShort = `${String(attendanceSheetMonth).padStart(
        2,
        '0'
      )}-${String(day).padStart(2, '0')}`;
      const yearHolidays = holidayData[attendanceSheetYear] || {};
      const isPublicHoliday = !!(
        customHolidays[dateKey] ||
        yearHolidays[dateKey] ||
        yearHolidays[dateKeyShort]
      );

      // 휴일(주말 또는 공휴일)이면 시프터 판정에서 제외
      if (isWeekend || isPublicHoliday) {
        continue;
      }

      const employeeKey = `${employeeId}_${dateKey}`;
      const attendance = attendanceSheetData[employeeKey];

      if (attendance && attendance.checkIn) {
        let shiftType = null;

        // 1순위: 출근 시간으로 자동 판정
        if (attendance.checkIn.includes(':')) {
          const [hours, minutes] = attendance.checkIn.split(':').map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            const totalMinutes = hours * 60 + minutes;
            shiftType =
              totalMinutes >= 240 && totalMinutes <= 1050 ? '주간' : '야간';
          }
        }

        // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
        if (!shiftType) {
          shiftType = attendance.shiftType;
        }

        if (shiftType) {
          shiftTypes.add(shiftType);
        }
      }
    }

    // 주간과 야간이 모두 있으면 true
    return shiftTypes.has('주간') && shiftTypes.has('야간');
  };

  // 직원의 근무 형태 표시 (주간/야간 시프트가 있으면 "주/야")
  const getWorkTypeDisplay = (employee) => {
    if (hasShiftWork(employee.id)) {
      return '주/야';
    }
    return employee.workType || '주간';
  };

  return (
    <div className="space-y-3 w-full h-full">
      <div
        className="bg-white border border-gray-200 rounded-xl p-6 max-w-full"
        style={{ maxWidth: '85.5vw' }}
      >
        {/* 상단 헤더 및 네비게이션 */}
        <div className="w-full overflow-x-auto">
          <div className="flex flex-nowrap gap-6 items-center mb-1 min-w-[1200px]">
            <h3 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
              근태 관리
            </h3>

            <div className="flex-1"></div>

            {/* 검색 필터 */}
            <div className="flex gap-4">
              <select
                value={attendanceSearchFilter.department}
                onChange={(e) =>
                  setAttendanceSearchFilter((f) => ({
                    ...f,
                    department: e.target.value,
                  }))
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체">전체 부서</option>
                {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={attendanceSearchFilter.position}
                onChange={(e) =>
                  setAttendanceSearchFilter((f) => ({
                    ...f,
                    position: e.target.value,
                  }))
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체">전체 직급</option>
                {COMPANY_STANDARDS.POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <select
                value={attendanceSearchFilter.workType || '전체'}
                onChange={(e) =>
                  setAttendanceSearchFilter((f) => ({
                    ...f,
                    workType: e.target.value,
                  }))
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체">전체 근무형태</option>
                <option value="주간">주간</option>
                <option value="야간">야간</option>
                <option value="주간/야간">주간/야간</option>
              </select>
              <select
                value={attendanceSearchFilter.payType || '전체'}
                onChange={(e) =>
                  setAttendanceSearchFilter((f) => ({
                    ...f,
                    payType: e.target.value,
                  }))
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체">전체 급여형태</option>
                {COMPANY_STANDARDS.PAY_TYPES.map((payType) => (
                  <option key={payType} value={payType}>
                    {payType}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="이름 검색 (쉼표 또는 띄어쓰기로 다중 검색 가능)"
                value={attendanceSearchFilter.name}
                onChange={(e) =>
                  setAttendanceSearchFilter((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
                className="px-3 py-2 border rounded-lg text-sm w-80"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={toggleEditingMode}
                className={`px-4 py-2 rounded-lg flex items-center whitespace-nowrap ${
                  isEditingAttendance
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                <Edit size={16} className="mr-2" />
                {isEditingAttendance ? '편집완료' : '편집'}
              </button>
              <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center whitespace-nowrap">
                <Upload size={16} className="mr-2" />
                업로드
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      uploadAttendanceXLSX(e.target.files[0]);
                      // 같은 파일을 다시 업로드할 수 있도록 값 초기화
                      e.target.value = '';
                    }
                  }}
                  accept=".xlsx,.xls"
                />
              </label>
              <button
                onClick={exportAttendanceXLSX}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center whitespace-nowrap"
              >
                <Download size={16} className="mr-2" />
                다운로드
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 하단 통계 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-x-auto">
          <div className="grid grid-cols-6 gap-4 text-sm min-w-[800px]">
            <div className="text-center">
              <div className="font-medium text-gray-600">필터 대상 직원</div>
              <div className="text-lg font-bold text-blue-600">
                {attendanceStats.totalEmployees}명
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">총 근무일/월</div>
              <div className="text-lg font-bold text-green-700">
                {attendanceStats.totalWorkDays}일{' '}
                <span className="text-xs font-semibold text-green-600">
                  (총 {daysInCurrentMonth}일)
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">평균 근무일/인</div>
              <div className="text-lg font-bold text-purple-600">
                {(attendanceStats.avgWorkDaysPerEmployee || 0).toFixed(1)}일
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">평균 근무시간/일</div>
              <div className="text-lg font-bold text-blue-500">
                {(attendanceStats.avgWorkHoursPerDay || 0).toFixed(1)}h
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">지각 건수/월</div>
              <div className="text-lg font-bold text-red-600">
                {attendanceStats.lateCount}건
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">총 연차 사용/월</div>
              <div className="text-lg font-bold text-orange-600">
                {attendanceStats.annualLeaveCount}일
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 근태 테이블 카드 */}
      <div
        className="bg-white border border-gray-200 rounded-lg p-3"
        style={{ width: '85.5vw' }}
      >
        {/* 근태 테이블 - 실제 엑셀 구조 100% 일치 */}
        <style>
          {`
            #attendanceTable th,
            #attendanceTable td {
              border-top: none !important;
              border-bottom: 1px solid #d1d5db !important;
              border-left: 1px solid #d1d5db !important;
              border-right: none !important;
            }
            #attendanceTable #navigationCell {
              border-left: none !important;
            }
            #attendanceTable {
              border-top: none !important;
              border-bottom: none !important;
              border-left: none !important;
              border-right: 1px solid #d1d5db !important;
            }
          `}
        </style>
        <div
          id="attendanceTableContainer"
          className="border-2 border-transparent focus:border-transparent rounded-lg p-1"
          onPaste={isEditingAttendance ? handleAttendancePaste : undefined}
          onKeyDown={handleAttendanceKeyDown}
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <table
            className="w-full text-xs attendance-table"
            id="attendanceTable"
            style={{
              margin: '1px',
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 5,
                backgroundColor: 'white',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
            >
              {/* 연도/월 네비게이션 행 */}
              <tr>
                <th
                  colSpan="100"
                  className="bg-white"
                  id="navigationCell"
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    padding: '8px',
                    position: 'relative',
                    boxShadow: '-2px -2px 0 0 white, 2px 0 0 0 white',
                  }}
                >
                  <div className="flex items-center space-x-2 text-lg font-semibold text-blue-800">
                    <button
                      onClick={() => {
                        const newYear = attendanceSheetYear - 1;
                        setAttendanceSheetYear(newYear);
                        loadHolidayData(newYear);
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      ‹‹ 이전연도
                    </button>
                    <button
                      onClick={() => {
                        if (attendanceSheetMonth === 1) {
                          const newYear = attendanceSheetYear - 1;
                          setAttendanceSheetMonth(12);
                          setAttendanceSheetYear(newYear);
                          loadHolidayData(newYear);
                        } else {
                          setAttendanceSheetMonth(attendanceSheetMonth - 1);
                        }
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      ‹ 이전달
                    </button>
                    <div className="px-4 py-2 text-m font-bold">
                      {attendanceSheetYear}년 {attendanceSheetMonth}월
                    </div>
                    <button
                      onClick={() => {
                        if (attendanceSheetMonth === 12) {
                          const newYear = attendanceSheetYear + 1;
                          setAttendanceSheetMonth(1);
                          setAttendanceSheetYear(newYear);
                          loadHolidayData(newYear);
                        } else {
                          setAttendanceSheetMonth(attendanceSheetMonth + 1);
                        }
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      다음달 ›
                    </button>
                    <button
                      onClick={() => {
                        const newYear = attendanceSheetYear + 1;
                        setAttendanceSheetYear(newYear);
                        loadHolidayData(newYear);
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      다음연도 ››
                    </button>
                    <div className="ml-6 text-xs font-bold text-green-600">
                      ※ 주간/야간 교대 근무자의 야간 근무 시 출근/퇴근 시간은
                      녹색으로 표기 (나머진 모두 검정색 글씨 표기)
                    </div>
                  </div>
                </th>
              </tr>
              {/* 첫 번째 헤더 행 - 근무구분 선택 행 */}
              <tr className="bg-gray-100">
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 text-[11px]"
                >
                  {attendanceSheetYear}년
                </th>
                <td
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-center font-bold bg-grey-200 text-[11px]"
                >
                  {String(attendanceSheetMonth).padStart(2, '0')}월
                </td>
                <td className="border border-gray-300 px-0.5 py-1 text-center font-bold bg-grey-200 text-[11px]">
                  평일
                  <br />
                  휴일
                </td>
                {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                  const day = i + 1;
                  const workType = getWorkTypeForDate(
                    attendanceSheetYear,
                    attendanceSheetMonth,
                    day
                  );

                  return (
                    <td
                      key={day}
                      className="border border-gray-300 px-0.5 py-0.5 text-center"
                    >
                      <select
                        value={workType}
                        onChange={(e) =>
                          setWorkTypeForDate(
                            attendanceSheetYear,
                            attendanceSheetMonth,
                            day,
                            e.target.value
                          )
                        }
                        className={`w-full px-0.5 py-0.5 text-[9px] border rounded font-medium appearance-none pr-3 bg-no-repeat bg-right ${
                          workType === 'weekday'
                            ? 'bg-white border-gray-300'
                            : 'bg-red-50 text-red-900 border-red-400'
                        }`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23333' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
                          backgroundSize: '8px 8px',
                          backgroundPositionX: 'calc(100% - 2px)',
                          backgroundPositionY: 'center',
                        }}
                      >
                        <option value="weekday">평일</option>
                        <option value="holiday">휴일</option>
                      </select>
                    </td>
                  );
                })}
                <td
                  colSpan="9"
                  className="border border-gray-300 px-0.5 py-0.5 text-center bg-blue-100 font-semibold text-[11px]"
                >
                  합계
                </td>
              </tr>
              {/* 두 번째 헤더 행 - 일자 */}
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-0.5 py-1 text-center font-bold bg-grey-200 text-[11px]">
                  일자
                </td>
                {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                  const day = i + 1;
                  const dayOfWeek = getDayOfWeek(
                    attendanceSheetYear,
                    attendanceSheetMonth,
                    day
                  );
                  const workType = getWorkTypeForDate(
                    attendanceSheetYear,
                    attendanceSheetMonth,
                    day
                  );

                  return (
                    <th
                      key={day}
                      className={`border border-gray-300 px-0.5 py-1 text-center text-[11px] ${
                        dayOfWeek === 6
                          ? 'bg-blue-50 text-blue-900'
                          : workType === 'holiday'
                          ? 'bg-red-50 text-red-900'
                          : ''
                      }`}
                    >
                      {String(day).padStart(2, '0')}
                    </th>
                  );
                })}
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '40px',
                  }}
                >
                  총<br />
                  시간
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  기본
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  조출
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  연장
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  심야
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  연장
                  <br />+<br />
                  심야
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  특근
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-0.5 py-1 text-[11px]"
                  style={{
                    minWidth: '45px',
                  }}
                >
                  특근
                  <br />+<br />
                  연장
                </th>
              </tr>
              {/* 세 번째 헤더 행 - 직원명/근무형태/요일 */}
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-1 py-1 text-[11px]">
                  직원명
                </th>
                <th
                  className="border border-gray-300 px-1 py-1 text-[11px]"
                  style={{
                    minWidth: '30px',
                  }}
                >
                  근무
                  <br />
                  형태
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px]">
                  요일
                </th>
                {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                  const day = i + 1;
                  const dayOfWeek = getDayOfWeek(
                    attendanceSheetYear,
                    attendanceSheetMonth,
                    day
                  );
                  const workType = getWorkTypeForDate(
                    attendanceSheetYear,
                    attendanceSheetMonth,
                    day
                  );

                  return (
                    <th
                      key={day}
                      className={`border border-gray-300 px-0.5 py-0.5 text-[11px] ${
                        dayOfWeek === 6
                          ? 'bg-blue-100 text-blue-700 font-bold'
                          : workType === 'holiday'
                          ? 'bg-red-100 text-red-900 font-bold'
                          : ''
                      }`}
                    >
                      {['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredAttendanceEmployees.map((emp) => {
                const stats = calculateMonthlyStats(emp.id);

                return (
                  <React.Fragment key={emp.id}>
                    {/* 출근 행 */}
                    <tr>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center font-medium text-[11px]"
                      >
                        {emp.name}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center font-medium text-[11px]"
                      >
                        {getWorkTypeDisplay(emp)}
                      </td>
                      <td className="border border-gray-300 px-0.5 py-0.5 text-center text-[11px] bg-blue-50">
                        출근
                      </td>
                      {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                        const day = i + 1;
                        const attendance = getAttendanceForEmployee(
                          emp.id,
                          attendanceSheetYear,
                          attendanceSheetMonth,
                          day
                        );
                        const dayKey = `${attendanceSheetYear}-${attendanceSheetMonth}-${day}`;
                        const workType =
                          dayMetadata[dayKey]?.workType || 'weekday';
                        const cellId = `${emp.id}_${day}_checkIn`;
                        const isSelected = selectedCells.has(cellId);

                        return (
                          <td
                            key={day}
                            className={`border border-gray-300 px-0.5 py-0.5 text-center cursor-pointer text-[11px] ${
                              workType === 'weekday' ? 'bg-white' : 'bg-red-50'
                            } ${isSelected ? 'bg-blue-200' : ''} ${
                              isDragging ? 'select-none' : ''
                            }`}
                            onClick={(e) => handleCellClick(cellId, e)}
                            onMouseDown={(e) => handleCellMouseDown(cellId, e)}
                            onMouseEnter={(e) =>
                              handleCellMouseEnter(cellId, e)
                            }
                            onMouseUp={(e) => handleCellMouseUp(cellId, e)}
                          >
                            {isEditingAttendance ? (
                              <input
                                type="text"
                                value={attendance.checkIn || ''}
                                onChange={(e) => {
                                  setAttendanceForEmployee(
                                    emp.id,
                                    attendanceSheetYear,
                                    attendanceSheetMonth,
                                    day,
                                    { ...attendance, checkIn: e.target.value }
                                  );
                                }}
                                className="w-full text-[11px] text-center border-none bg-transparent focus:bg-white focus:outline-blue-400"
                                placeholder=""
                              />
                            ) : (
                              (() => {
                                // 연차 정보 표시 로직
                                if (attendance.leaveType) {
                                  const leaveType = attendance.leaveType;
                                  // 반차(오전): 출근 행에만 "반차"로 표시
                                  if (leaveType === '반차(오전)') {
                                    return '반차';
                                  }
                                  // 반차(오후), 외출, 조퇴: 출근 행에는 표시 안 함
                                  if (
                                    leaveType === '반차(오후)' ||
                                    leaveType === '외출' ||
                                    leaveType === '조퇴'
                                  ) {
                                    const isShiftWorker = hasShiftWork(emp.id);
                                    // 1순위: 출근 시간으로 자동 판정
                                    let isNightShift = false;
                                    let isLate = false;

                                    // 평일 체크: 평일에만 지각 판정
                                    const dateWorkType = getWorkTypeForDate(
                                      attendanceSheetYear,
                                      attendanceSheetMonth,
                                      day
                                    );
                                    const isWeekday =
                                      dateWorkType === 'weekday';

                                    if (
                                      attendance.checkIn &&
                                      attendance.checkIn.includes(':')
                                    ) {
                                      const [hours, minutes] =
                                        attendance.checkIn
                                          .split(':')
                                          .map(Number);
                                      if (!isNaN(hours) && !isNaN(minutes)) {
                                        const totalMinutes =
                                          hours * 60 + minutes;
                                        isNightShift = !(
                                          totalMinutes >= 240 &&
                                          totalMinutes <= 1050
                                        );

                                        // 지각 판정 (평일에만)
                                        if (isWeekday) {
                                          const isDay =
                                            totalMinutes >= 240 &&
                                            totalMinutes <= 1050; // 04:00~17:30
                                          if (isDay) {
                                            // 주간 근무자: 08:31~15:00 사이 출근 시 지각
                                            isLate =
                                              totalMinutes >= 511 &&
                                              totalMinutes <= 900;
                                          } else {
                                            // 야간 근무자: 19:01~다음날 03:00 사이 출근 시 지각
                                            isLate =
                                              (totalMinutes >= 1141 &&
                                                totalMinutes <= 1439) ||
                                              (totalMinutes >= 0 &&
                                                totalMinutes <= 180);
                                          }
                                        }
                                      }
                                    } else {
                                      // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
                                      isNightShift =
                                        attendance.shiftType === '야간';
                                    }
                                    return (
                                      <span
                                        className={
                                          isLate
                                            ? 'text-red-600 font-medium'
                                            : isShiftWorker && isNightShift
                                            ? 'text-green-600 font-medium'
                                            : ''
                                        }
                                      >
                                        {attendance.checkIn || ''}
                                      </span>
                                    );
                                  }
                                  // 연차, 경조, 공가, 휴직, 결근, 기타: 출근 행에 표시
                                  return leaveType;
                                }
                                const isShiftWorker = hasShiftWork(emp.id);
                                // 1순위: 출근 시간으로 자동 판정
                                let isNightShift = false;
                                let isLate = false;

                                // 평일 체크: 평일에만 지각 판정
                                const dateWorkType = getWorkTypeForDate(
                                  attendanceSheetYear,
                                  attendanceSheetMonth,
                                  day
                                );
                                const isWeekday = dateWorkType === 'weekday';

                                if (
                                  attendance.checkIn &&
                                  attendance.checkIn.includes(':')
                                ) {
                                  const [hours, minutes] = attendance.checkIn
                                    .split(':')
                                    .map(Number);
                                  if (!isNaN(hours) && !isNaN(minutes)) {
                                    const totalMinutes = hours * 60 + minutes;
                                    isNightShift = !(
                                      totalMinutes >= 240 &&
                                      totalMinutes <= 1050
                                    );

                                    // 지각 판정 (평일에만)
                                    if (isWeekday) {
                                      const isDay =
                                        totalMinutes >= 240 &&
                                        totalMinutes <= 1050; // 04:00~17:30
                                      if (isDay) {
                                        // 주간 근무자: 08:31~15:00 사이 출근 시 지각
                                        isLate =
                                          totalMinutes >= 511 &&
                                          totalMinutes <= 900;
                                      } else {
                                        // 야간 근무자: 19:01~다음날 03:00 사이 출근 시 지각
                                        isLate =
                                          (totalMinutes >= 1141 &&
                                            totalMinutes <= 1439) ||
                                          (totalMinutes >= 0 &&
                                            totalMinutes <= 180);
                                      }
                                    }
                                  }
                                } else {
                                  // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
                                  isNightShift =
                                    attendance.shiftType === '야간';
                                }
                                return (
                                  <span
                                    className={
                                      isLate
                                        ? 'text-red-600 font-medium'
                                        : isShiftWorker && isNightShift
                                        ? 'text-green-600 font-medium'
                                        : ''
                                    }
                                  >
                                    {attendance.checkIn || ''}
                                  </span>
                                );
                              })()
                            )}
                          </td>
                        );
                      })}
                      {/* 합계 컬럼들 - 출근 행 (rowSpan=2) */}
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-yellow-100 font-medium text-[11px]"
                      >
                        {/* 총시간 */}
                        {stats.totalHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-green-100 font-medium text-[11px]"
                      >
                        {/* 기본 */}
                        {stats.regularHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-yellow-100 font-medium text-[11px]"
                      >
                        {/* 조출 */}
                        {stats.earlyHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-orange-100 font-medium text-[11px]"
                      >
                        {/* 연장 */}
                        {stats.overtimeHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-purple-100 font-medium text-[11px]"
                      >
                        {/* 심야 */}
                        {stats.nightHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-purple-200 font-medium text-[11px]"
                      >
                        {/* 연장+심야 */}
                        {stats.overtimeNightHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-blue-100 font-medium text-[11px]"
                      >
                        {/* 특근 */}
                        {stats.holidayHours}
                      </td>
                      <td
                        rowSpan="2"
                        className="border border-gray-300 px-0.5 py-0.5 text-center bg-red-100 font-medium text-[11px]"
                      >
                        {/* 특근+연장 */}
                        {stats.holidayOvertimeHours}
                      </td>
                    </tr>

                    {/* 퇴근 행 */}
                    <tr>
                      <td className="border border-gray-300 px-0.5 py-0.5 text-center text-[11px] bg-red-50">
                        퇴근
                      </td>
                      {Array.from({ length: daysInCurrentMonth }, (_, i) => {
                        const day = i + 1;
                        const attendance = getAttendanceForEmployee(
                          emp.id,
                          attendanceSheetYear,
                          attendanceSheetMonth,
                          day
                        );
                        const dayKey = `${attendanceSheetYear}-${attendanceSheetMonth}-${day}`;
                        const workType =
                          dayMetadata[dayKey]?.workType || 'weekday';
                        const cellId = `${emp.id}_${day}_checkOut`;
                        const isSelected = selectedCells.has(cellId);

                        return (
                          <td
                            key={day}
                            className={`border border-gray-300 px-0.5 py-0.5 text-center cursor-pointer text-[11px] ${
                              workType === 'weekday' ? 'bg-white' : 'bg-red-50'
                            } ${isSelected ? 'bg-blue-200' : ''} ${
                              isDragging ? 'select-none' : ''
                            }`}
                            onClick={(e) => handleCellClick(cellId, e)}
                            onMouseDown={(e) => handleCellMouseDown(cellId, e)}
                            onMouseEnter={(e) =>
                              handleCellMouseEnter(cellId, e)
                            }
                            onMouseUp={(e) => handleCellMouseUp(cellId, e)}
                          >
                            {isEditingAttendance ? (
                              <input
                                type="text"
                                value={attendance.checkOut || ''}
                                onChange={(e) => {
                                  setAttendanceForEmployee(
                                    emp.id,
                                    attendanceSheetYear,
                                    attendanceSheetMonth,
                                    day,
                                    { ...attendance, checkOut: e.target.value }
                                  );
                                }}
                                className="w-full text-[11px] text-center border-none bg-transparent focus:bg-white focus:outline-blue-400"
                                placeholder=""
                              />
                            ) : (
                              (() => {
                                // 연차 정보 표시 로직
                                if (attendance.leaveType) {
                                  const leaveType = attendance.leaveType;
                                  // 반차(오후): 퇴근 행에만 "반차"로 표시
                                  if (leaveType === '반차(오후)') {
                                    return '반차';
                                  }
                                  // 외출, 조퇴: 퇴근 행에 그대로 표시
                                  if (
                                    leaveType === '외출' ||
                                    leaveType === '조퇴'
                                  ) {
                                    return leaveType;
                                  }
                                  // 반차(오전): 퇴근 행에는 표시 안 함
                                  if (leaveType === '반차(오전)') {
                                    const isShiftWorker = hasShiftWork(emp.id);
                                    // 1순위: 출근 시간으로 자동 판정
                                    let isNightShift = false;
                                    if (
                                      attendance.checkIn &&
                                      attendance.checkIn.includes(':')
                                    ) {
                                      const [hours, minutes] =
                                        attendance.checkIn
                                          .split(':')
                                          .map(Number);
                                      if (!isNaN(hours) && !isNaN(minutes)) {
                                        const totalMinutes =
                                          hours * 60 + minutes;
                                        isNightShift = !(
                                          totalMinutes >= 240 &&
                                          totalMinutes <= 1050
                                        );
                                      }
                                    } else {
                                      // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
                                      isNightShift =
                                        attendance.shiftType === '야간';
                                    }
                                    return (
                                      <span
                                        className={
                                          isShiftWorker && isNightShift
                                            ? 'text-green-600 font-medium'
                                            : ''
                                        }
                                      >
                                        {attendance.checkOut || ''}
                                      </span>
                                    );
                                  }
                                  // 연차, 경조, 공가, 휴직, 결근, 기타: 퇴근 행에 표시
                                  return leaveType;
                                }
                                const isShiftWorker = hasShiftWork(emp.id);
                                // 1순위: 출근 시간으로 자동 판정
                                let isNightShift = false;
                                if (
                                  attendance.checkIn &&
                                  attendance.checkIn.includes(':')
                                ) {
                                  const [hours, minutes] = attendance.checkIn
                                    .split(':')
                                    .map(Number);
                                  if (!isNaN(hours) && !isNaN(minutes)) {
                                    const totalMinutes = hours * 60 + minutes;
                                    isNightShift = !(
                                      totalMinutes >= 240 &&
                                      totalMinutes <= 1050
                                    );
                                  }
                                } else {
                                  // 2순위: 출근 시간이 없거나 판정 실패한 경우 저장된 shiftType 사용
                                  isNightShift =
                                    attendance.shiftType === '야간';
                                }
                                return (
                                  <span
                                    className={
                                      isShiftWorker && isNightShift
                                        ? 'text-green-600 font-medium'
                                        : ''
                                    }
                                  >
                                    {attendance.checkOut || ''}
                                  </span>
                                );
                              })()
                            )}
                          </td>
                        );
                      })}
                      {/* 합계 컬럼들 - 퇴근 행은 출근 행의 rowSpan=2로 병합됨 */}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdminAttendanceManagement);
