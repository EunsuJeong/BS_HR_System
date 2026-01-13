import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// 플랫폼 타입 감지
export const getPlatformType = () => {
  // PWA 환경 체크
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                window.navigator.standalone === true ||
                document.referrer.includes('android-app://');

  if (isPWA) {
    return 'PWA';
  }

  // 네이티브 앱 체크
  if (Capacitor.isNativePlatform()) {
    return 'APP';
  }

  // 일반 웹 브라우저
  return 'Domain';
};

// 현재 앱 버전 가져오기
export const getCurrentVersion = async () => {
  try {
    const platformType = getPlatformType();

    // 네이티브 앱인 경우 실제 버전 반환
    if (platformType === 'APP') {
      const info = await App.getInfo();
      return info.version;
    }

    // PWA인 경우
    if (platformType === 'PWA') {
      return 'PWA';
    }

    // 웹 브라우저인 경우
    return 'Domain';
  } catch (error) {
    console.error('현재 버전 확인 오류:', error);
    return 'Domain';
  }
};

// 버전 정보 객체 가져오기 (로그인 시 사용)
export const getVersionInfo = async () => {
  try {
    const version = await getCurrentVersion();
    const platformType = getPlatformType();
    const platform = Capacitor.getPlatform(); // 'web', 'ios', 'android'

    return {
      version,
      platformType, // 'APP', 'PWA', 'Domain'
      platform, // 'web', 'ios', 'android'
      userAgent: navigator.userAgent,
      lastLoginAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('버전 정보 가져오기 오류:', error);
    return {
      version: 'Domain',
      platformType: 'Domain',
      platform: 'web',
      userAgent: navigator.userAgent,
      lastLoginAt: new Date().toISOString()
    };
  }
};

// 서버에서 최신 버전 정보 가져오기
export const checkForUpdate = async () => {
  try {
    const currentVersion = await getCurrentVersion();
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const response = await fetch(
      `${apiUrl}/api/system/app-version?current=${currentVersion}`
    );

    if (!response.ok) {
      throw new Error('버전 체크 요청 실패');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('업데이트 체크 오류:', error);
    return {
      success: false,
      updateAvailable: false,
      error: error.message
    };
  }
};

// APK 다운로드 및 설치 (안드로이드 전용)
export const downloadAndInstallUpdate = async (downloadUrl) => {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.log('웹 환경에서는 APK 설치를 지원하지 않습니다.');
      return { success: false, message: '웹 환경에서는 지원되지 않습니다.' };
    }

    if (Capacitor.getPlatform() !== 'android') {
      console.log('안드로이드 플랫폼만 지원됩니다.');
      return { success: false, message: '안드로이드만 지원됩니다.' };
    }

    // 브라우저로 다운로드 URL 열기 (안드로이드가 자동으로 처리)
    await Browser.open({ url: downloadUrl });

    return {
      success: true,
      message: 'APK 다운로드가 시작되었습니다. 다운로드 완료 후 설치를 진행하세요.'
    };
  } catch (error) {
    console.error('APK 다운로드 오류:', error);
    return {
      success: false,
      message: '다운로드 중 오류가 발생했습니다.',
      error: error.message
    };
  }
};

// 업데이트 알림을 표시할지 결정하는 함수
export const shouldShowUpdateAlert = (lastChecked) => {
  if (!lastChecked) return true;

  const now = Date.now();
  const hoursSinceLastCheck = (now - lastChecked) / (1000 * 60 * 60);

  // 24시간마다 업데이트 체크
  return hoursSinceLastCheck >= 24;
};

// 업데이트 마지막 체크 시간 저장
export const saveLastCheckTime = () => {
  try {
    localStorage.setItem('lastUpdateCheck', Date.now().toString());
  } catch (error) {
    console.error('마지막 체크 시간 저장 오류:', error);
  }
};

// 업데이트 마지막 체크 시간 가져오기
export const getLastCheckTime = () => {
  try {
    const lastCheck = localStorage.getItem('lastUpdateCheck');
    return lastCheck ? parseInt(lastCheck) : null;
  } catch (error) {
    console.error('마지막 체크 시간 가져오기 오류:', error);
    return null;
  }
};

// 버전 비교 함수
export const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
};
