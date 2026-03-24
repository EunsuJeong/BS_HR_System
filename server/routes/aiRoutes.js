const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { AiConfig, AiRecommendation, AiLog, PolicyCache } = require("../models");

// ✅ 모델 실제 테스트 함수 (간단한 요청으로 작동 여부 확인)
async function testModel(provider, model, apiKey, timeout = 10000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response;

    if (provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1
        }),
        signal: controller.signal
      });
    } else if (provider === 'gemini') {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 1 }
        }),
        signal: controller.signal
      });
    } else if (provider === 'claude') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    if (response.ok) {
      return { model, available: true, status: 'active' };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        model,
        available: false,
        status: 'unavailable',
        error: errorData.error?.message || response.statusText
      };
    }
  } catch (error) {
    return {
      model,
      available: false,
      status: 'error',
      error: error.message
    };
  }
}

// ✅ AI 모델 설정 조회
router.get("/config", async (req, res) => {
  try {
    const config = await AiConfig.findOne({ scope: "unified" });
    res.json(config || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 모델 설정 저장 (POST /config)
router.post("/config", async (req, res) => {
  try {
    const { provider, apiKey, model, prompts } = req.body;
    const updateData = {
      provider,
      apiKey,
      model,
      updatedAt: new Date(),
      active: true
    };

    // prompts가 있으면 추가
    if (prompts) {
      updateData.prompts = prompts;
    }

    const updated = await AiConfig.findOneAndUpdate(
      { scope: "unified" },
      updateData,
      { upsert: true, new: true }
    );
    console.log(`✅ AI 설정 저장 완료: provider=${provider}, model=${model}`);
    res.json(updated);
  } catch (err) {
    console.error('❌ AI 설정 저장 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 모델 설정 저장 (레거시)
router.post("/update-key", async (req, res) => {
  try {
    const { provider, apiKey, model } = req.body;
    const updated = await AiConfig.findOneAndUpdate(
      { scope: "unified" },
      { provider, apiKey, model, updatedAt: new Date(), active: true },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 추천사항 생성 (통합 AI 설정 사용)
router.post("/recommendations", async (req, res) => {
  try {
    const { useDatabase } = req.body;

    // ✅ 통합 AI 설정 조회
    const aiConfig = await AiConfig.findOne({ scope: "unified", active: true });
    if (!aiConfig || !aiConfig.apiKey) {
      return res.json({
        status: 'error',
        message: 'AI 설정이 없습니다. 시스템 관리에서 AI 모델을 설정해주세요.',
        recommendations: []
      });
    }

    const { provider, apiKey, model, prompts } = aiConfig;

    // ✅ MongoDB에서 실제 데이터 조회
    const {
      Employee, Attendance, Leave, Notice, Suggestion,
      Schedule, Payroll, Evaluation, SafetyAccident, Notification
    } = require('../models');

    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

    // 직원 관련 데이터
    const employees = await Employee.find().lean();
    const activeEmployees = employees.filter(emp => emp.status !== 'retired');

    // 근태 관련 데이터
    const todayAttendances = await Attendance.find({ date: today }).lean();
    const monthAttendances = await Attendance.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    // 연차 관련 데이터 (한글 상태값 사용)
    const approvedLeaves = await Leave.find({ status: '승인' }).lean();
    const pendingLeaves = await Leave.find({ status: '대기' }).lean();
    const rejectedLeaves = await Leave.find({ status: '반려' }).lean();

    // 🔍 [1] MongoDB 실체 확인
    console.log("\n========== [AI DB CHECK - RECOMMENDATIONS] ==========");
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.log("mongoose.connection.name:", mongoose.connection.name);
    console.log("mongoose.connection.host:", mongoose.connection.host);
    console.log("mongoose.connection.db.databaseName:", mongoose.connection.db?.databaseName);
    console.log("실행 환경:", process.env.NODE_ENV || 'development');
    console.log("======================================================\n");

    // 🔍 [2] 연차 데이터 실체 확인
    const allLeavesForCheck = await Leave.find().lean();
    const canceledLeaves = await Leave.find({ status: '취소' }).lean();

    // === [DEBUG] pendingLeaves 검증 시작 ===
    console.log('\n=== [DEBUG] pendingLeaves.length ===', pendingLeaves.length);
    console.log('=== [DEBUG] pendingLeaves detail ===');
    console.log(JSON.stringify(pendingLeaves, null, 2));

    console.log('\n=== [DEBUG] 전체 연차 길이 비교 ===');
    console.log('approvedLeaves.length:', approvedLeaves.length);
    console.log('pendingLeaves.length:', pendingLeaves.length);
    console.log('rejectedLeaves.length:', rejectedLeaves.length);
    console.log('canceledLeaves.length:', canceledLeaves.length);
    console.log('=== [DEBUG] pendingLeaves 검증 종료 ===\n');

    console.log("\n========== [REAL DB CHECK - RECOMMENDATIONS] ==========");
    console.log("ALL LEAVES 총 건수:", allLeavesForCheck.length);
    console.log("\n대기 건수:", pendingLeaves.length);
    console.log("승인 건수:", approvedLeaves.length);
    console.log("반려 건수:", rejectedLeaves.length);
    console.log("취소 건수:", canceledLeaves.length);
    console.log("\nSTATUS 값 종류:", [...new Set(allLeavesForCheck.map(l => l.status))]);
    console.log("=======================================================\n");

    // 공지사항 및 건의사항
    const notices = await Notice.find().sort({ date: -1 }).limit(5).lean();
    const suggestions = await Suggestion.find().sort({ createdAt: -1 }).limit(10).lean();
    const pendingSuggestions = suggestions.filter(s => s.status === '대기');
    const resolvedSuggestions = suggestions.filter(s => s.status === '승인');

    // 일정 관련 데이터
    const schedules = await Schedule.find().sort({ date: -1 }).limit(10).lean();

    // 급여 관련 데이터
    const payrolls = await Payroll.find().sort({ createdAt: -1 }).limit(5).lean();

    // 평가 관련 데이터
    const evaluations = await Evaluation.find().sort({ createdAt: -1 }).limit(10).lean();

    // 안전 관련 데이터
    const safetyAccidents = await SafetyAccident.find().sort({ date: -1 }).limit(10).lean();
    const recentAccidents = safetyAccidents.filter(acc => {
      const accDate = new Date(acc.date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return accDate >= monthAgo;
    });

    // 알림 관련 데이터
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(10).lean();
    const unreadNotifications = notifications.filter(n => !n.readBy || n.readBy.length === 0);

    // ✅ 이전 추천사항 조회 (중복 방지용)
    const previousRecommendations = await AiRecommendation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const previousTexts = previousRecommendations
      .map(rec => rec.recommendations?.map(r => r.title).join(', '))
      .filter(Boolean)
      .join(' | ');

    // 대시보드 지표 계산
    const attendanceRate = activeEmployees.length > 0
      ? Math.round((todayAttendances.length / activeEmployees.length) * 100)
      : 0;

    // 이번달 목표달성률 계산 (출근율 기반)
    const monthWorkDays = Math.floor((new Date() - new Date(startOfMonth)) / (1000 * 60 * 60 * 24)) + 1;
    const expectedAttendances = activeEmployees.length * monthWorkDays;
    const goalAchievementRate = expectedAttendances > 0
      ? Math.round((monthAttendances.length / expectedAttendances) * 100)
      : 0;

    // 워라밸 지표 계산
    const avgWorkHours = monthAttendances.length > 0
      ? monthAttendances.reduce((sum, att) => {
          if (att.checkIn && att.checkOut) {
            const start = new Date(`2000-01-01 ${att.checkIn}`);
            const end = new Date(`2000-01-01 ${att.checkOut}`);
            const hours = (end - start) / (1000 * 60 * 60);
            return sum + (hours > 0 ? hours : 0);
          }
          return sum;
        }, 0) / monthAttendances.filter(a => a.checkIn && a.checkOut).length
      : 0;

    const workLifeBalance = avgWorkHours <= 8 ? '양호' : avgWorkHours <= 9 ? '보통' : '개선필요';

    // 문제가 있는 항목만 수집
    const issues = [];

    if (pendingLeaves.length > 0) {
      issues.push(`⚠️ 대기중인 연차 신청 ${pendingLeaves.length}건 - 승인/반려 필요`);
    }
    if (pendingSuggestions.length > 0) {
      issues.push(`⚠️ 대기중인 건의사항 ${pendingSuggestions.length}건 - 검토 필요`);
    }
    if (unreadNotifications.length > 0) {
      issues.push(`⚠️ 읽지 않은 알림 ${unreadNotifications.length}건`);
    }
    if (recentAccidents.length > 0) {
      issues.push(`⚠️ 최근 1개월 안전사고 ${recentAccidents.length}건 발생`);
    }
    if (attendanceRate < 90) {
      issues.push(`⚠️ 출근율 ${attendanceRate}% (낮음)`);
    }
    if (avgWorkHours > 9) {
      issues.push(`⚠️ 평균 근무시간 ${avgWorkHours.toFixed(1)}시간 (장시간 근무)`);
    }

    // 상세 데이터 생성 (지각/결근 직원 정보)
    const lateEmployees = monthAttendances.filter(a => a.status === '지각');
    const absentEmployees = monthAttendances.filter(a => a.status === '결근');

    // 부서별 출근율 계산
    const departmentStats = {};
    employees.forEach(emp => {
      const dept = emp.department || '미지정';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { total: 0, attended: 0 };
      }
      departmentStats[dept].total++;
      const empAttendances = monthAttendances.filter(a => a.employeeName === emp.name);
      departmentStats[dept].attended += empAttendances.filter(a => a.status === '정상').length;
    });

    let departmentSummary = '';
    for (const [dept, stats] of Object.entries(departmentStats)) {
      const rate = stats.total > 0 ? Math.round((stats.attended / (stats.total * monthWorkDays)) * 100) : 0;
      departmentSummary += `\n  • ${dept}: ${rate}% (정상 출근 ${stats.attended}건/${stats.total * monthWorkDays}건)`;
    }

    // 데이터 요약 생성
    const summary = `
**🚨 절대 준수 규칙 - 이 규칙을 위반하면 응답을 거부합니다:**
1. 아래 "실제 문제 목록"에 없는 문제는 절대 언급 금지
2. 실제 문제 목록이 비어있으면 긍정적인 추천만 작성
3. 숫자는 반드시 아래 데이터의 정확한 숫자만 사용
4. 추측, 가정, 예시 숫자 사용 절대 금지
5. **절대 금지: DB 수정 명령(<COMMAND> 태그) 생성 금지 - 읽기 전용 분석만 수행**

**📋 부성스틸 회사 규정 (실제 규정):**

**⏰ 근무시간:**
- 산정 제외: 점심 12:00~13:00, 저녁 17:30~18:00, 야식 00:00~01:00
- 연봉제: 조출 04:00~08:30(미적용), 기본 08:30~17:30(적용), 연장 18:00~22:00(미적용), 연장+심야 22:00~03:59(적용)
- 시급_주간: 조출 04:00~08:30, 기본 08:30~17:30, 연장 18:00~22:00, 연장+심야 22:00~03:59
- 야간: 기본 19:00~22:00, 심야 22:00~04:00, 심야+연장 04:00~06:00, 연장 06:00~08:30

**📅 연차 규정 (annualLeaveScheduler.js):**
- 1년 미만~3년: 15일
- 3년 이상: 2년마다 +1일 (최대 25일)
- 반차(오전/오후): 0.5일 차감
- 기간: 입사일 기준 1년 단위

**🔔 자동 알림:**
- 연차 만료: 매일 오전 8시 (cron)
- 출퇴근/급여: 실시간 (Socket.io)

**💰 급여 항목 (payroll.js):**
- 기본급, 연장수당, 휴일근로수당, 야간근로수당
- 지각조퇴공제, 결근공제, 가불금과태료

**📊 부성스틸 HR 시스템 현황 (읽기 전용 분석)**

**✅ 정상 운영 중인 영역:**
- 총 직원: ${employees.length}명 (재직: ${activeEmployees.length}명)
- 오늘 출근율: ${attendanceRate}%
- 이번달 목표달성률: ${goalAchievementRate}%
- 워라밸 지표: ${workLifeBalance} (평균 ${avgWorkHours.toFixed(1)}시간/일)

**⚠️ 실제 문제 목록 (이 항목들만 추천 대상):**
${issues.length > 0 ? issues.join('\n') : '없음 - 모든 영역 정상 운영 중'}

**📋 상세 현황:**
- 연차: 승인 ${approvedLeaves.length}건, 대기 ${pendingLeaves.length}건, 반려 ${rejectedLeaves.length}건, 취소 ${canceledLeaves.length}건
${pendingLeaves.length > 0 ? `  → 대기 중: ${pendingLeaves.slice(0, 5).map(l => `${l.employeeName}(${l.type})`).join(', ')}${pendingLeaves.length > 5 ? ` 외 ${pendingLeaves.length - 5}건` : ''}` : `  → **현재 승인 대기 중인 연차는 없습니다.**`}
  **중요:** "대기"는 관리자 승인 대기, "취소"는 사용자가 직접 취소한 연차
- 건의사항: 전체 ${suggestions.length}건 (대기 ${pendingSuggestions.length}건, 승인 ${resolvedSuggestions.length}건)
${pendingSuggestions.length > 0 ? `  → 대기 중: ${pendingSuggestions.slice(0, 3).map(s => s.title).join(', ')}${pendingSuggestions.length > 3 ? ` 외 ${pendingSuggestions.length - 3}건` : ''}` : ''}
- 안전사고: 최근 1개월 ${recentAccidents.length}건
${recentAccidents.length > 0 ? `  → 사고 내역: ${recentAccidents.slice(0, 3).map(a => `${a.type}(${a.severity})`).join(', ')}` : ''}

**👥 이번 달 근태 상세:**
- 지각: ${lateEmployees.length}건${lateEmployees.length > 0 ? ` (상위 ${Math.min(5, lateEmployees.length)}명: ${lateEmployees.slice(0, 5).map(a => a.employeeName).join(', ')})` : ''}
- 결근: ${absentEmployees.length}건${absentEmployees.length > 0 ? ` (${absentEmployees.slice(0, 5).map(a => a.employeeName).join(', ')}${absentEmployees.length > 5 ? ` 외 ${absentEmployees.length - 5}명` : ''})` : ''}

**🏢 부서별 출근율:**${departmentSummary}

**이전 추천사항 (중복 방지):**
${previousTexts || '없음'}

**요청사항:**
위의 "실제 문제 목록"과 "상세 현황"을 기반으로 4가지 실용적인 추천사항을 작성하세요.
- 문제 목록이 비어있다면: 긍정적이고 생산적인 개선 아이디어 제안
- 문제가 있다면: 해당 문제 해결 방안만 제안 (구체적인 직원명/부서명 포함 가능)
- 형식: [카테고리] 제목 - 상세 설명
- 카테고리: 생산, 근태, 안전, 교육, 급여, 품질
- 이전 추천사항과 중복 금지
- **중요: 추천만 작성, DB 수정 명령 절대 생성 금지**`;

    // 🔍 AI INPUT 전체 내용 출력 (오답 원인 증명용)
    console.log('\n========== [AI RECOMMENDATIONS] AI INPUT 시작 ==========');
    console.log('📋 summary (AI에게 전달되는 데이터):');
    console.log(summary);
    console.log('\n🔢 핵심 데이터 추출:');
    console.log(`- 승인 대기 연차: ${pendingLeaves.length}건 (관리자 승인 대기)`);
    console.log(`- 승인됨 연차: ${approvedLeaves.length}건`);
    console.log(`- 반려됨 연차: ${rejectedLeaves.length}건`);
    console.log(`- 취소됨 연차: ${canceledLeaves.length}건 (사용자가 직접 취소)`);
    console.log(`- 오늘 출근율: ${attendanceRate}%`);
    console.log(`- 지각: ${lateEmployees.length}건`);
    console.log(`- 결근: ${absentEmployees.length}건`);
    console.log('\n⚠️ 중요: "대기" ≠ "취소" (별도 상태)');
    console.log('\n========== [AI RECOMMENDATIONS] AI INPUT 종료 ==========\n');

    let aiResponse = '';

    // ✅ Provider별 AI 호출 (AI 챗봇과 동일한 방식)
    if (provider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: prompts?.dashboard || `당신은 HR 데이터 분석 전문가입니다.

[절대 규칙]
1. 제공된 FACT 섹션의 숫자만 사용
2. 추정, 계산, 해석 금지
3. "전체 건수", "대략", "많은 수" 등 모호한 표현 금지
4. 승인 대기 건수가 0이면 "현재 승인 대기 중인 연차는 없습니다." 명시
5. FACT와 모순되는 문장 금지

제공된 데이터의 정확한 숫자만 사용하여 4가지 추천사항을 작성하세요.` },
            { role: 'user', content: summary }
          ],
          temperature: 0.3, // 정확성 우선
          max_tokens: 1500
        })
      });

      if (!openaiRes.ok) {
        throw new Error('OpenAI API 호출 실패');
      }

      const data = await openaiRes.json();
      aiResponse = data.choices[0]?.message?.content || '';

    } else if (provider === 'gemini') {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompts?.dashboard || `당신은 HR 데이터 분석 전문가입니다.

[절대 규칙]
1. 제공된 FACT 섹션의 숫자만 사용
2. 추정, 계산, 해석 금지
3. "전체 건수", "대략", "많은 수" 등 모호한 표현 금지
4. 승인 대기 건수가 0이면 "현재 승인 대기 중인 연차는 없습니다." 명시
5. FACT와 모순되는 문장 금지

제공된 데이터의 정확한 숫자만 사용하여 4가지 추천사항을 작성하세요.` }] },
          contents: [{
            parts: [{ text: summary }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500
          }
        })
      });

      if (!geminiRes.ok) {
        throw new Error('Gemini API 호출 실패');
      }

      const data = await geminiRes.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else if (provider === 'claude') {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.3,
          system: prompts?.dashboard || `당신은 HR 데이터 분석 전문가입니다.

[절대 규칙]
1. 제공된 FACT 섹션의 숫자만 사용
2. 추정, 계산, 해석 금지
3. "전체 건수", "대략", "많은 수" 등 모호한 표현 금지
4. 승인 대기 건수가 0이면 "현재 승인 대기 중인 연차는 없습니다." 명시
5. FACT와 모순되는 문장 금지

제공된 데이터의 정확한 숫자만 사용하여 4가지 추천사항을 작성하세요.`,
          messages: [
            { role: 'user', content: summary }
          ]
        })
      });

      if (!claudeRes.ok) {
        throw new Error('Claude API 호출 실패');
      }

      const data = await claudeRes.json();
      aiResponse = data.content?.[0]?.text || '';
    }

    console.log(`✅ [AI 추천사항] AI 응답 생성 완료 (${aiResponse.length}자)`);

    // 🔒 안전장치: COMMAND 태그가 있으면 제거 (AI 추천사항은 읽기 전용)
    const commandRegex = /<COMMAND>.*?<\/COMMAND>/gs;
    if (commandRegex.test(aiResponse)) {
      console.warn('⚠️ [AI 추천사항] COMMAND 태그 감지됨 - 자동 제거 (읽기 전용 모드)');
      aiResponse = aiResponse.replace(commandRegex, '[DB 수정 명령 차단됨]');
    }

    // 응답 파싱 (줄 단위로 분리)
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const recommendations = [];

    for (const line of lines) {
      if (/^\d+\./.test(line.trim())) {
        recommendations.push(line.trim());
      }
    }

    // DB에 저장
    const recommendation = new AiRecommendation({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('ko-KR'),
      title: `AI 추천사항 분석 (${recommendations.length}건)`,
      content: aiResponse,
      recommendations: recommendations.map(rec => ({
        type: '추천',
        title: rec,
        description: ''
      })),
      createdAt: new Date()
    });
    await recommendation.save();

    console.log(`✅ [POST /ai/recommendations] AI 추천사항 ${recommendations.length}개 생성 및 저장 완료`);

    res.json({
      status: 'success',
      recommendations: recommendations,
      model: model,
      provider: provider
    });

  } catch (err) {
    console.error('❌ [POST /ai/recommendations] 오류:', err);
    res.status(500).json({
      status: 'error',
      error: err.message,
      recommendations: []
    });
  }
});

// ✅ AI 추천사항 조회 (최근 10건)
router.get("/recommendations", async (req, res) => {
  try {
    const recommendations = await AiRecommendation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`✅ [GET /ai/recommendations] ${recommendations.length}건 조회`);
    res.json(recommendations);
  } catch (err) {
    console.error('❌ [GET /ai/recommendations] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 추천사항 다운로드 (한국어 인코딩)
router.get("/recommendations/export", async (req, res) => {
  try {
    const recommendations = await AiRecommendation.find()
      .sort({ createdAt: -1 })
      .lean();

    // CSV 형식으로 변환
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csv += '날짜,시간,제목,내용,추천사항\n';

    recommendations.forEach(rec => {
      const date = rec.date || new Date(rec.createdAt).toLocaleDateString('ko-KR');
      const time = rec.time || new Date(rec.createdAt).toLocaleTimeString('ko-KR');
      const title = (rec.title || '').replace(/"/g, '""');
      const content = (rec.content || '').replace(/"/g, '""').replace(/\n/g, ' ');

      // 추천사항 배열을 문자열로 변환
      const recommendations = rec.recommendations
        ? rec.recommendations.map(r =>
            `[${r.type}] ${r.title}: ${r.description}`
          ).join(' | ').replace(/"/g, '""')
        : '';

      csv += `"${date}","${time}","${title}","${content}","${recommendations}"\n`;
    });

    // 파일명에 현재 날짜 포함
    const filename = `AI추천사항_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);

    console.log(`✅ [GET /ai/recommendations/export] CSV 다운로드 완료 (${recommendations.length}건)`);
  } catch (err) {
    console.error('❌ [GET /ai/recommendations/export] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 로그 저장
router.post("/logs", async (req, res) => {
  try {
    const log = new AiLog(req.body);
    await log.save();
    console.log(`✅ [POST /ai/logs] AI 로그 저장 완료`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ [POST /ai/logs] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 로그 조회
router.get("/logs", async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logs = await AiLog.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ [GET /ai/logs] ${logs.length}건 조회`);
    res.json(logs);
  } catch (err) {
    console.error('❌ [GET /ai/logs] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 프롬프트 설정 저장
router.post("/prompts", async (req, res) => {
  try {
    const { prompts } = req.body;

    if (!prompts || typeof prompts !== 'object') {
      return res.status(400).json({
        error: 'prompts 객체가 필요합니다.'
      });
    }

    const updated = await AiConfig.findOneAndUpdate(
      { scope: "unified" },
      {
        prompts: prompts,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    console.log(`✅ [POST /ai/prompts] AI 프롬프트 저장 완료`);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('❌ [POST /ai/prompts] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 프롬프트 설정 조회
router.get("/prompts", async (req, res) => {
  try {
    const config = await AiConfig.findOne({ scope: "unified" });

    if (!config || !config.prompts) {
      return res.json({
        dashboard: '',
        chatbot: '',
        analysis: ''
      });
    }

    console.log(`✅ [GET /ai/prompts] AI 프롬프트 조회 완료`);
    res.json(config.prompts);
  } catch (err) {
    console.error('❌ [GET /ai/prompts] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ 정책정보 캐시 조회
router.get("/policy", async (req, res) => {
  try {
    const { query } = req.query;
    const cache = await PolicyCache.findOne({ query });
    res.json(cache || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Provider별 사용 가능한 모델 목록 조회
router.get("/models", async (req, res) => {
  try {
    const { provider } = req.query;

    const modelsByProvider = {
      openai: [
        // GPT-5 시리즈
        'gpt-5.1',
        'gpt-5.1-chat-latest',
        'gpt-5.1-codex',
        'gpt-5',
        'gpt-5-chat-latest',
        'gpt-5-codex',
        'gpt-5-pro',
        'gpt-5-mini',
        'gpt-5-nano',
        // GPT-4.1 시리즈
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4.1-nano',
        // O 시리즈
        'o3-mini',
        'o1',
        'o1-mini',
        'o1-preview',
        // GPT-4o 시리즈
        'gpt-4o',
        'gpt-4o-2024-11-20',
        'gpt-4o-2024-05-13',
        'chatgpt-4o-latest',
        'gpt-4o-mini',
        // GPT-4 시리즈
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4-0613',
        'gpt-4-0125-preview',
        // GPT-3.5 시리즈
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-0125',
        'gpt-3.5-turbo-1106',
        // Realtime 시리즈
        'gpt-realtime',
        'gpt-realtime-mini'
      ],
      gemini: [
        'gemini-2.0-flash-thinking-exp',
        'gemini-2.0-pro-exp',
        'gemini-2.0-flash-exp',
        'gemini-exp-1206',
        'gemini-exp-1121',
        'gemini-exp-1114',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro-002',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-flash-8b',
        'gemini-pro'
      ],
      claude: [
        'claude-sonnet-4-5-20250929',
        'claude-3.7-sonnet-20250219',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]
    };

    const models = modelsByProvider[provider] || [];

    console.log(`✅ [GET /ai/models] Provider: ${provider}, Models: ${models.length}개`);
    res.json({ provider, models });
  } catch (err) {
    console.error('❌ [GET /ai/models] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ API 키 검증 및 실제 사용 가능한 모델 목록 조회
router.post("/validate-and-get-models", async (req, res) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        error: 'provider와 apiKey는 필수입니다.'
      });
    }

    console.log(`🔍 [POST /ai/validate-and-get-models] Provider: ${provider}`);

    let models = [];
    let isValid = false;

    // Provider별 API 키 검증 및 모델 목록 조회
    if (provider === 'openai') {
      try {
        // ✅ 실제 API 테스트로 작동하는 모델만 확인
        const stableModels = [
          // GPT-5 시리즈
          'gpt-5.1',
          'gpt-5.1-chat-latest',
          'gpt-5.1-codex',
          'gpt-5',
          'gpt-5-chat-latest',
          'gpt-5-codex',
          'gpt-5-pro',
          'gpt-5-mini',
          'gpt-5-nano',
          // GPT-4.1 시리즈
          'gpt-4.1',
          'gpt-4.1-mini',
          'gpt-4.1-nano',
          // O 시리즈
          'o3-mini',
          'o1',
          'o1-mini',
          'o1-preview',
          'o1-preview-2024-09-12',
          'o1-mini-2024-09-12',
          // GPT-4o 시리즈
          'gpt-4o',
          'gpt-4o-2024-11-20',
          'gpt-4o-2024-08-06',
          'gpt-4o-2024-05-13',
          'chatgpt-4o-latest',
          'gpt-4o-mini',
          'gpt-4o-mini-2024-07-18',
          // GPT-4 시리즈
          'gpt-4-turbo',
          'gpt-4-turbo-2024-04-09',
          'gpt-4-turbo-preview',
          'gpt-4',
          'gpt-4-0613',
          'gpt-4-0125-preview',
          // GPT-3.5 시리즈
          'gpt-3.5-turbo',
          'gpt-3.5-turbo-0125',
          'gpt-3.5-turbo-1106',
          // Realtime 시리즈
          'gpt-realtime',
          'gpt-realtime-mini'
        ];

        console.log(`🔍 [OpenAI] ${stableModels.length}개 모델 실제 API 테스트 시작...`);

        // ✅ 모든 모델을 실제로 테스트 (병렬 처리)
        const testResults = await Promise.allSettled(
          stableModels.map(model => testModel('openai', model, apiKey, 8000))
        );

        // ✅ 테스트 결과를 { model, available } 형태로 변환
        models = testResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              model: stableModels[index],
              available: false,
              status: 'error',
              error: result.reason?.message || 'Test failed'
            };
          }
        });

        // 우선순위 정렬 (최신 모델 우선, 사용 가능한 모델 우선)
        models.sort((a, b) => {
          // 사용 가능 여부 우선
          if (a.available !== b.available) {
            return a.available ? -1 : 1;
          }

          // 같은 available 상태면 우선순위로 정렬
          const priority = {
            // GPT-5 시리즈 (최우선)
            'gpt-5.1': 1,
            'gpt-5.1-chat-latest': 2,
            'gpt-5.1-codex': 3,
            'gpt-5': 4,
            'gpt-5-chat-latest': 5,
            'gpt-5-codex': 6,
            'gpt-5-pro': 7,
            'gpt-5-mini': 8,
            'gpt-5-nano': 9,
            // GPT-4.1 시리즈
            'gpt-4.1': 10,
            'gpt-4.1-mini': 11,
            'gpt-4.1-nano': 12,
            // O 시리즈
            'o3-mini': 13,
            'o1': 14,
            'o1-mini': 15,
            'o1-preview': 16,
            'o1-preview-2024-09-12': 17,
            'o1-mini-2024-09-12': 18,
            // GPT-4o 시리즈
            'gpt-4o': 19,
            'gpt-4o-2024-11-20': 20,
            'chatgpt-4o-latest': 21,
            'gpt-4o-2024-08-06': 22,
            'gpt-4o-2024-05-13': 23,
            'gpt-4o-mini': 24,
            'gpt-4o-mini-2024-07-18': 25,
            // GPT-4 시리즈
            'gpt-4-turbo': 26,
            'gpt-4-turbo-2024-04-09': 27,
            'gpt-4-turbo-preview': 28,
            'gpt-4': 29,
            'gpt-4-0125-preview': 30,
            'gpt-4-0613': 31,
            // GPT-3.5 시리즈
            'gpt-3.5-turbo': 32,
            'gpt-3.5-turbo-0125': 33,
            'gpt-3.5-turbo-1106': 34,
            // Realtime 시리즈
            'gpt-realtime': 35,
            'gpt-realtime-mini': 36
          };
          return (priority[a.model] || 999) - (priority[b.model] || 999);
        });

        // 만약 화이트리스트 모델이 없으면 기본값 사용
        if (models.length === 0) {
          models = [
            'gpt-5.1', 'gpt-5', 'gpt-5-mini', 'gpt-4.1',
            'o3-mini', 'o1-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'
          ].map(model => ({ model, available: false }));
        }

        isValid = true;

        const availableCount = models.filter(m => m.available).length;
        const unavailableCount = models.filter(m => !m.available).length;
        console.log(`✅ OpenAI 모델 ${models.length}개 (사용 가능: ${availableCount}, 사용 불가: ${unavailableCount})`);
        console.log(`📋 사용 가능 모델:`, models.filter(m => m.available).map(m => m.model));
      } catch (error) {
        console.error('❌ OpenAI API 키 검증 실패:', error.message);
        return res.status(401).json({
          error: 'OpenAI API 키가 유효하지 않습니다.',
          details: error.message
        });
      }

    } else if (provider === 'gemini') {
      try {
        // ✅ 실제 API 테스트로 작동하는 모델만 확인
        const stableModels = [
          'gemini-2.0-flash-thinking-exp',
          'gemini-2.0-pro-exp',
          'gemini-2.0-flash-exp',
          'gemini-exp-1206',
          'gemini-exp-1121',
          'gemini-exp-1114',
          'gemini-1.5-pro',
          'gemini-1.5-pro-latest',
          'gemini-1.5-pro-002',
          'gemini-1.5-flash',
          'gemini-1.5-flash-latest',
          'gemini-1.5-flash-002',
          'gemini-1.5-flash-8b',
          'gemini-pro'
        ];

        console.log(`🔍 [Gemini] ${stableModels.length}개 모델 실제 API 테스트 시작...`);

        // ✅ 모든 모델을 실제로 테스트 (병렬 처리)
        const testResults = await Promise.allSettled(
          stableModels.map(model => testModel('gemini', model, apiKey, 8000))
        );

        // ✅ 테스트 결과를 { model, available } 형태로 변환
        models = testResults.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            return {
              model: stableModels[index],
              available: false,
              status: 'error',
              error: result.reason?.message || 'Test failed'
            };
          }
        });

        isValid = true;

        const availableCount = models.filter(m => m.available).length;
        const unavailableCount = models.filter(m => !m.available).length;
        console.log(`✅ Gemini 모델 ${models.length}개 (사용 가능: ${availableCount}, 사용 불가: ${unavailableCount})`);
        console.log(`📋 사용 가능 모델:`, models.filter(m => m.available).map(m => m.model));
      } catch (error) {
        console.error('❌ Gemini API 키 검증 실패:', error.message);
        return res.status(401).json({
          error: 'Gemini API 키가 유효하지 않습니다.',
          details: error.message
        });
      }

    } else if (provider === 'claude') {
      try {
        // Claude API 키 검증 (간단한 테스트 요청)
        const testResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'test' }]
          })
        });

        if (!testResponse.ok) {
          throw new Error('Claude API 키가 유효하지 않습니다.');
        }

        // Claude는 고정 모델 리스트 (API로 모델 목록 조회 불가)
        // 모든 모델을 available: true로 표시 (API 키가 유효하면 모두 사용 가능)
        const claudeModels = [
          'claude-sonnet-4-5-20250929',
          'claude-3.7-sonnet-20250219',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-sonnet-20240620',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];

        models = claudeModels.map(model => ({
          model: model,
          available: true  // API 키가 유효하면 모두 사용 가능
        }));

        isValid = true;

        console.log(`✅ Claude 모델 ${models.length}개 (모두 사용 가능)`);
      } catch (error) {
        console.error('❌ Claude API 키 검증 실패:', error.message);
        return res.status(401).json({
          error: 'Claude API 키가 유효하지 않습니다.',
          details: error.message
        });
      }

    } else {
      return res.status(400).json({
        error: `지원하지 않는 provider: ${provider}`
      });
    }

    res.json({
      success: true,
      isValid: isValid,
      provider: provider,
      models: models
    });

  } catch (err) {
    console.error('❌ [POST /ai/validate-and-get-models] 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 쿼리 처리 (데이터 수정 기능 포함)
// ─── AI Router v2 helpers ───────────────────────────────────────────────────
const { detectIntent } = require('../aiRouter');
const { getAttendanceSummary } = require('../services/attendanceService');
const { getLeaveSummary }      = require('../services/leaveService');
const { getEmployeeSummary }   = require('../services/employeeService');

/**
 * v2: intent → service layer → structured data string
 */
async function buildDbDataV2(query, permissions) {
  if (!permissions?.read) return '';

  const intent = detectIntent(query);
  console.log(`🧠 [AI Router v2] intent=${intent}`);

  const {
    Employee, Attendance, Leave, Notice, Suggestion,
    Schedule, Payroll, Evaluation, SafetyAccident, Notification
  } = require('../models');

  // intent별 service 호출 (필요한 데이터만 조회)
  let structured = '';

  if (intent === 'attendance') {
    const data = await getAttendanceSummary(query);
    structured = `
**📅 출근/근태 분석 데이터 (${data.period.year}년 ${data.period.month}월):**
- 조회 기간: ${data.period.startOfMonth} ~ ${data.period.endOfMonth}

**오늘(${data.period.today}) 출근 현황:**
- 실제 출근: ${data.today.checkedIn}명${data.today.names.length > 0 ? ' → ' + data.today.names.join(', ') + (data.today.checkedIn > data.today.names.length ? ` 외 ${data.today.checkedIn - data.today.names.length}명` : '') : ''}
- 연차/반차/경조 등: ${data.today.leaveCount}건${data.today.leaveTypes.length > 0 ? ' (' + data.today.leaveTypes.join(', ') + ')' : ''}

**${data.period.year}년 ${data.period.month}월 전체 출근 현황:**
- 총 출근 기록: ${data.month.checkedIn}건
- 연차/반차/경조 등: ${data.month.leaveCount}건`;

  } else if (intent === 'leave') {
    const data = await getLeaveSummary(query);
    structured = `
**🏖️ 연차/휴가 분석 데이터 (${data.period.year}년 ${data.period.month}월):**

**전체 연차 현황:**
- 승인 대기: ${data.all.pending}건${data.all.pendingNames.length > 0 ? ' → ' + data.all.pendingNames.join(', ') : ''}
- 승인됨: ${data.all.approved}건
- 반려됨: ${data.all.rejected}건
- 취소됨: ${data.all.cancelled}건

**${data.period.year}년 ${data.period.month}월 연차:**
- 총 ${data.month.total}건 (대기: ${data.month.pending}건, 승인: ${data.month.approved}건)
${data.month.records.length > 0 ? data.month.records.map(r => `- ${r.name}: ${r.startDate}~${r.endDate} (${r.type || '연차'}, ${r.status})`).join('\n') : '- 해당 월 연차 없음'}

**⚠️ 상태 구분:** 대기=관리자 승인 대기 / 취소=사용자가 직접 취소`;

  } else if (intent === 'employee') {
    const data = await getEmployeeSummary(query);
    structured = `
**👥 직원 분석 데이터:**
- 총 직원수: ${data.total}명 (재직: ${data.active}명, 퇴사: ${data.resigned}명)
- 부서별: ${JSON.stringify(data.byDept)}
- 직급별: ${JSON.stringify(data.byPosition)}
${data.mentioned ? `
**👤 [${data.mentioned.name}] 상세 정보:**
- 부서: ${data.mentioned.department}, 직급: ${data.mentioned.position}
- 상태: ${data.mentioned.status}, 입사일: ${data.mentioned.hireDate || '미등록'}
- 근무형태: ${data.mentioned.workType || '미등록'}` : ''}`;

  } else {
    // general / 기타: 핵심 요약만 조회 (전체 풀 데이터 대신 경량화)
    const today = new Date().toISOString().split('T')[0];
    const [empCount, pendingLeaves, todayAtt] = await Promise.all([
      Employee.countDocuments({ status: '재직' }),
      Leave.countDocuments({ status: '대기' }),
      Attendance.find({ date: today }).lean(),
    ]);
    structured = `
**📊 시스템 요약 (오늘: ${today}):**
- 재직 직원: ${empCount}명
- 연차 승인 대기: ${pendingLeaves}건
- 오늘 출근 기록: ${todayAtt.length}건 (checkIn 완료: ${todayAtt.filter(a => a.checkIn).length}건)`;
  }

  return structured;
}
// ────────────────────────────────────────────────────────────────────────────

router.post("/query", async (req, res) => {
  try {
    const { query, messages, internalData, externalData, permissions } = req.body;
    const { systemPrompt, user } = externalData || {};

    // 🔍 [1] MongoDB 실체 확인
    console.log("\n========== [AI DB CHECK - QUERY] ==========");
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.log("mongoose.connection.name:", mongoose.connection.name);
    console.log("mongoose.connection.host:", mongoose.connection.host);
    console.log("mongoose.connection.db.databaseName:", mongoose.connection.db?.databaseName);
    console.log("실행 환경:", process.env.NODE_ENV || 'development');
    console.log("==========================================\n");

    // AI 설정 조회
    const aiConfig = await AiConfig.findOne({ scope: "unified", active: true });
    if (!aiConfig || !aiConfig.apiKey) {
      return res.status(400).json({
        error: 'AI 설정이 없습니다. 시스템 관리에서 AI 모델을 설정해주세요.'
      });
    }

    const { provider, apiKey, model } = aiConfig;

    // ✅ 회사 규정 및 시스템 로직 (AI가 숙지해야 할 정보 - 모든 사용자에게 제공)
    const companyRegulations = `

**📋 부성스틸 회사 규정 및 시스템 로직 (필수 숙지 - 실제 규정 반영)**

**⏰ 근무시간 규정:**

**[근무시간 산정 제외]**
   - 12:00~13:00 점심시간
   - 17:30~18:00 저녁시간
   - 00:00~01:00 야식시간

**[임금형태]**
   - 연봉제 (연봉)
   - 시급제 (시급)

1️⃣ **연봉제 (사무직)**
   **평일:**
   - 04:00~08:30 조출 (근무시간 미적용)
   - **08:30~17:30 기본 (근무시간 적용)**
   - 18:00~22:00 연장 (근무시간 미적용)
   - 22:00~03:59 연장+심야 (근무시간 적용)

   **휴일:**
   - 출근 시간 기점부터 8시간: 특근
   - 8시간 이상: 특근+연장

2️⃣ **시급_주간 근무자**
   **평일:**
   - 04:00~08:30 조출
   - **08:30~17:30 기본**
   - 18:00~22:00 연장
   - 22:00~03:59 연장+심야

   **휴일:**
   - 04:00~06:30 조출+특근
   - 06:30~15:30 특근 (8시간 기준)
   - 15:30~22:00 특근+연장

3️⃣ **현장직_야간 근무자**
   **평일:**
   - 19:00~22:00 기본
   - 22:00~04:00 심야
   - 04:00~06:00 심야+연장
   - 06:00~08:30 연장

**📅 연차 휴가 규정 (annualLeaveScheduler.js):**

1️⃣ **근속연수별 연차 개수**
   - 1년 미만: 15일
   - 1~3년: 15일
   - 3~5년: 16일 (2년마다 +1일)
   - 5~7년: 17일
   - 7~9년: 18일
   - 9~11년: 19일
   - 11~13년: 20일
   - 13~15년: 21일
   - 15~17년: 22일
   - 17~19년: 23일
   - 19~21년: 24일
   - 21년 이상: 25일 (최대)

2️⃣ **연차 사용 차감**
   - 연차: 1일 차감
   - 반차(오전): 0.5일 차감
   - 반차(오후): 0.5일 차감
   - **연차 기간: 입사일 기준 1년 단위**

**🔔 실시간 알림 시스템:**

1️⃣ **자동 알림 발송 시간**
   - **연차 만료 알림**: 매일 오전 8시 (cron 스케줄러)
   - **출퇴근 알림**: 실시간 (Socket.io 'attendance-checked-in' 이벤트)
   - **급여 업로드 알림**: 실시간 (Socket.io 'payroll-bulk-uploaded' 이벤트)

2️⃣ **알림 종류 (notifications.js)**
   - 정기 알림: 반복 주기 설정 (특정일, 매일, 매주, 매월, 분기, 반기, 년)
   - 실시간 알림: 즉시 발송 (즉시)
   - 시스템 로그: 자동 생성 알림

**💰 급여 데이터 항목 (payroll.js):**

1️⃣ **급여 항목**
   - 기본급 (basicPay = 시급 × 기본시간)
   - 연장수당 (overtimePay)
   - 휴일근로수당 (holidayWorkPay)
   - 야간근로수당 (nightWorkPay)
   - 년차수당 (annualLeavePay)
   - 차량수당 (carAllowance)
   - 교통비 (transportAllowance)
   - 통신비 (phoneAllowance)
   - 상여금 (bonus)

2️⃣ **공제 항목**
   - 지각조퇴공제 (lateEarlyDeduction)
   - 결근공제 (absentDeduction)
   - 가불금과태료 (advanceDeduction)
   - 소득세, 지방세, 4대보험 등

**📊 근태 상태 자동 판정 (attendanceStatsCalculator.js):**
   - **출근** (status === '출근'): 정상 근무일
   - **지각** (status === '지각'): 근무일이지만 지각 카운트
   - **조퇴** (status === '조퇴'): 근무일이지만 조퇴 카운트
   - **결근** (status === '결근'): 결근일 카운트
   - **연차** (status === '연차'): 연차일 카운트
   - **반차(오전)** (status === '반차(오전)'): 근무일 + 오전반차 카운트
   - **반차(오후)** (status === '반차(오후)'): 근무일 + 오후반차 카운트
`;

    // ✅ DB 데이터 조회: feature flag로 v1/v2 분기
    let fullDbData = '';

    if (process.env.AI_ROUTER_V2) {
      // ─── v2: Intent Router → Service Layer → Structured Data ───────────
      console.log('🚀 [AI Router v2] 활성화');
      fullDbData = await buildDbDataV2(query, permissions);
      // ────────────────────────────────────────────────────────────────────
    } else if (permissions?.read) {
      // ─── v1 (기존): 전체 DB 데이터를 LLM에 전달 ─────────────────────────
      const {
        Employee, Attendance, Leave, Notice, Suggestion,
        Schedule, Payroll, Evaluation, SafetyAccident, Notification
      } = require('../models');

      const today = new Date().toISOString().split('T')[0];

      // 사용자 질문에서 날짜 파싱 (예: "2025년 08월", "8월", "2025-08" 등)
      let targetYear = new Date().getFullYear();
      let targetMonth = new Date().getMonth();

      const yearMatch = query.match(/(\d{4})\s*년/);
      const monthMatch = query.match(/(\d{1,2})\s*월/);
      const dateMatch = query.match(/(\d{4})-(\d{1,2})/);

      if (yearMatch) targetYear = parseInt(yearMatch[1]);
      if (monthMatch) targetMonth = parseInt(monthMatch[1]) - 1;
      if (dateMatch) {
        targetYear = parseInt(dateMatch[1]);
        targetMonth = parseInt(dateMatch[2]) - 1;
      }

      const startOfMonth = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];

      // 질문에서 직원 이름 또는 사번 추출 (유연한 검색)
      const employees = await Employee.find().lean();
      let mentionedEmployee = null;

      // 1차: 정확한 이름 매칭
      mentionedEmployee = employees.find(emp => query.includes(emp.name));

      // 2차: 사번 매칭 (BS-XXX 형식)
      if (!mentionedEmployee) {
        mentionedEmployee = employees.find(emp => emp.employeeId && query.includes(emp.employeeId));
      }

      // 3차: 부분 이름 매칭 (성 또는 이름만으로 검색)
      if (!mentionedEmployee && query.length >= 2) {
        mentionedEmployee = employees.find(emp => {
          const name = emp.name || '';
          // 2글자 이상의 부분 문자열이 있으면 매칭
          for (let i = 0; i <= name.length - 2; i++) {
            if (query.includes(name.substring(i, i + 2))) {
              return true;
            }
          }
          return false;
        });
      }

      // 4차: 유사 이름 검색 (초성 또는 발음 유사)
      if (!mentionedEmployee) {
        // 예: "민성" -> "민성우", "김영" -> "김영화" 등
        const possibleMatches = employees.filter(emp => {
          const name = emp.name || '';
          return name.length > 0 && query.includes(name.substring(0, Math.min(2, name.length)));
        });
        if (possibleMatches.length === 1) {
          mentionedEmployee = possibleMatches[0];
        }
      }

      // 모든 데이터 조회
      const [todayAttendances, monthAttendances, allLeaves, notices, suggestions,
             schedules, payrolls, evaluations, safetyAccidents, notifications] = await Promise.all([
        Attendance.find({ date: today }).lean(),
        Attendance.find({ date: { $gte: startOfMonth, $lte: endOfMonth } }).lean(),
        Leave.find().sort({ startDate: -1 }).limit(300).lean(),
        Notice.find().sort({ date: -1 }).limit(20).lean(),
        Suggestion.find().sort({ createdAt: -1 }).limit(20).lean(),
        Schedule.find().sort({ date: -1 }).limit(20).lean(),
        Payroll.find().sort({ createdAt: -1 }).limit(20).lean(),
        Evaluation.find().sort({ createdAt: -1 }).limit(20).lean(),
        SafetyAccident.find().sort({ date: -1 }).limit(20).lean(),
        Notification.find().sort({ createdAt: -1 }).limit(20).lean()
      ]);

      // 🔍 [2] 연차 데이터 실체 확인
      console.log("\n========== [REAL DB CHECK - QUERY] ==========");
      console.log("ALL LEAVES 총 건수:", allLeaves.length);
      console.log("\n대기 건수:", allLeaves.filter(l => l.status === '대기').length);
      console.log("승인 건수:", allLeaves.filter(l => l.status === '승인').length);
      console.log("반려 건수:", allLeaves.filter(l => l.status === '반려').length);
      console.log("취소 건수:", allLeaves.filter(l => l.status === '취소').length);
      console.log("\nSTATUS 값 종류:", [...new Set(allLeaves.map(l => l.status))]);
      console.log("=============================================\n");

      // 오늘 출근 분류
      const timeRegex = /^\d{2}:\d{2}$/;
      const todayReal = todayAttendances.filter(a => timeRegex.test(a.checkIn));
      const todayLeave = todayAttendances.filter(a => a.checkIn && !timeRegex.test(a.checkIn));

      // ✅ 연차 실시간 집계 (Leave 컬렉션 기준 - 승인된 것만)
      const leaveUsageMap = {};
      allLeaves.filter(l => l.status === '승인').forEach(l => {
        const id = l.employeeId || l.employeeName;
        if (!id) return;
        leaveUsageMap[id] = (leaveUsageMap[id] || 0) + (Number(l.requestedDays) || 0);
      });

      fullDbData = `

**📊 실시간 DB 데이터 (오늘: ${today}, 조회월: ${targetYear}년 ${targetMonth + 1}월)**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**👥 전체 직원 목록 (재직: ${employees.filter(e => e.status === '재직').length}명 / 퇴사: ${employees.filter(e => e.status === '퇴사').length}명)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${employees.filter(e => e.status === '재직').map(e => {
  const total = e.totalAnnual ?? e.leaveEntitled ?? 0;
  const used = leaveUsageMap[e.employeeId] ?? leaveUsageMap[e.name] ?? e.usedAnnual ?? e.leaveUsed ?? 0;
  const remain = total - used;
  return `[${e.employeeId}] ${e.name} | ${e.department} | ${e.position} | ${e.workType || '미지정'} | 입사: ${e.joinDate ? new Date(e.joinDate).toISOString().split('T')[0] : '미등록'} | 연차: 총${total}일 사용${used}일 잔여${remain}일 (기간:${e.annualLeaveStart||'?'}~${e.annualLeaveEnd||'?'})`;
}).join('\n')}
${employees.filter(e => e.status === '퇴사').length > 0 ? `\n[퇴사자] ${employees.filter(e => e.status === '퇴사').map(e => `${e.name}(${e.employeeId})`).join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**📅 오늘(${today}) 출근 현황 (실제출근: ${todayReal.length}명 / 연차·반차 등: ${todayLeave.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${todayReal.length > 0 ? todayReal.map(a => `출근 | ${a.employeeName || a.employeeId} | ${a.checkIn}${a.checkOut ? ` ~ ${a.checkOut}` : ' (미퇴근)'}${a.shiftType ? ` [${a.shiftType}]` : ''}`).join('\n') : '- 출근 기록 없음'}
${todayLeave.length > 0 ? '\n' + todayLeave.map(a => `${a.checkIn} | ${a.employeeName || a.employeeId}`).join('\n') : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**📅 ${targetYear}년 ${targetMonth + 1}월 출근 기록 (${startOfMonth} ~ ${endOfMonth})**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(() => {
  const real = monthAttendances.filter(a => timeRegex.test(a.checkIn));
  const leave = monthAttendances.filter(a => a.checkIn && !timeRegex.test(a.checkIn));
  const byEmployee = {};
  real.forEach(a => {
    const name = a.employeeName || a.employeeId;
    if (!byEmployee[name]) byEmployee[name] = [];
    byEmployee[name].push(`${a.date}(${a.checkIn})`);
  });
  const summary = Object.entries(byEmployee).map(([name, dates]) => `${name}: ${dates.length}일 출근`).join(', ');
  return `실제출근 총 ${real.length}건 (${Object.keys(byEmployee).length}명)\n${summary || '기록 없음'}\n연차/반차/경조 등: ${leave.length}건`;
})()}
${mentionedEmployee ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**👤 ${mentionedEmployee.name}(${mentionedEmployee.employeeId}) 상세 정보**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 부서: ${mentionedEmployee.department} | 직급: ${mentionedEmployee.position} | 근무형태: ${mentionedEmployee.workType || '미지정'}
- 입사일: ${mentionedEmployee.joinDate || '미등록'} | 상태: ${mentionedEmployee.status}
- 연차: 총 ${mentionedEmployee.totalAnnual ?? mentionedEmployee.leaveEntitled ?? 0}일, 사용 ${leaveUsageMap[mentionedEmployee.employeeId] ?? leaveUsageMap[mentionedEmployee.name] ?? mentionedEmployee.usedAnnual ?? mentionedEmployee.leaveUsed ?? 0}일, 잔여 ${(mentionedEmployee.totalAnnual ?? mentionedEmployee.leaveEntitled ?? 0) - (leaveUsageMap[mentionedEmployee.employeeId] ?? leaveUsageMap[mentionedEmployee.name] ?? mentionedEmployee.usedAnnual ?? mentionedEmployee.leaveUsed ?? 0)}일 (기간: ${mentionedEmployee.annualLeaveStart || '?'} ~ ${mentionedEmployee.annualLeaveEnd || '?'}) ✅실시간집계
- ${targetYear}년 ${targetMonth + 1}월 출근 기록:
${monthAttendances.filter(a => a.employeeName === mentionedEmployee.name || a.employeeId === mentionedEmployee.employeeId).map(a => `  ${a.date}: ${a.checkIn ? `출근 ${a.checkIn}` : '미출근'}${a.checkOut ? ` / 퇴근 ${a.checkOut}` : ''}${a.shiftType ? ` [${a.shiftType}]` : ''}`).join('\n') || '  해당 월 출근 기록 없음'}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**🏖️ 연차 신청 전체 목록 (총 ${allLeaves.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ "대기"=관리자 승인 대기중 / "취소"=사용자 직접 취소 (두 상태는 다름)
${allLeaves.length > 0 ? allLeaves.map(l => {
  const sd = l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : '?';
  const ed = l.endDate   ? new Date(l.endDate).toISOString().split('T')[0]   : '?';
  return `[${l.status}] ${l.employeeName}(${l.employeeId || ''}) | ${sd}~${ed} | ${l.type || '연차'} | ${l.requestedDays || '?'}일 | 사유: ${l.reason || '없음'}`;
}).join('\n') : '- 연차 신청 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**📢 최근 공지사항 (${notices.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${notices.length > 0 ? notices.map(n => `[${n.priority || 'medium'}] ${n.date || ''} | ${n.title} | 작성: ${n.author || ''}`).join('\n') : '- 공지사항 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**💡 건의사항 (${suggestions.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${suggestions.length > 0 ? suggestions.map(s => `[${s.status}] ${s.author || s.name || ''} | ${s.title} | ${s.category || ''}`).join('\n') : '- 건의사항 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**📆 최근 일정 (${schedules.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${schedules.length > 0 ? schedules.map(s => `${s.date || ''} ${s.time || ''} | ${s.title} | ${s.location || ''}`).join('\n') : '- 일정 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**💰 급여 데이터 (${payrolls.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${payrolls.length > 0 ? payrolls.map(p => `${p.employeeName}(${p.employeeId || ''}) | ${p.month || ''} | 기본급: ${(p.baseSalary || 0).toLocaleString()}원 | 총지급: ${(p.totalSalary || 0).toLocaleString()}원`).join('\n') : '- 급여 데이터 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**📈 평가 데이터 (${evaluations.length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${evaluations.length > 0 ? evaluations.map(e => `[${e.status}] ${e.employeeName}(${e.employeeId || ''}) | ${e.evaluationType || ''} | 점수: ${e.score != null ? e.score + '점' : '미입력'}`).join('\n') : '- 평가 데이터 없음'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**⚠️ 안전사고 (${safetyAccidents.length}건) | 🔔 미읽음 알림 (${notifications.filter(n => n.status === 'unread').length}건)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${safetyAccidents.length > 0 ? safetyAccidents.map(a => `[${a.severity}] ${a.date} | ${a.location} | ${a.type || ''}`).join('\n') : '안전사고 없음'}
`;
      // ────────────────────────────────────────────────────────────────────
    } // end v1 block

    // 권한에 따른 시스템 프롬프트 생성
    let permissionInfo = '';

    // ✅ 회사 규정은 모든 사용자에게 제공
    permissionInfo += companyRegulations;

    if (permissions?.read) {
      permissionInfo += `\n\n**✅ 읽기 권한 활성화:** 위 DB 데이터에 접근 가능합니다.
**중요:** 직원 이름/사번이 언급되면 위 직원 목록에서 반드시 찾아서 정확한 정보로 답변하세요.`;
    }

    if (permissions?.modify) {
      permissionInfo += `\n\n**✅ 수정 권한 활성화:** 데이터 생성/수정/삭제가 가능합니다.
**데이터 수정 방법:**
- 사용자가 데이터 생성/수정/삭제를 요청하면, 반드시 다음 형식으로 명령을 응답에 포함:
- 명령 형식: <COMMAND>{"action":"create|update|delete","dataType":"employee|notice|leave|payroll|evaluation|suggestion|safetyAccident|attendance|schedule|notification","data":{...},"id":"..."}</COMMAND>
- 예시: "공지사항을 생성하겠습니다. <COMMAND>{"action":"create","dataType":"notice","data":{"title":"긴급 회의","content":"내일 10시 회의","author":"관리자","priority":"high","date":"${new Date().toISOString().split('T')[0]}"}}</COMMAND> 생성 완료했습니다."

**지원되는 데이터 타입 및 필수 필드:**
1. **employee** (직원): name, department, position, email, phone, joinDate, workType, status, annualLeave
2. **notice** (공지사항): title, content, author, priority, date
3. **leave** (연차): employeeId, employeeName, startDate, endDate, reason, status
4. **payroll** (급여): employeeId, employeeName, baseSalary, totalSalary, month
5. **evaluation** (평가): employeeId, employeeName, evaluationType, status, score
6. **suggestion** (건의사항): title, content, author, category, status
7. **safetyAccident** (안전사고): type, description, location, date, severity
8. **attendance** (근태): employeeId, date, checkIn, checkOut, status
9. **schedule** (일정): title, date, time, location, description, participants
10. **notification** (알림): title, content, notificationType, status, recipients`;
    } else {
      permissionInfo += `\n\n**⚠️ 수정 권한 없음:** 데이터 조회만 가능하며, 생성/수정/삭제는 불가능합니다.`;
    }

    if (permissions?.download) {
      permissionInfo += `\n\n**✅ 다운로드 권한 활성화:** Excel, CSV, PDF, JSON 파일 생성 및 다운로드가 가능합니다.
**다운로드 방법:**
- 사용자가 데이터 다운로드를 요청하면, 다음 형식으로 응답:
- 명령 형식: <DOWNLOAD>{"format":"excel|csv|pdf|json","dataType":"employee|attendance|leave|payroll|evaluation|suggestion|safetyAccident|notice|schedule|notification","filter":{...}}</DOWNLOAD>

**지원 형식:**
1. **excel**: Excel 파일 (.xlsx) - 스프레드시트 형식, 데이터 분석 및 편집에 적합
2. **csv**: CSV 파일 (.csv) - 간단한 텍스트 형식, 호환성 높음
3. **pdf**: PDF 문서 (.pdf) - 읽기 전용 보고서 형식, 인쇄 및 공유에 적합
4. **json**: JSON 파일 (.json) - 개발자용 데이터 형식

**예시:**
- "직원 데이터를 엑셀로 다운로드하겠습니다. <DOWNLOAD>{"format":"excel","dataType":"employee","filter":{}}</DOWNLOAD> 다운로드 준비가 완료되었습니다."
- "출근 데이터를 PDF로 다운로드하겠습니다. <DOWNLOAD>{"format":"pdf","dataType":"attendance","filter":{}}</DOWNLOAD> PDF 보고서 생성이 완료되었습니다."
- "연차 데이터를 CSV로 다운로드하겠습니다. <DOWNLOAD>{"format":"csv","dataType":"leave","filter":{}}</DOWNLOAD> CSV 파일 다운로드 준비가 완료되었습니다."`;
    } else {
      permissionInfo += `\n\n**⚠️ 다운로드 권한 없음:** 파일 다운로드가 불가능합니다.`;
    }

    // DB 데이터를 systemPrompt 바로 뒤에 배치 (AI가 가장 먼저 참조)
    const enhancedSystemPrompt = `${systemPrompt}${fullDbData ? '\n\n' + fullDbData : ''}
${permissionInfo}`;

    // 🔍 디버깅: 시스템 프롬프트 크기 확인
    console.log(`📊 시스템 프롬프트 크기: ${enhancedSystemPrompt.length} 문자`);
    console.log(`📊 전체 DB 데이터 크기: ${fullDbData.length} 문자`);
    console.log(`📊 이전 대화 메시지 수: ${(messages || []).length}개`);

    // 🔍 AI INPUT 전체 내용 출력 (오답 원인 증명용)
    console.log('\n========== [AI QUERY] AI INPUT 시작 ==========');
    console.log('📝 사용자 질문:', query);
    console.log('\n📋 enhancedSystemPrompt (클라이언트 systemPrompt + 서버 permissionInfo):');
    console.log(enhancedSystemPrompt);
    console.log('\n========== [AI QUERY] AI INPUT 종료 ==========\n');

    let aiResponse = '';

    // ✅ 이전 대화는 최근 5개만 유지 (토큰 사용량 제한)
    const recentMessages = (messages || []).slice(-5);
    console.log(`📊 전송할 이전 대화 메시지 수: ${recentMessages.length}개 (최근 5개로 제한)`);

    // ✅ 이전 대화 내용을 포함한 메시지 배열 생성
    const fullMessages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...recentMessages, // 최근 5개 대화만 포함
      { role: 'user', content: query } // 현재 질문
    ];

    // Provider별 API 호출
    if (provider === 'openai') {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: fullMessages, // ✅ 이전 대화 포함
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!openaiRes.ok) {
        const error = await openaiRes.json();
        throw new Error(`OpenAI API 오류: ${error.error?.message || openaiRes.statusText}`);
      }

      const data = await openaiRes.json();
      aiResponse = data.choices[0]?.message?.content || '응답을 생성할 수 없습니다.';

    } else if (provider === 'gemini') {
      // Gemini는 contents 배열 형식으로 변환
      const geminiContents = recentMessages.concat([{ role: 'user', content: query }])
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: enhancedSystemPrompt }] },
          contents: geminiContents, // ✅ 이전 대화 포함
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      });

      if (!geminiRes.ok) {
        const error = await geminiRes.json();
        throw new Error(`Gemini API 오류: ${error.error?.message || geminiRes.statusText}`);
      }

      const data = await geminiRes.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '응답을 생성할 수 없습니다.';

    } else if (provider === 'claude') {
      // Claude는 messages 배열 형식 (system은 별도)
      const claudeMessages = recentMessages.concat([{ role: 'user', content: query }]);

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          system: enhancedSystemPrompt,
          messages: claudeMessages // ✅ 이전 대화 포함
        })
      });

      if (!claudeRes.ok) {
        const error = await claudeRes.json();
        throw new Error(`Claude API 오류: ${error.error?.message || claudeRes.statusText}`);
      }

      const data = await claudeRes.json();
      aiResponse = data.content?.[0]?.text || '응답을 생성할 수 없습니다.';

    } else {
      return res.status(400).json({ error: `지원하지 않는 provider: ${provider}` });
    }

    console.log(`✅ [AI Query] 응답 생성 완료 (${aiResponse.length}자)`);

    // ✅ 서버에서 COMMAND 파싱 및 실행
    const executedCommands = [];
    const commandRegex = /<COMMAND>(.*?)<\/COMMAND>/gs;
    let commandMatch;

    while ((commandMatch = commandRegex.exec(aiResponse)) !== null) {
      try {
        const commandJson = commandMatch[1].trim();
        const command = JSON.parse(commandJson);

        console.log(`🔧 [COMMAND 감지] action=${command.action}, dataType=${command.dataType}`);

        // ✅ 권한 확인 (사용자 role 기반 - 관리자만 허용)
        const hasModifyPermission = user && (
          user.role === '관리자' ||
          user.position === '관리자' ||
          user.isAdmin === true
        );

        if (!hasModifyPermission) {
          console.warn(`⚠️ [COMMAND 차단] 권한 없음 - user.role: ${user?.role}, user.position: ${user?.position}`);
          executedCommands.push({
            success: false,
            error: '관리자 권한이 필요합니다. (현재 role: ' + (user?.role || user?.position || '미확인') + ')',
            command: command
          });
          continue;
        }

        console.log(`✅ [COMMAND 권한 확인] 관리자 권한 보유 - role: ${user.role || user.position}`);

        // 데이터 타입 검증 (화이트리스트)
        const allowedDataTypes = ['employee', 'attendance', 'leave', 'notice', 'suggestion',
                                   'schedule', 'payroll', 'evaluation', 'safetyAccident', 'notification'];
        if (!allowedDataTypes.includes(command.dataType)) {
          executedCommands.push({
            success: false,
            error: `지원하지 않는 데이터 타입: ${command.dataType}`,
            command: command
          });
          continue;
        }

        // 모델 가져오기
        const {
          Employee, Attendance, Leave, Notice, Suggestion,
          Schedule, Payroll, Evaluation, SafetyAccident, Notification
        } = require('../models');

        const modelMap = {
          employee: Employee,
          attendance: Attendance,
          leave: Leave,
          notice: Notice,
          suggestion: Suggestion,
          schedule: Schedule,
          payroll: Payroll,
          evaluation: Evaluation,
          safetyAccident: SafetyAccident,
          notification: Notification
        };

        const Model = modelMap[command.dataType];
        let result;

        // ID 검증 (문자열만 허용, 객체 주입 방지)
        if (command.id && typeof command.id !== 'string') {
          executedCommands.push({
            success: false,
            error: 'ID는 문자열이어야 합니다.',
            command: command
          });
          continue;
        }

        // 액션 실행
        if (command.action === 'create') {
          result = await Model.create(command.data);
          executedCommands.push({
            success: true,
            action: 'create',
            dataType: command.dataType,
            result: result
          });
        } else if (command.action === 'update') {
          if (!command.id) {
            executedCommands.push({
              success: false,
              error: 'update 액션에는 id가 필요합니다.',
              command: command
            });
            continue;
          }
          result = await Model.findByIdAndUpdate(command.id, command.data, { new: true });
          executedCommands.push({
            success: true,
            action: 'update',
            dataType: command.dataType,
            result: result
          });
        } else if (command.action === 'delete') {
          if (!command.id) {
            executedCommands.push({
              success: false,
              error: 'delete 액션에는 id가 필요합니다.',
              command: command
            });
            continue;
          }
          result = await Model.findByIdAndDelete(command.id);
          executedCommands.push({
            success: true,
            action: 'delete',
            dataType: command.dataType,
            result: result
          });
        } else {
          executedCommands.push({
            success: false,
            error: `지원하지 않는 액션: ${command.action}`,
            command: command
          });
        }

        console.log(`✅ [COMMAND 실행 완료] ${command.action} ${command.dataType}`);

      } catch (parseError) {
        console.error(`❌ [COMMAND 파싱/실행 오류]:`, parseError);
        executedCommands.push({
          success: false,
          error: parseError.message,
          rawCommand: commandMatch[1]
        });
      }
    }

    if (executedCommands.length > 0) {
      console.log(`📊 [COMMAND 실행 결과] 총 ${executedCommands.length}개 명령 처리`);
    }

    // ✅ DB에 대화 기록 저장
    try {
      const aiLog = new AiLog({
        eventType: 'AI_QUERY',
        model: model,
        provider: provider,
        prompt: query,
        response: aiResponse,
        success: true,
        createdAt: new Date()
      });
      await aiLog.save();
    } catch (logError) {
      // DB 저장 실패 시 무시하고 계속 진행
    }

    // 응답 반환 (실행된 명령 결과 포함)
    res.json({
      response: aiResponse,
      provider: provider,
      model: model,
      executedCommands: executedCommands.length > 0 ? executedCommands : undefined
    });

  } catch (err) {
    console.error('❌ [POST /ai/query] 오류:', err);

    // ✅ 오류도 DB에 저장
    try {
      const aiLog = new AiLog({
        eventType: 'ERROR',
        prompt: req.body.query,
        errorMessage: err.message,
        success: false,
        createdAt: new Date()
      });
      await aiLog.save();
    } catch (logError) {
      // 로그 저장 실패 무시
    }

    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 챗봇 DB 명령 실행 (수정 권한 필요)
router.post("/chatbot/execute", async (req, res) => {
  try {
    const { action, dataType, data, id, permissions } = req.body;

    // 권한 체크
    if (!permissions?.modify) {
      return res.status(403).json({
        error: '수정 권한이 없습니다. 시스템 관리에서 AI 챗봇 권한을 활성화해주세요.'
      });
    }

    const {
      Employee, Attendance, Leave, Notice, Suggestion,
      Schedule, Payroll, Evaluation, SafetyAccident, Notification
    } = require('../models');

    // 데이터 타입에 따른 모델 선택
    const modelMap = {
      employee: Employee,
      attendance: Attendance,
      leave: Leave,
      notice: Notice,
      suggestion: Suggestion,
      schedule: Schedule,
      payroll: Payroll,
      evaluation: Evaluation,
      safetyAccident: SafetyAccident,
      notification: Notification
    };

    const Model = modelMap[dataType];
    if (!Model) {
      return res.status(400).json({ error: `지원하지 않는 데이터 타입: ${dataType}` });
    }

    let result;

    // 액션 수행
    if (action === 'create') {
      result = await Model.create(data);
    } else if (action === 'update') {
      if (!id) {
        return res.status(400).json({ error: 'ID가 필요합니다.' });
      }
      result = await Model.findByIdAndUpdate(id, data, { new: true });
    } else if (action === 'delete') {
      if (!id) {
        return res.status(400).json({ error: 'ID가 필요합니다.' });
      }
      result = await Model.findByIdAndDelete(id);
    } else {
      return res.status(400).json({ error: `지원하지 않는 액션: ${action}` });
    }

    res.json({
      success: true,
      action,
      dataType,
      result
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ AI 챗봇 데이터 다운로드 (다운로드 권한 필요)
router.post("/chatbot/download", async (req, res) => {
  try {
    const { format, dataType, filter, permissions } = req.body;

    // 권한 체크
    if (!permissions?.download) {
      return res.status(403).json({
        error: '다운로드 권한이 없습니다. 시스템 관리에서 AI 챗봇 권한을 활성화해주세요.'
      });
    }

    const {
      Employee, Attendance, Leave, Notice, Suggestion,
      Schedule, Payroll, Evaluation, SafetyAccident, Notification
    } = require('../models');

    // 데이터 타입에 따른 모델 선택
    const modelMap = {
      employee: Employee,
      attendance: Attendance,
      leave: Leave,
      notice: Notice,
      suggestion: Suggestion,
      schedule: Schedule,
      payroll: Payroll,
      evaluation: Evaluation,
      safetyAccident: SafetyAccident,
      notification: Notification
    };

    const Model = modelMap[dataType];
    if (!Model) {
      return res.status(400).json({ error: `지원하지 않는 데이터 타입: ${dataType}` });
    }

    // 데이터 조회
    const data = await Model.find(filter || {}).lean();

    // 형식에 따라 변환
    let downloadData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // CSV 변환
      if (data.length === 0) {
        downloadData = '';
      } else {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item =>
          Object.values(item).map(val =>
            typeof val === 'object' ? JSON.stringify(val) : val
          ).join(',')
        );
        downloadData = [headers, ...rows].join('\n');
      }
      contentType = 'text/csv';
      filename = `${dataType}_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (format === 'excel') {
      // Excel 변환 (xlsx 라이브러리 사용)
      const XLSX = require('xlsx');

      // 데이터를 평탄화 (중첩 객체를 문자열로 변환)
      const flattenedData = data.map(item => {
        const flattened = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'object' && value !== null) {
            flattened[key] = JSON.stringify(value);
          } else {
            flattened[key] = value;
          }
        }
        return flattened;
      });

      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(flattenedData);

      // 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, dataType);

      // 버퍼로 변환
      downloadData = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `${dataType}_${new Date().toISOString().split('T')[0]}.xlsx`;

    } else if (format === 'pdf') {
      // PDF 변환 (pdfkit 라이브러리 사용)
      const PDFDocument = require('pdfkit');
      const { Readable } = require('stream');

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          downloadData = Buffer.concat(chunks);
          contentType = 'application/pdf';
          filename = `${dataType}_${new Date().toISOString().split('T')[0]}.pdf`;

          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(downloadData);
          resolve();
        });
        doc.on('error', reject);

        // PDF 내용 작성
        doc.fontSize(20).text(`${dataType.toUpperCase()} 데이터`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`생성일: ${new Date().toLocaleString('ko-KR')}`, { align: 'center' });
        doc.moveDown(2);

        // 데이터 테이블 형식으로 출력
        doc.fontSize(10);
        data.forEach((item, index) => {
          doc.fontSize(12).text(`#${index + 1}`, { underline: true });
          doc.fontSize(10);

          for (const [key, value] of Object.entries(item)) {
            if (key === '_id' || key === '__v') continue;
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            doc.text(`${key}: ${displayValue}`, { indent: 20 });
          }

          doc.moveDown();

          // 페이지 넘김 체크
          if (doc.y > 700) {
            doc.addPage();
          }
        });

        doc.end();
      });

    } else if (format === 'json') {
      // JSON 형식
      downloadData = JSON.stringify(data, null, 2);
      contentType = 'application/json';
      filename = `${dataType}_${new Date().toISOString().split('T')[0]}.json`;

    } else {
      return res.status(400).json({ error: `지원하지 않는 형식: ${format}` });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(downloadData);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
