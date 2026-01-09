const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Notice, Notification, Suggestion } = require('../models');

// ==========================================
// 파일 업로드 설정
// ==========================================

// 업로드 디렉토리 생성
const uploadDir = path.join(__dirname, '../../uploads/notices');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 한글 파일명 디코딩 함수
const decodeFilename = (filename) => {
  try {
    // multer가 latin1로 인코딩한 경우 UTF-8로 디코딩
    return Buffer.from(filename, 'latin1').toString('utf8');
  } catch (e) {
    return filename;
  }
};

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const decodedName = decodeFilename(file.originalname);
    const ext = path.extname(decodedName);
    const nameWithoutExt = path.basename(decodedName, ext);
    // 파일명에서 특수문자 제거 (안전한 파일명)
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 허용할 파일 타입
    const allowedTypes =
      /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

// ==========================================
// 파일 업로드 API
// ==========================================

// ✅ 파일 업로드 (단일 파일)
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }

    const fileUrl = `/uploads/notices/${req.file.filename}`;
    const decodedName = decodeFilename(req.file.originalname);
    const fileInfo = {
      name: decodedName,
      url: fileUrl,
      size: `${(req.file.size / 1024).toFixed(1)} KB`,
    };

    console.log('✅ 파일 업로드 완료:', fileInfo);
    res.json(fileInfo);
  } catch (error) {
    console.error('❌ 파일 업로드 오류:', error);
    res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
  }
});

// ✅ 다중 파일 업로드
router.post('/upload-multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: '파일이 업로드되지 않았습니다.' });
    }

    const filesInfo = req.files.map((file) => ({
      name: decodeFilename(file.originalname),
      url: `/uploads/notices/${file.filename}`,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    }));

    console.log(`✅ ${filesInfo.length}개 파일 업로드 완료`);
    res.json(filesInfo);
  } catch (error) {
    console.error('❌ 파일 업로드 오류:', error);
    res.status(500).json({ message: '파일 업로드 중 오류가 발생했습니다.' });
  }
});

// ✅ 파일 다운로드 (한글 파일명 지원)
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    console.log('📥 파일 다운로드 요청:', filename);
    console.log('📁 파일 경로:', filePath);

    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      console.error('❌ 파일을 찾을 수 없음:', filePath);
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    // 원본 파일명 추출 (타임스탬프 제거)
    const match = filename.match(/^(.+)-\d+-\d+(\.[^.]+)$/);
    const originalName = match ? match[1] + match[2] : filename;

    console.log('✅ 파일 다운로드:', originalName);

    // 한글 파일명을 위한 Content-Disposition 헤더 설정
    const encodedFilename = encodeURIComponent(originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    // 파일 스트리밍
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('❌ 파일 다운로드 오류:', error);
    res.status(500).json({ message: '파일 다운로드 중 오류가 발생했습니다.' });
  }
});

// ==========================================
// 공지사항 (Notices) API
// ==========================================

// ✅ 공지사항 전체 조회 (조회 시 즉시 예약 공지사항 체크 및 게시 처리)
router.get('/notices', async (req, res) => {
  try {
    const { includeScheduled } = req.query;

    // 📢 조회 시 즉시 예약 시간이 지난 공지사항을 게시 상태로 업데이트
    const now = new Date();
    const updateResult = await Notice.updateMany(
      {
        isScheduled: true,
        scheduledDateTime: { $lte: now },
        isPublished: false,
      },
      {
        $set: { isPublished: true },
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(
        `📢 조회 시 ${updateResult.modifiedCount}개의 예약 공지사항을 즉시 게시로 변경`
      );
    }

    let query = {};

    // includeScheduled가 false이면 예약된 공지사항 제외
    if (includeScheduled === 'false') {
      query = {
        $or: [
          { isScheduled: false }, // 예약 안 된 공지사항
          { isScheduled: { $exists: false } }, // isScheduled 필드가 없는 오래된 공지사항
          { isScheduled: true, isPublished: true }, // 예약되었지만 게시된 공지사항
        ],
      };
      console.log('📋 게시 가능한 공지사항만 조회 (예약된 공지사항 제외)');
    } else {
      console.log('📋 모든 공지사항 조회 (예약 포함)');
    }

    const notices = await Notice.find(query).sort({ createdAt: -1 });

    // 첨부파일 크기 정보 추가
    const noticesWithFileSize = notices.map(notice => {
      const noticeObj = notice.toObject();

      // attachments에 파일 크기 추가
      if (noticeObj.attachments && noticeObj.attachments.length > 0) {
        noticeObj.attachments = noticeObj.attachments.map(att => {
          if (att.url && !att.size) {
            try {
              const fileName = att.url.split('/').pop();
              const filePath = path.join(uploadDir, fileName);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return {
                  ...att,
                  size: stats.size
                };
              }
            } catch (err) {
              console.error('파일 크기 조회 실패:', err);
            }
          }
          return att;
        });
      }

      // files 필드도 동일하게 처리
      if (noticeObj.files && noticeObj.files.length > 0) {
        noticeObj.files = noticeObj.files.map(file => {
          if (file.url && !file.size) {
            try {
              const fileName = file.url.split('/').pop();
              const filePath = path.join(uploadDir, fileName);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                return {
                  ...file,
                  size: stats.size
                };
              }
            } catch (err) {
              console.error('파일 크기 조회 실패:', err);
            }
          }
          return file;
        });
      }

      return noticeObj;
    });

    console.log(`✅ 공지사항 ${noticesWithFileSize.length}건 조회`);
    res.json(noticesWithFileSize);
  } catch (error) {
    console.error('❌ 공지사항 조회 오류:', error);
    res.status(500).json({ message: '공지사항 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 공지사항 등록
router.post('/notices', async (req, res) => {
  try {
    const {
      title,
      content,
      author,
      attachments,
      isImportant,
      isScheduled,
      scheduledDateTime,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용은 필수입니다.' });
    }

    const noticeData = {
      title,
      content,
      author: author || 'Admin',
      attachments: attachments || [],
      isImportant: isImportant || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 게시 예약 정보 처리
    if (isScheduled && scheduledDateTime) {
      noticeData.isScheduled = true;
      noticeData.scheduledDateTime = new Date(scheduledDateTime);
      noticeData.isPublished = false; // 예약 게시는 초기에 미게시 상태
      console.log('📅 게시 예약 설정:', {
        scheduledDateTime: noticeData.scheduledDateTime,
        isPublished: false,
      });
    } else {
      noticeData.isScheduled = false;
      noticeData.isPublished = true; // 즉시 게시
    }

    const notice = new Notice(noticeData);

    await notice.save();
    console.log('✅ 공지사항 등록 완료:', notice._id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notice-created', {
        noticeId: notice._id,
        title: notice.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(notice);
  } catch (error) {
    console.error('❌ 공지사항 등록 오류:', error);
    res.status(500).json({ message: '공지사항 등록 중 오류가 발생했습니다.' });
  }
});

// ✅ 공지사항 수정
router.put('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔧 [공지사항 수정] 요청 받음:', id);
    console.log('🔧 [공지사항 수정] Body:', req.body);
    const {
      title,
      content,
      attachments,
      isImportant,
      isScheduled,
      scheduledDateTime,
    } = req.body;

    const updateData = {
      title,
      content,
      attachments,
      isImportant,
      updatedAt: new Date(),
    };

    // 게시 예약 정보 처리
    if (isScheduled !== undefined) {
      updateData.isScheduled = isScheduled;

      if (isScheduled && scheduledDateTime) {
        updateData.scheduledDateTime = new Date(scheduledDateTime);
        updateData.isPublished = false; // 예약 게시는 미게시 상태로
        console.log('📅 게시 예약 수정:', {
          scheduledDateTime: updateData.scheduledDateTime,
          isPublished: false,
        });
      } else if (!isScheduled) {
        updateData.scheduledDateTime = null;
        updateData.isPublished = true; // 예약 해제 시 즉시 게시
      }
    }

    const notice = await Notice.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }

    console.log('✅ 공지사항 수정 완료:', id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notice-updated', {
        noticeId: notice._id,
        title: notice.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(notice);
  } catch (error) {
    console.error('❌ 공지사항 수정 오류:', error);
    res.status(500).json({ message: '공지사항 수정 중 오류가 발생했습니다.' });
  }
});

// ✅ 공지사항 삭제
router.delete('/notices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ [공지사항 삭제] 요청 받음:', id);
    const notice = await Notice.findByIdAndDelete(id);

    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }

    console.log('✅ 공지사항 삭제 완료:', id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notice-deleted', {
        noticeId: id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ message: '공지사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ 공지사항 삭제 오류:', error);
    res.status(500).json({ message: '공지사항 삭제 중 오류가 발생했습니다.' });
  }
});

// ✅ 공지사항 조회수 증가 (직원 1회 조회만 카운트)
router.post('/notices/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, isAdmin } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: '직원 ID가 필요합니다.' });
    }

    // ✅ 관리자는 조회수 카운트 안 함
    if (isAdmin) {
      console.log('👤 [조회수] 관리자 조회 - 카운트 제외:', employeeId);
      return res.json({
        message: '관리자 조회는 카운트되지 않습니다.',
        viewCount: 0
      });
    }

    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({ message: '공지사항을 찾을 수 없습니다.' });
    }

    // ✅ 이미 조회한 직원인지 확인
    const viewedBy = notice.viewedBy || [];
    const alreadyViewed = viewedBy.includes(employeeId);

    if (alreadyViewed) {
      console.log('👁️ [조회수] 이미 조회한 직원:', employeeId, '- 카운트 제외');
      return res.json({
        message: '이미 조회한 공지사항입니다.',
        viewCount: notice.viewCount || viewedBy.length
      });
    }

    // ✅ 첫 조회 - viewedBy에 추가 및 viewCount 증가
    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      {
        $addToSet: { viewedBy: employeeId }, // 중복 방지
        $inc: { viewCount: 1 }, // 카운트 증가
      },
      { new: true }
    );

    console.log(`✅ [조회수] 증가: ${employeeId} - 공지 "${notice.title.substring(0, 20)}..." (조회수: ${updatedNotice.viewCount})`);

    res.json({
      message: '조회수가 증가되었습니다.',
      viewCount: updatedNotice.viewCount
    });
  } catch (error) {
    console.error('❌ 조회수 증가 오류:', error);
    res.status(500).json({ message: '조회수 증가 중 오류가 발생했습니다.' });
  }
});

// ==========================================
// 알림 (Notifications) API
// ==========================================

// ✅ 알림 조회 (전체 또는 유형별)
router.get('/notifications', async (req, res) => {
  try {
    const { notificationType } = req.query;
    const query = notificationType ? { notificationType } : {};

    const notifications = await Notification.find(query).sort({
      createdAt: -1,
    });
    console.log(
      `✅ [Notifications API] 조회 완료: type=${
        notificationType || 'ALL'
      }, count=${notifications.length}`
    );
    res.json(notifications);
  } catch (error) {
    console.error('❌ 알림 조회 오류:', error);
    res.status(500).json({ message: '알림 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 알림 등록
router.post('/notifications', async (req, res) => {
  try {
    const {
      notificationType,
      title,
      content,
      status,
      startDate,
      endDate,
      repeatCycle,
      recipients,
    } = req.body;

    if (!notificationType || !title) {
      return res
        .status(400)
        .json({ message: '알림 유형과 제목은 필수입니다.' });
    }

    const notificationData = {
      notificationType,
      title,
      content: content || '',
      status: status || '진행중',
      recipients: recipients || {
        type: '전체',
        value: '전체직원',
        selectedEmployees: [],
      },
      createdAt: new Date(),
    };

    // 정기 알림인 경우에만 startDate, endDate, repeatCycle 추가
    if (notificationType === '정기' && startDate && endDate) {
      notificationData.startDate = startDate;
      notificationData.endDate = endDate;
      notificationData.repeatCycle = repeatCycle || '특정일';
    }

    // 시스템 알림(자동 알림)인 경우에도 startDate, endDate, repeatCycle 추가
    if (notificationType === '시스템') {
      notificationData.startDate = startDate || new Date().toISOString().split('T')[0];
      notificationData.endDate = endDate || new Date().toISOString().split('T')[0];
      notificationData.repeatCycle = repeatCycle || '즉시';
      if (req.body.priority) {
        notificationData.priority = req.body.priority;
      }
      if (req.body.completedAt) {
        notificationData.completedAt = req.body.completedAt;
      }
    }

    const notification = new Notification(notificationData);

    await notification.save();
    console.log(
      `✅ [Notifications API] 알림 생성 완료: type=${notificationType}, title=${title}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notification-created', {
        notificationId: notification._id,
        title: notification.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('❌ 알림 생성 오류:', error);
    res.status(500).json({ message: '알림 생성 중 오류가 발생했습니다.' });
  }
});

// ✅ 알림 수정
router.put('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const notification = await Notification.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    }

    console.log(`✅ [Notifications API] 알림 수정 완료: id=${id}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notification-updated', {
        notificationId: notification._id,
        title: notification.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(notification);
  } catch (error) {
    console.error('❌ 알림 수정 오류:', error);
    res.status(500).json({ message: '알림 수정 중 오류가 발생했습니다.' });
  }
});

// ✅ 알림 상태 변경
router.put('/notifications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['진행중', '완료', '중지'].includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 상태입니다.' });
    }

    const updateData = { status };
    if (status === '완료') {
      updateData.completedAt = new Date();
    }

    const notification = await Notification.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    }

    console.log(
      `✅ [Notifications API] 알림 상태 변경: id=${id}, status=${status}`
    );

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notification-updated', {
        notificationId: notification._id,
        title: notification.title,
        status: status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(notification);
  } catch (error) {
    console.error('❌ 알림 상태 변경 오류:', error);
    res.status(500).json({ message: '알림 상태 변경 중 오류가 발생했습니다.' });
  }
});

// ✅ 알림 삭제
router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    }

    console.log(`✅ [Notifications API] 알림 삭제 완료: id=${id}`);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('notification-deleted', {
        notificationId: id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ message: '알림이 삭제되었습니다.', notification });
  } catch (error) {
    console.error('❌ 알림 삭제 오류:', error);
    res.status(500).json({ message: '알림 삭제 중 오류가 발생했습니다.' });
  }
});

// ==========================================
// 건의사항 (Suggestions) API
// ==========================================

// ✅ 건의사항 조회 (관리자: 전체, 일반직원: 본인 것만)
router.get('/suggestions', async (req, res) => {
  try {
    const { employeeId, role } = req.query;
    console.log(`🔍 [Suggestions API] GET 요청 받음:`, { employeeId, role });

    let query = {};

    // 관리자가 아니고 employeeId가 있으면 본인 것만 조회
    if (role !== 'admin' && employeeId) {
      query.employeeId = employeeId;
    }
    // role='admin'이거나 employeeId가 없으면 전체 조회 (빈 query)

    console.log(`🔍 [Suggestions API] MongoDB 쿼리:`, query);
    const suggestions = await Suggestion.find(query).sort({ createdAt: -1 });
    console.log(
      `✅ [Suggestions API] 조회 완료: employeeId=${
        employeeId || 'ALL'
      }, role=${role || 'staff'}, count=${suggestions.length}`
    );

    if (suggestions.length > 0) {
      console.log(`📝 [Suggestions API] 첫 번째 데이터:`, suggestions[0]);
    }

    res.json(suggestions);
  } catch (error) {
    console.error('❌ [Suggestions API] 조회 오류:', error);
    res.status(500).json({ message: '건의사항 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 건의사항 등록
router.post('/suggestions', async (req, res) => {
  try {
    const { employeeId, name, department, type, title, content } = req.body;

    if (!employeeId || !title || !content) {
      return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
    }

    const now = new Date();
    const suggestion = new Suggestion({
      employeeId,
      name: name || '',
      department: department || '',
      type: type || '기타',
      title,
      content,
      status: '대기',
      applyDate: now.toISOString().split('T')[0],
      createdAt: now,
    });

    await suggestion.save();
    console.log('✅ 건의사항 등록 완료:', suggestion._id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('suggestion-created', {
        suggestionId: suggestion._id,
        title: suggestion.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(suggestion);
  } catch (error) {
    console.error('❌ 건의사항 등록 오류:', error);
    res.status(500).json({ message: '건의사항 등록 중 오류가 발생했습니다.' });
  }
});

// ✅ 건의사항 수정 (상태 변경, 내용 수정)
router.put('/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      approver,
      type,
      content,
      title,
      remark,
      employeeId,
      name,
      department,
      category,
    } = req.body;

    console.log('🔄 건의사항 수정 요청:', {
      id,
      requestBody: req.body,
    });

    const updateData = {};

    // 상태 업데이트 (승인/반려/취소)
    if (status) {
      updateData.status = status;
    }

    // 기본 정보 업데이트 (관리자 수정)
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;

    // 내용 업데이트
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.type = category; // category는 DB의 type에 저장
    if (content !== undefined) updateData.content = content;
    if (title !== undefined) updateData.title = title;
    if (remark !== undefined) updateData.remark = remark;

    // 승인/반려 시 승인자와 승인일 기록
    if (status === '승인' || status === '반려') {
      updateData.approver = approver;
      updateData.approvalDate = new Date();
    }

    console.log('📝 업데이트할 데이터:', updateData);

    const suggestion = await Suggestion.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!suggestion) {
      console.log('❌ 건의사항을 찾을 수 없음:', id);
      return res.status(404).json({ message: '건의사항을 찾을 수 없습니다.' });
    }

    console.log('✅ 건의사항 수정 완료:', id, suggestion);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('suggestion-updated', {
        suggestionId: suggestion._id,
        title: suggestion.title,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(suggestion);
  } catch (error) {
    console.error('❌ 건의사항 수정 오류:', error);
    res.status(500).json({ message: '건의사항 수정 중 오류가 발생했습니다.' });
  }
});

// ✅ 건의사항 삭제
router.delete('/suggestions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const suggestion = await Suggestion.findByIdAndDelete(id);

    if (!suggestion) {
      return res.status(404).json({ message: '건의사항을 찾을 수 없습니다.' });
    }

    console.log('✅ 건의사항 삭제 완료:', id);

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('suggestion-deleted', {
        suggestionId: id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ message: '건의사항이 삭제되었습니다.' });
  } catch (error) {
    console.error('❌ 건의사항 삭제 오류:', error);
    res.status(500).json({ message: '건의사항 삭제 중 오류가 발생했습니다.' });
  }
});

// ✅ 알림 읽음 처리 (일반직원용)
router.post('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: '직원 ID가 필요합니다.' });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' });
    }

    // ✅ 이미 읽은 직원인지 확인
    const readBy = notification.readBy || [];
    const alreadyRead = readBy.includes(employeeId);

    if (alreadyRead) {
      console.log('👁️ [알림 읽음] 이미 읽음:', employeeId);
      return res.json({
        message: '이미 읽은 알림입니다.',
        notification
      });
    }

    // ✅ 첫 읽음 - readBy에 추가
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      {
        $addToSet: { readBy: employeeId }, // 중복 방지
      },
      { new: true }
    );

    console.log(`✅ [알림 읽음] ${employeeId} - 알림 "${notification.title.substring(0, 20)}..."`);

    res.json({
      message: '알림을 읽음 처리했습니다.',
      notification: updatedNotification
    });
  } catch (error) {
    console.error('❌ 알림 읽음 처리 오류:', error);
    res.status(500).json({ message: '알림 읽음 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
