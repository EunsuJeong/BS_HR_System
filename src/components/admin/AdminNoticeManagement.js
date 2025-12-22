import React, { useRef, useEffect } from 'react';
import { FileText, Edit, Upload, Download, Trash2 } from 'lucide-react';
import { useNoticeManagement } from '../common/common_admin_notice';

const AdminNoticeManagement = ({
  notices,
  setNotices,
  noticeForm,
  setNoticeForm,
  noticeSearch,
  setNoticeSearch,
  adminNoticePage,
  setAdminNoticePage,
  editingNoticeId,
  setEditingNoticeId,
  noticeFiles,
  setNoticeFiles,
  noticeFilesRef,
  handleNoticeFileUpload,
  handleRemoveNoticeFile,
  handleNoticePasteImage,
  getFilteredNotices,
  currentUser,
}) => {
  // [2_관리자 모드] 2.3_공지 관리 - Hook
  const {
    loadNoticeForEdit,
    handleNoticeCreate,
    handleNoticeUpdate,
    handleNoticeDelete,
    handleNoticeCancelEdit,
  } = useNoticeManagement({
    noticeFiles,
    setNoticeFiles,
    noticeFilesRef,
    noticeForm,
    setNoticeForm,
    noticeSearch,
    setEditingNoticeId,
    setNotices,
    currentUser,
  });

  // contentEditable div 참조
  const contentEditableRef = useRef(null);
  const isUserEditingRef = useRef(false);

  // noticeForm.content가 프로그래밍 방식으로 변경될 때만 contentEditable 업데이트
  useEffect(() => {
    try {
      const element = contentEditableRef?.current;
      if (
        element &&
        typeof element.innerHTML !== 'undefined' &&
        !isUserEditingRef.current &&
        typeof noticeForm?.content !== 'undefined'
      ) {
        // 안전하게 비교
        const currentHTML = element.innerHTML || '';
        const newContent = noticeForm.content || '';
        if (currentHTML !== newContent) {
          element.innerHTML = newContent;
        }
      }
    } catch (error) {
      // 에러 발생 시 무시
      console.warn('contentEditable 업데이트 실패:', error);
    }
  }, [noticeForm.content]);
  return (
    <div className="flex gap-6 w-full h-[calc(102vh-70px)">
      {/* 좌측: 공지글 목록 및 검색 */}
      <div className="w-1/2 h-full flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="mb-8 flex gap-14 items-center">
            <h3 className="text-lg font-semibold text-gray-800 whitespace-nowrap">
              공지사항 목록
            </h3>

            {/* 검색 필터 */}
            <div className="flex-1 flex gap-3 mr-4 rounded-lg">
              <input
                type="text"
                placeholder="연도"
                value={noticeSearch.year}
                onChange={(e) =>
                  setNoticeSearch((s) => ({ ...s, year: e.target.value }))
                }
                className="px-3 py-1 border rounded-lg text-sm w-20"
              />
              <input
                type="text"
                placeholder="월"
                value={noticeSearch.month}
                onChange={(e) =>
                  setNoticeSearch((s) => ({ ...s, month: e.target.value }))
                }
                className="px-3 py-1 border rounded-lg text-sm w-16"
              />
              <input
                type="text"
                placeholder="일"
                value={noticeSearch.day}
                onChange={(e) =>
                  setNoticeSearch((s) => ({ ...s, day: e.target.value }))
                }
                className="px-3 py-1 border rounded-lg text-sm w-16"
              />
              <input
                type="text"
                placeholder="제목 또는 내용"
                value={noticeSearch.keyword}
                onChange={(e) =>
                  setNoticeSearch((s) => ({
                    ...s,
                    keyword: e.target.value,
                  }))
                }
                className="px-3 py-1 border rounded-lg text-sm flex-1"
              />
            </div>
          </div>

          {/* 공지 리스트 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col style={{ width: '180px' }} />
                <col />
                <col style={{ width: '150px' }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-center py-2 px-1">날 짜</th>
                  <th className="text-center py-2 px-1">제 목</th>
                  <th className="text-center py-2 px-1">관 리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const filteredNotices = getFilteredNotices(notices).sort(
                    (a, b) => {
                      const dateA = a.date || a.createdAt || '';
                      const dateB = b.date || b.createdAt || '';
                      return dateB.localeCompare(dateA);
                    }
                  );
                  return filteredNotices
                    .slice((adminNoticePage - 1) * 16, adminNoticePage * 16)
                    .map((n) => (
                      <tr key={n.id || n._id} className="hover:bg-gray-50">
                        <td className="text-center py-2 px-1 text-gray-600">
                          {n.date ||
                            (n.createdAt
                              ? new Date(n.createdAt).toISOString().slice(0, 10)
                              : '')}
                        </td>
                        <td
                          className="text-left py-2 px-1 cursor-pointer hover:text-blue-600 hover:underline font-medium"
                          onClick={() => loadNoticeForEdit(n)}
                        >
                          <div className="flex items-center overflow-hidden">
                            <span className="truncate">{n.title}</span>
                            {n.isScheduled && !n.isPublished && (
                              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full flex-shrink-0">
                                예약
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2 px-1">
                          <button
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-2 hover:bg-blue-200"
                            onClick={() => loadNoticeForEdit(n)}
                          >
                            수정
                          </button>
                          <button
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            onClick={() => handleNoticeDelete(n._id || n.id)}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ));
                })()}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {(() => {
            const filteredCount = getFilteredNotices(notices).length;
            if (filteredCount <= 16) return null;

            return (
              <div className="flex justify-center mt-4 gap-1">
                {Array.from({
                  length: Math.ceil(filteredCount / 16),
                }).map((_, i) => (
                  <button
                    key={i}
                    className={`px-3 py-1 rounded ${
                      adminNoticePage === i + 1
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                    onClick={() => setAdminNoticePage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 우측: 작성/수정 폼 */}
      <div className="w-1/2 h-full flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              {editingNoticeId ? '공지사항 수정' : '공지사항 작성'}
            </h3>
            {editingNoticeId && (
              <button
                onClick={handleNoticeCancelEdit}
                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
              >
                새 공지사항
              </button>
            )}
          </div>

          <div className="flex flex-col h-full flex-1">
            {/* 제목 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="제목을 입력하세요"
                value={noticeForm.title}
                onChange={(e) =>
                  setNoticeForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>

            {/* 게시 예약 설정 */}
            {/*         <div className="mb-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={noticeForm.isScheduled}
                    onChange={(e) =>
                      setNoticeForm((f) => ({
                        ...f,
                        isScheduled: e.target.checked,
                        scheduledDate:
                          e.target.checked && !f.scheduledDate
                            ? new Date().toISOString().slice(0, 10)
                            : f.scheduledDate,
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    게시 예약
                  </span>
                </label>
                {noticeForm.isScheduled && (
                  <>
                    <input
                      type="date"
                      value={noticeForm.scheduledDate}
                      onChange={(e) =>
                        setNoticeForm((f) => ({
                          ...f,
                          scheduledDate: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={noticeForm.scheduledTime}
                      onChange={(e) =>
                        setNoticeForm((f) => ({
                          ...f,
                          scheduledTime: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}
              </div>
            </div> */}

            {/* 파일첨부 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                파일첨부 (현재 {noticeFiles.length}개)
              </label>
              <div className="flex gap-2">
                <label className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 cursor-pointer text-sm">
                  <Upload size={16} className="mr-2" />
                  파일 선택
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleNoticeFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  />
                </label>
                {noticeFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNoticeFiles([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    모두 삭제
                  </button>
                )}
              </div>

              {/* 첨부된 파일 목록 */}
              {noticeFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {noticeFiles.map((file, index) => {
                    // 파일 크기 계산
                    let fileSizeText = '크기 불명';
                    let sizeInBytes = null;

                    // 1. file.size 확인 (기존 파일 - 바이트 단위 숫자)
                    if (typeof file.size === 'number' && file.size > 0) {
                      sizeInBytes = file.size;
                    }
                    // 2. file.size가 문자열인 경우 (서버에서 이미 포맷된 경우)
                    else if (typeof file.size === 'string') {
                      fileSizeText = file.size;
                    }
                    // 3. file.file.size 확인 (새로 업로드한 파일)
                    else if (file.file && file.file.size) {
                      sizeInBytes = file.file.size;
                    }

                    // 바이트를 KB로 변환
                    if (sizeInBytes !== null) {
                      const sizeInKB = Math.round(sizeInBytes / 1024);
                      fileSizeText = `${sizeInKB}KB`;
                    }

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText
                            size={16}
                            className="text-gray-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700 truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            ({fileSizeText})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 기존 파일인 경우에만 다운로드 버튼 표시 */}
                          {file.isExisting && file.url && (
                            <a
                              href={`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/communication/download/${file.url
                                .split('/')
                                .pop()}`}
                              download={file.name}
                              className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800 text-sm flex-shrink-0"
                              title="파일 다운로드"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download size={14} />
                              받기
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveNoticeFile(file.name)}
                            className="flex items-center gap-1 px-2 py-1 text-red-500 hover:text-red-700 text-sm flex-shrink-0"
                            title="파일 삭제"
                          >
                            <Trash2 size={14} />
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 공지사항 내용 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용
              </label>
              <div
                ref={contentEditableRef}
                contentEditable
                data-placeholder="공지사항 내용을 입력하세요 (이미지 붙여넣기 가능)"
                className="w-full min-h-[500px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none overflow-auto"
                onFocus={() => {
                  isUserEditingRef.current = true;
                }}
                onBlur={() => {
                  isUserEditingRef.current = false;
                }}
                onInput={(e) => {
                  isUserEditingRef.current = true;
                  try {
                    // React 합성 이벤트가 재사용되기 전에 값을 먼저 추출
                    const target = e.currentTarget;
                    if (!target) return;

                    const htmlContent = target.innerHTML;
                    if (htmlContent !== undefined) {
                      setNoticeForm((prev) => ({
                        ...prev,
                        content: htmlContent,
                      }));
                    }
                  } catch (error) {
                    console.warn('contentEditable onInput 에러:', error);
                  }
                }}
                onPaste={handleNoticePasteImage}
              />
              <style>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                }
                [contenteditable] img {
                  max-width: 100%;
                  height: auto;
                  display: block;
                  margin: 10px 0;
                  border-radius: 8px;
                  cursor: pointer;
                }
              `}</style>
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-2 pt-4">
              {!editingNoticeId ? (
                <button
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                  onClick={handleNoticeCreate}
                >
                  작성 완료
                </button>
              ) : (
                <>
                  <button
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                    onClick={() => handleNoticeUpdate(editingNoticeId)}
                  >
                    수정 완료
                  </button>
                  <button
                    className="flex-1 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
                    onClick={handleNoticeCancelEdit}
                  >
                    취소
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNoticeManagement;
