// *[1_공통] 날짜 변환 유틸* (KST 기준)
// Date 객체를 YYYY-MM-DD 문자열로 변환 (로컬 시간대 기준)
export const formatDateToString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
