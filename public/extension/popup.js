document.addEventListener('DOMContentLoaded', function() {
  const capturePopupBtn = document.getElementById('capturePopup');
  const captureFullPageBtn = document.getElementById('captureFullPage');
  const status = document.getElementById('status');

  function showStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 3000);
  }

  capturePopupBtn.addEventListener('click', async () => {
    try {
      showStatus('팝업 캡처 중...', 'info');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: captureHRPopup
      });

      showStatus('팝업 캡처 완료!', 'success');
    } catch (error) {
      console.error('캡처 오류:', error);
      showStatus('캡처 실패: ' + error.message, 'error');
    }
  });

  captureFullPageBtn.addEventListener('click', async () => {
    try {
      showStatus('전체 페이지 캡처 중...', 'info');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: captureFullPage
      });

      showStatus('전체 페이지 캡처 완료!', 'success');
    } catch (error) {
      console.error('캡처 오류:', error);
      showStatus('캡처 실패: ' + error.message, 'error');
    }
  });
});

// 이 함수들은 페이지에 주입되어 실행됩니다
function captureHRPopup() {
  // HR 시스템 팝업 찾기
  const popups = document.querySelectorAll('.bg-white.rounded-xl');
  let targetPopup = null;

  // 목표달성률 또는 워라밸 지표 팝업 찾기
  for (let popup of popups) {
    if (popup.textContent.includes('목표달성률 상세') ||
        popup.textContent.includes('워라밸 지표 상세')) {
      targetPopup = popup;
      break;
    }
  }

  if (!targetPopup) {
    alert('❌ HR 시스템 팝업을 찾을 수 없습니다.');
    return;
  }

  // 완전한 캡처 실행
  captureElementPerfectly(targetPopup, 'HR_Popup');
}

function captureFullPage() {
  // 전체 페이지 캡처
  captureElementPerfectly(document.body, 'Full_Page');
}

function captureElementPerfectly(element, filename) {
  // 고해상도 캔버스 생성
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // 요소의 실제 크기 계산
  const rect = element.getBoundingClientRect();
  const scrollHeight = Math.max(
    element.scrollHeight,
    element.offsetHeight,
    element.clientHeight
  );
  const scrollWidth = Math.max(
    element.scrollWidth,
    element.offsetWidth,
    element.clientWidth
  );

  // 고해상도 설정 (2배)
  const scale = 2;
  canvas.width = scrollWidth * scale;
  canvas.height = scrollHeight * scale;

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, scrollWidth, scrollHeight);

  // html2canvas 라이브러리 동적 로드 및 실행
  if (!window.html2canvas) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => executeCapture();
    document.head.appendChild(script);
  } else {
    executeCapture();
  }

  function executeCapture() {
    // 임시 컨테이너에서 요소 복제 및 펼치기
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-100000px';
    tempContainer.style.left = '-100000px';
    tempContainer.style.width = scrollWidth + 'px';
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.backgroundColor = '#ffffff';

    const clonedElement = element.cloneNode(true);

    // 모든 스크롤 제약 해제
    function expandAllElements(el) {
      if (el.nodeType === 1) {
        el.style.maxHeight = 'none';
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        el.style.overflowY = 'visible';
        el.style.overflowX = 'visible';
        el.style.transform = 'none';
        el.style.position = 'static';

        Array.from(el.children).forEach(expandAllElements);
      }
    }

    expandAllElements(clonedElement);
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // 렌더링 대기 후 캡처
    setTimeout(() => {
      html2canvas(clonedElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: true,
        logging: false,
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight
      }).then(canvas => {
        // 임시 컨테이너 제거
        document.body.removeChild(tempContainer);

        // 다운로드
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}_Perfect_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          alert(`🎉 ${filename} 완벽 캡처 완료!\n크기: ${canvas.width} x ${canvas.height}px`);
        }, 'image/png', 1.0);
      }).catch(error => {
        document.body.removeChild(tempContainer);
        console.error('html2canvas 오류:', error);
        alert('❌ 캡처 실패: ' + error.message);
      });
    }, 1500);
  }
}