const mongoose = require("mongoose");

/**
 * AI 분석 / 챗봇 / 추천 수행 로그
 * App.js의 logSystemEvent('AI_QUERY'...) 호출과 연동
 */
const aiLogSchema = new mongoose.Schema({
  eventType: { type: String, enum: ["AI_QUERY","AI_RESPONSE","ERROR","INFO"], default: "AI_QUERY" },
  model: String,
  provider: String,
  prompt: String,
  response: String,
  durationMs: Number,
  success: Boolean,
  errorMessage: String,
  createdAt: { type: Date, default: Date.now },
}, { collection: 'aiLogs' });

const AiLog = mongoose.model("AiLog", aiLogSchema);
module.exports = AiLog;