import React from 'react';
import { Plus, X } from 'lucide-react';
import {
  formatCreatedAt,
  calculateDDay,
  getRecurringSettingsDisplay,
} from '../common/common_admin_notification';

const AdminNotificationManagement = ({
  regularNotificationForm,
  setRegularNotificationForm,
  realtimeNotificationForm,
  setRealtimeNotificationForm,
  알림유형,
  set알림유형,
  setShowAddNotificationPopup,
  get관리자알림목록,
  getRecipientText,
  handleEditRegularNotification,
  handleDeleteRegularNotification,
  activeTab,
  notificationLogSearch,
  setNotificationLogSearch,
  visibleLogCount,
  handleLoadMoreLogs,
  handleCollapseLogs,
  getFilteredNotificationLogs,
  calculateRecipientCount,
  // New props for popups
  showAddRegularNotificationPopup,
  setShowAddRegularNotificationPopup,
  showAddRealtimeNotificationPopup,
  setShowAddRealtimeNotificationPopup,
  showAddNotificationPopup,
  showEditRegularNotificationPopup,
  setShowEditRegularNotificationPopup,
  showEditRealtimeNotificationPopup,
  setShowEditRealtimeNotificationPopup,
  showRecurringSettingsModal,
  setShowRecurringSettingsModal,
  handleAddRegularNotification,
  handleAddRealtimeNotification,
  openRecurringSettingsModal,
  closeRecurringSettingsModal,
  handleRecurringSettingsComplete,
  handleEmployeeSearch,
  addEmployeeToRecipients,
  removeEmployeeFromRecipients,
  handleEmployeeToggle,
  handleSaveRegularNotificationEdit,
  handleSaveRealtimeNotificationEdit,
  handleWeekdayToggle,
  recurringSettings,
  setRecurringSettings,
  employeeSearchTerm,
  setEmployeeSearchTerm,
  searchResults,
  setSearchResults,
  editingRegularNotification,
  setEditingRegularNotification,
  editingRealtimeNotification,
  setEditingRealtimeNotification,
  currentFormType,
  setCurrentFormType,
  repeatCycleOptions,
  recipientOptions,
  요일목록,
  employees,
}) => {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 연차 알림 현황 섹션 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          📅 연차 알림 설정
        </h3>

        <div className="grid grid-cols-2 gap-6">
          {/* 서버 알림 */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-800">서버 알림</h4>
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">활성화</span>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">✓</span>
                <span>4단계 (180일, 90일, 30일, 7일 전)</span>
              </div>
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">✓</span>
                <span className="font-medium text-blue-800">연차 갱신 알림 ⭐</span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-600">
                <div>• 발송 시각: 연차 만료일 다음날 오전 8시</div>
                <div>• 처리 방식: 매일 오전 8시 자동 실행 (cron)</div>
                <div>• 관리자: 인사팀장, 대표</div>
              </div>
            </div>
          </div>

          {/* 프론트엔드 알림 (Deprecated) */}
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 opacity-75">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-600">프론트엔드 알림</h4>
              <span className="px-2 py-1 bg-gray-400 text-white text-xs rounded">비활성화</span>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">✗</span>
                <span className="line-through">3단계 (6개월, 30일, 7일 전)</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">✗</span>
                <span className="line-through">만료일 다음날 오전 8시 알림</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500">
                <div>⚠️ 서버 알림으로 대체됨</div>
                <div>• 브라우저 열려있어야만 작동</div>
                <div>• 24시간 타이머 불안정</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 기존 알림 관리 섹션 */}
      <div className="flex gap-6 w-full">
      {/* 좌측: 통합 알림 관리 */}
      <div className="w-1/2 flex flex-col">
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              알림 관리
            </h3>
            <button
              onClick={() => {
                // 알림추가 재팝업시 내용 초기화
                setRegularNotificationForm({
                  title: '',
                  content: '',
                  status: '진행중',
                  startDate: '',
                  endDate: '',
                  repeatCycle: '특정일',
                  recipients: {
                    type: '전체',
                    value: '전체직원',
                    selectedEmployees: [],
                  },
                });
                setRealtimeNotificationForm({
                  title: '',
                  content: '',
                  status: '진행중',
                  startDate: '',
                  endDate: '',
                  repeatCycle: '특정일',
                  recipients: {
                    type: '전체',
                    value: '전체직원',
                    selectedEmployees: [],
                  },
                });
                set알림유형('정기');
                setShowAddNotificationPopup(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              추가
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {get관리자알림목록().map((notification) => (
                <div
                  key={`${notification.알림유형}-${notification.id}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-22 flex flex-col"
                >
                  <div className="flex justify-between items-start h-full">
                    <div className="flex-1 pr-4 min-h-0 flex flex-col">
                      <div className="flex items-center justify-between mb-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded flex-shrink-0 text-xs ${
                              notification.알림유형 === '정기'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {notification.알림유형}
                          </span>
                          <h4 className="font-medium text-sm text-gray-800 truncate">
                            {notification.title}
                          </h4>
                          {notification.알림유형 === '정기' && (
                            <span className="text-xs text-gray-400">
                              {calculateDDay(notification.endDate)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0">
                          생성일: {formatCreatedAt(notification.createdAt)} |
                          수신자: {getRecipientText(notification.recipients)}{' '}
                          {notification.알림유형 === '정기'
                            ? `| 반복유형: ${notification.repeatCycle}`
                            : ''}
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <p className="text-xs text-gray-600">
                          {notification.content}
                        </p>
                      </div>
                    </div>
                    {notification.알림유형 === '정기' && (
                      <div className="flex flex-col space-y-1 ml-1 flex-shrink-0">
                        <button
                          onClick={() =>
                            handleEditRegularNotification(notification)
                          }
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 whitespace-nowrap"
                        >
                          수정
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteRegularNotification(notification.id)
                          }
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* 우측: 알림 로그 - notification-management 메뉴에서만 표시 */}
      {activeTab === 'notification-management' && (
        <div className="w-1/2 flex flex-col">
          <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                알림 로그
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={notificationLogSearch.year}
                  onChange={(e) =>
                    setNotificationLogSearch({
                      ...notificationLogSearch,
                      year: e.target.value,
                    })
                  }
                  className="w-20 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="년도"
                />
                <input
                  type="text"
                  value={notificationLogSearch.month}
                  onChange={(e) =>
                    setNotificationLogSearch({
                      ...notificationLogSearch,
                      month: e.target.value,
                    })
                  }
                  className="w-20 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="월"
                />
                <select
                  value={notificationLogSearch.type}
                  onChange={(e) =>
                    setNotificationLogSearch({
                      ...notificationLogSearch,
                      type: e.target.value,
                    })
                  }
                  className="w-26 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  <option value="정기">정기</option>
                  <option value="실시간">실시간</option>
                </select>
                <input
                  type="text"
                  value={notificationLogSearch.recipient}
                  onChange={(e) =>
                    setNotificationLogSearch({
                      ...notificationLogSearch,
                      recipient: e.target.value,
                    })
                  }
                  className="w-24 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="수신자"
                />
                <input
                  type="text"
                  value={notificationLogSearch.titleOrContent}
                  onChange={(e) =>
                    setNotificationLogSearch({
                      ...notificationLogSearch,
                      titleOrContent: e.target.value,
                    })
                  }
                  className="w-72 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="제목 또는 내용 검색"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {(() => {
                  const filteredLogs = getFilteredNotificationLogs();
                  const hasSearchFilter =
                    notificationLogSearch.year ||
                    notificationLogSearch.month ||
                    notificationLogSearch.recipient ||
                    notificationLogSearch.titleOrContent ||
                    notificationLogSearch.type;

                  // 검색 중이면 전체 표시, 아니면 visibleLogCount만큼 표시 (점진적 더보기)
                  const displayLogs = hasSearchFilter
                    ? filteredLogs
                    : filteredLogs.slice(0, visibleLogCount);

                  return displayLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border-l-4 border-indigo-400 bg-indigo-50 p-4 rounded-r-lg h-20 flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-2 flex-shrink-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-medium text-gray-800 truncate flex-1">
                              {log.title}
                            </h4>
                            <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              생성일: {formatCreatedAt(log.createdAt)} | 수신자(
                              {calculateRecipientCount(log)}명):{' '}
                              {typeof log.recipients === 'string'
                                ? log.recipients
                                : log.recipients?.value || '알 수 없음'}{' '}
                              {log.type === '정기'
                                ? `| 반복유형: ${
                                    log.repeatType ||
                                    log.repeatCycle ||
                                    '설정없음'
                                  }`
                                : ''}
                            </div>
                          </div>
                          <div className="flex-1 min-h-0 overflow-y-auto">
                            <p className="text-xs text-gray-600">
                              {log.content}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs flex-shrink-0 ml-2 self-start ${
                            log.type === '정기'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {log.type}
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              {/* 더보기/접기 버튼 - 검색 중이 아닐 때만 표시 */}
              {(() => {
                const filteredLogs = getFilteredNotificationLogs();
                const hasSearchFilter =
                  notificationLogSearch.year ||
                  notificationLogSearch.month ||
                  notificationLogSearch.recipient ||
                  notificationLogSearch.titleOrContent ||
                  notificationLogSearch.type;

                if (hasSearchFilter) return null;

                const showMoreButton = filteredLogs.length > visibleLogCount;
                const showCollapseButton = visibleLogCount > 7 && filteredLogs.length > 7;

                if (!showMoreButton && !showCollapseButton) return null;

                return (
                  <div className="mt-4 text-center flex gap-2 justify-center">
                    {showMoreButton && (
                      <button
                        onClick={handleLoadMoreLogs}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        더보기 (
                        {Math.min(7, filteredLogs.length - visibleLogCount)}개
                        더)
                      </button>
                    )}
                    {showCollapseButton && (
                      <button
                        onClick={handleCollapseLogs}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        접기 (초기화)
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {/* 정기 알림 추가 팝업 */}
      {showAddRegularNotificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                정기 알림 추가
              </h3>
              <button
                onClick={() => setShowAddRegularNotificationPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={regularNotificationForm.title}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="알림 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용
                </label>
                <textarea
                  value={regularNotificationForm.content}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={regularNotificationForm.startDate}
                    onChange={(e) =>
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={regularNotificationForm.endDate}
                    onChange={(e) =>
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반복 주기
                </label>
                <div className="flex space-x-2">
                  <select
                    value={regularNotificationForm.repeatCycle}
                    onChange={(e) =>
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        repeatCycle: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {repeatCycleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => openRecurringSettingsModal('regular')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 whitespace-nowrap"
                  >
                    반복 설정
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신자
                </label>
                <div className="flex gap-2">
                  <select
                    value={regularNotificationForm.recipients.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaultValue =
                        type === '전체'
                          ? '전체직원'
                          : recipientOptions[type]
                          ? recipientOptions[type][0]
                          : '';
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        recipients: { type, value: defaultValue },
                      });
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                    <option value="직급">직급</option>
                    <option value="직책">직책</option>
                    <option value="개인">개인</option>
                  </select>
                  {regularNotificationForm.recipients.type !== '전체' &&
                    (regularNotificationForm.recipients.type === '개인' ? (
                      <div className="flex-1 space-y-3">
                        {/* 직원 검색 입력란 */}
                        <div className="relative">
                          <input
                            type="text"
                            value={employeeSearchTerm}
                            onChange={(e) =>
                              handleEmployeeSearch(e.target.value)
                            }
                            placeholder="직원 이름을 입력하세요"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />

                          {/* 검색 결과 */}
                          {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                              {searchResults.map((employee) => {
                                const isAlreadySelected =
                                  realtimeNotificationForm?.recipients?.selectedEmployees?.includes?.(
                                    employee.name
                                  ) ||
                                  regularNotificationForm?.recipients?.selectedEmployees?.includes?.(
                                    employee.name
                                  );
                                const formType = realtimeNotificationForm
                                  ? 'realtime'
                                  : 'regular';
                                return (
                                  <div
                                    key={employee.id}
                                    className="flex items-center justify-between p-2 hover:bg-gray-50"
                                  >
                                    <div className="flex-1">
                                      <span className="text-sm font-medium">
                                        {employee.name}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        ({employee.id} - {employee.department})
                                      </span>
                                    </div>
                                    {!isAlreadySelected && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          addEmployeeToRecipients(
                                            employee,
                                            formType
                                          )
                                        }
                                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                      >
                                        추가
                                      </button>
                                    )}
                                    {isAlreadySelected && (
                                      <span className="text-xs text-gray-400">
                                        이미 추가됨
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 선택된 직원 목록 */}
                        {(realtimeNotificationForm?.recipients
                          ?.selectedEmployees?.length > 0 ||
                          regularNotificationForm?.recipients?.selectedEmployees
                            ?.length > 0) && (
                          <div>
                            <div className="text-xs text-gray-600 mb-2">
                              선택된 직원:
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(
                                realtimeNotificationForm?.recipients
                                  ?.selectedEmployees ||
                                regularNotificationForm?.recipients
                                  ?.selectedEmployees ||
                                []
                              ).map((employeeName) => {
                                const employee = employees.find(
                                  (emp) => emp.name === employeeName
                                );
                                const formType = realtimeNotificationForm
                                  ? 'realtime'
                                  : 'regular';
                                return (
                                  <div
                                    key={employeeName}
                                    className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm"
                                  >
                                    <span>{employeeName}</span>
                                    {employee && (
                                      <span className="text-xs text-blue-600 ml-1">
                                        ({employee.id})
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeEmployeeFromRecipients(
                                          employeeName,
                                          formType
                                        )
                                      }
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={regularNotificationForm.recipients.value}
                        onChange={(e) =>
                          setRegularNotificationForm({
                            ...regularNotificationForm,
                            recipients: {
                              ...regularNotificationForm.recipients,
                              value: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {recipientOptions[
                          regularNotificationForm.recipients.type
                        ]?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={regularNotificationForm.status}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="진행중">진행중</option>
                  <option value="미진행중">미진행중</option>
                </select>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowAddRegularNotificationPopup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddRegularNotification}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 실시간 알림 추가 팝업 */}
      {showAddRealtimeNotificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                실시간 알림 추가
              </h3>
              <button
                onClick={() => setShowAddRealtimeNotificationPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={realtimeNotificationForm.title}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="알림 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용
                </label>
                <textarea
                  value={realtimeNotificationForm.content}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={realtimeNotificationForm.startDate}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={realtimeNotificationForm.endDate}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반복주기
                </label>
                <div className="flex space-x-2">
                  <select
                    value={realtimeNotificationForm.repeatCycle}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        repeatCycle: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="특정일">특정일</option>
                    <option value="매일">매일</option>
                    <option value="매주">매주</option>
                    <option value="매월">매월</option>
                    <option value="분기">분기</option>
                    <option value="반기">반기</option>
                    <option value="년">년</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openRecurringSettingsModal('realtime')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 whitespace-nowrap"
                  >
                    반복 설정
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신자
                </label>
                <div className="flex gap-2">
                  <select
                    value={realtimeNotificationForm.recipients.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaultValue =
                        type === '전체'
                          ? '전체직원'
                          : recipientOptions[type]
                          ? recipientOptions[type][0]
                          : '';
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        recipients: {
                          type,
                          value: defaultValue,
                          selectedEmployees: [],
                        },
                      });
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                    <option value="직급">직급</option>
                    <option value="직책">직책</option>
                    <option value="개인">개인</option>
                  </select>
                  {realtimeNotificationForm.recipients.type !== '전체' &&
                    (realtimeNotificationForm.recipients.type === '개인' ? (
                      <div className="flex-1">
                        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-32 overflow-y-auto">
                          <div className="text-xs text-gray-600 mb-2">
                            직원 선택 (다중 선택 가능):
                          </div>
                          <div className="space-y-1">
                            {employees.map((employee) => (
                              <label
                                key={employee.id}
                                className="flex items-center space-x-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    realtimeNotificationForm.recipients.selectedEmployees?.includes(
                                      employee.name
                                    ) || false
                                  }
                                  onChange={() =>
                                    handleEmployeeToggle(
                                      employee.name,
                                      'realtime'
                                    )
                                  }
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-gray-700">
                                  {employee.name} ({employee.id} -{' '}
                                  {employee.department})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {realtimeNotificationForm.recipients.selectedEmployees
                          ?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            선택된 직원:{' '}
                            {getRecipientText(
                              realtimeNotificationForm.recipients
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={realtimeNotificationForm.recipients.value}
                        onChange={(e) =>
                          setRealtimeNotificationForm({
                            ...realtimeNotificationForm,
                            recipients: {
                              ...realtimeNotificationForm.recipients,
                              value: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {recipientOptions[
                          realtimeNotificationForm.recipients.type
                        ]?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={realtimeNotificationForm.status}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="진행중">진행중</option>
                  <option value="완료">완료</option>
                </select>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowAddRealtimeNotificationPopup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddRealtimeNotification}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 통합 알림 추가 팝업 */}
      {showAddNotificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">알림 추가</h3>
              <button
                onClick={() => {
                  // 팝업 닫을 때 폼들 초기화
                  setRegularNotificationForm({
                    title: '',
                    content: '',
                    status: '진행중',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: {
                      type: '전체',
                      value: '전체직원',
                      selectedEmployees: [],
                    },
                  });
                  setRealtimeNotificationForm({
                    title: '',
                    content: '',
                    status: '진행중',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: {
                      type: '전체',
                      value: '전체직원',
                      selectedEmployees: [],
                    },
                  });
                  setShowAddNotificationPopup(false);
                  set알림유형('정기');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 정기/실시간 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 유형
                </label>
                <select
                  value={알림유형}
                  onChange={(e) => {
                    const newType = e.target.value;
                    // 알림 유형 변경 시 해당 폼 초기화
                    if (newType === '정기') {
                      setRegularNotificationForm({
                        title: '',
                        content: '',
                        status: '진행중',
                        startDate: '',
                        endDate: '',
                        repeatCycle: '특정일',
                        recipients: {
                          type: '전체',
                          value: '전체직원',
                          selectedEmployees: [],
                        },
                      });
                    } else {
                      setRealtimeNotificationForm({
                        title: '',
                        content: '',
                        status: '진행중',
                        startDate: '',
                        endDate: '',
                        repeatCycle: '특정일',
                        recipients: {
                          type: '전체',
                          value: '전체직원',
                          selectedEmployees: [],
                        },
                      });
                    }
                    set알림유형(newType);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="정기">정기</option>
                  <option value="실시간">실시간</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={
                    알림유형 === '정기'
                      ? regularNotificationForm.title
                      : realtimeNotificationForm.title
                  }
                  onChange={(e) => {
                    if (알림유형 === '정기') {
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        title: e.target.value,
                      });
                    } else {
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        title: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="알림 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용
                </label>
                <textarea
                  value={
                    알림유형 === '정기'
                      ? regularNotificationForm.content
                      : realtimeNotificationForm.content
                  }
                  onChange={(e) => {
                    if (알림유형 === '정기') {
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        content: e.target.value,
                      });
                    } else {
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        content: e.target.value,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>

              {/* 정기 알림인 경우에만 반복 설정 버튼 표시 */}
              {알림유형 === '정기' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    반복 설정
                  </label>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => openRecurringSettingsModal('regular')}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                    >
                      반복 설정
                    </button>
                    {/* 반복 설정값 실시간 표시 */}
                    {regularNotificationForm.recurringSettings && (
                      <div className="px-3 py-1 bg-purple-50 text-purple-800 text-sm rounded-lg border border-purple-200">
                        {getRecurringSettingsDisplay(
                          regularNotificationForm.recurringSettings,
                          regularNotificationForm.repeatCycle
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신자
                </label>
                <div className="flex gap-2">
                  <select
                    value={
                      알림유형 === '정기'
                        ? regularNotificationForm.recipients.type
                        : realtimeNotificationForm.recipients.type
                    }
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaultValue =
                        type === '전체'
                          ? '전체직원'
                          : recipientOptions[type]
                          ? recipientOptions[type][0]
                          : '';
                      if (알림유형 === '정기') {
                        setRegularNotificationForm({
                          ...regularNotificationForm,
                          recipients: {
                            type,
                            value: defaultValue,
                            selectedEmployees: [],
                          },
                        });
                      } else {
                        setRealtimeNotificationForm({
                          ...realtimeNotificationForm,
                          recipients: {
                            type,
                            value: defaultValue,
                            selectedEmployees: [],
                          },
                        });
                      }
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                    <option value="직급">직급</option>
                    <option value="직책">직책</option>
                    <option value="개인">개인</option>
                  </select>
                  {(알림유형 === '정기'
                    ? regularNotificationForm.recipients.type
                    : realtimeNotificationForm.recipients.type) !== '전체' &&
                    ((알림유형 === '정기'
                      ? regularNotificationForm.recipients.type
                      : realtimeNotificationForm.recipients.type) === '개인' ? (
                      <div className="flex-1">
                        {/* 검색 기반 직원 선택 UI */}
                        <div className="space-y-2">
                          <div>
                            <input
                              type="text"
                              value={employeeSearchTerm}
                              onChange={(e) =>
                                handleEmployeeSearch(e.target.value)
                              }
                              placeholder="직원 이름 검색..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* 검색 결과 */}
                          {searchResults.length > 0 && (
                            <div className="border border-gray-300 rounded-lg p-2 bg-white max-h-32 overflow-y-auto">
                              <div className="text-xs text-gray-600 mb-1">
                                검색 결과:
                              </div>
                              {searchResults.map((employee) => (
                                <div
                                  key={employee.id}
                                  className="flex items-center justify-between py-1"
                                >
                                  <span className="text-sm text-gray-700">
                                    {employee.name} ({employee.department})
                                  </span>
                                  <button
                                    onClick={() =>
                                      addEmployeeToRecipients(
                                        employee,
                                        알림유형 === '정기'
                                          ? 'regular'
                                          : 'realtime'
                                      )
                                    }
                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  >
                                    추가
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 선택된 직원 목록 */}
                          {(
                            (알림유형 === '정기'
                              ? regularNotificationForm.recipients
                                  .selectedEmployees
                              : realtimeNotificationForm.recipients
                                  .selectedEmployees) || []
                          ).length > 0 && (
                            <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                              <div className="text-xs text-gray-600 mb-1">
                                선택된 직원:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(
                                  (알림유형 === '정기'
                                    ? regularNotificationForm.recipients
                                        .selectedEmployees
                                    : realtimeNotificationForm.recipients
                                        .selectedEmployees) || []
                                ).map((employeeName) => (
                                  <span
                                    key={employeeName}
                                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {employeeName}
                                    <button
                                      onClick={() =>
                                        removeEmployeeFromRecipients(
                                          employeeName,
                                          알림유형 === '정기'
                                            ? 'regular'
                                            : 'realtime'
                                        )
                                      }
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <select
                        value={
                          알림유형 === '정기'
                            ? regularNotificationForm.recipients.value
                            : realtimeNotificationForm.recipients.value
                        }
                        onChange={(e) => {
                          if (알림유형 === '정기') {
                            setRegularNotificationForm({
                              ...regularNotificationForm,
                              recipients: {
                                ...regularNotificationForm.recipients,
                                value: e.target.value,
                              },
                            });
                          } else {
                            setRealtimeNotificationForm({
                              ...realtimeNotificationForm,
                              recipients: {
                                ...realtimeNotificationForm.recipients,
                                value: e.target.value,
                              },
                            });
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {recipientOptions[
                          알림유형 === '정기'
                            ? regularNotificationForm.recipients.type
                            : realtimeNotificationForm.recipients.type
                        ]?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  // 취소 시 폼들 초기화
                  setRegularNotificationForm({
                    title: '',
                    content: '',
                    status: '진행중',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: {
                      type: '전체',
                      value: '전체직원',
                      selectedEmployees: [],
                    },
                  });
                  setRealtimeNotificationForm({
                    title: '',
                    content: '',
                    status: '진행중',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: {
                      type: '전체',
                      value: '전체직원',
                      selectedEmployees: [],
                    },
                  });
                  setShowAddNotificationPopup(false);
                  set알림유형('정기');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  let success = false;
                  if (알림유형 === '정기') {
                    success = handleAddRegularNotification();
                  } else {
                    success = handleAddRealtimeNotification();
                  }
                  // 검증 성공 시에만 팝업 닫기
                  if (success) {
                    setShowAddNotificationPopup(false);
                    set알림유형('정기');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 정기 알림 수정 팝업 - 통합 알림 추가와 동일한 형태 */}
      {showEditRegularNotificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                정기 알림 수정
              </h3>
              <button
                onClick={() => {
                  setShowEditRegularNotificationPopup(false);
                  setEditingRegularNotification(null);
                  setRegularNotificationForm({
                    title: '',
                    content: '',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: {
                      type: '전체',
                      value: '전체직원',
                      selectedEmployees: [],
                    },
                    status: '진행중',
                    recurringSettings: null,
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={regularNotificationForm.title}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="알림 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용
                </label>
                <textarea
                  value={regularNotificationForm.content}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={regularNotificationForm.startDate}
                    onChange={(e) =>
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={regularNotificationForm.endDate}
                    onChange={(e) =>
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 반복 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반복 설정
                </label>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => openRecurringSettingsModal('regular')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    반복 설정
                  </button>
                  {/* 반복 설정값 실시간 표시 */}
                  {regularNotificationForm.recurringSettings && (
                    <div className="px-3 py-1 bg-purple-50 text-purple-800 text-sm rounded-lg border border-purple-200">
                      {getRecurringSettingsDisplay(
                        regularNotificationForm.recurringSettings,
                        regularNotificationForm.repeatCycle
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신자
                </label>
                <div className="flex gap-2">
                  <select
                    value={regularNotificationForm.recipients.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaultValue =
                        type === '전체'
                          ? '전체직원'
                          : recipientOptions[type]
                          ? recipientOptions[type][0]
                          : '';
                      setRegularNotificationForm({
                        ...regularNotificationForm,
                        recipients: {
                          type,
                          value: defaultValue,
                          selectedEmployees: [],
                        },
                      });
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                    <option value="직급">직급</option>
                    <option value="직책">직책</option>
                    <option value="개인">개인</option>
                  </select>
                  {regularNotificationForm.recipients.type !== '전체' &&
                    (regularNotificationForm.recipients.type === '개인' ? (
                      <div className="flex-1">
                        {/* 검색 기반 직원 선택 UI */}
                        <div className="space-y-2">
                          <div>
                            <input
                              type="text"
                              value={employeeSearchTerm}
                              onChange={(e) =>
                                handleEmployeeSearch(e.target.value)
                              }
                              placeholder="직원 이름 검색..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* 검색 결과 */}
                          {searchResults.length > 0 && (
                            <div className="border border-gray-300 rounded-lg p-2 bg-white max-h-32 overflow-y-auto">
                              <div className="text-xs text-gray-600 mb-1">
                                검색 결과:
                              </div>
                              {searchResults.map((employee) => (
                                <div
                                  key={employee.id}
                                  className="flex items-center justify-between py-1"
                                >
                                  <span className="text-sm text-gray-700">
                                    {employee.name} ({employee.department})
                                  </span>
                                  <button
                                    onClick={() =>
                                      addEmployeeToRecipients(
                                        employee,
                                        'regular'
                                      )
                                    }
                                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  >
                                    추가
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 선택된 직원 목록 */}
                          {(
                            regularNotificationForm.recipients
                              .selectedEmployees || []
                          ).length > 0 && (
                            <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                              <div className="text-xs text-gray-600 mb-1">
                                선택된 직원:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {(
                                  regularNotificationForm.recipients
                                    .selectedEmployees || []
                                ).map((employeeName) => (
                                  <span
                                    key={employeeName}
                                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {employeeName}
                                    <button
                                      onClick={() =>
                                        removeEmployeeFromRecipients(
                                          employeeName,
                                          'regular'
                                        )
                                      }
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <select
                        value={regularNotificationForm.recipients.value}
                        onChange={(e) =>
                          setRegularNotificationForm({
                            ...regularNotificationForm,
                            recipients: {
                              ...regularNotificationForm.recipients,
                              value: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {recipientOptions[
                          regularNotificationForm.recipients.type
                        ]?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={regularNotificationForm.status}
                  onChange={(e) =>
                    setRegularNotificationForm({
                      ...regularNotificationForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="진행중">진행중</option>
                  <option value="완료">완료</option>
                </select>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowEditRegularNotificationPopup(false);
                  setEditingRegularNotification(null);
                  setRegularNotificationForm({
                    title: '',
                    content: '',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: '전체',
                    status: '진행중',
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveRegularNotificationEdit}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 실시간 알림 수정 팝업 */}
      {showEditRealtimeNotificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                실시간 알림 수정
              </h3>
              <button
                onClick={() => {
                  setShowEditRealtimeNotificationPopup(false);
                  setEditingRealtimeNotification(null);
                  setRealtimeNotificationForm({
                    title: '',
                    content: '',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: '전체',
                    status: '진행중',
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 제목
                </label>
                <input
                  type="text"
                  value={realtimeNotificationForm.title}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="알림 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  알림 내용
                </label>
                <textarea
                  value={realtimeNotificationForm.content}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-24"
                  placeholder="알림 내용을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={realtimeNotificationForm.startDate}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={realtimeNotificationForm.endDate}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  반복주기
                </label>
                <div className="flex space-x-2">
                  <select
                    value={realtimeNotificationForm.repeatCycle}
                    onChange={(e) =>
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        repeatCycle: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="특정일">특정일</option>
                    <option value="매일">매일</option>
                    <option value="매주">매주</option>
                    <option value="매월">매월</option>
                    <option value="분기">분기</option>
                    <option value="반기">반기</option>
                    <option value="년">년</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openRecurringSettingsModal('realtime')}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 whitespace-nowrap"
                  >
                    반복 설정
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수신자
                </label>
                <div className="flex gap-2">
                  <select
                    value={realtimeNotificationForm.recipients.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      const defaultValue =
                        type === '전체'
                          ? '전체직원'
                          : recipientOptions[type]
                          ? recipientOptions[type][0]
                          : '';
                      setRealtimeNotificationForm({
                        ...realtimeNotificationForm,
                        recipients: {
                          type,
                          value: defaultValue,
                          selectedEmployees: [],
                        },
                      });
                    }}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="전체">전체</option>
                    <option value="부서">부서</option>
                    <option value="직급">직급</option>
                    <option value="직책">직책</option>
                    <option value="개인">개인</option>
                  </select>
                  {realtimeNotificationForm.recipients.type !== '전체' &&
                    (realtimeNotificationForm.recipients.type === '개인' ? (
                      <div className="flex-1">
                        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-32 overflow-y-auto">
                          <div className="text-xs text-gray-600 mb-2">
                            직원 선택 (다중 선택 가능):
                          </div>
                          <div className="space-y-1">
                            {employees.map((employee) => (
                              <label
                                key={employee.id}
                                className="flex items-center space-x-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    realtimeNotificationForm.recipients.selectedEmployees?.includes(
                                      employee.name
                                    ) || false
                                  }
                                  onChange={() =>
                                    handleEmployeeToggle(
                                      employee.name,
                                      'realtime'
                                    )
                                  }
                                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="text-gray-700">
                                  {employee.name} ({employee.id} -{' '}
                                  {employee.department})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {realtimeNotificationForm.recipients.selectedEmployees
                          ?.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            선택된 직원:{' '}
                            {getRecipientText(
                              realtimeNotificationForm.recipients
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <select
                        value={realtimeNotificationForm.recipients.value}
                        onChange={(e) =>
                          setRealtimeNotificationForm({
                            ...realtimeNotificationForm,
                            recipients: {
                              ...realtimeNotificationForm.recipients,
                              value: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {recipientOptions[
                          realtimeNotificationForm.recipients.type
                        ]?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  value={realtimeNotificationForm.status}
                  onChange={(e) =>
                    setRealtimeNotificationForm({
                      ...realtimeNotificationForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="진행중">진행중</option>
                  <option value="완료">완료</option>
                </select>
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => {
                  setShowEditRealtimeNotificationPopup(false);
                  setEditingRealtimeNotification(null);
                  setRealtimeNotificationForm({
                    title: '',
                    content: '',
                    startDate: '',
                    endDate: '',
                    repeatCycle: '특정일',
                    recipients: '전체',
                    status: '진행중',
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveRealtimeNotificationEdit}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 반복 설정 모달 */}
      {showRecurringSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 pb-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">반복 설정</h3>
              <button
                onClick={closeRecurringSettingsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 반복 시작일/종료일 설정 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    반복 시작일
                  </label>
                  <input
                    type="date"
                    value={recurringSettings.반복시작일}
                    onChange={(e) =>
                      setRecurringSettings((prev) => ({
                        ...prev,
                        반복시작일: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    반복 종료일
                  </label>
                  <input
                    type="date"
                    value={recurringSettings.반복종료일}
                    onChange={(e) =>
                      setRecurringSettings((prev) => ({
                        ...prev,
                        반복종료일: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* 반복 주기 설정 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  반복 주기
                </label>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    min="1"
                    value={recurringSettings.반복주기_숫자}
                    onChange={(e) =>
                      setRecurringSettings((prev) => ({
                        ...prev,
                        반복주기_숫자: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <select
                    value={recurringSettings.반복주기_단위}
                    onChange={(e) =>
                      setRecurringSettings((prev) => ({
                        ...prev,
                        반복주기_단위: e.target.value,
                        반복요일: e.target.value === '주' ? prev.반복요일 : [],
                      }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="일">일</option>
                    <option value="주">주</option>
                    <option value="개월">개월</option>
                    <option value="년">년</option>
                  </select>
                </div>
              </div>

              {/* 반복시간 설정 (모든 주기에 공통) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  반복시간
                </label>
                <input
                  type="time"
                  value={recurringSettings.반복시간 || '09:00'}
                  onChange={(e) =>
                    setRecurringSettings((prev) => ({
                      ...prev,
                      반복시간: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 반복 요일 설정 (주 단위일 때만 표시) */}
              {recurringSettings.반복주기_단위 === '주' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    반복 요일
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {요일목록.map((요일) => (
                      <button
                        key={요일}
                        type="button"
                        onClick={() => handleWeekdayToggle(요일)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          recurringSettings.반복요일.includes(요일)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {요일}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 반복 일자 설정 (월 단위일 때만 표시) */}
              {recurringSettings.반복주기_단위 === '개월' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    반복 일자
                  </label>
                  <select
                    value={recurringSettings.반복일자 || 1}
                    onChange={(e) =>
                      setRecurringSettings((prev) => ({
                        ...prev,
                        반복일자: parseInt(e.target.value),
                      }))
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}일
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 반복 월/일자 설정 (년 단위일 때만 표시) */}
              {recurringSettings.반복주기_단위 === '년' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      반복 월
                    </label>
                    <select
                      value={recurringSettings.반복월 || 1}
                      onChange={(e) =>
                        setRecurringSettings((prev) => ({
                          ...prev,
                          반복월: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (month) => (
                          <option key={month} value={month}>
                            {month}월
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      반복 일자
                    </label>
                    <select
                      value={recurringSettings.반복일자 || 1}
                      onChange={(e) =>
                        setRecurringSettings((prev) => ({
                          ...prev,
                          반복일자: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(
                        (day) => (
                          <option key={day} value={day}>
                            {day}일
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={closeRecurringSettingsModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRecurringSettingsComplete}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}{' '}
      </div>
    </div>
  );
};

export default AdminNotificationManagement;
