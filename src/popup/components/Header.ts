export function updateHeaderCount(
  countElement: HTMLElement,
  subtitleElement: HTMLElement,
  count: number
) {
  countElement.textContent = `${count} 件`;
  subtitleElement.textContent = count > 0 ? '保存済みアプリ' : '保存件数';
}
