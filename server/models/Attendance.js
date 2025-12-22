// const mongoose = require('mongoose');

// /**
//  * 출퇴근 기록 스키마
//  */
// const attendanceSchema = new mongoose.Schema(
//   {
//     employeeId: {
//       type: String,
//       required: true,
//       ref: 'Employee',
//     },

//     // 날짜
//     date: {
//       type: Date,
//       required: true,
//     },

//     // 출근 시간
//     checkIn: {
//       time: { type: Date },
//       location: { type: String },
//       ipAddress: { type: String },
//     },

//     // 퇴근 시간
//     checkOut: {
//       time: { type: Date },
//       location: { type: String },
//       ipAddress: { type: String },
//     },

//     // 근무 시간 (분 단위)
//     workMinutes: {
//       type: Number,
//       default: 0,
//     },

//     // 상태
//     status: {
//       type: String,
//       enum: ['present', 'absent', 'late', 'half_day', 'leave'],
//       default: 'present',
//     },

//     // 지각 여부
//     isLate: {
//       type: Boolean,
//       default: false,
//     },

//     // 메모
//     note: String,

//     // 승인자
//     approvedBy: {
//       type: String,
//       ref: 'Employee',
//     },
//     approvedAt: Date,

//     // 추가 필드
//     shiftType: String, // 근무 유형
//     overtimeHours: Number, // 초과 근무 시간
//     holidayHours: Number, // 휴일 근무 시간
//     nightHours: Number, // 야간 근무 시간
//     remarks: String, // 비고
//     autoDetermined: Boolean, // 자동 판정 여부
//   },
//   {
//     timestamps: true,
//     collection: 'attendance', // 기존 컬렉션 이름 명시
//   }
// );

// // 복합 인덱스
// attendanceSchema.index({ employeeId: 1, date: -1 });
// attendanceSchema.index({ date: -1 });
// attendanceSchema.index({ status: 1, date: -1 });

// // 중복 모델 정의 방지
// module.exports =
//   mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
