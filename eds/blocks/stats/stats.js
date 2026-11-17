/** One row per figure: [number | label]. Becomes a semantic description list, so assistive tech reads each figure with its label. */
export default function decorate(block) {
  const list = document.createElement('dl');
  [...block.children].forEach((row) => {
    const [value, label] = row.children;
    const item = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label.textContent.trim();
    detail.textContent = value.textContent.trim();
    item.append(detail, term);
    list.append(item);
  });
  block.replaceChildren(list);
}
