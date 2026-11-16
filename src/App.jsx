import { useEffect, useMemo, useState } from 'react';
import {
  Theme, Flex, Box, Grid, Heading, Text, Button, Card, Container, Select,
  TextField, Separator, Badge, Code, Callout, Switch, IconButton,
} from '@radix-ui/themes';

const ACCENTS = ['gold', 'bronze', 'brown', 'red', 'crimson', 'ruby', 'tomato', 'orange', 'amber', 'yellow', 'lime', 'grass', 'green', 'jade', 'mint', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'iris', 'violet', 'purple', 'plum', 'pink'];
const GRAYS = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand'];
const RADII = ['none', 'small', 'medium', 'large', 'full'];
const SCALINGS = ['90%', '95%', '100%', '105%', '110%'];
const STEPS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const CONTAINERS = ['1', '2', '3', '4'];

function Field({ label, children }) {
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">{label}</Text>
      {children}
    </Flex>
  );
}

function Pick({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <Select.Root value={value} onValueChange={onChange} size="2">
        <Select.Trigger />
        <Select.Content>
          {options.map((o) => <Select.Item key={o} value={o}>{o}</Select.Item>)}
        </Select.Content>
      </Select.Root>
    </Field>
  );
}

function Text1({ label, value, onChange }) {
  return (
    <Field label={label}>
      <TextField.Root value={value} onChange={(e) => onChange(e.target.value)} size="2" />
    </Field>
  );
}

/** The brand rendered with real Radix Themes components. Mirrors the Edge Delivery blocks. */
function Preview({ brand }) {
  const { theme, typography: t, layout } = brand;
  const heading = { fontFamily: t.headingFont, fontWeight: t.headingWeight, letterSpacing: t.headingTracking, textTransform: t.headingTransform };
  const vars = { '--default-font-family': t.bodyFont };
  return (
    <Theme {...theme} hasBackground style={{ minHeight: 'auto', ...vars, borderRadius: 'var(--radius-4)' }}>
      <Box style={{ background: 'var(--gray-3)' }} py={layout.sectionSpace}>
        <Container size={layout.containerSize}>
          <Flex direction="column" align="center" gap="4" style={{ textAlign: 'center' }}>
            <Heading size="8" style={heading}>Drive what moves you</Heading>
            <Text size="4" color="gray">One set of blocks. Every brand renders as itself.</Text>
            <Button size="3">Explore models</Button>
          </Flex>
        </Container>
      </Box>
      <Box py={layout.sectionSpace}>
        <Container size={layout.containerSize}>
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
        <Container size={layout.containerSize}>
          <Heading size="6" mb="2" style={heading}>Find your fit</Heading>
          <Text color="gray">Compare trims side by side and see what changes between brands.</Text>
        </Container>
      </Box>
      <Box py="6">
        <Container size={layout.containerSize}>
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

export default function App() {
  const [manifest, setManifest] = useState(null);
  const [brands, setBrands] = useState({});
  const [current, setCurrent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await (await fetch('./manifest.json')).json();
      const loaded = {};
      await Promise.all(m.brands.map(async (b) => { loaded[b.id] = await (await fetch(`./${b.file}`)).json(); }));
      setManifest(m); setBrands(loaded); setCurrent(m.brands[0].id);
    })();
  }, []);

  const brand = brands[current];
  const other = manifest?.brands.find((b) => b.id !== current)?.id;
  const json = useMemo(() => (brand ? `${JSON.stringify(brand, null, 2)}\n` : ''), [brand]);

  if (!brand) return <Theme><Box p="6"><Text>Loading design system…</Text></Box></Theme>;

  const edit = (group, key) => (value) => {
    setBrands((all) => ({ ...all, [current]: { ...all[current], [group]: { ...all[current][group], [key]: value } } }));
  };
  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Theme accentColor="indigo" grayColor="slate" radius="medium" hasBackground>
      <Flex direction={{ initial: 'column', md: 'row' }} align="stretch" style={{ minHeight: '100vh' }}>
        <Box p="4" width={{ initial: '100%', md: '360px' }} flexShrink="0" style={{ borderRight: '1px solid var(--gray-5)', borderBottom: '1px solid var(--gray-5)' }}>
          <Flex direction="column" gap="3">
            <Heading size="4">Radix Design System</Heading>
            <Text size="2" color="gray">Edit a brand, preview it with real Radix Themes components, then export the JSON. Edge Delivery sites read the published brands at runtime.</Text>
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
          </Flex>
        </Box>

        <Box p="4" style={{ flex: 1, minWidth: 0 }}>
          <Flex direction="column" gap="4">
            <Grid columns={compare && other ? { initial: '1', lg: '2' } : '1'} gap="4">
              <Preview brand={brand} />
              {compare && other && <Preview brand={brands[other]} />}
            </Grid>
            <Card size="2">
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center" wrap="wrap" gap="2">
                  <Heading size="3">Publish <Code>brands/{current}.json</Code></Heading>
                  <Button onClick={copy} variant="soft">{copied ? 'Copied' : 'Copy JSON'}</Button>
                </Flex>
                <Callout.Root size="1" color="gray">
                  <Callout.Text>Paste into <Code>public/brands/{current}.json</Code> and push to <Code>main</Code>. GitHub Pages republishes it, and every site that reads this design system picks it up.</Callout.Text>
                </Callout.Root>
                <pre style={{ margin: 0, overflow: 'auto', fontSize: 12 }}><code>{json}</code></pre>
              </Flex>
            </Card>
          </Flex>
        </Box>
      </Flex>
    </Theme>
  );
}
