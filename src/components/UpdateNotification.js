import React, { useState, useEffect } from 'react';
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  shouldShowUpdateAlert,
  saveLastCheckTime,
  getLastCheckTime
} from '../utils/appUpdate';
import { Capacitor } from '@capacitor/core';

const UpdateNotification = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    checkUpdate();
  }, []);

  const checkUpdate = async () => {
    // 모바일 플랫폼이 아니면 체크하지 않음
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 마지막 체크 시간 확인
    const lastChecked = getLastCheckTime();
    if (!shouldShowUpdateAlert(lastChecked)) {
      console.log('최근에 업데이트를 확인했습니다. 24시간 후에 다시 확인합니다.');
      return;
    }

    try {
      const info = await checkForUpdate();

      if (info.success && info.updateAvailable) {
        setUpdateInfo(info);
        setShowNotification(true);
      }

      // 체크 시간 저장
      saveLastCheckTime();
    } catch (error) {
      console.error('업데이트 체크 오류:', error);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo || !updateInfo.downloadUrl) {
      alert('다운로드 URL을 찾을 수 없습니다.');
      return;
    }

    setIsDownloading(true);

    try {
      const result = await downloadAndInstallUpdate(updateInfo.downloadUrl);

      if (result.success) {
        alert(result.message);
        setShowNotification(false);
      } else {
        alert(result.message || '다운로드 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('업데이트 다운로드 오류:', error);
      alert('업데이트 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLater = () => {
    setShowNotification(false);
    // 나중에 알림을 받기 위해 마지막 체크 시간을 초기화하지 않음
  };

  const handleSkip = () => {
    setShowNotification(false);
    // 이 버전을 건너뛰기 위해 시간을 저장
    saveLastCheckTime();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '알 수 없음';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (!showNotification || !updateInfo) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>
          🎉 새 버전 업데이트 가능
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            <strong>현재 버전:</strong> {updateInfo.currentVersion}
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            <strong>최신 버전:</strong> {updateInfo.latestVersion}
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
            <strong>파일 크기:</strong> {formatFileSize(updateInfo.fileSize)}
          </p>
        </div>

        {updateInfo.releaseNotes && (
          <div
            style={{
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              업데이트 내용:
            </h3>
            <div style={{ fontSize: '13px', color: '#333', whiteSpace: 'pre-wrap' }}>
              {updateInfo.releaseNotes}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSkip}
            disabled={isDownloading}
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#666',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            건너뛰기
          </button>
          <button
            onClick={handleLater}
            disabled={isDownloading}
            style={{
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#666',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            나중에
          </button>
          <button
            onClick={handleUpdate}
            disabled={isDownloading}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isDownloading ? '#ccc' : '#1a73e8',
              color: 'white',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isDownloading ? '다운로드 중...' : '지금 업데이트'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
