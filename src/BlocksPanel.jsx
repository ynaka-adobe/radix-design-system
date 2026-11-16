import { useMemo, useState } from 'react';
import {
  Flex, Box, Grid, Heading, Text, Button, Card, Badge, Switch, Tabs, TextArea, Callout,
} from '@radix-ui/themes';
import { Pick, Text1 } from './ui.jsx';
import { fieldsIn, previewDoc } from './ds.js';

const STATUSES = ['draft', 'stable', 'deprecated'];

const template = (name, title) => ({
  name,
  tier: 'collection',
  isNew: true,
  spec: { title, status: 'draft', description: '', authoring: '' },
  css: `.${name} {\n  padding: var(--ds-section-space, var(--space-8)) var(--space-5);\n  max-width: var(--ds-container, 880px);\n  margin: 0 auto;\n  color: var(--gray-12);\n}\n`,
  js: 'export default function decorate(block) {\n  // Decorate the authored rows in block.children\n}\n',
  jsx: `export default function ${title.replace(/[^A-Za-z0-9]/g, '')}() {\n  return null;\n}\n`,
  sample: `<div class="${name}"><div><div><p>Sample content</p></div></div></div>\n`,
});

const FILES = [
  ['css', 'style.css'],
  ['js', 'EDS js'],
  ['jsx', 'index.jsx'],
  ['sample', 'sample.html'],
];

function Preview({ block, brand, manifest, label }) {
  const doc = useMemo(
    () => previewDoc({ brand, manifest, name: block.name, css: block.css, js: block.js, sample: block.sample }),
    [brand, manifest, block.name, block.css, block.js, block.sample],
  );
  return (
    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
      <Text size="1" color="gray">{label}</Text>
      <iframe title={`${block.name} in ${label}`} sandbox="allow-scripts" srcDoc={doc} style={{ width: '100%', height: 340, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-3)', background: '#fff' }} />
    </Flex>
  );
}

function Editor({ value, onChange, editable }) {
  if (!editable) return <pre style={{ margin: 0, overflow: 'auto', fontSize: 12, maxHeight: 320 }}><code>{value || '(none)'}</code></pre>;
  return <TextArea value={value} onChange={(e) => onChange(e.target.value)} rows={12} spellCheck={false} style={{ fontFamily: 'var(--code-font-family)', fontSize: 12 }} />;
}

export default function BlocksPanel({
  tier, editable, manifest, brands, blocks, setBlocks, setManifest, current, setCurrent, compare, setCompare,
}) {
  const names = Object.keys(blocks).filter((n) => blocks[n].tier === tier).sort();
  const [sel, setSel] = useState(names[0]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');
  const name = names.includes(sel) ? sel : names[0];
  const block = blocks[name];
  const brandIds = manifest.brands.map((b) => b.id);
  const other = brandIds.find((b) => b !== current);

  const update = (patch) => setBlocks((all) => ({ ...all, [name]: { ...all[name], ...patch } }));
  const updateSpec = (k) => (v) => update({ spec: { ...block.spec, [k]: v } });
  const create = () => {
    const n = newName.trim().toLowerCase();
    if (!/^[a-z][a-z0-9-]*$/.test(n)) return setErr('Use lowercase letters, numbers and dashes, starting with a letter.');
    if (blocks[n]) return setErr('A block with that name exists.');
    const title = n.replace(/(^|-)(\w)/g, (_, a, c) => (a ? ' ' : '') + c.toUpperCase());
    setBlocks((all) => ({ ...all, [n]: template(n, title) }));
    setManifest((m) => ({ ...m, blocks: { ...(m.blocks || {}), [n]: tier } }));
    setSel(n); setNewName(''); setErr(''); setAdding(false);
  };

  const fields = block ? fieldsIn(block.css, manifest) : [];
  const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

  return (
    <Flex direction={{ initial: 'column', md: 'row' }} align="stretch">
      <Box p="4" width={{ initial: '100%', md: '300px' }} flexShrink="0" style={{ borderRight: '1px solid var(--gray-5)', borderBottom: '1px solid var(--gray-5)' }}>
        <Flex direction="column" gap="3">
          <Text size="2" color="gray">
            {editable
              ? 'Primitives and block collection blocks. A developer registers each block with index.jsx, style.css and the EDS script. The look comes from the selected brand.'
              : 'Boilerplate blocks are atomic and maintained by the design system team. They change appearance with the selected brand.'}
          </Text>
          <Pick label="Brand" value={current} options={brandIds} onChange={setCurrent} />
          <Flex align="center" gap="2"><Switch checked={compare} onCheckedChange={setCompare} /><Text size="2">Compare with {other}</Text></Flex>
          <Flex direction="column" gap="1">
            {names.map((n) => (
              <Button key={n} variant={n === name ? 'solid' : 'soft'} color={n === name ? undefined : 'gray'} onClick={() => setSel(n)} style={{ justifyContent: 'space-between' }}>
                {blocks[n].spec.title || n}{blocks[n].isNew && <Badge size="1" color="green">new</Badge>}
              </Button>
            ))}
          </Flex>
          {editable && (adding ? (
            <Card size="1"><Flex direction="column" gap="2">
              <Text1 label="Block name" value={newName} onChange={setNewName} placeholder="carousel" />
              {err && <Text size="1" color="red">{err}</Text>}
              <Flex gap="2"><Button size="2" onClick={create}>Create</Button><Button size="2" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></Flex>
            </Flex></Card>
          ) : <Button variant="outline" onClick={() => setAdding(true)}>Register a block</Button>)}
        </Flex>
      </Box>

      <Box p="4" style={{ flex: 1, minWidth: 0 }}>
        {!block ? <Text color="gray">No blocks in this collection yet.</Text> : (
          <Flex direction="column" gap="4">
            <Grid columns={compare && other ? { initial: '1', lg: '2' } : '1'} gap="4">
              <Preview block={block} brand={brands[current]} manifest={manifest} label={manifest.brands.find((b) => b.id === current)?.name} />
              {compare && other && <Preview block={block} brand={brands[other]} manifest={manifest} label={manifest.brands.find((b) => b.id === other)?.name} />}
            </Grid>

            <Card size="2">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2" wrap="wrap">
                  <Heading size="3">{block.spec.title || name}</Heading>
                  <Badge color={block.spec.status === 'stable' ? 'green' : 'amber'}>{block.spec.status}</Badge>
                  <Badge color="gray">{tier === 'core' ? 'boilerplate' : 'collection'}</Badge>
                </Flex>
                {editable ? (
                  <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                    <Text1 label="Title" value={block.spec.title || ''} onChange={updateSpec('title')} />
                    <Pick label="Status" value={block.spec.status || 'draft'} options={STATUSES} onChange={updateSpec('status')} />
                    <Text1 label="Description" value={block.spec.description || ''} onChange={updateSpec('description')} />
                    <Text1 label="Authoring guidance" value={block.spec.authoring || ''} onChange={updateSpec('authoring')} />
                  </Grid>
                ) : (
                  <>
                    <Text size="2">{block.spec.description}</Text>
                    <Text size="2" color="gray">Authoring: {block.spec.authoring}</Text>
                  </>
                )}
                <Flex gap="2" wrap="wrap" align="center">
                  <Text size="1" color="gray">Design system fields it uses:</Text>
                  {fields.map((f) => <Badge key={f} size="1" color="gray">{f}</Badge>)}
                </Flex>
                <Flex gap="2" wrap="wrap" align="center">
                  <Text size="1" color="gray">Brand coverage:</Text>
                  {brandIds.map((id) => {
                    const missing = fields.filter((f) => get(f.startsWith('tokens.') ? { tokens: { ...Object.fromEntries(Object.entries(manifest.tokens || {}).map(([k, v]) => [k, v.default])), ...(brands[id].tokens || {}) } } : brands[id], f) == null);
                    return <Badge key={id} size="1" color={missing.length ? 'red' : 'green'}>{manifest.brands.find((b) => b.id === id).name}: {missing.length ? `missing ${missing.join(', ')}` : 'full parity'}</Badge>;
                  })}
                </Flex>
              </Flex>
            </Card>

            <Tabs.Root defaultValue="css">
              <Tabs.List>{FILES.map(([k, label]) => <Tabs.Trigger key={k} value={k}>{label}</Tabs.Trigger>)}</Tabs.List>
              <Box pt="3">
                {FILES.map(([k]) => (
                  <Tabs.Content key={k} value={k}><Editor value={block[k] || ''} onChange={(v) => update({ [k]: v })} editable={editable} /></Tabs.Content>
                ))}
              </Box>
            </Tabs.Root>
            {editable && (
              <Callout.Root size="1" color="gray"><Callout.Text>
                Saved as <code>eds/blocks/{name}/</code>: <code>{name}.css</code> (style.css), <code>{name}.js</code> (EDS), <code>index.jsx</code>, <code>sample.html</code> and <code>spec.json</code>. Use Apply in the bar below to create the branch.
              </Callout.Text></Callout.Root>
            )}
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
