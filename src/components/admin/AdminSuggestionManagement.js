import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import { exportSuggestionsToXLSX } from '../common/common_admin_suggestion';
import { getSuggestionCategoryText } from '../common/common_staff_suggestion';

const AdminSuggestionManagement = ({
  suggestions,
  setSuggestions,
  suggestionSearch,
  setSuggestionSearch,
  editingSuggestion,
  setEditingSuggestion,
  editingSuggestionRemark,
  setEditingSuggestionRemark,
  showSuggestionApprovalPopup,
  setShowSuggestionApprovalPopup,
  suggestionApprovalData,
  setSuggestionApprovalData,
  COMPANY_STANDARDS,
  STATUS_COLORS,
  formatDateByLang,
  getFilteredSuggestions,
  getSortedSuggestions,
  handleSuggestionSort,
  handleApproveSuggestion,
  handleRejectSuggestion,
  handleSuggestionApprovalConfirm,
  suggestionPage,
  setSuggestionPage,
  editingSuggestionRow,
  setEditingSuggestionRow,
  editingSuggestionData,
  setEditingSuggestionData,
}) => {
  // 검색 필터 변경시 페이지 1로 리셋
  useEffect(() => {
    setSuggestionPage(1);
  }, [
    suggestionSearch.year,
    suggestionSearch.month,
    suggestionSearch.day,
    suggestionSearch.type,
    suggestionSearch.department,
    suggestionSearch.status,
    suggestionSearch.keyword,
    setSuggestionPage,
  ]);

  // 건의 내역 수정 핸들러
  const handleEditSuggestion = (suggestion) => {
    setEditingSuggestionRow(suggestion.id);
    setEditingSuggestionData({
      employeeId: suggestion.employeeId,
      name: suggestion.name,
      department: suggestion.department,
      category: suggestion.category,
      title: suggestion.title,
      content: suggestion.content,
      remark: suggestion.remark || '',
      status: suggestion.status,
    });
  };

  // 건의 내역 수정 저장 핸들러
  const handleSaveSuggestion = async (suggestionId) => {
    try {
      const { default: SuggestionAPI } = await import('../../api/suggestion');

      // DB 업데이트
      await SuggestionAPI.update(suggestionId, editingSuggestionData);

      // 로컬 state 업데이트
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === suggestionId ? { ...s, ...editingSuggestionData } : s
        )
      );

      setEditingSuggestionRow(null);
      setEditingSuggestionData({});
      alert('건의 내역이 수정되었습니다.');
    } catch (error) {
      console.error('❌ 건의 내역 수정 실패:', error);
      alert('건의 내역 수정 중 오류가 발생했습니다.');
    }
  };

  // 건의 내역 수정 취소 핸들러
  const handleCancelSuggestion = () => {
    setEditingSuggestionRow(null);
    setEditingSuggestionData({});
  };

  return (
    <div className="space-y-6 w-full h-full">
      <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
            건의 관리
          </h3>

          <div className="flex-1"></div>

          {/* 검색 필터 */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="연도"
              value={suggestionSearch.year}
              onChange={(e) =>
                setSuggestionSearch((s) => ({ ...s, year: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-20"
            />
            <input
              type="text"
              placeholder="월"
              value={suggestionSearch.month}
              onChange={(e) =>
                setSuggestionSearch((s) => ({
                  ...s,
                  month: e.target.value,
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-20"
            />
            <input
              type="text"
              placeholder="일"
              value={suggestionSearch.day}
              onChange={(e) =>
                setSuggestionSearch((s) => ({ ...s, day: e.target.value }))
              }
              className="px-3 py-1 border rounded-lg text-sm w-20"
            />
            <select
              value={suggestionSearch.type}
              onChange={(e) =>
                setSuggestionSearch((s) => ({ ...s, type: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-40"
            >
              <option value="전체">전체 유형</option>
              <option value="구매">구매 (소모품)</option>
              <option value="기타">건의 (대표이사)</option>
            </select>
            <select
              value={suggestionSearch.department}
              onChange={(e) =>
                setSuggestionSearch((s) => ({
                  ...s,
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
              value={suggestionSearch.status}
              onChange={(e) =>
                setSuggestionSearch((s) => ({
                  ...s,
                  status: e.target.value,
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-40"
            >
              <option value="전체">전체 상태</option>
              <option value="대기">대기</option>
              <option value="승인">승인</option>
              <option value="반려">반려</option>
            </select>
            <input
              type="text"
              placeholder="사번 또는 이름"
              value={suggestionSearch.keyword}
              onChange={(e) =>
                setSuggestionSearch((s) => ({
                  ...s,
                  keyword: e.target.value,
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-60"
            />
          </div>

          <button
            onClick={() =>
              exportSuggestionsToXLSX(
                suggestions,
                getFilteredSuggestions,
                formatDateByLang
              )
            }
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center whitespace-nowrap"
          >
            <Download size={16} className="mr-2" />
            다운로드
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                <th className="text-center py-1 px-2 min-w-[90px]">
                  신청일
                  <button
                    onClick={() => handleSuggestionSort('applyDate')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[90px]">
                  결재일
                  <button
                    onClick={() => handleSuggestionSort('approvalDate')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[80px]">
                  사번
                  <button
                    onClick={() => handleSuggestionSort('employeeId')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[80px]">
                  이름
                  <button
                    onClick={() => handleSuggestionSort('name')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[100px]">
                  부서
                  <button
                    onClick={() => handleSuggestionSort('department')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[80px]">
                  유형
                  <button
                    onClick={() => handleSuggestionSort('type')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[350px]">
                  내용
                  <button
                    onClick={() => handleSuggestionSort('content')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[120px]">
                  비고
                  <button
                    onClick={() => handleSuggestionSort('remark')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[80px]">
                  상태
                  <button
                    onClick={() => handleSuggestionSort('status')}
                    className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ▼
                  </button>
                </th>
                <th className="text-center py-1 px-2 min-w-[150px]">결제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(() => {
                const filteredSuggestions = getSortedSuggestions(
                  getFilteredSuggestions(suggestions)
                );

                if (filteredSuggestions.length === 0) {
                  return (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-8 text-gray-500"
                      >
                        건의사항이 없습니다.
                      </td>
                    </tr>
                  );
                }

                return filteredSuggestions
                  .slice((suggestionPage - 1) * 16, suggestionPage * 16)
                  .map((s) => {
                    const isEditing = editingSuggestionRow === s.id;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="text-center py-2 px-2">{s.applyDate}</td>
                        <td className="text-center py-2 px-2">
                          {s.approvalDate || '-'}
                        </td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={
                                editingSuggestionData.employeeId || s.employeeId
                              }
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  employeeId: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          ) : (
                            s.employeeId
                          )}
                        </td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingSuggestionData.name || s.name}
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded text-center"
                            />
                          ) : (
                            s.name
                          )}
                        </td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <select
                              value={
                                editingSuggestionData.department || s.department
                              }
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  department: e.target.value,
                                }))
                              }
                              className="w-24 px-2 py-1 border rounded text-center"
                            >
                              {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>
                                  {dept}
                                </option>
                              ))}
                            </select>
                          ) : (
                            s.department
                          )}
                        </td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <select
                              value={editingSuggestionData.category || s.type}
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  category: e.target.value,
                                }))
                              }
                              className="w-32 px-2 py-1 border rounded text-center"
                            >
                              <option value="구매">구매 (소모품)</option>
                              <option value="기타">건의 (대표이사)</option>
                            </select>
                          ) : (
                            getSuggestionCategoryText(s.type, 'ko')
                          )}
                        </td>
                        <td className="text-left py-2 px-2">
                          {isEditing ? (
                            <textarea
                              value={editingSuggestionData.content || s.content}
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  content: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border rounded"
                              rows="2"
                            />
                          ) : (
                            <div className="max-w-xs text-left whitespace-normal break-words line-clamp-3">
                              {s.content}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-2 px-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={
                                editingSuggestionData.remark || s.remark || ''
                              }
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  remark: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border rounded text-center"
                            />
                          ) : (
                            <div
                              className="max-w-[100px] text-center whitespace-normal break-words line-clamp-2 mx-auto"
                              title={s.remark || '-'}
                            >
                              {s.remark || '-'}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-1 px-2">
                          {isEditing ? (
                            <select
                              value={editingSuggestionData.status || s.status}
                              onChange={(e) =>
                                setEditingSuggestionData((prev) => ({
                                  ...prev,
                                  status: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 border rounded text-center"
                            >
                              <option value="대기">대기</option>
                              <option value="승인">승인</option>
                              <option value="반려">반려</option>
                            </select>
                          ) : (
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                STATUS_COLORS[s.status] || STATUS_COLORS['대기']
                              }`}
                            >
                              {s.status}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-1 px-2">
                          {isEditing ? (
                            <>
                              <button
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                onClick={() => handleSaveSuggestion(s.id)}
                              >
                                저장
                              </button>
                              <button
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                                onClick={handleCancelSuggestion}
                              >
                                취소
                              </button>
                            </>
                          ) : s.status === '대기' ? (
                            <>
                              <button
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-1 hover:bg-blue-200"
                                onClick={() => handleApproveSuggestion(s.id)}
                              >
                                승인
                              </button>
                              <button
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                                onClick={() => handleRejectSuggestion(s.id)}
                              >
                                반려
                              </button>
                            </>
                          ) : (
                            <button
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                              onClick={() => handleEditSuggestion(s)}
                            >
                              수정
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  });
              })()}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {(() => {
          const filteredCount = getSortedSuggestions(
            getFilteredSuggestions(suggestions)
          ).length;
          if (filteredCount <= 16) return null;

          return (
            <div className="flex justify-center mt-4 gap-1">
              {Array.from({
                length: Math.ceil(filteredCount / 16),
              }).map((_, i) => (
                <button
                  key={i}
                  className={`px-3 py-1 rounded ${
                    suggestionPage === i + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  onClick={() => setSuggestionPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 승인/반려 비고 입력 팝업 */}
      {showSuggestionApprovalPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {suggestionApprovalData.type === 'approve'
                  ? '승인 사유 입력'
                  : '반려 사유 입력'}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {suggestionApprovalData.type === 'approve'
                    ? '승인 사유 (선택사항)'
                    : '반려 사유 (선택사항)'}
                </label>
                <textarea
                  value={suggestionApprovalData.remark}
                  onChange={(e) =>
                    setSuggestionApprovalData((prev) => ({
                      ...prev,
                      remark: e.target.value,
                    }))
                  }
                  placeholder={
                    suggestionApprovalData.type === 'approve'
                      ? '승인 사유를 입력하세요...'
                      : '반려 사유를 입력하세요... (미입력 시 "사유 없음"으로 처리됩니다)'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSuggestionApprovalConfirm}
                  className={`flex-1 px-4 py-2 text-white rounded-lg ${
                    suggestionApprovalData.type === 'approve'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {suggestionApprovalData.type === 'approve' ? '승인' : '반려'}
                </button>
                <button
                  onClick={() => {
                    setShowSuggestionApprovalPopup(false);
                    setSuggestionApprovalData({
                      id: null,
                      type: '',
                      remark: '',
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비고 수정 팝업 */}
      {editingSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">비고 수정</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비고
                </label>
                <textarea
                  value={editingSuggestionRemark}
                  onChange={(e) => setEditingSuggestionRemark(e.target.value)}
                  placeholder="비고를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSuggestions((prev) =>
                      prev.map((sg) =>
                        sg.id === editingSuggestion
                          ? { ...sg, remark: editingSuggestionRemark }
                          : sg
                      )
                    );
                    setEditingSuggestion(null);
                    setEditingSuggestionRemark('');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditingSuggestion(null);
                    setEditingSuggestionRemark('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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

export default AdminSuggestionManagement;
