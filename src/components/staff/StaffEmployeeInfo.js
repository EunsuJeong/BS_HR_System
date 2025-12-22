import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { getWorkPeriodText } from '../common/common_common';

/**
 * STAFF ① 사원정보 컴포넌트
 * 직원 모드에서 본인의 사원 정보를 확인하는 컴포넌트
 */
const StaffEmployeeInfo = ({ currentUser, getText }) => {
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Users className="w-5 h-5 text-rose-500 mr-2" />
          <h3 className="text-sm font-semibold text-gray-800">
            {getText('사원 정보', 'Information')}
          </h3>
        </div>
        <button
          onClick={() => setShowEmployeeDetails(!showEmployeeDetails)}
          className="text-blue-500 text-2xs hover:text-blue-600"
        >
          {showEmployeeDetails
            ? getText('접기', 'Hide')
            : getText('더보기', 'More')}{' '}
          &gt;
        </button>
      </div>
      {showEmployeeDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <p className="text-xs text-gray-500">
              {getText('사원번호', 'Employee ID')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.id}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('이름', 'Name')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('직급', 'Position')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.position}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('부서', 'Department')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.department}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('세부부서', 'Sub_Department')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.subDepartment}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('직책', 'Role')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.role}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('입사일', 'Join Date')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {currentUser.joinDate}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">
              {getText('근속년수', 'Work Period')}
            </p>
            <p className="text-xs font-medium text-gray-800">
              {getWorkPeriodText(currentUser.joinDate)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffEmployeeInfo;
