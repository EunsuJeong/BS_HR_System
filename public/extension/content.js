// Content script for HR Perfect Screenshot Extension

// 확장프로그램 아이콘 클릭 감지
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capturePopup') {
    captureHRSystemPopup();
  } else if (request.action === 'captureFullPage') {
    captureEntirePage();
  }
});

function captureHRSystemPopup() {
  console.log('🎯 HR 시스템 팝업 캡처 시작...');

  // HR 시스템 팝업 찾기
  const searchMethods = [
    // 방법 1: 클래스 기반 검색
    () => document.querySelector('.fixed.inset-0 .bg-white.rounded-xl'),

    // 방법 2: 텍스트 기반 검색
    () => {
      const popups = document.querySelectorAll('.bg-white.rounded-xl');
      return Array.from(popups).find(popup =>
        popup.textContent.includes('목표달성률 상세') ||
        popup.textContent.includes('워라밸 지표 상세')
      );
    },

    // 방법 3: 모달 검색
    () => {
      const modals = document.querySelectorAll('[class*="fixed"]');
      for (let modal of modals) {
        const content = modal.querySelector('.bg-white');
        if (content && (
          content.textContent.includes('목표달성률') ||
          content.textContent.includes('워라밸')
        )) {
          return content;
        }
      }
      return null;
    }
  ];

  let popup = null;
  for (let method of searchMethods) {
    popup = method();
    if (popup) break;
  }

  if (!popup) {
    showNotification('❌ HR 시스템 팝업을 찾을 수 없습니다.', 'error');
    return;
  }

  console.log('✅ 팝업 발견:', popup);
  showNotification('🎯 팝업 캡처 중...', 'info');

  // 완벽한 캡처 실행
  performPerfectCapture(popup, 'HR_Popup');
}

function captureEntirePage() {
  console.log('📄 전체 페이지 캡처 시작...');
  showNotification('📄 전체 페이지 캡처 중...', 'info');
  performPerfectCapture(document.body, 'Full_Page');
}

function performPerfectCapture(element, filename) {
  // html2canvas 라이브러리 동적 로드
  if (!window.html2canvas) {
    loadHtml2Canvas().then(() => executePerfectCapture(element, filename));
  } else {
    executePerfectCapture(element, filename);
  }
}

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function executePerfectCapture(element, filename) {
  try {
    // 1. 임시 컨테이너 생성 (화면 밖)
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
      position: absolute;
      top: -200000px;
      left: -200000px;
      width: 3000px;
      height: auto;
      overflow: visible;
      background-color: #ffffff;
      padding: 20px;
      z-index: 999999;
    `;

    // 2. 요소 복제
    const clonedElement = element.cloneNode(true);

    // 3. 복제된 요소의 모든 제약 해제
    function removeAllConstraints(el) {
      if (el.nodeType === 1) {
        const style = el.style;
        style.maxHeight = 'none';
        style.maxWidth = 'none';
        style.height = 'auto';
        style.width = 'auto';
        style.overflow = 'visible';
        style.overflowY = 'visible';
        style.overflowX = 'visible';
        style.transform = 'none';
        style.transition = 'none';
        style.position = 'static';
        style.clip = 'auto';
        style.clipPath = 'none';

        // 자식 요소들도 재귀적으로 처리
        Array.from(el.children).forEach(removeAllConstraints);
      }
    }

    removeAllConstraints(clonedElement);

    // 4. 임시 컨테이너에 추가
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // 5. 렌더링 완료 대기
    setTimeout(() => {
      const finalWidth = Math.max(
        clonedElement.scrollWidth,
        clonedElement.offsetWidth,
        clonedElement.clientWidth
      );

      const finalHeight = Math.max(
        clonedElement.scrollHeight,
        clonedElement.offsetHeight,
        clonedElement.clientHeight
      );

      console.log(`📏 최종 크기: ${finalWidth} x ${finalHeight}`);

      // 6. html2canvas로 캡처
      html2canvas(clonedElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
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
        // 7. 임시 컨테이너 제거
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error('캔버스 크기가 0입니다');
        }

        // 8. 다운로드
        canvas.toBlob(blob => {
          if (!blob) {
            throw new Error('이미지 생성 실패');
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}_Perfect_Extension_${Date.now()}.png`;

          // 다운로드 실행
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          console.log(`✅ 캡처 완료! 크기: ${canvas.width} x ${canvas.height}`);
          showNotification(`🎉 ${filename} 완벽 캡처 완료!\n크기: ${canvas.width} x ${canvas.height}px`, 'success');

        }, 'image/png', 1.0);

      }).catch(error => {
        // 임시 컨테이너 제거
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
        throw error;
      });

    }, 2000); // 2초 대기

  } catch (error) {
    console.error('캡처 실패:', error);
    showNotification('❌ 캡처 실패: ' + error.message, 'error');
  }
}

function showNotification(message, type = 'info') {
  // 기존 알림 제거
  const existingNotification = document.getElementById('perfect-screenshot-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // 새 알림 생성
  const notification = document.createElement('div');
  notification.id = 'perfect-screenshot-notification';

  const bgColor = {
    'info': 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);',
    'success': 'background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);',
    'error': 'background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    ${bgColor[type]}
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    max-width: 300px;
    white-space: pre-line;
    animation: slideInRight 0.3s ease-out;
  `;

  // 애니메이션 추가
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  notification.textContent = message;
  document.body.appendChild(notification);

  // 3초 후 자동 제거
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}