const mongoose = require("mongoose");

/**
 * 정책/법규/노동기준 관련 API 캐시
 * App.js의 fetchPolicyInfo(), getCachedPolicyInfo() 로직 대응
 */
const policyCacheSchema = new mongoose.Schema({
  query: { type: String, index: true },    // 검색어
  response: Object,                        // API 응답 전체
  responseTime: Number,                    // API 응답속도 (ms)
  lastUpdated: { type: Date, default: Date.now },
  source: String,                          // ex) '정부24', '고용노동부'
}, { collection: 'policyCache' });

const PolicyCache = mongoose.model("PolicyCache", policyCacheSchema);
module.exports = PolicyCache;
