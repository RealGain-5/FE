/**
 * 경로 문자열에서 파일명(확장자 포함)만 추출한다.
 * Windows(\) / POSIX(/) 양쪽 구분자를 모두 처리한다.
 * @param {string} filePath
 * @returns {string}
 */
export function getFileName(filePath) {
  return filePath.split(/[/\\]/).pop()
}
