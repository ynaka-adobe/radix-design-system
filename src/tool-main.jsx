import React from 'react';
import { createRoot } from 'react-dom/client';
import { Theme, Box, Text } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './layout.css';
import App from './App.jsx';
import { configureHub } from './github.js';

// Installed-tool entry. hub.json sits next to radix-designer.html:
// { "repo": "owner/radix-design-system", "pagesUrl": "https://owner.github.io/radix-design-system/" }
const root = createRoot(document.getElementById('root'));
fetch(`./hub.json?t=${Date.now()}`, { cache: 'no-store' })
  .then((r) => { if (!r.ok) throw new Error(`hub.json: ${r.status}`); return r.json(); })
  .then((cfg) => {
    if (!cfg.pagesUrl) throw new Error('hub.json needs "pagesUrl"');
    configureHub(cfg);
    root.render(<App hub={cfg.pagesUrl.replace(/\/?$/, '/')} />);
  })
  .catch((e) => root.render(<Theme><Box p="6"><Text color="red">Could not read hub.json: {e.message}</Text></Box></Theme>));
