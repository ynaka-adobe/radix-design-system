import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Flex, Box, Grid, Heading, Text, Button, Card,
  Separator, Badge, Code, Callout, Switch,
} from '@radix-ui/themes';
import { Field, Pick, Text1 } from './ui.jsx';
import { varsIn, samplePageHtml, sampleDoc, loadSiteCode, pageExists } from './ds.js';
import { sitePreviewUrl } from './github.js';


function SampleFrame({ url, title, brand, doc }) {
  const ref = useRef(null);
  const post = () => {
    try { ref.current?.contentWindow?.postMessage({ type: 'ds-brand-preview', brand }, new URL(url).origin); } catch (e) { /* not ready */ }
  };
  useEffect(post, [brand, url]);
  const style = { width: '100%', height: 640, border: '1px solid var(--gray-5)', borderRadius: 'var(--radius-3)', background: 'white' };
  if (doc) return <iframe title={title} sandbox="allow-scripts" srcDoc={doc} style={style} />;
  return <iframe ref={ref} onLoad={post} key={url} src={url} title={title} style={style} />;
}

const ACCENTS = ['gold', 'bronze', 'brown', 'red', 'crimson', 'ruby', 'tomato', 'orange', 'amber', 'yellow', 'lime', 'grass', 'green', 'jade', 'mint', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'iris', 'violet', 'purple', 'plum', 'pink'];
const GRAYS = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand'];
const RADII = ['none', 'small', 'medium', 'large', 'full'];
const SCALINGS = ['90%', '95%', '100%', '105%', '110%'];
const STEPS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const CONTAINERS = ['1', '2', '3', '4'];

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

export default function BrandsPanel({ manifest, setManifest, brands, setBrands, blocks, setBlocks, current, setCurrent, compare, setCompare, draft, site, setSite }) {
  const [path, setPath] = useState('/ds-sample');
  const [exists, setExists] = useState(null);
  const [siteCode, setSiteCode] = useState({});
  const [sampleCopied, setSampleCopied] = useState(false);
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
  const names = Object.keys(blocks);
  const samplePath = path.replace(/^\/?/, '/').replace(/\/$/, '') || '/';

  useEffect(() => {
    let live = true;
    setExists(null);
    pageExists(`${site.replace(/\/?$/, '/')}${samplePath.slice(1)}.plain.html`).then((v) => { if (live) setExists(v); });
    return () => { live = false; };
  }, [site, samplePath]);
  useEffect(() => {
    let live = true;
    if (exists === false) loadSiteCode(site, names).then((c) => { if (live) setSiteCode(c); });
    return () => { live = false; };
  }, [exists, site, names.join()]);

  const fallbackDoc = (b) => {
    const items = Object.values(blocks).filter((x) => x.sample).map((x) => ({ name: x.name, sample: x.sample, css: siteCode[x.name]?.css ?? x.css, js: siteCode[x.name]?.js ?? x.js }));
    const order = (samplePageHtml(blocks, manifest).match(/class="([\w-]+)"/g) || []).map((c) => c.slice(7, -1));
    items.sort((a, c) => order.indexOf(a.name) - order.indexOf(c.name));
    return sampleDoc({ brand: b, manifest, items });
  };
  const copySample = async () => { await navigator.clipboard.writeText(samplePageHtml(blocks, manifest)); setSampleCopied(true); setTimeout(() => setSampleCopied(false), 1500); };
  const frame = (id) => (exists === null
    ? <Text size="2" color="gray">Checking the site page…</Text>
    : <SampleFrame brand={brands[id]} title={`${id} sample page`} url={sitePreviewUrl(site, samplePath, id, draft?.sha)} doc={exists ? undefined : fallbackDoc(brands[id])} />);

  return (
    <Flex direction={{ initial: 'column', md: 'row' }} align="stretch">
      <Box p="4" width={{ initial: '100%', md: '360px' }} flexShrink="0" className="brands-sidebar" style={{ borderRight: '1px solid var(--gray-5)', borderBottom: '1px solid var(--gray-5)', boxSizing: 'border-box', minWidth: 0 }}>
        <Flex direction="column" gap="3">
          <Text size="2" color="gray">Edit a brand and preview it on the sample page. Save a draft from the bar at the bottom, preview it, then publish.</Text>
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
          <Card size="2">
            <Flex direction="column" gap="2">
              <Flex gap="3" wrap="wrap" align="end">
                <Box style={{ flex: 2, minWidth: 220 }}><Text1 label="Site URL" value={site} onChange={setSite} /></Box>
                <Box style={{ flex: 1, minWidth: 120 }}><Text1 label="Sample page path" value={path} onChange={setPath} placeholder="/ds-sample" /></Box>
                <Button size="2" variant="soft" onClick={copySample}>{sampleCopied ? 'Copied' : 'Copy sample page HTML'}</Button>
              </Flex>
              <Text size="1" color="gray">
                {exists === false
                  ? `No page at ${samplePath} on the site yet, so the built-in sample page is shown (it uses the site's block code and updates as you edit). Copy the sample page HTML and paste it into DA at ${samplePath}.`
                  : `Sample page ${samplePath} on the site. Shows saved drafts; press Save draft to refresh${draft?.dirty ? ' (you have unsaved changes)' : ''}.`}
              </Text>
            </Flex>
          </Card>
          <Grid columns={compare && other ? { initial: '1', lg: '2' } : '1'} gap="4">
            {frame(current)}
            {compare && other && frame(other)}
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
