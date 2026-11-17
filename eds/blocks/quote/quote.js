/** One cell: the quote as a paragraph, then the attribution. Becomes a semantic blockquote with a cite. */
export default function decorate(block) {
  const cell = block.querySelector(':scope > div > div');
  const [quote, attribution] = [...cell.querySelectorAll('p')];
  const blockquote = document.createElement('blockquote');
  if (quote) blockquote.append(quote);
  if (attribution) {
    const cite = document.createElement('cite');
    cite.textContent = attribution.textContent.trim();
    blockquote.append(cite);
  }
  block.replaceChildren(blockquote);
}
