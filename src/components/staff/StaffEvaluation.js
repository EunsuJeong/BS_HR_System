import React, { useState, useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import { EVALUATION_PAGE_SIZE } from '../common/common_staff_evaluation';

/**
 * STAFF ⑧ 직원 평가 컴포넌트
 * 직원 모드에서 자신의 평가 내역을 확인하는 컴포넌트
 */
const StaffEvaluation = ({
  currentUser,
  evaluationData,
  getText,
  selectedLanguage,
  fontSize = 'normal',
}) => {
  const [showEvaluationMorePopup, setShowEvaluationMorePopup] = useState(false);
  const [evaluationPage, setEvaluationPage] = useState(1);
  const evaluationScrollRef = useRef(null);

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showEvaluationMorePopup && evaluationScrollRef.current) {
      evaluationScrollRef.current.scrollTop = 0;
    }
  }, [showEvaluationMorePopup, evaluationPage]);

  // fontSize에 따른 공통 클래스 반환 (버튼, input, select 모두 동일)
  const getCommonClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-2xs px-1.5 py-0.5';
      case 'large':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-2 py-1';
    }
  };

  // fontSize에 따른 테이블 글씨 크기 클래스
  const getTableTextClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-2xs';
      case 'large':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  const commonClass = getCommonClass();
  const tableTextClass = getTableTextClass();

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 text-pink-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('직원 평가', 'Evaluation')}
            </h3>
          </div>
          <button
            className="text-blue-500 text-2xs hover:text-blue-600"
            onClick={() => {
              setEvaluationPage(1);
              setShowEvaluationMorePopup(true);
            }}
          >
            {getText('더보기', 'More')} &gt;
          </button>
        </div>

        {/* 직원 평가 더보기 팝업 */}
        {showEvaluationMorePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
              <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-800">
                  {getText(
                    '직원 평가 내역',
                    'Employee Evaluation History'
                  )}
                </h3>
                <button
                  onClick={() => setShowEvaluationMorePopup(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>
              <div ref={evaluationScrollRef} className="flex-1 overflow-y-auto p-6">
                <table className={`w-full ${tableTextClass}`}>
                  <thead className="bg-gray-100">
                    <tr>
                      <th className={`text-center py-2 px-3 ${tableTextClass}`}>
                        {getText('날짜', 'Date (Year)')}
                      </th>
                      <th className={`text-center py-2 px-3 ${tableTextClass}`}>
                        {getText('등급', 'Grade')}
                      </th>
                      <th className={`text-center py-2 px-3 ${tableTextClass}`}>
                        {getText('내용', 'Content')}
                      </th>
                      <th className={`text-center py-2 px-3 ${tableTextClass}`}>
                        {getText('상태', 'Status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {evaluationData
                      .filter(
                        (perf) => perf.employeeId === currentUser.id
                      )
                      .slice(
                        (evaluationPage - 1) * EVALUATION_PAGE_SIZE,
                        evaluationPage * EVALUATION_PAGE_SIZE
                      )
                      .map((perf, index) => (
                        <tr key={perf.id || `eval-${perf.employeeId}-${perf.year}-${index}`}>
                          <td className={`text-center py-2 px-3 ${tableTextClass}`}>
                            {perf.year}
                          </td>
                          <td className={`text-center py-2 px-3 font-semibold ${tableTextClass}`}>
                            {perf.grade}
                          </td>
                          <td className={`text-center py-2 px-3 ${tableTextClass}`} style={{ lineHeight: '1.15' }}>
                            {perf.content || '사유 없음'}
                          </td>
                          <td className={`text-center py-2 px-3 ${tableTextClass}`}>
                            <span
                              className={`px-2 py-1 rounded-full ${tableTextClass} ${
                                perf.status === '확정'
                                  ? 'bg-green-100 text-green-700'
                                  : perf.status === '임시저장'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {perf.status || '확정'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {evaluationData.filter(
                      (perf) => perf.employeeId === currentUser.id
                    ).length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className={`text-center text-gray-400 py-8 ${tableTextClass}`}
                        >
                          {getText(
                            '등록된 평가 내역이 없습니다.',
                            'No registered evaluation records.'
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* 페이지네이션 */}
                <div className="flex justify-center items-center py-3 space-x-2">
                  <button
                    onClick={() =>
                      setEvaluationPage(Math.max(1, evaluationPage - 1))
                    }
                    disabled={evaluationPage === 1}
                    className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
                  >
                    {selectedLanguage === 'en' ? 'Prev' : '이전'}
                  </button>
                  <span className={`${tableTextClass} text-gray-600`}>
                    {evaluationPage} /{' '}
                    {Math.max(
                      1,
                      Math.ceil(
                        evaluationData.filter(
                          (perf) => perf.employeeId === currentUser.id
                        ).length / EVALUATION_PAGE_SIZE
                      )
                    )}
                  </span>
                  <button
                    onClick={() =>
                      setEvaluationPage(
                        Math.min(
                          Math.ceil(
                            evaluationData.filter(
                              (perf) =>
                                perf.employeeId === currentUser.id
                            ).length / EVALUATION_PAGE_SIZE
                          ),
                          evaluationPage + 1
                        )
                      )
                    }
                    disabled={
                      evaluationPage >=
                      Math.ceil(
                        evaluationData.filter(
                          (perf) => perf.employeeId === currentUser.id
                        ).length / EVALUATION_PAGE_SIZE
                      )
                    }
                    className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
                  >
                    {selectedLanguage === 'en' ? 'Next' : '다음'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default StaffEvaluation;
