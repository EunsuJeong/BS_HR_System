import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import {
  SUG_PAGE_SIZE,
  getSuggestionCategoryText,
} from '../common/common_staff_suggestion';
import { SuggestionAPI } from '../../api/communication';

const StaffSuggestion = ({
  suggestions,
  setSuggestions,
  currentUser,
  getText,
  selectedLanguage,
  send자동알림,
  handleSuggestionApply,
  handleSuggestionSubmit,
  suggestionInput,
  setSuggestionInput,
  showSuggestionApplyPopup,
  setShowSuggestionApplyPopup,
  applyTitle,
  setApplyTitle,
  applyContent,
  setApplyContent,
  suggestionPage,
  setSuggestionPage,
  fontSize = 'normal',
}) => {
  const [showSuggestionMorePopup, setShowSuggestionMorePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editingSuggestionContent, setEditingSuggestionContent] = useState('');
  const [editingSuggestionTitle, setEditingSuggestionTitle] = useState('');
  const [editingSuggestionRemark, setEditingSuggestionRemark] = useState('');
  const suggestionScrollRef = useRef(null);
  const textareaRef = useRef(null);

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showSuggestionMorePopup && suggestionScrollRef.current) {
      suggestionScrollRef.current.scrollTop = 0;
    }
  }, [showSuggestionMorePopup, suggestionPage]);

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
              value={suggestionInput}
              onChange={(e) => setSuggestionInput(e.target.value)}
              className={`${commonClass} border rounded flex-1 min-w-[100px]`}
              style={{ minHeight: '30px' }}
            >
              <option value="구매">
                {selectedLanguage === 'en'
                  ? 'Purchase (Consumables)'
                  : '구매 (소모품)'}
              </option>
              <option value="기타">
                {selectedLanguage === 'en'
                  ? 'Suggestion (to CEO)'
                  : '건의 (대표이사)'}
              </option>
            </select>
            <button
              className={`${commonClass} bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap font-normal`}
              onClick={handleSuggestionSubmit}
              disabled={!suggestionInput || !applyContent.trim()}
            >
              {getText('신청', 'Submit')}
            </button>
          </div>
          <div>
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
                minHeight: '30px',
              }}
            />
          </div>
        </div>
      </div>

      {/* 더보기 팝업 */}
      {showSuggestionMorePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">
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
              className="flex-1 overflow-y-auto overflow-x-auto p-6 min-h-0"
            >
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full text-xs border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="text-center py-1 px-2 min-w-[90px] whitespace-nowrap">
                        {getText('신청일', 'Request Date')}
                      </th>
                      <th className="text-center py-1 px-2 min-w-[80px] whitespace-nowrap">
                        {getText('유형', 'Division')}
                      </th>
                      <th className="text-center py-1 px-2 min-w-[200px] whitespace-nowrap">
                        {getText('내용', 'Content')}
                      </th>
                      <th className="text-center py-1 px-2 min-w-[150px] whitespace-nowrap">
                        {getText('비고', 'Remark')}
                      </th>
                      <th className="text-center py-1 px-2 min-w-[80px] whitespace-nowrap">
                        {getText('상태', 'Status')}
                      </th>
                      <th className="text-center py-1 px-2 min-w-[150px] whitespace-nowrap">
                        {getText('수정/삭제', 'Edit/Delete')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {suggestions
                      .slice(
                        (suggestionPage - 1) * SUG_PAGE_SIZE,
                        suggestionPage * SUG_PAGE_SIZE
                      )
                      .map((s) => (
                        <tr key={s.id}>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {s.applyDate}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
                            {getSuggestionCategoryText(
                              s.type,
                              selectedLanguage
                            )}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-pre-wrap" style={lineHeightStyle}>
                            {addLineBreaks(s.content)}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-pre-wrap" style={lineHeightStyle}>
                            {(s.status === '승인' || s.status === '반려') &&
                            s.remark
                              ? addLineBreaks(s.remark)
                              : '-'}
                          </td>
                          <td className="text-center py-1 px-2 whitespace-nowrap">
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
                          <td className="text-center py-1 px-2">
                            {s.status === '대기' && (
                              <div className="flex items-center justify-center gap-1">
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
                          className="text-center text-gray-400 py-8"
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
            <div className="flex justify-center items-center py-3 space-x-1 shrink-0 border-t border-gray-200">
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
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">
                {getText('건의 사항 신청', 'Suggestion Application')}
              </h3>
              <button
                onClick={() => setShowSuggestionApplyPopup(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-800">
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
            <div className="p-6 space-y-4">
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
                  <option value="기타">
                    {selectedLanguage === 'en'
                      ? 'Suggestion (to CEO)'
                      : '건의 (대표이사)'}
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
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-normal text-xs"
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-normal text-xs"
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
