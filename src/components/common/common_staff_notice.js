/**
 * [3_일반직원 모드] 3.2_공지 사항 통합 모듈
 * - Constants → Hook → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useState, useCallback } from 'react';

// ============================================================
// [3_일반직원 모드] 3.2_공지 사항 - CONSTANTS
// ============================================================

/**
 * 공지사항 페이지 크기
 */
export const NOTICE_PAGE_SIZE = 10;

// ============================================================
// [3_일반직원 모드] 3.2_공지 사항 - HOOKS
// ============================================================

/**
 * 공지사항 토글 Hook (단일 오픈)
 * @returns {Object} expandedNotices, toggleNotice
 */
export const useNoticeToggle = () => {
  const [expandedNotices, setExpandedNotices] = useState(new Set());

  const toggleNotice = useCallback((noticeId) => {
    setExpandedNotices((prev) => {
      if (prev.has(noticeId)) return new Set();
      const next = new Set();
      next.add(noticeId);
      return next;
    });
  }, []);

  return { expandedNotices, toggleNotice };
};

// ============================================================
// [3_일반직원 모드] 3.2_공지 사항 - UTILS
// ============================================================

/**
 * 파일 확장자별 아이콘 반환
 * @param {string} fileName - 파일명
 * @returns {string} 파일 아이콘 이모지
 */
export const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📽️';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    case 'zip':
    case 'rar':
    case '7z':
      return '🗂️';
    default:
      return '📎';
  }
};

/**
 * 파일 다운로드 공통 함수
 * @param {Object|File} file - 다운로드할 파일 객체
 * @param {Function} devLog - 디버그 로그 함수
 * @param {Event} event - 클릭 이벤트 (optional)
 */
export const downloadFile = (file, devLog, event = null) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  devLog && devLog('다운로드 시도:', file);
  devLog && devLog('파일 타입:', typeof file);
  devLog && devLog('File 인스턴스 여부:', file instanceof File);
  devLog && devLog('파일 URL:', file.url);

  try {
    if (file.url) {
      // 기존 URL이 있는 경우
      devLog && devLog('URL 다운로드 시도');
      const link = document.createElement('a');
      const filename = file.url.split('/').pop();
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
      link.href = `${apiBaseUrl}/communication/download/${filename}`;
      link.download = file.name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file instanceof File) {
      // File 객체인 경우 Blob URL 생성
      devLog && devLog('File 객체 다운로드 시도');
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      // 대체 다운로드 방법
      devLog && devLog('대체 다운로드 방법 시도');
      const fileName = file.name || 'download';
      const content = file.content || JSON.stringify(file);
      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) {
    devLog && devLog('다운로드 실패:', error);
    alert('파일 다운로드에 실패했습니다.');
  }
};

// ============================================================
// [3_일반직원 모드] 3.2_공지 사항 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Constants]
 * - NOTICE_PAGE_SIZE: 공지사항 페이지 크기 (15)
 *
 * [Hooks]
 * - useNoticeToggle: 공지사항 토글 Hook (단일 오픈)
 *   → expandedNotices: 확장된 공지사항 Set
 *   → toggleNotice: 공지사항 토글 함수
 *
 * [Services]
 * - (없음)
 *
 * [Utils]
 * - getFileIcon: 파일 확장자별 아이콘 반환
 * - downloadFile: 파일 다운로드 공통 함수
 */
