/**
 * [2_관리자 모드] 2.3_공지 관리 통합 모듈
 * - Hook → Service → Util → Export
 * - UI 컴포넌트 제외, 지원 로직만 포함
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { NoticeAPI } from '../../api/communication';

// ============================================================
// [2_관리자 모드] 2.3_공지 관리 - HOOKS
// ============================================================

/**
 * 공지 관리 state 관리 Hook
 */
export const useNoticeState = () => {
  // 공지 검색 필터
  const [noticeSearch, setNoticeSearch] = useState({
    year: '',
    month: '',
    day: '',
    keyword: '',
  });

  // 공지 파일 첨부
  const [noticeFiles, setNoticeFiles] = useState([]);
  const noticeFilesRef = useRef(noticeFiles);

  // noticeFiles 변경 시 ref 동기화
  useEffect(() => {
    noticeFilesRef.current = noticeFiles;
  }, [noticeFiles]);

  // 공지 페이지네이션
  const [adminNoticePage, setAdminNoticePage] = useState(1);

  return {
    noticeSearch,
    setNoticeSearch,
    noticeFiles,
    setNoticeFiles,
    noticeFilesRef,
    adminNoticePage,
    setAdminNoticePage,
  };
};

export const useNoticeManagement = (dependencies = {}) => {
  const {
    noticeFiles = [],
    setNoticeFiles = () => {},
    noticeFilesRef,
    noticeForm = {},
    setNoticeForm = () => {},
    noticeSearch = {},
    setEditingNoticeId = () => {},
    setNotices = () => {},
    currentUser = {},
  } = dependencies;

  // [2_관리자 모드] 2.3_공지 관리 - 파일 업로드
  const handleNoticeFileUpload = useCallback(
    (e) => {

      const files = Array.from(e.target.files);

      if (files.length === 0) {
        console.warn('⚠️ 선택된 파일이 없습니다');
        return;
      }

      const newFiles = files.map((file) => ({
        name: file.name,
        file: file,
        isExisting: false, // 새로 추가하는 파일은 기존 파일이 아님
      }));


      setNoticeFiles((prev) => {
        const updated = [...prev, ...newFiles];
        return updated;
      });

      // input 초기화 (같은 파일을 다시 선택할 수 있도록)
      e.target.value = '';
    },
    [setNoticeFiles]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 파일 제거
  const handleRemoveNoticeFile = useCallback(
    (fileName) => {
      setNoticeFiles((prev) => prev.filter((file) => file.name !== fileName));
    },
    [setNoticeFiles]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 이미지 붙여넣기
  const handleNoticePasteImage = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;

    // 이미지가 있는지 먼저 확인
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        break;
      }
    }

    // 이미지가 있을 때만 처리
    if (hasImage) {
      e.preventDefault(); // 기본 붙여넣기 동작 방지

      // currentTarget을 미리 저장 (비동기 콜백에서 null이 될 수 있음)
      const contentDiv = e.currentTarget;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageUrl = event.target.result;
              const img = document.createElement('img');
              img.src = imageUrl;
              img.alt = '붙여넣기 이미지';
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.marginTop = '10px';
              img.style.marginBottom = '10px';

              // 현재 선택 위치에 이미지 삽입
              const selection = window.getSelection();
              if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.insertNode(img);

                // 커서를 이미지 뒤로 이동
                range.setStartAfter(img);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);

                // noticeForm.content 업데이트
                try {
                  if (contentDiv && typeof contentDiv?.innerHTML !== 'undefined') {
                    setNoticeForm((prev) => ({
                      ...prev,
                      content: contentDiv.innerHTML,
                    }));
                  }
                } catch (error) {
                  console.warn('이미지 붙여넣기 중 에러:', error);
                }
              }
            };
            reader.readAsDataURL(file);
          }
          break; // 첫 번째 이미지만 처리
        }
      }
    }
  }, [setNoticeForm]);

  // [2_관리자 모드] 2.3_공지 관리 - 공지 목록 필터링
  const getFilteredNotices = useCallback(
    (noticeList) => {
      return noticeList.filter((notice) => {
        if (noticeSearch.year || noticeSearch.month || noticeSearch.day) {
          const noticeDate = new Date(notice.date);
          if (
            noticeSearch.year &&
            noticeDate.getFullYear() !== parseInt(noticeSearch.year)
          ) {
            return false;
          }
          if (
            noticeSearch.month &&
            noticeDate.getMonth() + 1 !== parseInt(noticeSearch.month)
          ) {
            return false;
          }
          if (
            noticeSearch.day &&
            noticeDate.getDate() !== parseInt(noticeSearch.day)
          ) {
            return false;
          }
        }

        if (noticeSearch.keyword) {
          if (
            !notice.title?.includes(noticeSearch.keyword) &&
            !notice.content?.includes(noticeSearch.keyword)
          ) {
            return false;
          }
        }

        return true;
      });
    },
    [noticeSearch]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 공지사항 수정 폼 로드
  const loadNoticeForEdit = useCallback(
    (notice) => {
      
      const scheduleInfo = {};
      if (notice.isScheduled && notice.scheduledDateTime) {
        const scheduledDate = new Date(notice.scheduledDateTime);
        scheduleInfo.isScheduled = true;
        scheduleInfo.scheduledDate = scheduledDate.toISOString().slice(0, 10);
        scheduleInfo.scheduledTime = scheduledDate.toTimeString().slice(0, 5);
      } else {
        scheduleInfo.isScheduled = false;
        scheduleInfo.scheduledDate = '';
        scheduleInfo.scheduledTime = '09:00';
      }

      setNoticeForm({
        id: notice.id || notice._id,
        title: notice.title,
        content: notice.content,
        isImportant: notice.isImportant || false,
        ...scheduleInfo,
      });
      setEditingNoticeId(notice.id || notice._id);

      // 첨부파일 설정 (files 필드 우선)
      if (notice.files && notice.files.length > 0) {
        const existingFiles = notice.files.map((file) => ({
          name: file.name,
          url:
            file.url ||
            (file instanceof File ? URL.createObjectURL(file) : null),
          size: file.size || null,
          isExisting: true,
        }));
        setNoticeFiles(existingFiles);
      } else if (notice.attachments && notice.attachments.length > 0) {
        const existingFiles = notice.attachments.map((att) => ({
          name: att.name,
          url: att.url,
          size: att.size || null,
          isExisting: true,
        }));
        setNoticeFiles(existingFiles);
      } else {
        setNoticeFiles([]);
      }
    },
    [setNoticeForm, setEditingNoticeId, setNoticeFiles]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 공지사항 작성 완료
  const handleNoticeCreate = async () => {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      // noticeFilesRef를 사용하여 최신 값 참조
      const currentFiles = noticeFilesRef?.current || noticeFiles;


      // 1. 새로 추가된 파일들을 서버에 업로드
      const uploadedAttachments = [];

      if (!currentFiles || currentFiles.length === 0) {
        console.warn('⚠️ 첨부할 파일이 없습니다.');
      } else {
      }

      for (const file of currentFiles) {

        if (file.isExisting) {
          // 기존 파일은 그대로 유지
          uploadedAttachments.push({
            name: file.name,
            url: file.url,
            size: file.size,
          });
        } else if (file.file) {
          // wrapped object: { name, file, isExisting }

          const uploadedFile = await NoticeAPI.uploadFile(file.file);
          uploadedAttachments.push(uploadedFile);
        } else if (file instanceof File) {
          // raw File object

          const uploadedFile = await NoticeAPI.uploadFile(file);
          uploadedAttachments.push(uploadedFile);
        } else {
          console.warn('⚠️ 파일 객체가 없음:', file);
        }
      }


      // 2. 공지사항 등록
      const noticeData = {
        title: noticeForm.title,
        content: noticeForm.content,
        author: currentUser?.name || currentUser?.id || 'Admin',
        attachments: uploadedAttachments,
        isImportant: noticeForm.isImportant || false,
      };


      // 게시 예약 정보 추가
      if (noticeForm.isScheduled && noticeForm.scheduledDate && noticeForm.scheduledTime) {
        const scheduledDateTime = new Date(`${noticeForm.scheduledDate}T${noticeForm.scheduledTime}:00`);
        noticeData.isScheduled = true;
        noticeData.scheduledDateTime = scheduledDateTime.toISOString();
      } else {
      }

      const savedNotice = await NoticeAPI.create(noticeData);

      // 로컬 state 업데이트 (서버 응답의 모든 필드 반영)
      const formattedNotice = {
        id: savedNotice._id,
        _id: savedNotice._id,
        title: savedNotice.title,
        content: savedNotice.content,
        author: savedNotice.author,
        attachments: savedNotice.attachments || [],
        files: savedNotice.attachments || [], // files 필드도 추가
        date: savedNotice.createdAt
          ? new Date(savedNotice.createdAt).toISOString().slice(0, 10)
          : '',
        createdAt: savedNotice.createdAt,
        updatedAt: savedNotice.updatedAt,
        isImportant: savedNotice.isImportant || false,
        isScheduled: savedNotice.isScheduled || false,
        scheduledDateTime: savedNotice.scheduledDateTime,
        isPublished: savedNotice.isPublished !== undefined ? savedNotice.isPublished : true,
      };
      setNotices((prev) => [formattedNotice, ...prev]);

      // 폼 초기화
      setNoticeForm({
        id: null,
        title: '',
        content: '',
        isScheduled: false,
        scheduledDate: '',
        scheduledTime: '09:00',
      });
      setNoticeFiles([]);

      alert('공지사항이 등록되었습니다.');
    } catch (error) {
      console.error('❌ 공지사항 등록 실패:', error);
      alert('공지사항 등록에 실패했습니다.');
    }
  };

  // [2_관리자 모드] 2.3_공지 관리 - 공지사항 수정 완료
  const handleNoticeUpdate = async (editingNoticeId) => {
    try {
      // noticeFilesRef를 사용하여 최신 값 참조
      const currentFiles = noticeFilesRef?.current || noticeFiles;

      // 1. 새로 추가된 파일들을 서버에 업로드
      const uploadedAttachments = [];

      for (const file of currentFiles) {
        if (file.isExisting) {
          // 기존 파일은 그대로 유지
          uploadedAttachments.push({
            name: file.name,
            url: file.url,
            size: file.size,
          });
        } else if (file.file) {
          // wrapped object: { name, file, isExisting }
          const uploadedFile = await NoticeAPI.uploadFile(file.file);
          uploadedAttachments.push(uploadedFile);
        } else if (file instanceof File) {
          // raw File object
          const uploadedFile = await NoticeAPI.uploadFile(file);
          uploadedAttachments.push(uploadedFile);
        }
      }

      // 2. 공지사항 수정
      const noticeData = {
        title: noticeForm.title,
        content: noticeForm.content,
        attachments: uploadedAttachments,
        isImportant: noticeForm.isImportant || false,
      };


      // 게시 예약 정보 추가
      if (noticeForm.isScheduled && noticeForm.scheduledDate && noticeForm.scheduledTime) {
        const scheduledDateTime = new Date(`${noticeForm.scheduledDate}T${noticeForm.scheduledTime}:00`);
        noticeData.isScheduled = true;
        noticeData.scheduledDateTime = scheduledDateTime.toISOString();
      } else {
        noticeData.isScheduled = false;
        noticeData.scheduledDateTime = null;
      }

      const updatedNotice = await NoticeAPI.update(editingNoticeId, noticeData);

      // 로컬 state 업데이트 (서버 응답의 모든 필드 반영)
      const formattedNotice = {
        id: updatedNotice._id,
        _id: updatedNotice._id,
        title: updatedNotice.title,
        content: updatedNotice.content,
        author: updatedNotice.author,
        attachments: updatedNotice.attachments || [],
        files: updatedNotice.attachments || [], // files 필드도 추가
        date: updatedNotice.updatedAt
          ? new Date(updatedNotice.updatedAt).toISOString().slice(0, 10)
          : '',
        createdAt: updatedNotice.createdAt,
        updatedAt: updatedNotice.updatedAt,
        isImportant: updatedNotice.isImportant || false,
        isScheduled: updatedNotice.isScheduled || false,
        scheduledDateTime: updatedNotice.scheduledDateTime,
        isPublished: updatedNotice.isPublished !== undefined ? updatedNotice.isPublished : true,
      };
      setNotices((prev) =>
        prev.map((n) =>
          n._id === editingNoticeId || n.id === editingNoticeId
            ? formattedNotice
            : n
        )
      );

      // 폼 초기화
      setNoticeForm({
        id: null,
        title: '',
        content: '',
        isScheduled: false,
        scheduledDate: '',
        scheduledTime: '09:00',
      });
      setNoticeFiles([]);
      setEditingNoticeId(null);

      alert('공지사항이 수정되었습니다.');
    } catch (error) {
      console.error('❌ 공지사항 수정 실패:', error);
      alert('공지사항 수정에 실패했습니다.');
    }
  };

  // [2_관리자 모드] 2.3_공지 관리 - 공지사항 삭제
  const handleNoticeDelete = useCallback(
    async (noticeId) => {
      if (!window.confirm('정말 삭제하시겠습니까?')) return;

      try {
        await NoticeAPI.delete(noticeId);

        // 로컬 state 업데이트
        setNotices((prev) => prev.filter((item) => item._id !== noticeId && item.id !== noticeId));

        alert('공지사항이 삭제되었습니다.');
      } catch (error) {
        console.error('❌ 공지사항 삭제 실패:', error);
        alert('공지사항 삭제에 실패했습니다.');
      }
    },
    [setNotices]
  );

  // [2_관리자 모드] 2.3_공지 관리 - 수정 취소
  const handleNoticeCancelEdit = useCallback(() => {
    setNoticeForm({
      id: null,
      title: '',
      content: '',
      isScheduled: false,
      scheduledDate: '',
      scheduledTime: '09:00',
    });
    setNoticeFiles([]);
    setEditingNoticeId(null);
  }, [setNoticeForm, setNoticeFiles, setEditingNoticeId]);

  return {
    handleNoticeFileUpload,
    handleRemoveNoticeFile,
    handleNoticePasteImage,
    getFilteredNotices,
    loadNoticeForEdit,
    handleNoticeCreate,
    handleNoticeUpdate,
    handleNoticeDelete,
    handleNoticeCancelEdit,
  };
};

// ============================================================
// [2_관리자 모드] 2.3_공지 관리 - UTILS
// ============================================================

/**
 * 공지사항 목록 필터링
 * @param {Array} noticeList - 공지사항 목록
 * @param {Object} noticeSearch - 검색 조건
 * @returns {Array} 필터링된 공지사항 목록
 */
export const filterNotices = (noticeList, noticeSearch) => {
  return noticeList.filter((notice) => {
    if (noticeSearch.year || noticeSearch.month || noticeSearch.day) {
      const noticeDate = new Date(notice.date);
      if (
        noticeSearch.year &&
        noticeDate.getFullYear() !== parseInt(noticeSearch.year)
      ) {
        return false;
      }
      if (
        noticeSearch.month &&
        noticeDate.getMonth() + 1 !== parseInt(noticeSearch.month)
      ) {
        return false;
      }
      if (
        noticeSearch.day &&
        noticeDate.getDate() !== parseInt(noticeSearch.day)
      ) {
        return false;
      }
    }

    if (noticeSearch.keyword) {
      if (
        !notice.title?.includes(noticeSearch.keyword) &&
        !notice.content?.includes(noticeSearch.keyword)
      ) {
        return false;
      }
    }

    return true;
  });
};

// ============================================================
// [2_관리자 모드] 2.3_공지 관리 - EXPORTS (update-only)
// ============================================================

/**
 * EXPORTS:
 *
 * [Hooks]
 * - useNoticeState: 공지 관리 state 관리 Hook
 *   → noticeSearch, setNoticeSearch: 공지 검색 필터
 *   → noticeFiles, setNoticeFiles: 공지 파일 첨부
 *   → adminNoticePage, setAdminNoticePage: 공지 페이지네이션
 *
 * - useNoticeManagement: 공지 관리 Hook
 *   → handleNoticeFileUpload: 파일 업로드
 *   → handleRemoveNoticeFile: 파일 제거
 *   → handleNoticePasteImage: 이미지 붙여넣기
 *   → getFilteredNotices: 공지 목록 필터링
 *   → loadNoticeForEdit: 공지사항 수정 폼 로드
 *   → handleNoticeCreate: 공지사항 작성 완료
 *   → handleNoticeUpdate: 공지사항 수정 완료
 *   → handleNoticeDelete: 공지사항 삭제
 *   → handleNoticeCancelEdit: 수정 취소
 *
 * [Utils]
 * - filterNotices: 공지사항 목록 필터링 함수
 */
