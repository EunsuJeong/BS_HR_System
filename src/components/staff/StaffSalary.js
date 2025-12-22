import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Eye, EyeOff } from 'lucide-react';
import { SALARY_PAGE_SIZE } from '../common/common_staff_payroll';
import PayrollAPI from '../../api/payroll';

/**
 * STAFF ⑥ 급여 내역 컴포넌트
 * 직원 모드에서 급여 내역을 확인하는 컴포넌트
 */
const StaffSalary = ({
  currentUser,
  generateSalaryHistory,
  getText,
  selectedLanguage,
  fontSize = 'normal',
  payrollByMonth = {},
}) => {
  const [showSalaryHistoryPopup, setShowSalaryHistoryPopup] = useState(false);
  const [selectedSalaryHistory, setSelectedSalaryHistory] = useState(null);
  const [salaryPage, setSalaryPage] = useState(1);
  const [showSalaryPasswordPopup, setShowSalaryPasswordPopup] = useState(false);
  const [salaryPasswordInput, setSalaryPasswordInput] = useState('');
  const [salaryPasswordError, setSalaryPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localPayrollData, setLocalPayrollData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const salaryScrollRef = useRef(null);

  // 직원 로그인 시 서버에서 본인의 급여 데이터 로드
  useEffect(() => {
    const loadEmployeePayroll = async () => {
      if (!currentUser || !currentUser.id) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await PayrollAPI.getEmployeePayroll(currentUser.id);

        if (response && response.data) {
          // 서버에서 받은 데이터를 월별로 그룹화하고 필드명 매핑
          const groupedData = {};
          response.data.forEach((payroll) => {
            const yearMonth =
              payroll.yearMonth ||
              payroll.귀속년월 ||
              `${payroll.year}-${String(payroll.month).padStart(2, '0')}`;

            // 서버 데이터를 클라이언트 형식으로 변환 (영문 -> 한글 매핑 추가)
            const mappedPayroll = {
              ...payroll,
              귀속년월: yearMonth,
              성명: payroll.name || payroll.성명,
              직원명: payroll.name || payroll.직원명,
              부서: payroll.department || payroll.부서,
              직급: payroll.position || payroll.직급,
              기본급: payroll.basicPay || payroll.기본급 || 0,
              연장수당_금액: payroll.overtimePay || payroll.연장수당_금액 || 0,
              연장수당_시간:
                payroll.overtimeHours || payroll.연장수당_시간 || 0,
              휴일근로수당_금액:
                payroll.holidayWorkPay || payroll.휴일근로수당_금액 || 0,
              휴일근로수당_시간:
                payroll.holidayWorkHours || payroll.휴일근로수당_시간 || 0,
              야간근로수당_금액:
                payroll.nightWorkPay || payroll.야간근로수당_금액 || 0,
              야간근로수당_시간:
                payroll.nightWorkHours || payroll.야간근로수당_시간 || 0,
              지각조퇴_금액:
                payroll.lateEarlyDeduction || payroll.지각조퇴_금액 || 0,
              지각조퇴_시간:
                payroll.lateEarlyHours || payroll.지각조퇴_시간 || 0,
              결근무급주휴_금액:
                payroll.absentDeduction || payroll.결근무급주휴_금액 || 0,
              결근무급주휴_일수:
                payroll.absentDays || payroll.결근무급주휴_일수 || 0,
              차량: payroll.carAllowance || payroll.차량 || 0,
              교통비: payroll.transportAllowance || payroll.교통비 || 0,
              통신비: payroll.phoneAllowance || payroll.통신비 || 0,
              기타수당: payroll.otherAllowance || payroll.기타수당 || 0,
              년차수당_금액:
                payroll.annualLeavePay || payroll.년차수당_금액 || 0,
              년차수당_일수:
                payroll.annualLeaveDays || payroll.년차수당_일수 || 0,
              상여금: payroll.bonus || payroll.상여금 || 0,
              소득세: payroll.incomeTax || payroll.소득세 || 0,
              지방세: payroll.localTax || payroll.지방세 || 0,
              국민연금: payroll.nationalPension || payroll.국민연금 || 0,
              건강보험: payroll.healthInsurance || payroll.건강보험 || 0,
              장기요양: payroll.longTermCare || payroll.장기요양 || 0,
              고용보험: payroll.employmentInsurance || payroll.고용보험 || 0,
              가불금과태료:
                payroll.advanceDeduction || payroll.가불금과태료 || 0,
              매칭IRP적립: payroll.irpMatching || payroll.매칭IRP적립 || 0,
              경조비기타공제:
                payroll.otherDeduction || payroll.경조비기타공제 || 0,
              기숙사: payroll.dormitory || payroll.기숙사 || 0,
              건강보험연말정산:
                payroll.healthYearEnd || payroll.건강보험연말정산 || 0,
              장기요양연말정산:
                payroll.longTermYearEnd || payroll.장기요양연말정산 || 0,
              연말정산징수세액:
                payroll.taxYearEnd || payroll.연말정산징수세액 || 0,
            };

            if (!groupedData[yearMonth]) {
              groupedData[yearMonth] = [];
            }
            groupedData[yearMonth].push(mappedPayroll);
          });
          setLocalPayrollData(groupedData);
        }
      } catch (error) {
        console.error('❌ 급여 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeePayroll();
  }, [currentUser]);

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showSalaryHistoryPopup && salaryScrollRef.current) {
      salaryScrollRef.current.scrollTop = 0;
    }
  }, [showSalaryHistoryPopup, salaryPage]);

  // 서버에서 로드한 데이터 우선 사용, 없으면 props 사용
  const effectivePayrollData =
    Object.keys(localPayrollData).length > 0
      ? localPayrollData
      : payrollByMonth;

  // 관리자 모드 급여 관리에서 실제로 추가된 급여 데이터만 가져오기
  // generateSalaryHistory는 payrollByMonth에서 실제 데이터만 가져옵니다
  const actualSalaryData = generateSalaryHistory
    ? generateSalaryHistory(
        currentUser.joinDate,
        currentUser.id,
        effectivePayrollData
      )
    : [];

  // fontSize에 따른 버튼 클래스 반환
  const getButtonClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-2xs px-1.5 py-0.5';
      case 'large':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  const btnClass = getButtonClass();

  // 급여 비밀번호 확인 함수
  const handleSalaryPasswordConfirmLocal = () => {
    const inputPassword = salaryPasswordInput.trim();
    const userPassword = currentUser.password
      ? String(currentUser.password).trim()
      : '';

    if (inputPassword === userPassword) {
      setShowSalaryPasswordPopup(false);
      setShowSalaryHistoryPopup(true);
      setSalaryPasswordInput('');
      setSalaryPasswordError('');
      setShowPassword(false);
    } else {
      setSalaryPasswordError(
        getText('비밀번호가 일치하지 않습니다.', 'Password does not match.')
      );
    }
  };

  return (
    <>
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <DollarSign className="w-5 h-5 text-emerald-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('급여 내역', 'Salary History')}
            </h3>
          </div>
          <button
            onClick={() => {
              setSalaryPage(1);
              setShowSalaryPasswordPopup(true);
            }}
            className="text-blue-500 text-2xs hover:text-blue-600"
          >
            {getText('더보기', 'More')} &gt;
          </button>
        </div>
        <div className="overflow-x-auto"></div>

        {/* 급여 전체 내역 팝업 */}
        {showSalaryHistoryPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-6xl w-full mx-4 max-h-[80vh] flex flex-col">
              <div className="p-6 pb-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {getText('전체 급여 내역', 'Complete Salary History')}
                  </h3>
                  <button
                    onClick={() => {
                      setShowSalaryHistoryPopup(false);
                      setSelectedSalaryHistory(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                ref={salaryScrollRef}
                style={{
                  height: '500px',
                  overflowY: 'auto',
                  padding: '1.5rem',
                }}
              >
                {!selectedSalaryHistory ? (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-center py-2 px-3">
                              {getText('지급월', 'Pay Month')}
                            </th>
                            <th className="text-center py-2 px-3">
                              {getText('지급내역', 'Gross Pay')}
                            </th>
                            <th className="text-center py-2 px-3">
                              {getText('공제내역', 'Deductions')}
                            </th>
                            <th className="text-center py-2 px-3">
                              {getText('실수령액', 'Net Pay')}
                            </th>
                            <th className="text-center py-2 px-3">
                              {getText('상세보기', 'Details')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {actualSalaryData
                            .slice(
                              (salaryPage - 1) * SALARY_PAGE_SIZE,
                              salaryPage * SALARY_PAGE_SIZE
                            )
                            .map((salary, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="text-center py-2 px-3 font-semibold">
                                  {salary.month}
                                </td>
                                <td className="text-right py-2 px-3">
                                  {salary.totalGross.toLocaleString()}
                                  {getText('원', ' KRW')}
                                </td>
                                <td className="text-right py-2 px-3">
                                  {salary.totalDeduction.toLocaleString()}
                                  {getText('원', ' KRW')}
                                </td>
                                <td className="text-right py-2 px-3 font-bold text-emerald-600">
                                  {salary.netPay.toLocaleString()}
                                  {getText('원', ' KRW')}
                                </td>
                                <td className="text-center py-2 px-3">
                                  <button
                                    onClick={() =>
                                      setSelectedSalaryHistory(salary)
                                    }
                                    className={`${btnClass} bg-blue-500 text-white rounded hover:bg-blue-600`}
                                  >
                                    {getText('보기', 'View')}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 페이지네이션 */}
                    {actualSalaryData.length > 0 && (
                      <div className="flex justify-center items-center mt-6 space-x-2">
                        <button
                          onClick={() =>
                            setSalaryPage(Math.max(1, salaryPage - 1))
                          }
                          disabled={salaryPage === 1}
                          className={`${btnClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50`}
                        >
                          {selectedLanguage === 'en' ? 'Prev' : '이전'}
                        </button>
                        <span className="text-xs text-gray-600">
                          {salaryPage} /{' '}
                          {Math.max(
                            1,
                            Math.ceil(
                              actualSalaryData.length / SALARY_PAGE_SIZE
                            )
                          )}
                        </span>
                        <button
                          onClick={() =>
                            setSalaryPage(
                              Math.min(
                                Math.ceil(
                                  actualSalaryData.length / SALARY_PAGE_SIZE
                                ),
                                salaryPage + 1
                              )
                            )
                          }
                          disabled={
                            salaryPage >=
                            Math.ceil(
                              actualSalaryData.length / SALARY_PAGE_SIZE
                            )
                          }
                          className={`${btnClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50`}
                        >
                          {selectedLanguage === 'en' ? 'Next' : '다음'}
                        </button>
                      </div>
                    )}
                    {actualSalaryData.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-xs">
                          {getText('급여 내역이 없습니다', 'No salary records')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setSelectedSalaryHistory(null)}
                        className={`${btnClass} text-blue-500 hover:text-blue-600`}
                      >
                        ← {getText('목록으로', 'Back to List')}
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">
                          {selectedSalaryHistory.month}{' '}
                          {getText('급여 상세 내역', 'Salary Details')}
                        </h4>
                      </div>

                      {/* 지급 내역 */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">
                          {getText('지급 내역', 'Income Details')}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse table-fixed">
                            <colgroup>
                              <col className="w-1/2" />
                              <col className="w-1/2" />
                            </colgroup>
                            <tbody className="bg-white">
                              {selectedSalaryHistory.incomeDetails ? (
                                selectedSalaryHistory.incomeDetails.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td className="py-2 px-3 border border-gray-300 bg-gray-50">
                                        {item.label}
                                      </td>
                                      <td className="py-2 px-3 border border-gray-300 text-right">
                                        {item.hours !== null &&
                                          item.hours > 0 && (
                                            <span className="text-gray-600 mr-2">
                                              ({item.hours}
                                              {item.label.includes('일수') ||
                                              item.label.includes('년차') ||
                                              item.label.includes('결근')
                                                ? '일'
                                                : '시간'}
                                              )
                                            </span>
                                          )}
                                        {item.amount.toLocaleString()}
                                        {getText('원', ' KRW')}
                                      </td>
                                    </tr>
                                  )
                                )
                              ) : (
                                <tr>
                                  <td
                                    className="py-2 px-3 border border-gray-300 text-center"
                                    colSpan="2"
                                  >
                                    {getText(
                                      '급여 상세 데이터를 불러오는 중...',
                                      'Loading salary details...'
                                    )}
                                  </td>
                                </tr>
                              )}
                              <tr className="font-semibold bg-blue-50">
                                <td className="py-2 px-3 border border-gray-300">
                                  {getText('지급계', 'Total Gross')}
                                </td>
                                <td className="py-2 px-3 border border-gray-300 text-right">
                                  {selectedSalaryHistory.totalGross.toLocaleString()}
                                  {getText('원', ' KRW')}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 공제 내역 */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">
                          {getText('공제 내역', 'Deduction Details')}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse table-fixed">
                            <colgroup>
                              <col className="w-1/2" />
                              <col className="w-1/2" />
                            </colgroup>
                            <tbody className="bg-white">
                              {selectedSalaryHistory.deductionDetails ? (
                                selectedSalaryHistory.deductionDetails.map(
                                  (item, index) => (
                                    <tr key={index}>
                                      <td className="py-2 px-3 border border-gray-300 bg-gray-50">
                                        {item.label}
                                      </td>
                                      <td className="py-2 px-3 border border-gray-300 text-right">
                                        {item.amount.toLocaleString()}
                                        {getText('원', ' KRW')}
                                      </td>
                                    </tr>
                                  )
                                )
                              ) : (
                                <tr>
                                  <td
                                    className="py-2 px-3 border border-gray-300 text-center"
                                    colSpan="2"
                                  >
                                    {getText(
                                      '공제 상세 데이터를 불러오는 중...',
                                      'Loading deduction details...'
                                    )}
                                  </td>
                                </tr>
                              )}
                              <tr className="font-semibold bg-red-50">
                                <td className="py-2 px-3 border border-gray-300">
                                  {getText('공제계', 'Total Deductions')}
                                </td>
                                <td className="py-2 px-3 border border-gray-300 text-right">
                                  {selectedSalaryHistory.totalDeduction.toLocaleString()}
                                  {getText('원', ' KRW')}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 실수령액 */}
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-emerald-800">
                            {getText('실수령액', 'Net Pay')}
                          </span>
                          <span className="text-lg font-bold text-emerald-600">
                            {selectedSalaryHistory.netPay.toLocaleString()}
                            {getText('원', ' KRW')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 급여 비밀번호 확인 팝업 */}
        {showSalaryPasswordPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-4 flex flex-col">
              <div className="p-6 pb-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-800">
                    급여 조회 인증
                  </h3>
                  <button
                    onClick={() => {
                      setShowSalaryPasswordPopup(false);
                      setSalaryPasswordInput('');
                      setSalaryPasswordError('');
                      setShowPassword(false);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="text-xs p-6 space-y-4">
                <p className="text-gray-600">
                  {getText(
                    '비밀번호를 입력하세요',
                    'Please enter your password'
                  )}
                </p>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={salaryPasswordInput}
                    onChange={(e) => setSalaryPasswordInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSalaryPasswordConfirmLocal();
                      }
                    }}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
                    placeholder={getText('비밀번호', 'Password')}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {salaryPasswordError && (
                  <div className="text-red-500 text-xs">
                    {salaryPasswordError}
                  </div>
                )}
                <button
                  onClick={handleSalaryPasswordConfirmLocal}
                  className="w-full py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StaffSalary;
