/** Rows of [label | content] become an accessible tab set. Same data-state contract as Radix Tabs. */
export default function decorate(block) {
  const rows = [...block.children];
  const list = document.createElement('div');
  list.className = 'tabs-list';
  list.setAttribute('role', 'tablist');
  const tabs = [];
  const panels = [];
  rows.forEach((row) => {
    const [label, body] = row.children;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-trigger';
    tab.setAttribute('role', 'tab');
    tab.textContent = label.textContent.trim();
    const panel = document.createElement('div');
    panel.className = 'tabs-panel';
    panel.setAttribute('role', 'tabpanel');
    panel.append(...body.childNodes);
    tabs.push(tab);
    panels.push(panel);
  });
  const select = (n, focus) => {
    tabs.forEach((tab, i) => {
      const on = i === n;
      tab.dataset.state = on ? 'active' : 'inactive';
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[n].focus();
  };
  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  list.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (i < 0 || next === undefined) return;
    e.preventDefault();
    select((next + tabs.length) % tabs.length, true);
  });
  list.append(...tabs);
  block.replaceChildren(list, ...panels);
  select(0);
}
