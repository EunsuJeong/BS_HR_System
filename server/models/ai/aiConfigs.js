const mongoose = require("mongoose");

const aiConfigSchema = new mongoose.Schema({
  provider: { type: String, enum: ["openai", "claude", "gemini"] },
  apiKey: String,
  model: String,
  scope: { type: String, enum: ["unified"], default: "unified" },
  active: Boolean,
  // AI 프롬프트 설정
  prompts: {
    dashboard: String,      // 대시보드 AI 추천사항용 프롬프트
    chatbot: String,        // 챗봇용 프롬프트
    analysis: String,       // 데이터 분석용 프롬프트
  },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'aiConfigs' });

const AiConfig = mongoose.model("AiConfig", aiConfigSchema);
module.exports = AiConfig;
