// Background script for HR Perfect Screenshot Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('HR Perfect Screenshot Extension 설치 완료!');
});

// 확장프로그램 아이콘 클릭 처리
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Content script가 이미 주입되어 있는지 확인
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return window.hrPerfectScreenshotLoaded || false;
      }
    });

    // HR 시스템 팝업 자동 감지 및 캡처
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: autoDetectAndCapture
    });

  } catch (error) {
    console.error('스크립트 주입 실패:', error);
  }
});

// 자동 감지 및 캡처 함수 (페이지에 주입됨)
function autoDetectAndCapture() {
  window.hrPerfectScreenshotLoaded = true;

  // HR 시스템 페이지인지 확인
  const isHRSystem = document.title.includes('HR') ||
                    document.URL.includes('hr-system') ||
                    document.querySelector('.bg-white.rounded-xl');

  if (!isHRSystem) {
    alert('❌ HR 시스템 페이지가 아닙니다.');
    return;
  }

  // 팝업 자동 감지
  const popups = document.querySelectorAll('.bg-white.rounded-xl');
  let hrPopup = null;

  for (let popup of popups) {
    if (popup.textContent.includes('목표달성률 상세') ||
        popup.textContent.includes('워라밸 지표 상세')) {
      hrPopup = popup;
      break;
    }
  }

  if (hrPopup) {
    // HR 팝업 발견 시 자동 캡처
    alert('🎯 HR 팝업이 감지되었습니다. 자동 캡처를 시작합니다.');
    triggerPerfectCapture(hrPopup, 'HR_Auto_Popup');
  } else {
    // 팝업이 없으면 전체 페이지 캡처 옵션 제공
    if (confirm('HR 팝업이 감지되지 않았습니다. 전체 페이지를 캡처하시겠습니까?')) {
      triggerPerfectCapture(document.body, 'HR_Full_Page');
    }
  }
}

// 완벽한 캡처 트리거 함수
function triggerPerfectCapture(element, filename) {
  // html2canvas 동적 로드
  if (!window.html2canvas) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => executePerfectCaptureBackground(element, filename);
    script.onerror = () => alert('❌ html2canvas 로드 실패');
    document.head.appendChild(script);
  } else {
    executePerfectCaptureBackground(element, filename);
  }
}

function executePerfectCaptureBackground(element, filename) {
  // 알림 표시
  showCaptureNotification('🎯 완벽한 캡처 시작...', 'info');

  // 임시 컨테이너 생성
  const tempContainer = document.createElement('div');
  tempContainer.style.cssText = `
    position: absolute !important;
    top: -500000px !important;
    left: -500000px !important;
    width: 5000px !important;
    height: auto !important;
    overflow: visible !important;
    background-color: #ffffff !important;
    padding: 30px !important;
    z-index: 999999 !important;
    transform: none !important;
  `;

  // 요소 복제 및 제약 해제
  const clonedElement = element.cloneNode(true);

  function liberateElement(el) {
    if (el.nodeType === 1) {
      const style = el.style;

      // 크기 제약 완전 해제
      style.setProperty('max-height', 'none', 'important');
      style.setProperty('max-width', 'none', 'important');
      style.setProperty('height', 'auto', 'important');
      style.setProperty('width', 'auto', 'important');

      // 스크롤 완전 해제
      style.setProperty('overflow', 'visible', 'important');
      style.setProperty('overflow-y', 'visible', 'important');
      style.setProperty('overflow-x', 'visible', 'important');

      // 변형 및 위치 초기화
      style.setProperty('transform', 'none', 'important');
      style.setProperty('transition', 'none', 'important');
      style.setProperty('position', 'static', 'important');
      style.setProperty('clip', 'auto', 'important');
      style.setProperty('clip-path', 'none', 'important');

      // 자식 요소 재귀 처리
      Array.from(el.children).forEach(liberateElement);
    }
  }

  liberateElement(clonedElement);

  // DOM에 추가 및 렌더링 대기
  tempContainer.appendChild(clonedElement);
  document.body.appendChild(tempContainer);

  setTimeout(() => {
    try {
      // 최종 크기 계산
      const finalWidth = Math.max(
        clonedElement.scrollWidth,
        clonedElement.offsetWidth,
        clonedElement.clientWidth,
        2000 // 최소 너비
      );

      const finalHeight = Math.max(
        clonedElement.scrollHeight,
        clonedElement.offsetHeight,
        clonedElement.clientHeight,
        1000 // 최소 높이
      );

      console.log(`📊 최종 캡처 크기: ${finalWidth} x ${finalHeight}`);

      // html2canvas 실행
      html2canvas(clonedElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        imageTimeout: 0,
        logging: false,
        width: finalWidth,
        height: finalHeight,
        windowWidth: finalWidth,
        windowHeight: finalHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      }).then(canvas => {
        // 임시 컨테이너 정리
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }

        // 캔버스 검증
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('캔버스 생성 실패');
        }

        // 다운로드 실행
        canvas.toBlob(blob => {
          if (!blob) {
            throw new Error('이미지 변환 실패');
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}_PerfectExtension_${new Date().toISOString().slice(0,10)}_${Date.now()}.png`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          showCaptureNotification(`🎉 완벽 캡처 성공!\n파일: ${link.download}\n크기: ${canvas.width} x ${canvas.height}px`, 'success');

        }, 'image/png', 1.0);

      }).catch(error => {
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
        throw error;
      });

    } catch (error) {
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
      console.error('캡처 실행 오류:', error);
      showCaptureNotification('❌ 캡처 실패: ' + error.message, 'error');
    }

  }, 3000); // 3초 대기로 충분한 렌더링 보장
}

function showCaptureNotification(message, type) {
  // 기존 알림 제거
  const existing = document.getElementById('extension-capture-notification');
  if (existing) existing.remove();

  // 새 알림 생성
  const notification = document.createElement('div');
  notification.id = 'extension-capture-notification';

  const colors = {
    info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
    error: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'
  };

  notification.style.cssText = `
    position: fixed !important;
    top: 30px !important;
    right: 30px !important;
    background: ${colors[type]} !important;
    color: white !important;
    padding: 20px 25px !important;
    border-radius: 12px !important;
    font-family: 'Segoe UI', Arial, sans-serif !important;
    font-size: 15px !important;
    font-weight: 600 !important;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
    z-index: 2147483647 !important;
    max-width: 350px !important;
    white-space: pre-line !important;
    border: 2px solid rgba(255,255,255,0.3) !important;
    backdrop-filter: blur(10px) !important;
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  // 5초 후 자동 제거
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      notification.style.transition = 'all 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}