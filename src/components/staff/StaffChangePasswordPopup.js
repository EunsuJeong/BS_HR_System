import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * STAFF 비밀번호 변경 팝업
 * - 비밀번호 표시 UI 상태(showCurrent/New/Confirm)를 로컬 state로 소유
 * - 인증 로직(handleChangePassword)은 App.js/useAuth에 유지
 * - showChangePasswordPopup 조건부 렌더는 App.js에서 관리
 */
const StaffChangePasswordPopup = ({
  getText,
  onClose,
  changePasswordForm,
  setChangePasswordForm,
  changePasswordError,
  changePasswordSuccess,
  handleChangePassword,
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full mx-4 flex flex-col">
        <div className="p-6 pb-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-ㅠㅁㄴㄷ font-semibold text-gray-800">
              {getText('비밀번호 변경', 'Change Password')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder={getText('현재 비밀번호', 'Current Password')}
              value={changePasswordForm.current}
              onChange={(e) =>
                setChangePasswordForm((f) => ({ ...f, current: e.target.value }))
              }
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showCurrentPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder={getText('새 비밀번호', 'New Password')}
              value={changePasswordForm.new}
              onChange={(e) =>
                setChangePasswordForm((f) => ({ ...f, new: e.target.value }))
              }
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={getText('새 비밀번호 확인', 'Confirm New Password')}
              value={changePasswordForm.confirm}
              onChange={(e) =>
                setChangePasswordForm((f) => ({ ...f, confirm: e.target.value }))
              }
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {changePasswordError && (
            <div className="text-red-500 text-xs">{changePasswordError}</div>
          )}
          {changePasswordSuccess && (
            <div className="text-green-600 text-m font-medium">
              {changePasswordSuccess}
            </div>
          )}
          <button
            onClick={handleChangePassword}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            {getText('변경하기', 'Change')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffChangePasswordPopup;
