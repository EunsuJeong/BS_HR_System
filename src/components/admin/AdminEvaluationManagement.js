import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { exportEvaluationToXLSX, useEvaluationManagement } from '../common/common_admin_evaluation';
import { useDebounce } from '../common/common_common';

const AdminEvaluationManagement = ({
  evaluationData,
  setEvaluationData,
  evaluationSearch,
  setEvaluationSearch,
  employees,
  COMPANY_STANDARDS,
  STATUS_COLORS,
  getEvaluationWithPosition,
  getFilteredEvaluation,
  getSortedEvaluations,
  handleEvaluationSort,
  send자동알림,
  currentUser,
}) => {
  const [evaluationForm, setEvaluationForm] = useState({
    year: new Date().getFullYear(),
    employeeId: '',
    name: '',
    position: '',
    department: '',
    grade: 'A',
    content: '',
    status: '예정',
  });
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [editingEvaluationId, setEditingEvaluationId] = useState(null);
  const [editingEvaluationData, setEditingEvaluationData] = useState({});
  const [evaluationPage, setEvaluationPage] = useState(1);

  // 평가 검색 필터 로컬 state + debounce (타이핑 렉 방지)
  const [evalYearInput, setEvalYearInput] = useState(evaluationSearch?.year || '');
  const [evalKeywordInput, setEvalKeywordInput] = useState(evaluationSearch?.keyword || '');
  const debouncedEvalYear = useDebounce(evalYearInput, 200);
  const debouncedEvalKeyword = useDebounce(evalKeywordInput, 200);
  useEffect(() => { setEvaluationSearch((s) => ({ ...s, year: debouncedEvalYear })); }, [debouncedEvalYear]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setEvaluationSearch((s) => ({ ...s, keyword: debouncedEvalKeyword })); }, [debouncedEvalKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    handleEvaluationSubmit,
    handleEvaluationEdit,
    handleEvaluationSave,
    handleEvaluationDelete,
  } = useEvaluationManagement({
    evaluationForm,
    setEvaluationForm,
    evaluationData,
    setEvaluationData,
    setShowEvaluationForm,
    editingEvaluationId,
    setEditingEvaluationId,
    editingEvaluationData,
    setEditingEvaluationData,
    employees,
    send자동알림,
    currentUser,
  });

  // 검색 필터 변경시 페이지 1로 리셋
  useEffect(() => {
    setEvaluationPage(1);
  }, [
    evaluationSearch.year,
    evaluationSearch.department,
    evaluationSearch.grade,
    evaluationSearch.keyword,
    setEvaluationPage,
  ]);
  return (
    <div className="space-y-6 w-full h-full">
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-3 mb-4">
          {/* 1행: 제목 + 다운로드 버튼 */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">평가 관리</h3>
            <button
              onClick={() => {
                const filteredData = getFilteredEvaluation(
                  getEvaluationWithPosition(evaluationData)
                );
                exportEvaluationToXLSX(filteredData);
              }}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center text-sm"
            >
              <Download size={14} className="mr-1" />
              다운로드
            </button>
          </div>

          {/* 2행: 검색 필터 */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="연도"
              value={evalYearInput}
              onChange={(e) => setEvalYearInput(e.target.value)}
              className="px-2 py-1.5 border rounded-lg text-sm w-20"
            />
            <select
              value={evaluationSearch.department}
              onChange={(e) =>
                setEvaluationSearch((s) => ({
                  ...s,
                  department: e.target.value,
                }))
              }
              className="px-2 py-1.5 border rounded-lg text-sm flex-1 min-w-[100px]"
            >
              <option value="전체">전체 부서</option>
              {COMPANY_STANDARDS.DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={evaluationSearch.grade}
              onChange={(e) =>
                setEvaluationSearch((s) => ({
                  ...s,
                  grade: e.target.value,
                }))
              }
              className="px-2 py-1.5 border rounded-lg text-sm flex-1 min-w-[100px]"
            >
              <option value="전체">전체 등급</option>
              <option value="S">S등급</option>
              <option value="A">A등급</option>
              <option value="B">B등급</option>
              <option value="C">C등급</option>
            </select>
            <input
              type="text"
              placeholder="사번/이름 검색"
              value={evalKeywordInput}
              onChange={(e) => setEvalKeywordInput(e.target.value)}
              className="px-2 py-1.5 border rounded-lg text-sm flex-1 min-w-[140px]"
            />
          </div>
        </div>

        {/* 성과 입력 폼 */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-semibold text-blue-800 mb-2">성과 평가 등록</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              placeholder="연도"
              value={evaluationForm.year}
              onChange={(e) =>
                setEvaluationForm((f) => ({
                  ...f,
                  year: parseInt(e.target.value) || new Date().getFullYear(),
                }))
              }
              className="text-center border px-1.5 py-1.5 text-xs w-20 rounded"
            />
            <input
              type="text"
              placeholder="사번"
              value={evaluationForm.employeeId}
              className="text-center border px-1.5 py-1.5 text-xs w-24 bg-gray-100 rounded"
              readOnly
            />
            <div className="relative">
              <input
                type="text"
                placeholder="이름"
                value={evaluationForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEvaluationForm((f) => ({
                    ...f,
                    name: name,
                    ...(name
                      ? (() => {
                          const found = employees.find(
                            (emp) => emp.name === name
                          );
                          return found
                            ? {
                                employeeId: found.id,
                                position:
                                  found.position || found.title || '사원',
                                department: found.department,
                              }
                            : {
                                employeeId: '',
                                position: '',
                                department: '',
                              };
                        })()
                      : { employeeId: '', position: '', department: '' }),
                  }));
                }}
                list="employee-names"
                className="text-center border px-1.5 py-1.5 text-xs w-24 rounded"
                required
              />
              <datalist id="employee-names">
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.id} - {emp.department}
                  </option>
                ))}
              </datalist>
            </div>
            <input
              type="text"
              placeholder="직급"
              value={evaluationForm.position}
              className="text-center border px-1.5 py-1.5 text-xs w-20 bg-gray-100 rounded"
              readOnly
            />
            <input
              type="text"
              placeholder="부서"
              value={evaluationForm.department}
              className="text-center border px-1.5 py-1.5 text-xs w-24 bg-gray-100 rounded"
              readOnly
            />
            <select
              value={evaluationForm.grade}
              onChange={(e) =>
                setEvaluationForm((f) => ({
                  ...f,
                  grade: e.target.value,
                }))
              }
              className="text-center border px-1.5 py-1.5 text-xs w-16 rounded"
            >
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <input
              type="text"
              placeholder="평가 내용"
              value={evaluationForm.content}
              onChange={(e) =>
                setEvaluationForm((f) => ({
                  ...f,
                  content: e.target.value,
                }))
              }
              className="border px-2 py-1.5 text-xs flex-1 min-w-[140px] rounded"
            />
            <select
              value={evaluationForm.status}
              onChange={(e) =>
                setEvaluationForm((f) => ({
                  ...f,
                  status: e.target.value,
                }))
              }
              className="text-center border px-1.5 py-1.5 text-xs w-16 rounded"
            >
              <option value="예정">예정</option>
              <option value="완료">완료</option>
            </select>
            <button
              onClick={handleEvaluationSubmit}
              className="px-4 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 whitespace-nowrap"
            >
              등록
            </button>
          </div>
        </div>

        <>
            <div className="overflow-x-auto max-h-[85vh] overflow-y-auto">
              <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      연도
                      <button
                        onClick={() => handleEvaluationSort('year')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      사번
                      <button
                        onClick={() => handleEvaluationSort('employeeId')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      이름
                      <button
                        onClick={() => handleEvaluationSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      직급
                      <button
                        onClick={() => handleEvaluationSort('position')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      부서
                      <button
                        onClick={() => handleEvaluationSort('department')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      등급
                      <button
                        onClick={() => handleEvaluationSort('grade')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      내용
                      <button
                        onClick={() => handleEvaluationSort('content')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">
                      상태
                      <button
                        onClick={() => handleEvaluationSort('status')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-2 px-2 whitespace-nowrap">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getSortedEvaluations(
                    getFilteredEvaluation(
                      getEvaluationWithPosition(evaluationData)
                    )
                  )
                    .slice((evaluationPage - 1) * 14, evaluationPage * 14)
                    .map((p) => {
                      const isEditing = editingEvaluationId === p._id;
                      return (
                        <tr
                          key={p._id || `${p.year}-${p.employeeId}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingEvaluationData.year || ''}
                                onChange={(e) =>
                                  setEditingEvaluationData({
                                    ...editingEvaluationData,
                                    year: parseInt(e.target.value) || '',
                                  })
                                }
                                className="w-20 px-1 py-0.5 text-center border border-gray-300 rounded"
                              />
                            ) : (
                              p.year
                            )}
                          </td>
                          <td className="text-center py-2 px-2">
                            {p.employeeId}
                          </td>
                          <td className="text-center py-2 px-2">{p.name}</td>
                          <td className="text-center py-2 px-2">
                            {p.position}
                          </td>
                          <td className="text-center py-2 px-2">
                            {p.department}
                          </td>
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <select
                                value={editingEvaluationData.grade || 'A'}
                                onChange={(e) =>
                                  setEditingEvaluationData({
                                    ...editingEvaluationData,
                                    grade: e.target.value,
                                  })
                                }
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="S">S</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  p.grade === 'A'
                                    ? 'bg-green-100 text-green-800'
                                    : p.grade === 'B'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {p.grade}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 px-2 max-w-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingEvaluationData.content || ''}
                                onChange={(e) =>
                                  setEditingEvaluationData({
                                    ...editingEvaluationData,
                                    content: e.target.value,
                                  })
                                }
                                className="w-full px-1 py-0.5 border border-gray-300 rounded"
                              />
                            ) : (
                              <span className="truncate block">
                                {p.content}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <select
                                value={editingEvaluationData.status || '확정'}
                                onChange={(e) =>
                                  setEditingEvaluationData({
                                    ...editingEvaluationData,
                                    status: e.target.value,
                                  })
                                }
                                className="px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="예정">예정</option>
                                <option value="완료">완료</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  STATUS_COLORS[p.status] ||
                                  STATUS_COLORS['완료']
                                }`}
                              >
                                {p.status}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-2 px-2">
                            {isEditing ? (
                              <button
                                onClick={() => handleEvaluationSave(p)}
                                className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs"
                              >
                                저장
                              </button>
                            ) : (
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleEvaluationEdit(p)}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleEvaluationDelete(p)}
                                  className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {(() => {
              const filteredCount = getSortedEvaluations(
                getFilteredEvaluation(getEvaluationWithPosition(evaluationData))
              ).length;
              if (filteredCount <= 14) return null;

              const totalPages = Math.ceil(filteredCount / 14);
              const groupSize = 10;
              const currentGroup = Math.floor((evaluationPage - 1) / groupSize);
              const startPage = currentGroup * groupSize + 1;
              const endPage = Math.min(startPage + groupSize - 1, totalPages);

              return (
                <div className="flex flex-wrap justify-center mt-4 gap-1 px-2">
                  {startPage > 1 && (
                    <button
                      className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                      onClick={() => setEvaluationPage(startPage - 1)}
                    >
                      &lt;
                    </button>
                  )}
                  {Array.from({ length: endPage - startPage + 1 }).map((_, i) => (
                    <button
                      key={startPage + i}
                      className={`px-3 py-1 rounded text-sm ${
                        evaluationPage === startPage + i
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                      onClick={() => setEvaluationPage(startPage + i)}
                    >
                      {startPage + i}
                    </button>
                  ))}
                  {endPage < totalPages && (
                    <button
                      className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                      onClick={() => setEvaluationPage(endPage + 1)}
                    >
                      &gt;
                    </button>
                  )}
                </div>
              );
            })()}
          </>
      </div>
    </div>
  );
};

export default React.memo(AdminEvaluationManagement);
