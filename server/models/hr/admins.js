const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    adminId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    phone: String,
    department: String,
    position: String,
    joinDate: Date,
    status: { type: String, enum: ['재직', '휴직', '퇴사'], default: '재직' },
    address: String,
    isAdmin: { type: Boolean, default: true },
    permissions: {
      type: [String],
      default: [
        'dashboard',
        'employee-management',
        'notice-management',
        'notification-management',
        'schedule-management',
        'leave-management',
        'suggestion-management',
        'attendance-management',
        'payroll-management',
        'evaluation-management',
        'ai-chat',
        'system',
      ],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'admins',
    timestamps: true
  }
);

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
