import { useEffect, useMemo, useState } from 'react';
import { Theme, Flex, Box, Heading, Text, Tabs } from '@radix-ui/themes';
import BrandsPanel from './BrandsPanel.jsx';
import BlocksPanel from './BlocksPanel.jsx';
import ParityPanel from './ParityPanel.jsx';
import ApplyBar from './ApplyBar.jsx';
import { loadDs, fieldsIn, flat } from './ds.js';

const pretty = (o) => `${JSON.stringify(o, null, 2)}\n`;

/** The files a block contributes to the repo. Empty optional files are omitted. */
function blockFiles(b) {
  const dir = `eds/blocks/${b.name}`;
  const out = { [`${dir}/spec.json`]: pretty(b.spec), [`${dir}/${b.name}.css`]: b.css, [`${dir}/${b.name}.js`]: b.js };
  if (b.jsx) out[`${dir}/index.jsx`] = b.jsx;
  if (b.sample) out[`${dir}/sample.html`] = b.sample;
  return out;
}

export default function App({ hub = './' }) {
  const [orig, setOrig] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [brands, setBrands] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [current, setCurrent] = useState(null);
  const [compare, setCompare] = useState(false);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDs(hub).then((ds) => {
      setOrig({
        manifest: pretty(ds.manifest),
        brands: JSON.parse(JSON.stringify(ds.brands)),
        files: Object.assign({}, ...Object.values(ds.blocks).map(blockFiles)),
      });
      setManifest(ds.manifest); setBrands(ds.brands); setBlocks(ds.blocks); setCurrent(ds.manifest.brands[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  // Everything that differs from what is published, as repo paths.
  const { files, impact } = useMemo(() => {
    if (!orig || !manifest) return { files: {}, impact: [] };
    const out = {}; const reasons = {};
    const why = (block, text) => { reasons[block] = [...(reasons[block] || []), text]; };
    const changedFields = new Set();
    manifest.brands.forEach((b) => {
      if (JSON.stringify(brands[b.id]) !== JSON.stringify(orig.brands[b.id])) {
        out[`public/${b.file}`] = pretty(brands[b.id]);
        const now = Object.fromEntries(flat(brands[b.id])); const was = Object.fromEntries(flat(orig.brands[b.id]));
        Object.keys({ ...now, ...was }).filter((k) => k !== 'name' && now[k] !== was[k]).forEach((k) => changedFields.add(k));
      }
    });
    if (pretty(manifest) !== orig.manifest) {
      out['public/manifest.json'] = pretty(manifest);
      Object.keys(manifest.tokens || {}).forEach((t) => { if (JSON.stringify(manifest.tokens[t]) !== JSON.stringify(JSON.parse(orig.manifest).tokens?.[t])) changedFields.add(`tokens.${t}`); });
    }
    const now = Object.assign({}, ...Object.values(blocks).map(blockFiles));
    Object.entries(now).forEach(([p, c]) => { if (orig.files[p] !== c) out[p] = c; });
    Object.values(blocks).forEach((b) => {
      const fields = fieldsIn(b.css, manifest);
      fields.filter((f) => changedFields.has(f)).forEach((f) => why(b.name, `${f} changed`));
      if (Object.keys(blockFiles(b)).some((p) => out[p])) why(b.name, 'block code changed');
    });
    return { files: out, impact: Object.entries(reasons).map(([block, w]) => ({ block, why: [...new Set(w)] })) };
  }, [orig, manifest, brands, blocks]);

  if (error) return <Theme><Box p="6"><Text color="red">Could not load the design system: {error}</Text></Box></Theme>;
  if (!brands) return <Theme><Box p="6"><Text>Loading design system…</Text></Box></Theme>;

  const shared = { manifest, setManifest, brands, setBrands, blocks, setBlocks, current, setCurrent, compare, setCompare, draft };
  return (
    <Theme accentColor="indigo" grayColor="slate" radius="medium" hasBackground>
      <Flex direction="column" style={{ minHeight: '100vh' }}>
        <Box px="4" pt="3"><Heading size="4">Radix Design System</Heading></Box>
        <Tabs.Root defaultValue={window.location.hash === '#parity' ? 'parity' : 'brands'} style={{ flex: 1 }}>
          <Box px="4"><Tabs.List>
            <Tabs.Trigger value="brands">Brands and tokens</Tabs.Trigger>
            <Tabs.Trigger value="primitives">Primitives and block collection</Tabs.Trigger>
            <Tabs.Trigger value="components">Components (boilerplate)</Tabs.Trigger>
            <Tabs.Trigger value="parity">Parity</Tabs.Trigger>
          </Tabs.List></Box>
          <Tabs.Content value="brands"><BrandsPanel {...shared} /></Tabs.Content>
          <Tabs.Content value="primitives"><BlocksPanel {...shared} tier="collection" editable /></Tabs.Content>
          <Tabs.Content value="components"><BlocksPanel {...shared} tier="core" editable={false} /></Tabs.Content>
          <Tabs.Content value="parity"><ParityPanel {...shared} hub={hub} /></Tabs.Content>
        </Tabs.Root>
        <Box px="4" pb="2"><Text size="1" color="gray">Build {__BUILD__}</Text></Box>
        <ApplyBar files={files} impact={impact} brandId={current} onDraft={setDraft} />
      </Flex>
    </Theme>
  );
}
