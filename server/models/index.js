// HR Models
const Employee = require('./hr/employees');
const Admin = require('./hr/admins');
const Attendance = require('./hr/attendance');
const AttendanceSummary = require('./hr/attendanceSummary');
const Leave = require('./hr/leaves');
const Payroll = require('./hr/payrolls');
const Evaluation = require('./hr/evaluations');

// AI Models
const AiConfig = require('./ai/aiConfigs');
const AiRecommendation = require('./ai/aiRecommendations');
const AiLog = require('./ai/aiLogs');
const PolicyCache = require('./ai/policyCache');

// Communication Models
const Notice = require('./communication/notices');
const Notification = require('./communication/notifications');
const Suggestion = require('./communication/suggestions');
const PushSubscription = require('./communication/pushSubscription');

// Safety Models
const SafetyAccident = require('./safety/safetyAccidents');
const WeatherCache = require('./safety/weatherCache');

// System Models
const Schedule = require('./system/schedules');
const SystemLog = require('./system/systemLogs');
const UserSession = require('./system/userSessions');

// ========================================================
// ✅ Export All Models
// ========================================================
module.exports = {
  // HR
  Employee,
  Admin,
  Attendance,
  AttendanceSummary,
  Leave,
  Payroll,
  Evaluation,

  // AI
  AiConfig,
  AiRecommendation,
  AiLog,
  PolicyCache,

  // Communication
  Notice,
  Notification,
  Suggestion,
  PushSubscription,

  // Safety
  SafetyAccident,
  WeatherCache,

  // System
  Schedule,
  SystemLog,
  UserSession,
};
