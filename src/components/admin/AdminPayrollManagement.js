import React, { useEffect, useState } from 'react';
import { Edit, Upload, Download, RefreshCw } from 'lucide-react';

const AdminPayrollManagement = ({
  payrollTableData,
  payrollSearchFilter,
  setPayrollSearchFilter,
  isPayrollEditMode,
  setIsPayrollEditMode,
  editingPayrollCell,
  setEditingPayrollCell,
  COMPANY_STANDARDS,
  initializePayrollTable,
  handlePayrollFileUpload,
  exportPayrollXLSX,
  getFilteredPayrollData,
  updatePayrollCell,
  safeFormatNumber,
  defaultHours,
  handleEditHours,
  applyDefaultHoursToTable,
  setPayrollByMonth,
  setPayrollHashes,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);

  // 급여 데이터 초기화 핸들러
  const handleResetPayrollData = (resetType) => {
    try {
      if (resetType === 'all') {
        // 전체 초기화
        if (
          window.confirm(
            '모든 급여 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
          )
        ) {
          // 급여 데이터는 state로만 관리 (localStorage 불필요)
          setPayrollByMonth({});
          setPayrollHashes({});
          alert('전체 급여 데이터가 초기화되었습니다.');
          window.location.reload();
        }
      } else if (resetType === 'month') {
        // 해당월만 초기화
        const currentKey = `${payrollSearchFilter.year}-${String(
          payrollSearchFilter.month
        ).padStart(2, '0')}`;

        if (
          window.confirm(
            `${payrollSearchFilter.year}년 ${payrollSearchFilter.month}월 급여 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`
          )
        ) {
          // 급여 데이터는 state로만 관리 (localStorage 불필요)
          const data = { ...payrollByMonth };
          const hashes = { ...payrollHashes };

          // 해당월 데이터 삭제
          delete data[currentKey];
          delete hashes[currentKey];

          // state 업데이트
          setPayrollByMonth(data);
          setPayrollHashes(hashes);

          alert(
            `${payrollSearchFilter.year}년 ${payrollSearchFilter.month}월 급여 데이터가 초기화되었습니다.`
          );
          window.location.reload();
        }
      }
      setShowResetModal(false);
    } catch (error) {
      console.error('급여 데이터 초기화 중 오류:', error);
      alert('급여 데이터 초기화 중 오류가 발생했습니다.');
      setShowResetModal(false);
    }
  };
  // 급여대장 테이블 초기화 (컴포넌트 마운트 시 실행)
  useEffect(() => {
    if (payrollTableData.length === 0) {
      setTimeout(() => initializePayrollTable(), 0);
    }
  }, [payrollTableData.length, initializePayrollTable]);

  return (
    <div className="space-y-3">
      {/* 필터 및 통계 카드 */}
      <div
        className="bg-white border border-gray-200 rounded-xl p-6 max-w-full"
        style={{ maxWidth: '85.5vw' }}
      >
        {/* 상단 헤더 */}
        <div className="w-full overflow-x-auto">
          <div className="flex flex-nowrap gap-6 items-center mb-1">
            <h3 className="text-lg font-semibold text-gray-800">급여 관리</h3>
            <div className="flex-1"></div>
            <div className="flex gap-2">
              <select
                value={payrollSearchFilter.department || '전체 부서'}
                onChange={(e) =>
                  setPayrollSearchFilter({
                    ...payrollSearchFilter,
                    department: e.target.value,
                  })
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체 부서">전체 부서</option>
                {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <select
                value={payrollSearchFilter.position || '전체'}
                onChange={(e) =>
                  setPayrollSearchFilter({
                    ...payrollSearchFilter,
                    position: e.target.value,
                  })
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
                value={payrollSearchFilter.workType || '전체'}
                onChange={(e) =>
                  setPayrollSearchFilter({
                    ...payrollSearchFilter,
                    workType: e.target.value,
                  })
                }
                className="px-3 py-2 border rounded-lg text-sm w-40"
              >
                <option value="전체">전체 근무형태</option>
                <option value="주간">주간</option>
                <option value="야간">야간</option>
                <option value="주간/야간">주간/야간</option>
              </select>
              <input
                type="text"
                placeholder="이름 검색 (쉼표 또는 띄어쓰기로 다중 검색 가능)"
                value={payrollSearchFilter.name}
                onChange={(e) =>
                  setPayrollSearchFilter({
                    ...payrollSearchFilter,
                    name: e.target.value,
                  })
                }
                className="px-3 py-2 border rounded-lg text-sm w-80"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowResetModal(true)}
                className="px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-600 flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                초기화
              </button>
              {/* 편집 버튼 비활성화 (2024-01-16)
              <button
                onClick={() => {
                  setIsPayrollEditMode(!isPayrollEditMode);
                  setEditingPayrollCell(null);
                }}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  isPayrollEditMode
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                <Edit size={16} className="mr-2" />
                {isPayrollEditMode ? '편집완료' : '편집'}
              </button>
              */}
              <label className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center">
                <Upload size={16} className="mr-2" />
                업로드
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handlePayrollFileUpload(file);
                      e.target.value = '';
                    }
                  }}
                  accept=".xlsx,.xls,.csv"
                />
              </label>
              <button
                onClick={exportPayrollXLSX}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
              >
                <Download size={16} className="mr-2" />
                다운로드
              </button>
            </div>
          </div>
        </div>

        {/* 통계 정보 */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-x-auto">
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-600">전체 직원</div>
              <div className="text-lg font-bold text-blue-600">
                {getFilteredPayrollData().length}명
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">총 급여합계</div>
              <div className="text-lg font-bold text-green-600">
                {(() => {
                  const total = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.급여합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  return total.toLocaleString();
                })()}
                원
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">총 공제합계</div>
              <div className="text-lg font-bold text-red-600">
                {(() => {
                  const total = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.공제합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  return total.toLocaleString();
                })()}
                원
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">총 차인지급액</div>
              <div className="text-lg font-bold text-purple-600">
                {(() => {
                  const totalPayment = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.급여합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  const totalDeduction = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.공제합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  return (totalPayment - totalDeduction).toLocaleString();
                })()}
                원
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-600">평균 급여</div>
              <div className="text-lg font-bold text-orange-600">
                {(() => {
                  if (getFilteredPayrollData().length === 0) return '0';
                  const totalPayment = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.급여합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  const totalDeduction = Math.round(
                    getFilteredPayrollData()
                      .reduce(
                        (sum, row) =>
                          sum +
                          (parseFloat(row.공제합계?.toString().replace(/,/g, '')) ||
                            0),
                        0
                      )
                  );
                  const actualTotal = totalPayment - totalDeduction;
                  return Math.round(actualTotal / getFilteredPayrollData().length).toLocaleString();
                })()}
                원
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 및 테이블 카드 */}
      <div
        className="bg-white border border-gray-200 rounded-lg p-3"
        style={{ minWidth: '85.5vw', width: 'fit-content' }}
      >
        {/* 급여대장 테이블 */}
        <style>
          {`
            #payrollTable th {
              border-top: 1px solid #d1d5db !important;
              border-bottom: none !important;
              border-left: 1px solid #d1d5db !important;
              border-right: none !important;
            }
            #payrollTable td {
              border-top: 1px solid #d1d5db !important;
              border-bottom: none !important;
              border-left: 1px solid #d1d5db !important;
              border-right: none !important;
            }
            #payrollTable #payrollNavigationCell {
              border-top: none !important;
              border-bottom: none !important;
              border-left: none !important;
              border-right: none !important;
            }
            #payrollTable #payrollBasicHoursCell {
              border-top: none !important;
              border-bottom: none !important;
              border-left: none !important;
              border-right: none !important;
            }
            #payrollTable {
              border-top: none !important;
              border-bottom: 1px solid #d1d5db !important;
              border-left: none !important;
              border-right: 1px solid #d1d5db !important;
            }
          `}
        </style>
        <div
          id="payrollTableContainer"
          className="border-2 border-transparent focus:border-transparent rounded-lg p-1"
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          <table
            className="text-[11px]"
            id="payrollTable"
            style={{
              width: 'max-content',
              margin: '1px',
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            {/* 계층형 헤더 - 엑셀 양식과 완전 일치 */}
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
                  id="payrollNavigationCell"
                  style={{
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    padding: '8px 12px 4px 12px',
                    position: 'relative',
                    boxShadow: '-2px -2px 0 0 white, 2px 0 0 0 white',
                  }}
                >
                  <div className="flex items-center space-x-2 text-lg font-semibold text-blue-800">
                    <button
                      onClick={() => {
                        const currentYear =
                          payrollSearchFilter.year || new Date().getFullYear();
                        const newYear = currentYear - 1;
                        setPayrollSearchFilter((f) => ({
                          ...f,
                          year: newYear,
                        }));
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      ‹‹ 이전연도
                    </button>
                    <button
                      onClick={() => {
                        const currentMonth =
                          payrollSearchFilter.month ||
                          new Date().getMonth() + 1;
                        const currentYear =
                          payrollSearchFilter.year || new Date().getFullYear();
                        if (currentMonth === 1) {
                          setPayrollSearchFilter((f) => ({
                            ...f,
                            month: 12,
                            year: currentYear - 1,
                          }));
                        } else {
                          setPayrollSearchFilter((f) => ({
                            ...f,
                            month: currentMonth - 1,
                          }));
                        }
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      ‹ 이전달
                    </button>
                    <div className="px-4 py-2 text-m font-bold">
                      {payrollSearchFilter.year || new Date().getFullYear()}년{' '}
                      {payrollSearchFilter.month || new Date().getMonth() + 1}월
                    </div>
                    <button
                      onClick={() => {
                        const currentMonth =
                          payrollSearchFilter.month ||
                          new Date().getMonth() + 1;
                        const currentYear =
                          payrollSearchFilter.year || new Date().getFullYear();
                        if (currentMonth === 12) {
                          setPayrollSearchFilter((f) => ({
                            ...f,
                            month: 1,
                            year: currentYear + 1,
                          }));
                        } else {
                          setPayrollSearchFilter((f) => ({
                            ...f,
                            month: currentMonth + 1,
                          }));
                        }
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      다음달 ›
                    </button>
                    <button
                      onClick={() => {
                        const currentYear =
                          payrollSearchFilter.year || new Date().getFullYear();
                        const newYear = currentYear + 1;
                        setPayrollSearchFilter((f) => ({
                          ...f,
                          year: newYear,
                        }));
                      }}
                      className="px-1 py-1 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-xs font-medium"
                    >
                      다음연도 ››
                    </button>
                  </div>
                </th>
              </tr>

              {/* 기본시간 설정 행 */}
              <tr>
                <th
                  id="payrollBasicHoursCell"
                  colSpan="100"
                  className="bg-white"
                  style={{
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderTop: 'none',
                    padding: '4px 12px 8px 12px',
                    position: 'relative',
                    boxShadow: '-2px 0 0 0 white, 2px 0 0 0 white',
                  }}
                >
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-5">
                      <label className="text-sm font-semibold text-blue-800">
                        기본시간 설정:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={defaultHours}
                          onChange={(e) => handleEditHours(e.target.value)}
                          className="w-20 border px-2 py-1 text-right text-sm rounded"
                          min="1"
                          max="999"
                        />
                        <span className="text-sm text-gray-600">시간</span>
                        <button
                          onClick={applyDefaultHoursToTable}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
                          title="기본시간을 테이블의 모든 직원에게 적용"
                        >
                          ✓ 확정
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">
                        (모든 직원의 기본 근무시간)
                      </span>
                    </div>
                  </div>
                </th>
              </tr>

              {/* 테이블 헤더 1행 */}
              <tr className="bg-gray-50">
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[60px] bg-gray-50"
                >
                  부서
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[60px]"
                >
                  성명
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[45px]"
                >
                  직급
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[70px]"
                >
                  입사일자
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[50px]"
                >
                  시급
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-blue-100 font-semibold text-center"
                >
                  기본
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-green-100 font-semibold text-center"
                >
                  연장수당(150%)
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-green-100 font-semibold text-center"
                >
                  휴일근로수당
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-green-100 font-semibold text-center"
                >
                  야간근로수당(50%)
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-red-100 font-semibold text-center"
                >
                  지각/조퇴
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-red-100 font-semibold text-center"
                >
                  결근/무급/주휴
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  차량
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  교통비
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  통신비
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[50px]"
                >
                  기타수당
                </th>
                <th
                  colSpan="2"
                  className="border border-gray-300 px-2 py-1 bg-yellow-100 font-semibold text-center"
                >
                  년차수당
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  상여금
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-blue-200 font-semibold min-w-[75px]"
                >
                  급여합계
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  소득세
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  지방세
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  국민연금
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  건강보험
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  장기요양
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  고용보험
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  가불금
                  <br />
                  (과태료)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  매칭IRP
                  <br />
                  적립
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  경조비
                  <br />
                  (기타공제)
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  기숙사
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  건강보험
                  <br />
                  연말정산
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  장기요양
                  <br />
                  연말정산
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[55px]"
                >
                  연말정산
                  <br />
                  징수세액
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-red-200 font-semibold min-w-[75px]"
                >
                  공제합계
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 bg-green-200 font-semibold min-w-[75px]"
                >
                  차인지급액
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[25px]"
                >
                  결근
                  <br />
                  무휴
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[25px]"
                >
                  년차
                </th>
                <th
                  rowSpan="2"
                  className="border border-gray-300 px-1 py-1 font-semibold min-w-[25px]"
                >
                  지각
                  <br />
                  조퇴
                  <br />
                  외출
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px] bg-gray-50">
                  시간
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  기본급
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  시간
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  시간
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  시간
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  시간
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  일수
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[35px]">
                  일수
                </th>
                <th className="border border-gray-300 px-1 py-1 text-[11px] min-w-[60px]">
                  금액
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredPayrollData().map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {row.부서}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {row.성명}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {row.직급}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    {row.입사일자}
                  </td>
                  <td
                    className={`border border-gray-300 px-2 py-1 text-right ${
                      isPayrollEditMode
                        ? 'cursor-pointer hover:bg-yellow-50'
                        : ''
                    }`}
                    onClick={() =>
                      isPayrollEditMode &&
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '시급',
                      })
                    }
                  >
                    {isPayrollEditMode &&
                    editingPayrollCell?.rowIndex === index &&
                    editingPayrollCell?.field === '시급' ? (
                      <input
                        type="text"
                        value={row.시급 || ''}
                        onChange={(e) =>
                          updatePayrollCell(index, '시급', e.target.value)
                        }
                        onBlur={() => setEditingPayrollCell(null)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setEditingPayrollCell(null)
                        }
                        className="w-full px-1 py-0 text-right border-0 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      safeFormatNumber(row.시급) || ''
                    )}
                    {isPayrollEditMode &&
                      !(
                        editingPayrollCell?.rowIndex === index &&
                        editingPayrollCell?.field === '시급'
                      ) && (
                        <div className="text-blue-500 text-xs opacity-60">
                          클릭하여 편집
                        </div>
                      )}
                  </td>

                  {/* 기본급 */}
                  <td
                    className={`border border-gray-300 px-2 py-1 text-right ${
                      isPayrollEditMode ? 'cursor-pointer hover:bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      isPayrollEditMode &&
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '기본시간',
                      })
                    }
                  >
                    {isPayrollEditMode &&
                    editingPayrollCell?.rowIndex === index &&
                    editingPayrollCell?.field === '기본시간' ? (
                      <input
                        type="text"
                        value={row.기본시간}
                        onChange={(e) =>
                          updatePayrollCell(index, '기본시간', e.target.value)
                        }
                        onBlur={() => setEditingPayrollCell(null)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setEditingPayrollCell(null)
                        }
                        className="w-full px-1 py-0 text-right border-0 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      Math.round(row.기본시간 || 0)
                    )}
                  </td>
                  <td
                    className={`border border-gray-300 px-2 py-1 text-right ${
                      isPayrollEditMode ? 'cursor-pointer hover:bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      isPayrollEditMode &&
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '기본급',
                      })
                    }
                  >
                    {isPayrollEditMode &&
                    editingPayrollCell?.rowIndex === index &&
                    editingPayrollCell?.field === '기본급' ? (
                      <input
                        type="text"
                        value={row.기본급}
                        onChange={(e) =>
                          updatePayrollCell(index, '기본급', e.target.value)
                        }
                        onBlur={() => setEditingPayrollCell(null)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && setEditingPayrollCell(null)
                        }
                        className="w-full px-1 py-0 text-right border-0 focus:outline-none bg-transparent"
                        autoFocus
                      />
                    ) : (
                      safeFormatNumber(row.기본급)
                    )}
                  </td>

                  {/* 연장수당(150%) */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '연장수당_시간',
                      })
                    }
                  >
                    {row.연장수당_시간}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '연장수당_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.연장수당_금액)}
                  </td>

                  {/* 휴일근로수당 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '휴일근로수당_시간',
                      })
                    }
                  >
                    {row.휴일근로수당_시간}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '휴일근로수당_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.휴일근로수당_금액)}
                  </td>

                  {/* 야간근로수당(50%) */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '야간근로수당_시간',
                      })
                    }
                  >
                    {row.야간근로수당_시간}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-green-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '야간근로수당_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.야간근로수당_금액)}
                  </td>

                  {/* 지각/조퇴 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '지각조퇴_시간',
                      })
                    }
                  >
                    {row.지각조퇴_시간}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '지각조퇴_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.지각조퇴_금액)}
                  </td>

                  {/* 결근/무급/주휴 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '결근무급주휴_일수',
                      })
                    }
                  >
                    {row.결근무급주휴_일수}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '결근무급주휴_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.결근무급주휴_금액)}
                  </td>

                  {/* 수당 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-blue-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '차량',
                      })
                    }
                  >
                    {safeFormatNumber(row.차량)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-blue-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '교통비',
                      })
                    }
                  >
                    {safeFormatNumber(row.교통비)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-blue-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '통신비',
                      })
                    }
                  >
                    {safeFormatNumber(row.통신비)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-blue-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '기타수당',
                      })
                    }
                  >
                    {safeFormatNumber(row.기타수당)}
                  </td>

                  {/* 년차수당 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-yellow-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '년차수당_일수',
                      })
                    }
                  >
                    {row.년차수당_일수}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-yellow-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '년차수당_금액',
                      })
                    }
                  >
                    {safeFormatNumber(row.년차수당_금액)}
                  </td>

                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-blue-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '상여금',
                      })
                    }
                  >
                    {safeFormatNumber(row.상여금)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right bg-blue-100 font-semibold">
                    {/* ✅ 급여합계 = 기본급+연장수당+휴일근로수당+야간근로수당+지각조퇴+결근무급주휴+차량+교통비+통신비+기타수당+년차수당+상여금 */}
                    {safeFormatNumber(
                      (parseFloat(row.기본급?.toString().replace(/,/g, '')) ||
                        0) +
                        (parseFloat(
                          row.연장수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.휴일근로수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.야간근로수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['지각조퇴_금액']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['결근무급주휴_금액']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.차량?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(row.교통비?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(row.통신비?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.기타수당?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.년차수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.상여금?.toString().replace(/,/g, '')) ||
                          0)
                    )}
                  </td>

                  {/* 공제항목 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '소득세',
                      })
                    }
                  >
                    {safeFormatNumber(row.소득세)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '지방세',
                      })
                    }
                  >
                    {safeFormatNumber(row.지방세)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '국민연금',
                      })
                    }
                  >
                    {safeFormatNumber(row.국민연금)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '건강보험',
                      })
                    }
                  >
                    {safeFormatNumber(row.건강보험)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '장기요양',
                      })
                    }
                  >
                    {safeFormatNumber(row.장기요양)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '고용보험',
                      })
                    }
                  >
                    {safeFormatNumber(row.고용보험)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '가불금과태료',
                      })
                    }
                  >
                    {safeFormatNumber(row.가불금과태료)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '매칭IRP적립',
                      })
                    }
                  >
                    {safeFormatNumber(row.매칭IRP적립)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '경조비기타공제',
                      })
                    }
                  >
                    {safeFormatNumber(row.경조비기타공제)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '기숙사',
                      })
                    }
                  >
                    {safeFormatNumber(row.기숙사)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '건강보험연말정산',
                      })
                    }
                  >
                    {safeFormatNumber(row.건강보험연말정산)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '장기요양연말정산',
                      })
                    }
                  >
                    {safeFormatNumber(row.장기요양연말정산)}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-red-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '연말정산징수세액',
                      })
                    }
                  >
                    {safeFormatNumber(row.연말정산징수세액)}
                  </td>

                  <td className="border border-gray-300 px-2 py-1 text-right bg-red-100 font-semibold">
                    {/* ✅ 공제합계 = 소득세+지방세+국민연금+건강보험+장기요양+고용보험+가불금(과태료)+매칭IRP적립+경조비(기타공제)+기숙사+건강보험연말정산+장기요양연말정산+연말정산징수세액 */}
                    {safeFormatNumber(
                      (parseFloat(row.소득세?.toString().replace(/,/g, '')) ||
                        0) +
                        (parseFloat(row.지방세?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.국민연금?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.건강보험?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.장기요양?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.고용보험?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.가불금과태료?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['매칭IRP적립']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.경조비기타공제?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.기숙사?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.건강보험연말정산?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.장기요양연말정산?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.연말정산징수세액?.toString().replace(/,/g, '')
                        ) || 0)
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right bg-green-100 font-semibold">
                    {/* ✅ 차인지급액 = 급여합계 - 공제합계 (실시간 계산) */}
                    {(() => {
                      // 급여합계 실시간 계산
                      const 급여합계_계산 =
                        (parseFloat(row.기본급?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.연장수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.휴일근로수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.야간근로수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['지각조퇴_금액']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['결근무급주휴_금액']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.차량?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(row.교통비?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(row.통신비?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.기타수당?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.년차수당_금액?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.상여금?.toString().replace(/,/g, '')) ||
                          0);

                      // 공제합계 실시간 계산
                      const 공제합계_계산 =
                        (parseFloat(row.소득세?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(row.지방세?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.국민연금?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.건강보험?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.장기요양?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.고용보험?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.가불금과태료?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row['매칭IRP적립']?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.경조비기타공제?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(row.기숙사?.toString().replace(/,/g, '')) ||
                          0) +
                        (parseFloat(
                          row.건강보험연말정산?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.장기요양연말정산?.toString().replace(/,/g, '')
                        ) || 0) +
                        (parseFloat(
                          row.연말정산징수세액?.toString().replace(/,/g, '')
                        ) || 0);

                      return safeFormatNumber(급여합계_계산 - 공제합계_계산);
                    })()}
                  </td>

                  {/* 근태현황 */}
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '결근무휴',
                      })
                    }
                  >
                    {row.결근무휴}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '년차',
                      })
                    }
                  >
                    {row.년차}
                  </td>
                  <td
                    className="border border-gray-300 px-2 py-1 text-right cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setEditingPayrollCell({
                        rowIndex: index,
                        field: '지각조퇴외출',
                      })
                    }
                  >
                    {row.지각조퇴외출}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 초기화 선택 모달 */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                급여 데이터 초기화
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                초기화할 범위를 선택하세요:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleResetPayrollData('month')}
                  className="w-full px-4 py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center transition-colors"
                >
                  <RefreshCw size={16} className="mr-2" />
                  해당월만 초기화 ({payrollSearchFilter.year}년{' '}
                  {payrollSearchFilter.month}월)
                </button>
                <button
                  onClick={() => handleResetPayrollData('all')}
                  className="w-full px-4 py-3 bg-red-400 text-white rounded-lg hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                  <RefreshCw size={16} className="mr-2" />
                  전체 초기화
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayrollManagement;
