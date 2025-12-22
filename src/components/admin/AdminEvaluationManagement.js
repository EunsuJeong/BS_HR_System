import React, { useEffect } from 'react';
import { Download } from 'lucide-react';
import { exportEvaluationToXLSX } from '../common/common_admin_evaluation';

const AdminEvaluationManagement = ({
  evaluationData,
  evaluationSearch,
  setEvaluationSearch,
  evaluationForm,
  setEvaluationForm,
  evaluationTab,
  editingEvaluationId,
  editingEvaluationData,
  setEditingEvaluationData,
  employees,
  COMPANY_STANDARDS,
  STATUS_COLORS,
  getEvaluationWithPosition,
  getFilteredEvaluation,
  getSortedEvaluations,
  handleEvaluationSort,
  handleEvaluationSubmit,
  handleEvaluationEdit,
  handleEvaluationSave,
  handleEvaluationDelete,
  evaluationPage,
  setEvaluationPage,
}) => {
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
      <div className="bg-white border border-gray-200 rounded-xl p-6 h-[870px] flex flex-col">
        <div className="flex flex-nowrap gap-6 items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">평가 관리</h3>
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="연도"
              value={evaluationSearch.year}
              onChange={(e) =>
                setEvaluationSearch((s) => ({ ...s, year: e.target.value }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-32"
            />
            <select
              value={evaluationSearch.department}
              onChange={(e) =>
                setEvaluationSearch((s) => ({
                  ...s,
                  department: e.target.value,
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-32"
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
              className="px-3 py-2 border rounded-lg text-sm w-32"
            >
              <option value="전체">전체 등급</option>
              <option value="S">S등급</option>
              <option value="A">A등급</option>
              <option value="B">B등급</option>
              <option value="C">C등급</option>
            </select>
            <input
              type="text"
              placeholder="사번/이름 검색 (쉼표/띄어쓰기로 다중 검색 가능)"
              value={evaluationSearch.keyword}
              onChange={(e) =>
                setEvaluationSearch((s) => ({
                  ...s,
                  keyword: e.target.value,
                }))
              }
              className="px-3 py-2 border rounded-lg text-sm w-80"
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const filteredData = getFilteredEvaluation(
                  getEvaluationWithPosition(evaluationData)
                );
                exportEvaluationToXLSX(filteredData);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              <Download size={16} className="mr-2" />
              다운로드
            </button>
          </div>
        </div>

        {/* 성과 입력 폼 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2.5 items-center">
            <span className="text-xs font-semibold text-blue-800 whitespace-nowrap mr-1">
              성과 평가 등록:
            </span>
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
              className="text-center border px-1.5 py-2 text-xs w-28 rounded"
            />
            <input
              type="text"
              placeholder="사번"
              value={evaluationForm.employeeId}
              className="text-center border px-1.5 py-2 text-xs w-28 bg-gray-100 rounded"
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
                className="text-center border px-1.5 py-2 text-xs w-30 rounded"
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
              className="text-center border px-1.5 py-2 text-xs w-24 bg-gray-100 rounded"
              readOnly
            />
            <input
              type="text"
              placeholder="부서"
              value={evaluationForm.department}
              className="text-center border px-1.5 py-2 text-xs w-28 bg-gray-100 rounded"
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
              className="text-center border px-1.5 py-2 text-xs w-20 rounded"
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
              className="border px-2 py-2 text-xs flex-1 rounded"
            />
            <select
              value={evaluationForm.status}
              onChange={(e) =>
                setEvaluationForm((f) => ({
                  ...f,
                  status: e.target.value,
                }))
              }
              className="text-center border px-1.5 py-2 text-xs w-20 rounded"
            >
              <option value="예정">예정</option>
              <option value="완료">완료</option>
            </select>
            <button
              onClick={handleEvaluationSubmit}
              className="px-10 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 whitespace-nowrap"
            >
              등록
            </button>
          </div>
        </div>

        {evaluationTab === 'employee' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-center py-1 px-2">
                      연도
                      <button
                        onClick={() => handleEvaluationSort('year')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      사번
                      <button
                        onClick={() => handleEvaluationSort('employeeId')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      이름
                      <button
                        onClick={() => handleEvaluationSort('name')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      직급
                      <button
                        onClick={() => handleEvaluationSort('position')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      부서
                      <button
                        onClick={() => handleEvaluationSort('department')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      등급
                      <button
                        onClick={() => handleEvaluationSort('grade')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      내용
                      <button
                        onClick={() => handleEvaluationSort('content')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">
                      상태
                      <button
                        onClick={() => handleEvaluationSort('status')}
                        className="ml-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        ▼
                      </button>
                    </th>
                    <th className="text-center py-1 px-2">관리</th>
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
                            {p.employeeId}
                          </td>
                          <td className="text-center py-1 px-2">{p.name}</td>
                          <td className="text-center py-1 px-2">
                            {p.position}
                          </td>
                          <td className="text-center py-1 px-2">
                            {p.department}
                          </td>
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2 max-w-xs">
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
                          <td className="text-center py-1 px-2">
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
                          <td className="text-center py-1 px-2">
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

              return (
                <div className="flex justify-center mt-4 gap-1">
                  {Array.from({
                    length: Math.ceil(filteredCount / 14),
                  }).map((_, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1 rounded ${
                        evaluationPage === i + 1
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                      onClick={() => setEvaluationPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              );
            })()}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">연도별 성과 분석</p>
            <p className="text-sm">
              연도별 성과 통계 및 분석 자료를 표시합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEvaluationManagement;
