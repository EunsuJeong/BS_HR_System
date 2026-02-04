const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');

/**
 * @route   GET /api/employees
 * @desc    모든 직원 조회
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { department, status, page = 1, limit = 50 } = req.query;

    // 필터 조건
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;

    // 페이지네이션
    const skip = (page - 1) * limit;

    const employees = await Employee.find(filter)
      .select('-password') // 비밀번호 제외
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean(); // 성능 최적화: Plain JavaScript 객체로 반환

    const total = await Employee.countDocuments(filter);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/employees/:id
 * @desc    특정 직원 조회
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findOne({
      employeeId: req.params.id,
    }).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '직원을 찾을 수 없습니다.',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('직원 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/employees
 * @desc    새 직원 등록
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const {
      employeeId,
      name,
      email,
      password,
      department,
      position,
      hireDate,
    } = req.body;

    // 필수 필드 확인
    if (
      !employeeId ||
      !name ||
      !email ||
      !password ||
      !department ||
      !position
    ) {
      return res.status(400).json({
        success: false,
        message: '필수 정보를 모두 입력해주세요.',
      });
    }

    // 중복 확인
    const existingEmployee = await Employee.findOne({
      $or: [{ employeeId }, { email }],
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: '이미 등록된 사번 또는 이메일입니다.',
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 직원 생성
    const employee = new Employee({
      ...req.body,
      password: hashedPassword,
    });

    await employee.save();

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('employee-created', {
        employeeId: employee.employeeId,
        name: employee.name,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: '직원이 성공적으로 등록되었습니다.',
      data: employee,
    });
  } catch (error) {
    console.error('직원 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 등록 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/employees/:id
 * @desc    직원 정보 수정
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    // 퇴사일/상태 자동 연동 로직
    const today = new Date().toISOString().split('T')[0];
    
    // 1. 퇴사일(leaveDate)이 있으면 상태를 '퇴사'로 자동 변경
    if (updateData.leaveDate && updateData.leaveDate !== '') {
      updateData.status = '퇴사';
    }
    // 2. 상태가 '퇴사'이고 퇴사일이 없으면 오늘 날짜로 설정
    else if (updateData.status === '퇴사' && (!updateData.leaveDate || updateData.leaveDate === '')) {
      updateData.leaveDate = today;
    }
    // 3. 상태가 '재직' 또는 '휴직'이면 퇴사일 초기화
    else if (updateData.status === '재직' || updateData.status === '휴직') {
      updateData.leaveDate = '';
    }

    // 비밀번호 변경 시 해싱
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const employee = await Employee.findOneAndUpdate(
      { employeeId: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '직원을 찾을 수 없습니다.',
      });
    }

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('employee-updated', {
        employeeId: employee.employeeId,
        name: employee.name,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: '직원 정보가 수정되었습니다.',
      data: employee,
    });
  } catch (error) {
    console.error('직원 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 정보 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/employees/:id
 * @desc    직원 삭제 (상태 변경)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { employeeId: req.params.id },
      { $set: { status: 'terminated' } },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: '직원을 찾을 수 없습니다.',
      });
    }

    // Socket.io 이벤트 발생 (실시간 업데이트)
    if (req.app.locals.io) {
      req.app.locals.io.emit('employee-deleted', {
        employeeId: employee.employeeId,
        name: employee.name,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: '직원이 퇴사 처리되었습니다.',
      data: employee,
    });
  } catch (error) {
    console.error('직원 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '직원 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/employees/stats/summary
 * @desc    직원 통계
 * @access  Private
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const total = await Employee.countDocuments();
    const active = await Employee.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        total,
        active,
        byDepartment: stats,
      },
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
