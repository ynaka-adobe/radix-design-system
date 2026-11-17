import { useMemo, useState } from 'react';
import {
  Theme, Flex, Box, Grid, Heading, Text, Button, Card, Container,
  Separator, Badge, Code, Callout, Switch,
} from '@radix-ui/themes';
import { Field, Pick, Text1 } from './ui.jsx';
import { varsIn } from './ds.js';

const ACCENTS = ['gold', 'bronze', 'brown', 'red', 'crimson', 'ruby', 'tomato', 'orange', 'amber', 'yellow', 'lime', 'grass', 'green', 'jade', 'mint', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'iris', 'violet', 'purple', 'plum', 'pink'];
const GRAYS = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand'];
const RADII = ['none', 'small', 'medium', 'large', 'full'];
const SCALINGS = ['90%', '95%', '100%', '105%', '110%'];
const STEPS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const CONTAINERS = ['1', '2', '3', '4'];

/** The brand rendered with real Radix Themes components. Mirrors the Edge Delivery blocks. */
function Preview({ brand }) {
  const { theme, typography: t, layout } = brand;
  const heading = { fontFamily: t.headingFont, fontWeight: t.headingWeight, letterSpacing: t.headingTracking, textTransform: t.headingTransform };
  const vars = { '--default-font-family': t.bodyFont };
  return (
    <Theme {...theme} hasBackground style={{ minHeight: 'auto', ...vars, borderRadius: 'var(--radius-4)' }}>
      <Box style={{ background: 'var(--gray-3)' }} py={layout.sectionSpace}>
        <Container size={layout.containerSize} px="5">
          <Flex direction="column" align="center" gap="4" style={{ textAlign: 'center' }}>
            <Heading size="8" style={heading}>Drive what moves you</Heading>
            <Text size="4" color="gray">One set of blocks. Every brand renders as itself.</Text>
            <Button size="3">Explore models</Button>
          </Flex>
        </Container>
      </Box>
      <Box py={layout.sectionSpace}>
        <Container size={layout.containerSize} px="5">
          <Grid columns={{ initial: '1', sm: '3' }} gap="4">
            {[['Hybrid', 'Efficiency without compromise.'], ['Safety', 'Standard on every trim.'], ['Service', 'Book in two taps.']].map(([h, p]) => (
              <Card key={h} size="3">
                <Heading size="4" mb="2" color={theme.accentColor} style={heading}>{h}</Heading>
                <Text color="gray">{p}</Text>
              </Card>
            ))}
          </Grid>
        </Container>
      </Box>
      <Box style={{ background: 'var(--gray-3)', borderLeft: '6px solid var(--accent-9)' }} py={layout.sectionSpace}>
        <Container size={layout.containerSize} px="5">
          <Heading size="6" mb="2" style={heading}>Find your fit</Heading>
          <Text color="gray">Compare trims side by side and see what changes between brands.</Text>
        </Container>
      </Box>
      <Box py="6">
        <Container size={layout.containerSize} px="5">
          <Flex gap="3" wrap="wrap">
            <Button size="3">Build yours</Button>
            <Button size="3" variant="outline">Find a dealer</Button>
            <Badge size="2">New</Badge>
          </Flex>
        </Container>
      </Box>
    </Theme>
  );
}


function NewToken({ manifest, setManifest, blocks, setBlocks }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', description: '', def: '', block: 'none', selector: '', property: '' });
  const [err, setErr] = useState('');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const add = () => {
    const name = `--ds-${f.name.replace(/^--(ds-)?/, '')}`;
    if (!/^--ds-[a-z0-9-]+$/.test(name) || name === '--ds-') return setErr('Name: lowercase letters, numbers and dashes.');
    if (manifest.tokens?.[name]) return setErr('That token already exists.');
    if (!f.def.trim() || /[;{}<>]/.test(f.def)) return setErr('Give a default value (no ; { } < >).');
    if (f.block !== 'none' && (!f.selector.trim() || !f.property.trim() || /[{};]/.test(f.selector + f.property))) return setErr('To use it in a block, give a selector and a CSS property.');
    setManifest((m) => ({ ...m, tokens: { ...(m.tokens || {}), [name]: { description: f.description, default: f.def.trim() } } }));
    if (f.block !== 'none') {
      setBlocks((all) => ({ ...all, [f.block]: { ...all[f.block], css: `${all[f.block].css.replace(/\n*$/, '\n')}/* ${name} */\n${f.selector.trim()} { ${f.property.trim()}: var(${name}, ${f.def.trim()}); }\n` } }));
    }
    setF({ name: '', description: '', def: '', block: 'none', selector: '', property: '' }); setErr(''); setOpen(false);
  };
  if (!open) return <Button variant="soft" size="2" onClick={() => setOpen(true)}>New token</Button>;
  return (
    <Card size="1"><Flex direction="column" gap="2">
      <Text1 label="Name (prefixed --ds-)" value={f.name} onChange={set('name')} placeholder="card-gap" />
      <Text1 label="Description" value={f.description} onChange={set('description')} />
      <Text1 label="Default value" value={f.def} onChange={set('def')} placeholder="var(--space-4)" />
      <Pick label="Use it in a block (optional)" value={f.block} options={['none', ...Object.keys(blocks)]} onChange={set('block')} />
      {f.block !== 'none' && (<>
        <Text1 label="CSS selector" value={f.selector} onChange={set('selector')} placeholder={`.${f.block} > div`} />
        <Text1 label="CSS property" value={f.property} onChange={set('property')} placeholder="gap" />
      </>)}
      {err && <Text size="1" color="red">{err}</Text>}
      <Flex gap="2"><Button size="2" onClick={add}>Add token</Button><Button size="2" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></Flex>
    </Flex></Card>
  );
}

export default function BrandsPanel({ manifest, setManifest, brands, setBrands, blocks, setBlocks, current, setCurrent, compare, setCompare }) {
  const [copied, setCopied] = useState(false);
  const brand = brands[current];
  const other = manifest.brands.find((b) => b.id !== current)?.id;
  const json = useMemo(() => `${JSON.stringify(brand, null, 2)}\n`, [brand]);
  const edit = (group, key) => (value) => {
    setBrands((all) => ({ ...all, [current]: { ...all[current], [group]: { ...all[current][group], [key]: value } } }));
  };
  const editToken = (name) => (value) => {
    setBrands((all) => {
      const tokens = { ...(all[current].tokens || {}) };
      if (value === '') delete tokens[name]; else tokens[name] = value;
      return { ...all, [current]: { ...all[current], tokens } };
    });
  };
  const copy = async () => { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const tokenEntries = Object.entries(manifest.tokens || {});
  const previewBrand = (b) => ({ ...b, tokens: undefined });

  return (
    <Flex direction={{ initial: 'column', md: 'row' }} align="stretch">
      <Box p="4" width={{ initial: '100%', md: '360px' }} flexShrink="0" className="brands-sidebar" style={{ borderRight: '1px solid var(--gray-5)', borderBottom: '1px solid var(--gray-5)', boxSizing: 'border-box', minWidth: 0 }}>
        <Flex direction="column" gap="3">
          <Text size="2" color="gray">Edit a brand and preview it with real Radix Themes components. Save a draft from the bar at the bottom, preview it, then publish.</Text>
          <Pick label="Brand" value={current} options={manifest.brands.map((b) => b.id)} onChange={setCurrent} />
          <Flex align="center" gap="2"><Switch checked={compare} onCheckedChange={setCompare} /><Text size="2">Compare with {other}</Text></Flex>
          <Separator size="4" />
          <Text size="2" weight="bold">Theme (Radix Themes props)</Text>
          <Pick label="accentColor" value={brand.theme.accentColor} options={ACCENTS} onChange={edit('theme', 'accentColor')} />
          <Pick label="grayColor" value={brand.theme.grayColor} options={GRAYS} onChange={edit('theme', 'grayColor')} />
          <Pick label="radius" value={brand.theme.radius} options={RADII} onChange={edit('theme', 'radius')} />
          <Pick label="scaling" value={brand.theme.scaling} options={SCALINGS} onChange={edit('theme', 'scaling')} />
          <Pick label="appearance" value={brand.theme.appearance} options={['light', 'dark']} onChange={edit('theme', 'appearance')} />
          <Separator size="4" />
          <Text size="2" weight="bold">Typography</Text>
          <Text1 label="headingFont" value={brand.typography.headingFont} onChange={edit('typography', 'headingFont')} />
          <Text1 label="bodyFont" value={brand.typography.bodyFont} onChange={edit('typography', 'bodyFont')} />
          <Text1 label="headingWeight" value={brand.typography.headingWeight} onChange={edit('typography', 'headingWeight')} />
          <Text1 label="headingTracking" value={brand.typography.headingTracking} onChange={edit('typography', 'headingTracking')} />
          <Pick label="headingTransform" value={brand.typography.headingTransform} options={['none', 'uppercase', 'capitalize']} onChange={edit('typography', 'headingTransform')} />
          <Separator size="4" />
          <Text size="2" weight="bold">Layout</Text>
          <Pick label="sectionSpace (Radix space step)" value={brand.layout.sectionSpace} options={STEPS} onChange={edit('layout', 'sectionSpace')} />
          <Pick label="containerSize (Radix container)" value={brand.layout.containerSize} options={CONTAINERS} onChange={edit('layout', 'containerSize')} />
          <Separator size="4" />
          <Text size="2" weight="bold">Custom tokens</Text>
          <Text size="1" color="gray">Brand-specific values for tokens that blocks use. Leave empty to use the default.</Text>
          {tokenEntries.map(([name, def]) => {
            const users = Object.values(blocks).filter((b) => varsIn(b.css).includes(name)).map((b) => b.name);
            return (
              <Flex key={name} direction="column" gap="1">
                <Text1 label={`${name}${def.description ? `: ${def.description}` : ''}`} value={brand.tokens?.[name] ?? ''} placeholder={`default ${def.default}`} onChange={editToken(name)} />
                <Flex gap="1" wrap="wrap">{users.length ? users.map((u) => <Badge key={u} size="1" color="gray">{u}</Badge>) : <Text size="1" color="gray">not used by a block yet</Text>}</Flex>
              </Flex>
            );
          })}
          <NewToken manifest={manifest} setManifest={setManifest} blocks={blocks} setBlocks={setBlocks} />
        </Flex>
      </Box>

      <Box p="4" style={{ flex: 1, minWidth: 0, paddingBottom: 160 }}>
        <Flex direction="column" gap="4">
          <Grid columns={compare && other ? { initial: '1', lg: '2' } : '1'} gap="4">
            <Preview brand={previewBrand(brand)} />
            {compare && other && <Preview brand={previewBrand(brands[other])} />}
          </Grid>
          <Card size="2">
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center" wrap="wrap" gap="2">
                <Heading size="3">Brand file <Code>brands/{current}.json</Code></Heading>
                <Button onClick={copy} variant="soft">{copied ? 'Copied' : 'Copy JSON'}</Button>
              </Flex>
              <Callout.Root size="1" color="gray">
                <Callout.Text>Use <b>Save draft</b> in the bar below. Copy JSON is for editing the file by hand.</Callout.Text>
              </Callout.Root>
              <pre style={{ margin: 0, overflow: 'auto', fontSize: 12 }}><code>{json}</code></pre>
            </Flex>
          </Card>
        </Flex>
      </Box>
    </Flex>
  );
}
