import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  SUG_PAGE_SIZE,
  getSuggestionCategoryText,
  useStaffSuggestion,
} from '../common/common_staff_suggestion';
import { SuggestionAPI } from '../../api/communication';
import { useAuthContext } from '../../contexts/AuthContext';

const StaffSuggestion = ({
  suggestions,
  setSuggestions,
  getText,
  selectedLanguage,
  send자동알림,
  suggestionPage,
  setSuggestionPage,
  fontSize = 'normal',
  onEditingChange,
  formatDateByLang,
}) => {
  const { currentUser } = useAuthContext();
  const [applyTitle, setApplyTitle] = useState('');
  const [applyContent, setApplyContent] = useState('');
  const [suggestionInput, setSuggestionInput] = useState('구매');
  const [showSuggestionApplyPopup, setShowSuggestionApplyPopup] = useState(false);

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
  const [showSuggestionMorePopup, setShowSuggestionMorePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editingSuggestionContent, setEditingSuggestionContent] = useState('');
  const [editingSuggestionTitle, setEditingSuggestionTitle] = useState('');
  const [editingSuggestionRemark, setEditingSuggestionRemark] = useState('');
  const suggestionScrollRef = useRef(null);
  const textareaRef = useRef(null);
  const selectRef = useRef(null);

  // select 실제 크기 변화 감지 → textarea minHeight 자동 동기화
  useEffect(() => {
    if (!selectRef.current || !textareaRef.current) return;

    const observer = new ResizeObserver(() => {
      if (selectRef.current && textareaRef.current) {
        textareaRef.current.style.minHeight = selectRef.current.offsetHeight + 'px';
      }
    });

    observer.observe(selectRef.current);
    return () => observer.disconnect();
  }, []);

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showSuggestionMorePopup && suggestionScrollRef.current) {
      suggestionScrollRef.current.scrollTop = 0;
    }
  }, [showSuggestionMorePopup, suggestionPage]);

  // 편집 중 상태 → App.js에 전달 (자동 새로고침 연기용)
  useEffect(() => {
    const isEditing = !!(applyTitle || applyContent) || showSuggestionApplyPopup || showEditPopup;
    onEditingChange?.(isEditing);
  }, [applyTitle, applyContent, showSuggestionApplyPopup, showEditPopup, onEditingChange]);

  // 더보기 팝업 열릴 때 1회 조회 + 10분 polling
  useEffect(() => {
    if (!showSuggestionMorePopup || !currentUser?.id) return;

    const load = async () => {
      try {
        const dbSuggestions = await SuggestionAPI.list(currentUser.id, null);
        if (Array.isArray(dbSuggestions) && dbSuggestions.length > 0) {
          setSuggestions(
            dbSuggestions.map((s) => ({
              id: s._id,
              _id: s._id,
              employeeId: s.employeeId,
              name: s.name || '',
              department: s.department || '',
              type: s.type,
              title: s.title,
              content: s.content,
              status: s.status,
              remark: s.remark || '',
              approver: s.approver,
              approvalDate: formatDateByLang ? formatDateByLang(s.approvalDate) : s.approvalDate,
              applyDate: s.applyDate || (s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : ''),
              createdAt: s.createdAt,
              date: s.applyDate || (s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : ''),
            }))
          );
        }
      } catch (err) {
        console.error('❌ [건의 더보기] 건의사항 데이터 재조회 실패:', err);
      }
    };

    load();
    const intervalId = setInterval(load, 10 * 60 * 1000); // 10분 polling
    return () => clearInterval(intervalId);
  }, [showSuggestionMorePopup, currentUser, setSuggestions, formatDateByLang]);

  // applyContent가 빈 값이 되면 textarea 높이 초기화
  useEffect(() => {
    if (applyContent === '' && textareaRef.current) {
      textareaRef.current.style.height = '';
    }
  }, [applyContent]);

  // fontSize에 따른 공통 클래스 반환 (버튼, input, select 모두 동일)
  const getCommonClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-2xs px-1.5 py-0.5';
      case 'large':
        return 'text-sm px-3 py-1.5';
      default:
        return 'text-xs px-1 py-1';
    }
  };

  // fontSize에 따른 placeholder 클래스 반환
  const getPlaceholderClass = () => {
    switch (fontSize) {
      case 'small':
        return 'placeholder:text-2xs';
      case 'large':
        return 'placeholder:text-sm';
      default:
        return 'placeholder:text-xs';
    }
  };

  // 줄 간격 스타일 반환 (1.15로 통일)
  const lineHeightStyle = { lineHeight: '1.15' };

  const commonClass = getCommonClass();
  const placeholderClass = getPlaceholderClass();

  // fontSize에 따라 줄바꿈 글자 수를 조정하는 함수 (모든 모드에서 25글자)
  const getMaxLineLength = () => {
    return 25;
  };

  // 글자 수에 따라 줄바꿈 추가하는 함수
  const addLineBreaks = (text) => {
    if (!text) return '';
    const maxLength = getMaxLineLength();
    let result = '';
    for (let i = 0; i < text.length; i += maxLength) {
      result += text.slice(i, i + maxLength);
      if (i + maxLength < text.length) {
        result += '\n';
      }
    }
    return result;
  };

  return (
    <>
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-yellow-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('건의 사항', 'Suggestions')}
            </h3>
          </div>
          <button
            onClick={() => {
              setSuggestionPage(1);
              setShowSuggestionMorePopup(true);
            }}
            className="text-blue-500 text-2xs hover:text-blue-600"
          >
            {getText('더보기', 'More')} &gt;
          </button>
        </div>
        <div className="space-y-2">
          <div className="flex space-x-1">
            <select
              ref={selectRef}
              value={suggestionInput}
              onChange={(e) => setSuggestionInput(e.target.value)}
              className={`${commonClass} border rounded flex-1 min-w-[100px]`}
              style={{ lineHeight: '1.15' }}
            >
              <option value="구매">
                {selectedLanguage === 'en'
                  ? 'Purchase (Consumables)'
                  : '구매 (소모품)'}
              </option>
              <option value="대표이사">
                {selectedLanguage === 'en'
                  ? 'Suggestion (to CEO)'
                  : '건의 (대표이사)'}
              </option>
              <option value="관리팀">
                {selectedLanguage === 'en'
                  ? 'Suggestion (to Management)'
                  : '건의 (관리팀)'}
              </option>
              <option value="기타">
                {selectedLanguage === 'en'
                  ? 'Other'
                  : '기타'}
              </option>
            </select>
            <button
              className={`${commonClass} bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap font-normal`}
              style={{ paddingLeft: '0.75rem', paddingRight: '0.75rem' }}
              onClick={handleSuggestionSubmit}
              disabled={!suggestionInput || !applyContent.trim()}
            >
              {getText('신청', 'Submit')}
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={applyContent}
            onChange={(e) => setApplyContent(e.target.value)}
            onInput={(e) => {
              if (e.target.value === '') {
                e.target.style.height = '';
              } else {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }
            }}
            rows={1}
            className={`${commonClass} ${placeholderClass} placeholder:font-normal w-full border rounded resize-none break-words`}
            placeholder={getText(
              '건의 내용을 입력하세요',
              'Enter suggestion content'
            )}
            style={{
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              overflow: 'hidden',
            }}
          />
        </div>
      </div>

      {/* 더보기 팝업 */}
      {showSuggestionMorePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col text-xs">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center shrink-0 text-xs">
              <h3 className="text-sm font-bold text-gray-900">
                {getText('내 건의 사항 전체 내역', 'My Suggestions')}
              </h3>
              <button
                onClick={() => setShowSuggestionMorePopup(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div
              ref={suggestionScrollRef}
              className="flex-1 overflow-y-auto overflow-x-auto p-6 min-h-0 text-xs"
            >
              <div className="overflow-x-auto text-xs">
                <table className="min-w-[800px] w-full text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="text-center py-1 px-2 text-xs min-w-[90px] whitespace-nowrap">
                        {getText('신청일', 'Request Date')}
                      </th>
                      <th className="text-center py-1 px-2 text-xs min-w-[80px] whitespace-nowrap">
                        {getText('유형', 'Division')}
                      </th>
                      <th className="text-center py-1 px-2 text-xs min-w-[200px] whitespace-nowrap">
                        {getText('내용', 'Content')}
                      </th>
                      <th className="text-center py-1 px-2 text-xs min-w-[150px] whitespace-nowrap">
                        {getText('비고', 'Remark')}
                      </th>
                      <th className="text-center py-1 px-2 text-xs min-w-[80px] whitespace-nowrap">
                        {getText('상태', 'Status')}
                      </th>
                      <th className="text-center py-1 px-2 text-xs min-w-[150px] whitespace-nowrap">
                        {getText('수정/삭제', 'Edit/Delete')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {suggestions
                      .slice(
                        (suggestionPage - 1) * SUG_PAGE_SIZE,
                        suggestionPage * SUG_PAGE_SIZE
                      )
                      .map((s) => (
                        <tr key={s.id} className="text-xs">
                          <td className="text-center py-1 px-2 text-xs whitespace-nowrap">
                            {s.applyDate}
                          </td>
                          <td className="text-center py-1 px-2 text-xs whitespace-nowrap">
                            {getSuggestionCategoryText(
                              s.type,
                              selectedLanguage
                            )}
                          </td>
                          <td className="text-center py-1 px-2 text-xs whitespace-pre" style={lineHeightStyle}>
                            {addLineBreaks(s.content)}
                          </td>
                          <td className="text-center py-1 px-2 text-xs whitespace-pre" style={lineHeightStyle}>
                            {(s.status === '승인' || s.status === '반려') &&
                            s.remark
                              ? addLineBreaks(s.remark)
                              : '-'}
                          </td>
                          <td className="text-center py-1 px-2 text-xs whitespace-nowrap">
                            <span
                              className={`px-1 py-0.5 rounded-full text-xs ${
                                s.status === '승인'
                                  ? 'bg-blue-100 text-blue-800'
                                  : s.status === '대기'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : s.status === '취소'
                                  ? 'bg-gray-200 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="text-center py-1 px-2 text-xs">
                            {s.status === '대기' && (
                              <div className="flex items-center justify-center gap-1 text-xs">
                                <button
                                  className={`${commonClass} bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap font-normal`}
                                  onClick={() => {
                                    setEditingSuggestion(s.id);
                                    setEditingSuggestionContent(s.content);
                                    setEditingSuggestionTitle(s.type);
                                    setEditingSuggestionRemark(s.remark || '');
                                    setShowEditPopup(true);
                                  }}
                                >
                                  {getText('수정', 'Edit')}
                                </button>
                                <button
                                  className={`${commonClass} bg-red-100 text-red-700 rounded hover:bg-red-200 whitespace-nowrap font-normal`}
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        getText(
                                          '정말 취소하시겠습니까?',
                                          'Are you sure you want to cancel?'
                                        )
                                      )
                                    ) {
                                      try {
                                        const updatedSuggestion =
                                          await SuggestionAPI.update(s.id, {
                                            status: '취소',
                                          });
                                        setSuggestions((prev) =>
                                          prev.map((item) =>
                                            item.id === s.id
                                              ? {
                                                  ...item,
                                                  status:
                                                    updatedSuggestion.status,
                                                  approver:
                                                    updatedSuggestion.approver,
                                                  approvalDate:
                                                    updatedSuggestion.approvalDate,
                                                }
                                              : item
                                          )
                                        );
                                      } catch (error) {
                                        console.error(
                                          '❌ 건의사항 취소 실패:',
                                          error
                                        );
                                        alert(
                                          getText(
                                            '취소 중 오류가 발생했습니다.',
                                            'Failed to cancel suggestion.'
                                          )
                                        );
                                      }
                                    }
                                  }}
                                >
                                  {getText('취소', 'Cancel')}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    {suggestions.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center text-xs text-gray-400 py-8"
                        >
                          {getText(
                            '등록된 건의 사항이 없습니다.',
                            'No registered suggestions.'
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* 페이지네이션 */}
            <div className="flex justify-center items-center py-3 space-x-1 shrink-0 border-t border-gray-200 text-xs popup-footer-safe">
              <button
                onClick={() =>
                  setSuggestionPage(Math.max(1, suggestionPage - 1))
                }
                disabled={suggestionPage === 1}
                className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
              >
                {selectedLanguage === 'en' ? 'Prev' : '이전'}
              </button>
              <span className="text-xs text-gray-600">
                {suggestionPage} /{' '}
                {Math.max(1, Math.ceil(suggestions.length / SUG_PAGE_SIZE))}
              </span>
              <button
                onClick={() =>
                  setSuggestionPage(
                    Math.min(
                      Math.ceil(suggestions.length / SUG_PAGE_SIZE),
                      suggestionPage + 1
                    )
                  )
                }
                disabled={
                  suggestionPage >=
                  Math.ceil(suggestions.length / SUG_PAGE_SIZE)
                }
                className={`${commonClass} border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-normal`}
              >
                {selectedLanguage === 'en' ? 'Next' : '다음'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 건의사항 신청 팝업 */}
      {showSuggestionApplyPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">
                {getText('건의 사항 신청', 'Suggestion Application')}
              </h3>
              <button
                onClick={() => setShowSuggestionApplyPopup(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {getText('유형', 'Category')}
                </label>
                <input
                  type="text"
                  value={getSuggestionCategoryText(
                    applyTitle,
                    selectedLanguage
                  )}
                  readOnly
                  className="text-xs w-full px-4 py-1 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {getText('상세 내용', 'Content')}
                </label>
                <textarea
                  value={applyContent}
                  onChange={(e) => setApplyContent(e.target.value)}
                  rows={5}
                  className="text-xs w-full px-4 py-1 border border-gray-300 rounded-lg"
                  placeholder={getText(
                    '상세 내용을 입력하세요',
                    'Enter detailed content'
                  )}
                />
              </div>
              <button
                onClick={handleSuggestionSubmit}
                className={`${commonClass} w-full bg-blue-500 text-white rounded hover:bg-blue-600 font-normal`}
              >
                {getText('신청', 'Submission')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 건의사항 수정 팝업 */}
      {showEditPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col text-xs">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center text-xs">
              <h3 className="text-sm font-bold text-gray-900">
                {getText('건의 사항 수정', 'Edit Suggestion')}
              </h3>
              <button
                onClick={() => {
                  setShowEditPopup(false);
                  setEditingSuggestion(null);
                  setEditingSuggestionContent('');
                  setEditingSuggestionTitle('');
                  setEditingSuggestionRemark('');
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs min-h-0">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {getText('유형', 'Category')}
                </label>
                <select
                  value={editingSuggestionTitle}
                  onChange={(e) => setEditingSuggestionTitle(e.target.value)}
                  className="text-xs w-full px-4 py-1 border border-gray-300 rounded-lg"
                >
                  <option value="구매">
                    {selectedLanguage === 'en'
                      ? 'Purchase (Consumables)'
                      : '구매 (소모품)'}
                  </option>
                  <option value="대표이사">
                    {selectedLanguage === 'en'
                      ? 'Suggestion (to CEO)'
                      : '건의 (대표이사)'}
                  </option>
                  <option value="관리팀">
                    {selectedLanguage === 'en'
                      ? 'Suggestion (to Management)'
                      : '건의 (관리팀)'}
                  </option>
                  <option value="기타">
                    {selectedLanguage === 'en'
                      ? 'Other'
                      : '기타'}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {getText('내용', 'Content')}
                </label>
                <textarea
                  value={editingSuggestionContent}
                  onChange={(e) => setEditingSuggestionContent(e.target.value)}
                  rows={5}
                  className="text-xs w-full px-4 py-1 border border-gray-300 rounded-lg"
                  placeholder={getText('내용을 입력하세요', 'Enter content')}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!editingSuggestionContent.trim()) {
                      alert(
                        getText('내용을 입력해주세요.', 'Please enter content.')
                      );
                      return;
                    }

                    try {
                      const updatedSuggestion = await SuggestionAPI.update(
                        editingSuggestion,
                        {
                          type: editingSuggestionTitle,
                          content: editingSuggestionContent,
                        }
                      );

                      setSuggestions((prev) =>
                        prev.map((item) =>
                          item.id === editingSuggestion
                            ? {
                                ...item,
                                type: updatedSuggestion.type,
                                content: updatedSuggestion.content,
                                title: updatedSuggestion.title,
                              }
                            : item
                        )
                      );

                      alert(
                        getText('수정이 완료되었습니다.', 'Update completed.')
                      );
                      setShowEditPopup(false);
                      setEditingSuggestion(null);
                      setEditingSuggestionContent('');
                      setEditingSuggestionTitle('');
                      setEditingSuggestionRemark('');
                    } catch (error) {
                      console.error('❌ 건의사항 수정 실패:', error);
                      alert(
                        getText(
                          '수정 중 오류가 발생했습니다.',
                          'Failed to update suggestion.'
                        )
                      );
                    }
                  }}
                  className="flex-1 px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-normal text-xs"
                >
                  {getText('저장', 'Save')}
                </button>
                <button
                  onClick={() => {
                    setShowEditPopup(false);
                    setEditingSuggestion(null);
                    setEditingSuggestionContent('');
                    setEditingSuggestionTitle('');
                    setEditingSuggestionRemark('');
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-normal text-xs"
                >
                  {getText('취소', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffSuggestion;
