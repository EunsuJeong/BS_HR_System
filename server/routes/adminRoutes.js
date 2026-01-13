const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const Admin = require('../models/hr/admins');

// ==========================================
// 관리자 (Admins) API
// ==========================================

// ✅ 관리자 전체 조회
router.get('/admins', async (req, res) => {
  try {
    console.log('🔍 [Admins API] GET 요청 받음');
    const admins = await Admin.find({ status: '재직' }).sort({ createdAt: -1 });
    console.log(`✅ [Admins API] 조회 완료: count=${admins.length}`);
    res.json(admins);
  } catch (error) {
    console.error('❌ [Admins API] 조회 오류:', error);
    res.status(500).json({ message: '관리자 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 관리자 단일 조회 (adminId로)
router.get('/admins/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    console.log(`🔍 [Admins API] GET 요청 받음: adminId=${adminId}`);

    const admin = await Admin.findOne({ adminId });

    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    console.log(`✅ [Admins API] 조회 완료: ${admin.name}`);
    res.json(admin);
  } catch (error) {
    console.error('❌ [Admins API] 조회 오류:', error);
    res.status(500).json({ message: '관리자 조회 중 오류가 발생했습니다.' });
  }
});

// ✅ 관리자 등록
router.post('/admins', async (req, res) => {
  try {
    const { adminId, name, password, phone, department, position, joinDate, address } = req.body;

    console.log('📝 [Admins API] POST 요청 받음:', { adminId, name });

    // 중복 체크
    const existingAdmin = await Admin.findOne({ adminId });
    if (existingAdmin) {
      return res.status(400).json({ message: '이미 존재하는 관리자 ID입니다.' });
    }

    const admin = new Admin({
      adminId,
      name,
      password,
      phone,
      department,
      position,
      joinDate: joinDate ? new Date(joinDate) : new Date(),
      address,
      status: '재직',
      isAdmin: true,
    });

    await admin.save();
    console.log(`✅ [Admins API] 관리자 등록 완료: ${admin.name}`);
    res.status(201).json(admin);
  } catch (error) {
    console.error('❌ [Admins API] 등록 오류:', error);
    res.status(500).json({ message: '관리자 등록 중 오류가 발생했습니다.' });
  }
});

// ✅ 관리자 비밀번호 변경 (더 구체적인 라우트를 먼저 배치)
router.put('/admins/:adminId/password', async (req, res) => {
  try {
    const { adminId } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log(`🔐 [Admins API] 비밀번호 변경 요청: adminId=${adminId}`);

    // 관리자 찾기
    const admin = await Admin.findOne({ adminId, status: '재직' });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: '관리자를 찾을 수 없습니다.',
      });
    }

    // 현재 비밀번호 확인
    if (admin.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        error: '현재 비밀번호가 일치하지 않습니다.',
      });
    }

    // 새 비밀번호 업데이트
    admin.password = newPassword;
    admin.updatedAt = new Date();
    await admin.save();

    console.log(`✅ [Admins API] 비밀번호 변경 완료: ${admin.name}`);

    res.json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    console.error('❌ [Admins API] 비밀번호 변경 오류:', error);
    res.status(500).json({
      success: false,
      error: '비밀번호 변경 중 오류가 발생했습니다.',
    });
  }
});

// ✅ 관리자 수정
router.put('/admins/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    const updateData = req.body;

    console.log(`📝 [Admins API] PUT 요청 받음: adminId=${adminId}`);

    // updatedAt 자동 갱신
    updateData.updatedAt = new Date();

    const admin = await Admin.findOneAndUpdate(
      { adminId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    console.log(`✅ [Admins API] 관리자 수정 완료: ${admin.name}`);
    res.json(admin);
  } catch (error) {
    console.error('❌ [Admins API] 수정 오류:', error);
    res.status(500).json({ message: '관리자 수정 중 오류가 발생했습니다.' });
  }
});

// ✅ 관리자 삭제 (soft delete - 상태를 '퇴사'로 변경)
router.delete('/admins/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;
    console.log(`🗑️ [Admins API] DELETE 요청 받음: adminId=${adminId}`);

    const admin = await Admin.findOneAndUpdate(
      { adminId },
      { status: '퇴사', updatedAt: new Date() },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    console.log(`✅ [Admins API] 관리자 삭제 완료: ${admin.name}`);
    res.json({ message: '관리자가 삭제되었습니다.', admin });
  } catch (error) {
    console.error('❌ [Admins API] 삭제 오류:', error);
    res.status(500).json({ message: '관리자 삭제 중 오류가 발생했습니다.' });
  }
});

// ✅ 관리자 로그인 (인증)
router.post('/admins/login', async (req, res) => {
  try {
    const { id, password, versionInfo } = req.body;
    console.log(`🔐 [Admins API] 로그인 요청: id=${id}`);

    // adminId 또는 name으로 검색
    const admin = await Admin.findOne({
      $or: [{ adminId: id }, { name: id }],
      status: '재직',
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: '아이디를 찾을 수 없습니다.',
      });
    }

    // 비밀번호 확인 (평문 비교 - 실제 운영환경에서는 bcrypt 사용 권장)
    if (admin.password !== password) {
      return res.status(401).json({
        success: false,
        error: '비밀번호가 일치하지 않습니다.',
      });
    }

    // ✅ 마지막 로그인 시간 업데이트 (KST 기준)
    admin.lastLogin = moment.tz('Asia/Seoul').toDate();

    // ✅ 앱 버전 정보 업데이트
    if (versionInfo) {
      admin.appVersion = versionInfo.version || 'Domain';
      admin.platformType = versionInfo.platformType || 'Domain';
      admin.platform = versionInfo.platform || 'web';
      admin.userAgent = versionInfo.userAgent || '';
      admin.lastVersionUpdate = new Date();

      console.log(`📱 [로그인] ${admin.name} (관리자) - 버전: ${admin.appVersion}, 플랫폼: ${admin.platformType}`);
    }

    await admin.save();

    console.log(`✅ [Admins API] 로그인 성공: ${admin.name}`);

    // 비밀번호 제외하고 반환
    const adminData = admin.toObject();
    delete adminData.password;

    res.json({
      success: true,
      admin: adminData,
    });
  } catch (error) {
    console.error('❌ [Admins API] 로그인 오류:', error);
    res.status(500).json({
      success: false,
      error: '로그인 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
