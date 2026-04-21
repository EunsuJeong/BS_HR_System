import React, { createContext, useContext } from 'react';

const EmployeeContext = createContext(null);

/**
 * EmployeeProvider
 * employees 배열을 read-only로 하위 컴포넌트에 제공한다.
 * setEmployees write 경로는 App.js에 유지한다.
 *
 * @param {{ employees: Array, children: React.ReactNode }} props
 */
export const EmployeeProvider = ({ employees, children }) => (
  <EmployeeContext.Provider value={employees}>
    {children}
  </EmployeeContext.Provider>
);

/**
 * useEmployeeContext
 * employees 배열을 반환한다.
 * EmployeeProvider 외부에서 호출하면 오류를 던진다.
 */
export const useEmployeeContext = () => {
  const ctx = useContext(EmployeeContext);
  if (ctx === null) {
    throw new Error('useEmployeeContext must be used within EmployeeProvider');
  }
  return ctx;
};
