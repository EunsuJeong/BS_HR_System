import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, User } from 'lucide-react';

const ConflictResolutionModal = ({ conflicts, onResolve, onClose }) => {
  const [selectedConflict, setSelectedConflict] = useState(conflicts[0] || null);
  const [selectedResolution, setSelectedResolution] = useState('');

  if (!conflicts || conflicts.length === 0) return null;

  const handleResolve = () => {
    if (!selectedConflict || !selectedResolution) return;

    onResolve(selectedConflict.id, selectedResolution,
      selectedResolution === 'accept_local' ? selectedConflict.localData : null
    );

    // 다음 충돌로 이동하거나 모달 닫기
    const remainingConflicts = conflicts.filter(c => c.id !== selectedConflict.id);
    if (remainingConflicts.length > 0) {
      setSelectedConflict(remainingConflicts[0]);
      setSelectedResolution('');
    } else {
      onClose();
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '정보 없음';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR');
  };

  const formatWorkTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">데이터 충돌 해결</h2>
                <p className="text-sm text-gray-600">
                  동시에 수정된 데이터가 {conflicts.length}건 발견되었습니다.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {selectedConflict && (
            <>
              {/* 충돌 정보 */}
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    충돌 정보
                  </h3>
                  <p className="text-sm text-yellow-700 mb-2">
                    {selectedConflict.message || '데이터 충돌이 발생했습니다.'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-yellow-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>감지 시각: {formatDateTime(selectedConflict.detectedAt)}</span>
                    </div>
                    {selectedConflict.resolution && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>해결 방식: {selectedConflict.resolution}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 데이터 비교 */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* 로컬 데이터 */}
                <div className="border rounded-lg">
                  <div className="bg-blue-50 border-b px-4 py-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-800">내 수정사항</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedConflict.localData && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700">직원명:</label>
                          <div className="text-sm text-gray-900">
                            {selectedConflict.localData.employeeName || '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">출근시간:</label>
                          <div className="text-sm text-gray-900">
                            {formatWorkTime(selectedConflict.localData.checkIn)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">퇴근시간:</label>
                          <div className="text-sm text-gray-900">
                            {formatWorkTime(selectedConflict.localData.checkOut)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">근무구분:</label>
                          <div className="text-sm text-gray-900">
                            {selectedConflict.localData.workType || '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">수정시각:</label>
                          <div className="text-sm text-gray-600">
                            {formatDateTime(selectedConflict.localData.modifiedAt)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 서버 데이터 */}
                <div className="border rounded-lg">
                  <div className="bg-green-50 border-b px-4 py-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-800">
                        다른 사용자 수정사항
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {selectedConflict.serverData && (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-700">직원명:</label>
                          <div className="text-sm text-gray-900">
                            {selectedConflict.serverData.employeeName || '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">출근시간:</label>
                          <div className="text-sm text-gray-900">
                            {formatWorkTime(selectedConflict.serverData.checkIn)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">퇴근시간:</label>
                          <div className="text-sm text-gray-900">
                            {formatWorkTime(selectedConflict.serverData.checkOut)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">근무구분:</label>
                          <div className="text-sm text-gray-900">
                            {selectedConflict.serverData.workType || '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">수정시각:</label>
                          <div className="text-sm text-gray-600">
                            {formatDateTime(selectedConflict.serverData.modifiedAt)}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">수정자:</label>
                          <div className="text-sm text-gray-600">
                            {selectedConflict.serverData.modifiedBy || '-'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 해결 방법 선택 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">해결 방법을 선택하세요:</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_local"
                      checked={selectedResolution === 'accept_local'}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-blue-700">내 수정사항을 유지</span>
                      <p className="text-sm text-gray-600">
                        내가 수정한 내용을 서버에 저장하고 다른 사용자에게 알립니다.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="resolution"
                      value="accept_server"
                      checked={selectedResolution === 'accept_server'}
                      onChange={(e) => setSelectedResolution(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <span className="font-medium text-green-700">다른 사용자 수정사항을 적용</span>
                      <p className="text-sm text-gray-600">
                        다른 사용자가 수정한 내용을 내 화면에 적용합니다.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 충돌 목록 */}
              {conflicts.length > 1 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    추가 충돌 ({conflicts.length - 1}건)
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {conflicts.filter(c => c.id !== selectedConflict.id).map((conflict, index) => (
                      <div
                        key={conflict.id}
                        className="text-sm text-gray-600 bg-gray-50 p-2 rounded border"
                      >
                        <span className="font-medium">충돌 #{index + 2}</span>
                        <span className="ml-2">{conflict.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  나중에 해결
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!selectedResolution}
                  className={`
                    px-4 py-2 rounded-lg font-medium flex items-center gap-2
                    ${selectedResolution
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <CheckCircle className="w-4 h-4" />
                  충돌 해결
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;