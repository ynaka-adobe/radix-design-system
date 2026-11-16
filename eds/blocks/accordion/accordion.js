/** Rows of [label | content] become keyboard-accessible disclosure items. Same data-state contract as Radix Accordion. */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [label, body] = row.children;
    const item = document.createElement('details');
    item.className = 'accordion-item';
    item.dataset.state = 'closed';
    const trigger = document.createElement('summary');
    trigger.className = 'accordion-trigger';
    trigger.append(...label.childNodes);
    const content = document.createElement('div');
    content.className = 'accordion-content';
    content.append(...body.childNodes);
    item.append(trigger, content);
    item.addEventListener('toggle', () => { item.dataset.state = item.open ? 'open' : 'closed'; });
    row.replaceWith(item);
  });
}
