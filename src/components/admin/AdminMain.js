import React, { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useNavigationContext } from '../../contexts/NavigationContext';

/**
 * ADMIN 관리자 모드 - 메인 레이아웃 컴포넌트
 * 사이드바(로고, 사용자 정보, 네비게이션 메뉴) 및 메인 콘텐츠 영역 표시
 * 시스템 상태 표시바, 사용자 알림, 권한 거부 모달 포함
 */
const AdminMain = ({
  menuItems,
  handleTabChange,
  setCurrentMonth,
  setCurrentYear,
  setSelectedDate,
  setLeaveManagementTab,
  handleLogout,
  getText,
  renderContent,
  systemStatus,
  adminNotifications,
  notifications,
  showPermissionModal,
  setShowPermissionModal,
  permissionModalData,
}) => {
  const { currentUser } = useAuthContext();
  const { activeTab } = useNavigationContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = (itemId) => {
    handleTabChange(itemId);
    if (itemId === 'schedule-management') {
      const today = new Date();
      setCurrentMonth(today.getMonth() + 1);
      setCurrentYear(today.getFullYear());
      setSelectedDate(today.getDate());
    }
    if (itemId === 'leave-management') {
      setLeaveManagementTab('employee-leave');
    }
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🎨 [패치 8] 시스템 상태 표시바 - 숨김 처리됨 */}
      {/* {currentUser?.role === 'admin' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2 text-xs">
            <div className="flex items-center space-x-4">
              {Object.entries(systemStatus).map(([key, status]) => (
                <div key={key} className="flex items-center space-x-1">
                  <span>{status.icon}</span>
                  <span className="font-medium" style={{ color: status.color }}>
                    {key}: {status.message}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">관리자 모드</span>
              {adminNotifications.filter((n) => !n.read).length > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs">
                  {adminNotifications.filter((n) => !n.read).length}
                </span>
              )}
            </div>
          </div>
        </div>
      )} */}
      {/* 모바일 상단 헤더 */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold text-gray-800">부성스틸(주)</h1>
          <p className="text-xs text-indigo-600">관리자 모드</p>
        </div>
        <div className="w-10" />
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 🔔 사용자 알림 시스템 */}
      <div className="fixed top-16 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
              notification.type === 'success'
                ? 'bg-green-100 text-green-800 border-l-4 border-green-500'
                : notification.type === 'warning'
                ? 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500'
                : notification.type === 'error'
                ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
                : 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
            }`}
          >
            <div className="font-semibold text-sm">{notification.title}</div>
            <div className="text-xs mt-1">{notification.message}</div>
          </div>
        ))}
      </div>
      {/* 🚫 권한 거부 모달 */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl">🚫</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    접근 권한 없음
                  </h3>
                  <p className="text-sm text-gray-600">
                    요청하신 작업을 수행할 권한이 없습니다.
                  </p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>작업:</strong> {permissionModalData?.action}
                </p>
                <p className="text-sm text-red-800 mt-1">
                  <strong>사유:</strong> {permissionModalData?.reason}
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 사이드바 */}
      <div
        className={`fixed left-0 top-0 z-50 w-56 bg-white shadow-lg border-r border-gray-200 h-screen overflow-y-auto transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="px-6 pt-4 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-m font-bold text-gray-800">부성스틸(주)</h1>
            <p className="text-xs text-indigo-600">AI 인사관리시스템</p>
          </div>
          {/* 모바일 닫기 버튼 */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        {/* 환영 메시지 및 로그아웃 */}
        <div className="px-6 py-4 border-b border-t border-gray-200 bg-indigo-50">
          <div className="text-sm font-semibold text-indigo-800 mb-2">
            {currentUser.name}님 환영합니다!
          </div>
          <div className="text-xs text-indigo-600 mb-3">관리자 모드</div>
          <button
            onClick={handleLogout}
            className="flex items-center text-sm text-red-500 hover:text-red-600 font-bold"
          >
            <LogOut size={14} className="mr-1" />
            {getText('로그아웃', 'Logout')}
          </button>
        </div>
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-indigo-50 hover:text-indigo-600 ${
                  activeTab === item.id
                    ? 'bg-indigo-200 text-indigo-600 border-r-2 border-indigo-600'
                    : 'text-gray-700'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="md:ml-56 pt-14 md:pt-0">
        <div className="p-3 md:p-6">{renderContent()}</div>
      </div>
    </div>
  );
};

export default AdminMain;
