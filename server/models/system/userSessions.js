const mongoose = require("mongoose");

/**
 * 사용자 세션 기록 (로그인 / 로그아웃 / AI 사용 내역)
 * 관리자용 접속이력 관리와 대응
 */
const userSessionSchema = new mongoose.Schema({
  userId: String,
  role: String,                    // ex) 관리자, 직원, 임원
  ipAddress: String,
  device: String,                  // ex) PC, Mobile
  browser: String,
  loginTime: { type: Date, default: Date.now },
  logoutTime: Date,
  lastActivity: Date,
  isActive: { type: Boolean, default: true },
}, { collection: 'userSessions' });

const UserSession = mongoose.model("UserSession", userSessionSchema);
module.exports = UserSession;
