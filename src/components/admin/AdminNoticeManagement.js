import React, { useRef, useEffect, useState } from 'react';
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

  // 이미지 크기 조절 state
  const [selectedImage, setSelectedImage] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [currentHandle, setCurrentHandle] = useState(null);

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

  // 이미지 클릭 이벤트 처리
  useEffect(() => {
    const element = contentEditableRef?.current;
    if (!element) return;

    const handleImageClick = (e) => {
      if (e.target.tagName === 'IMG' && !e.target.closest('.resize-handle')) {
        e.preventDefault();
        e.stopPropagation();

        // 이전 선택된 이미지의 클래스 제거
        const allImages = element.querySelectorAll('img');
        allImages.forEach((img) => img.classList.remove('selected-for-resize'));

        // 새로 선택된 이미지에 클래스 추가
        e.target.classList.add('selected-for-resize');
        setSelectedImage(e.target);
      }
    };

    const handleClickOutside = (e) => {
      if (e.target.tagName !== 'IMG' && !e.target.closest('.resize-handle')) {
        // 모든 이미지의 선택 클래스 제거
        if (element) {
          const allImages = element.querySelectorAll('img');
          allImages.forEach((img) =>
            img.classList.remove('selected-for-resize')
          );
        }
        setSelectedImage(null);
      }
    };

    element.addEventListener('click', handleImageClick);
    document.addEventListener('click', handleClickOutside);

    return () => {
      element.removeEventListener('click', handleImageClick);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // 핸들에 맞는 커서 반환
  const getCursorForHandle = (handle) => {
    const cursors = {
      nw: 'nw-resize',
      ne: 'ne-resize',
      sw: 'sw-resize',
      se: 'se-resize',
      n: 'n-resize',
      s: 's-resize',
      e: 'e-resize',
      w: 'w-resize',
    };
    return cursors[handle] || 'default';
  };

  // 리사이즈 핸들 드래그 시작
  const handleResizeStart = (e, handle) => {
    if (!selectedImage) return;

    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setCurrentHandle(handle);

    const rect = selectedImage.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    });
  };

  // 리사이즈 드래그 중
  useEffect(() => {
    if (!isResizing || !selectedImage) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

      // 핸들 위치에 따라 크기 조절
      switch (currentHandle) {
        case 'se': // 오른쪽 하단
          newWidth = resizeStart.width + deltaX;
          break;
        case 'sw': // 왼쪽 하단
          newWidth = resizeStart.width - deltaX;
          break;
        case 'ne': // 오른쪽 상단
          newWidth = resizeStart.width + deltaX;
          break;
        case 'nw': // 왼쪽 상단
          newWidth = resizeStart.width - deltaX;
          break;
        case 'e': // 오른쪽
          newWidth = resizeStart.width + deltaX;
          break;
        case 'w': // 왼쪽
          newWidth = resizeStart.width - deltaX;
          break;
        case 'n': // 위쪽 (높이는 자동이므로 무시)
        case 's': // 아래쪽 (높이는 자동이므로 무시)
          return; // 비율 유지를 위해 세로 조절은 무시
        default:
          break;
      }

      // 최소/최대 크기 제한
      newWidth = Math.max(
        50,
        Math.min(newWidth, contentEditableRef.current?.offsetWidth || 800)
      );

      // 비율 유지하며 크기 조절
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = 'auto';
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setCurrentHandle(null);

      // content 업데이트
      if (contentEditableRef.current) {
        setNoticeForm((prev) => ({
          ...prev,
          content: contentEditableRef.current.innerHTML,
        }));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, selectedImage, resizeStart, currentHandle]);
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
                <col style={{ width: '150px' }} />
                <col style={{ width: '80px' }} />
                <col />
                <col style={{ width: '150px' }} />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-center py-2 px-1">날 짜</th>
                  <th className="text-center py-2 px-1">조회수</th>
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
                        <td className="text-center py-2 px-1 text-gray-400 text-xs">
                          👁 {n.viewCount || 0}
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

          <div className="flex flex-col h-full flex-1 overflow-hidden">
            {/* 제목 */}
            <div className="mb-2 flex-shrink-0">
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
            <div className="mb-3 flex-shrink-0">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  파일첨부 (현재 {noticeFiles.length}개)
                </label>
                <div className="flex gap-2">
                  <label className="inline-flex items-center px-2 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 cursor-pointer text-sm">
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
                      className="px-2 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      모두 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* 첨부된 파일 목록 */}
              {noticeFiles.length > 0 && (
                <div className="mt-2 space-y-0.5 max-h-[100px] overflow-y-auto border border-gray-200 rounded-lg p-1.5 bg-gray-50">
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
                        className="flex items-center justify-between bg-gray-50 rounded-lg"
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
                              href={`http://localhost:5000/api/communication/download/${file.url
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
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
                내용
              </label>
              <div className="relative flex-1 min-h-0 max-h-full overflow-hidden">
                {/* 이미지 리사이즈 핸들 */}
                {selectedImage &&
                  !isResizing &&
                  (() => {
                    const imgRect = selectedImage.getBoundingClientRect();
                    const containerRect =
                      contentEditableRef.current?.getBoundingClientRect();
                    if (!containerRect) return null;

                    return (
                      <div
                        className="resize-handles-container"
                        style={{
                          position: 'absolute',
                          top: imgRect.top - containerRect.top - 3 + 'px',
                          left: imgRect.left - containerRect.left - 3 + 'px',
                          width: imgRect.width + 6 + 'px',
                          height: imgRect.height + 6 + 'px',
                          border: '2px solid #3b82f6',
                          pointerEvents: 'none',
                          zIndex: 10,
                        }}
                      >
                        {/* 6개 리사이즈 핸들 (비율 유지를 위해 n, s 제외) */}
                        {['nw', 'ne', 'sw', 'se', 'e', 'w'].map((handle) => (
                          <div
                            key={handle}
                            className={`resize-handle resize-handle-${handle}`}
                            onMouseDown={(e) => handleResizeStart(e, handle)}
                            style={{
                              position: 'absolute',
                              width: handle.length === 1 ? '6px' : '8px',
                              height: handle.length === 1 ? '6px' : '8px',
                              background: 'white',
                              border: '1px solid #3b82f6',
                              pointerEvents: 'auto',
                              cursor: getCursorForHandle(handle),
                              ...(handle === 'nw' && { top: -4, left: -4 }),
                              ...(handle === 'ne' && { top: -4, right: -4 }),
                              ...(handle === 'sw' && { bottom: -4, left: -4 }),
                              ...(handle === 'se' && { bottom: -4, right: -4 }),
                              ...(handle === 'n' && {
                                top: -3,
                                left: '50%',
                                transform: 'translateX(-50%)',
                              }),
                              ...(handle === 's' && {
                                bottom: -3,
                                left: '50%',
                                transform: 'translateX(-50%)',
                              }),
                              ...(handle === 'e' && {
                                right: -3,
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }),
                              ...(handle === 'w' && {
                                left: -3,
                                top: '50%',
                                transform: 'translateY(-50%)',
                              }),
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}

                <div
                  ref={contentEditableRef}
                  contentEditable
                  data-placeholder="공지사항 내용을 입력하세요 (이미지 붙여넣기 가능)"
                  className="w-full h-full max-h-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none overflow-y-auto"
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
              </div>
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
                  border-radius: 4px;
                  cursor: pointer;
                  transition: opacity 0.2s ease;
                  user-select: none;
                }
                [contenteditable] img:hover {
                  opacity: 0.9;
                }
                [contenteditable] img.selected-for-resize {
                  opacity: 1;
                }
                .resize-handles-container {
                  box-sizing: border-box;
                }
                .resize-handle {
                  box-sizing: border-box;
                  border-radius: 2px;
                }
                .resize-handle:hover {
                  background: #3b82f6 !important;
                }
              `}</style>
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-2 pt-3 flex-shrink-0">
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
