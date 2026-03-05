import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import {
  NOTICE_PAGE_SIZE,
  useNoticeToggle,
  getFileIcon,
  downloadFile,
} from '../common/common_staff_notice';
import { NoticeAPI } from '../../api/communication';
import { linkifyText } from '../common/common_common';

/**
 * STAFF ② 공지사항 컴포넌트
 * 직원 모드에서 회사 공지사항을 확인하는 컴포넌트 (카드 + 더보기 팝업 포함)
 */
const StaffNotice = ({
  currentUser,
  notices,
  setNotices,
  getText,
  devLog,
  readAnnouncements,
  markNoticeAsRead,
  getUnreadNoticeCount,
  selectedLanguage,
}) => {
  const { expandedNotices, toggleNotice } = useNoticeToggle();
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [noticePage, setNoticePage] = useState(1);
  const noticeScrollRef = useRef(null);

  // 조회수가 이미 증가된 공지사항 ID를 추적 (중복 방지)
  const viewedNoticesRef = useRef(new Set());

  // 날짜 형식 변환 함수 (YYYY-MM-DD → YYYY\nMM-DD)
  const formatDateMultiLine = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      return (
        <>
          <div>{parts[0]}</div>
          <div>{parts[1]}-{parts[2]}</div>
        </>
      );
    }
    return dateStr;
  };

  // 팝업이 열리거나 페이지가 변경될 때 스크롤을 맨 위로
  useEffect(() => {
    if (showNoticePopup && noticeScrollRef.current) {
      noticeScrollRef.current.scrollTop = 0;
    }
  }, [showNoticePopup, noticePage]);

  // 조회수 증가 처리 (1회만 실행)
  const handleIncrementViewCount = async (noticeId) => {
    // 이미 조회수가 증가된 공지사항이면 스킵
    if (viewedNoticesRef.current.has(noticeId)) {
      return;
    }

    try {
      const employeeId = currentUser?.id || currentUser?.employeeId;
      const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin;

      if (!employeeId) {
        return;
      }

      // API 호출
      const result = await NoticeAPI.incrementViewCount(
        noticeId,
        employeeId,
        isAdmin
      );

      // 중복 방지를 위해 Set에 추가
      viewedNoticesRef.current.add(noticeId);

      // 로컬 state 업데이트 (즉시 UI 반영)
      if (setNotices && result?.viewCount !== undefined) {
        setNotices((prev) =>
          prev.map((n) =>
            n.id === noticeId || n._id === noticeId
              ? { ...n, viewCount: result.viewCount }
              : n
          )
        );
      }
    } catch (error) {
      // 에러 무시 (프로덕션 환경 등)
    }
  };

  return (
    <>
      <style>{`
        .notice-content { font-size: 12px; }
        .notice-content font[size="1"] { font-size: 10px !important; }
        .notice-content font[size="2"] { font-size: 12px !important; }
        .notice-content font[size="3"] { font-size: 14px !important; }
      `}</style>
      {/* 공지사항 카드 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-sm font-semibold text-gray-800">
              {getText('공지 사항', 'Announcements')}
            </h3>
            {getUnreadNoticeCount() > 0 && (
              <span className="ml-2 bg-red-500 text-white text-2xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold">
                {getUnreadNoticeCount()}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setNoticePage(1);
              setShowNoticePopup(true);
            }}
            className="text-blue-500 text-2xs hover:text-blue-600"
          >
            {getText('더보기', 'More')} &gt;
          </button>
        </div>
        <div className="space-y-0.5">
          {notices
            .filter((notice) => !notice.isScheduled || notice.isPublished)
            .slice(0, 3)
            .map((notice) => {
              const isUnread = !readAnnouncements.has(notice.id);
              return (
                <div
                  key={notice.id}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <div
                    onClick={() => {
                      if (isUnread) {
                        markNoticeAsRead(notice.id);
                      }
                      // 조회수 증가 (첫 펼침 시에만)
                      if (!expandedNotices.has(notice.id)) {
                        handleIncrementViewCount(notice.id);
                      }
                      toggleNotice(notice.id);
                    }}
                    className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer"
                  >
                    <div className="flex-1 flex items-center">
                      <span
                        className={`text-xs font-semibold ${
                          isUnread
                            ? 'font-semibold text-gray-900'
                            : 'text-gray-700'
                        }`}
                      >
                        {notice.title}
                      </span>
                      {isUnread && (
                        <span className="ml-2 bg-red-500 text-white text-2xs rounded-full px-1.5 py-0.5 font-bold">
                          N
                        </span>
                      )}
                    </div>
                    <div className="text-2xs flex items-center ml-2">
                      <span className="text-gray-400 mr-1.5">
                        👁 {notice.viewCount || 0}
                      </span>
                      <span className="text-gray-500 mr-1 text-right" style={{ lineHeight: '1.15' }}>{formatDateMultiLine(notice.date)}</span>
                      <span
                        className={`transform transition-transform duration-200 ${
                          expandedNotices.has(notice.id) ? 'rotate-180' : ''
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                  {expandedNotices.has(notice.id) && (
                    <div className="mt-1 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <div
                        className="notice-content text-xs text-gray-700"
                        style={{ lineHeight: '1.15' }}
                        dangerouslySetInnerHTML={{
                          __html: linkifyText(notice.content || ''),
                        }}
                      ></div>

                      {/* 첨부파일 목록 표시 (files 필드 우선) */}
                      {notice.files && notice.files.length > 0 ? (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <h4 className="text-xs font-medium text-gray-600 mb-1">
                            첨부파일:
                          </h4>
                          <div className="space-y-1">
                            {notice.files.map((file, index) => (
                              <button
                                key={index}
                                onClick={(e) => downloadFile(file, devLog, e)}
                                className="flex items-center text-xs text-blue-600 hover:text-blue-800 underline bg-transparent border-none cursor-pointer w-full text-left"
                              >
                                📎 {file.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        notice.attachments &&
                        notice.attachments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-blue-200">
                            <h4 className="text-xs font-medium text-gray-600 mb-1">
                              첨부파일:
                            </h4>
                            <div className="space-y-1">
                              {notice.attachments.map((file, index) => {
                                // 문자열인 경우와 객체인 경우 모두 처리
                                const fileName =
                                  typeof file === 'string'
                                    ? file
                                    : file.name || '파일';
                                const fileUrl =
                                  typeof file === 'object' ? file.url : '';

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span className="text-blue-600">📎</span>
                                      <span className="text-xs text-gray-700 font-medium">
                                        {fileName}
                                      </span>
                                    </div>
                                    {fileUrl && (
                                      <a
                                        href={`${
                                          process.env.REACT_APP_API_BASE_URL ||
                                          'http://localhost:5000/api'
                                        }/communication/download/${fileUrl
                                          .split('/')
                                          .pop()}`}
                                        download={fileName}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        다운로드
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 공지사항 전체 팝업 */}
      {showNoticePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-800">
                  {getText('전체 공지사항', 'All Announcements')}
                </h3>
                <button
                  onClick={() => {
                    setShowNoticePopup(false);
                    setSelectedNotice(null);
                    // 팝업 상태는 React state로만 관리
                  }}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              ref={noticeScrollRef}
              style={{
                height: '500px',
                overflowY: 'auto',
                padding: '1.5rem',
              }}
            >
              {!selectedNotice ? (
                <div>
                  {/* 공지사항 목록 */}
                  <div className="space-y-1">
                    {notices
                      .filter(
                        (notice) => !notice.isScheduled || notice.isPublished
                      )
                      .slice(
                        (noticePage - 1) * NOTICE_PAGE_SIZE,
                        noticePage * NOTICE_PAGE_SIZE
                      )
                      .map((notice) => (
                        <div
                          key={notice.id}
                          onClick={() => {
                            if (!readAnnouncements.has(notice.id)) {
                              markNoticeAsRead(notice.id);
                            }
                            // 조회수 증가 (첫 조회 시에만)
                            handleIncrementViewCount(notice.id);
                            setSelectedNotice(notice);
                          }}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                        >
                          <div className="flex items-center flex-1">
                            <span
                              className={`text-xs font-medium ${
                                !readAnnouncements.has(notice.id)
                                  ? 'text-gray-900 font-semibold'
                                  : 'text-gray-700'
                              }`}
                            >
                              {notice.title}
                            </span>
                            {!readAnnouncements.has(notice.id) && (
                              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                                N
                              </span>
                            )}
                          </div>
                          <div className="text-2xs flex items-center ml-4">
                            <span className="text-gray-400 mr-2">
                              👁 {notice.viewCount || 0}
                            </span>
                            <span className="text-gray-500 text-right" style={{ lineHeight: '1.15' }}>{formatDateMultiLine(notice.date)}</span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* 페이지네이션 */}
                  <div className="flex justify-center items-center mt-6 space-x-2">
                    <button
                      onClick={() => setNoticePage(Math.max(1, noticePage - 1))}
                      disabled={noticePage === 1}
                      className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {selectedLanguage === 'en' ? 'Prev' : '이전'}
                    </button>
                    <span className="text-xs text-gray-600">
                      {noticePage} /{' '}
                      {Math.ceil(
                        notices.filter(
                          (notice) => !notice.isScheduled || notice.isPublished
                        ).length / NOTICE_PAGE_SIZE
                      )}
                    </span>
                    <button
                      onClick={() => {
                        const filteredNoticesLength = notices.filter(
                          (notice) => !notice.isScheduled || notice.isPublished
                        ).length;
                        setNoticePage(
                          Math.min(
                            Math.ceil(filteredNoticesLength / NOTICE_PAGE_SIZE),
                            noticePage + 1
                          )
                        );
                      }}
                      disabled={
                        noticePage >=
                        Math.ceil(
                          notices.filter(
                            (notice) =>
                              !notice.isScheduled || notice.isPublished
                          ).length / NOTICE_PAGE_SIZE
                        )
                      }
                      className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {selectedLanguage === 'en' ? 'Next' : '다음'}
                    </button>
                  </div>
                </div>
              ) : (
                /* 공지사항 상세보기 */
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setSelectedNotice(null)}
                      className="text-blue-500 text-sm hover:text-blue-600"
                    >
                      ← 목록으로
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-800 mb-2">
                        {selectedNotice.title}
                      </h4>
                      <div className="text-2xs text-gray-500 mb-4 flex items-center">
                        <span className="text-gray-400 mr-2">
                          👁 {selectedNotice.viewCount || 0}
                        </span>
                        <span className="text-right" style={{ lineHeight: '1.15' }}>{formatDateMultiLine(selectedNotice.date)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div
                        className="notice-content text-xs text-gray-700"
                        style={{ lineHeight: '1.15' }}
                        dangerouslySetInnerHTML={{
                          __html: linkifyText(selectedNotice.content || ''),
                        }}
                      ></div>

                      {/* 첨부 이미지 표시 */}
                      {selectedNotice.images &&
                        selectedNotice.images.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-800 mb-3">
                              첨부 이미지
                            </h4>
                            <div className="space-y-3">
                              {selectedNotice.images.map((imageUrl, index) => (
                                <img
                                  key={index}
                                  src={imageUrl}
                                  alt={`첨부이미지 ${index + 1}`}
                                  style={{ maxWidth: 400 }}
                                  className="rounded-lg border border-gray-200 shadow-sm"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                      {/* 첨부파일 목록 (새로운 files 필드) */}
                      {selectedNotice.files &&
                        selectedNotice.files.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-800 mb-3">
                              첨부파일
                            </h4>
                            <div className="space-y-2">
                              {selectedNotice.files.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center space-x-3 flex-1">
                                    <span className="text-2xl">
                                      {getFileIcon(file.name)}
                                    </span>
                                    <div className="flex-1">
                                      <div className="text-xs font-medium text-gray-800">
                                        {file.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {file.size ||
                                          (file instanceof File
                                            ? `${(file.size / 1024).toFixed(
                                                1
                                              )} KB`
                                            : '크기 불명')}
                                      </div>
                                    </div>
                                  </div>
                                  {file.url ? (
                                    <button
                                      onClick={() => downloadFile(file, devLog)}
                                      className="px-4 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                                    >
                                      <span>다운로드</span>
                                    </button>
                                  ) : (
                                    <span className="px-4 py-2 text-xs text-gray-400">
                                      파일 없음
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* 기존 attachments 필드도 유지 (하위호환성) */}
                      {selectedNotice.attachments &&
                        selectedNotice.attachments.length > 0 &&
                        !(
                          selectedNotice.files &&
                          selectedNotice.files.length > 0
                        ) && (
                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="text-xs font-medium text-gray-800 mb-3">
                              첨부파일
                            </h4>
                            <div className="space-y-2">
                              {selectedNotice.attachments.map((file, index) => {
                                // 문자열인 경우와 객체인 경우 모두 처리
                                const fileName =
                                  typeof file === 'string'
                                    ? file
                                    : file.name || '파일';
                                const fileUrl =
                                  typeof file === 'object' ? file.url : '';
                                const fileSize =
                                  typeof file === 'object'
                                    ? file.size || '크기 불명'
                                    : '크기 불명';

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="flex items-center space-x-3 flex-1">
                                      <span className="text-2xl">
                                        {getFileIcon(fileName)}
                                      </span>
                                      <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-800">
                                          {fileName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {fileSize}
                                        </div>
                                      </div>
                                    </div>
                                    {fileUrl ? (
                                      <a
                                        href={`${
                                          process.env.REACT_APP_API_BASE_URL ||
                                          'http://localhost:5000/api'
                                        }/communication/download/${fileUrl
                                          .split('/')
                                          .pop()}`}
                                        download={fileName}
                                        className="px-4 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                                      >
                                        <span>다운로드</span>
                                      </a>
                                    ) : (
                                      <span className="px-4 py-2 text-xs text-gray-400">
                                        파일 없음
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffNotice;
