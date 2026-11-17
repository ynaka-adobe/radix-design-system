import { useEffect, useState } from 'react';
import { Box, Flex, Text, Badge, Table, Code } from '@radix-ui/themes';
import { fieldOf } from './ds.js';

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const text = async (u) => { try { const r = await fetch(`${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' }); return r.ok ? r.text() : ''; } catch (e) { return ''; } };

// https://<ref>--<repo>--<owner>.aem.page/ maps to the site repo on GitHub, which serves CORS-enabled raw files.
export function siteRaw(site) {
  const m = /^https?:\/\/([^.]+)\.aem\.(?:page|live)/.exec(site || '');
  const [ref, repo, owner] = (m?.[1] || '').split('--');
  return owner && repo ? `https://raw.githubusercontent.com/${owner}/${repo}/${ref || 'main'}/` : '';
}

const SITE = 'https://main--ew-radix-brands--ynaka-adobe.aem.page/';

export default function ParityPanel({ manifest, brands, blocks, hub = './' }) {
  const [siteCode, setSiteCode] = useState({});
  const [lock, setLock] = useState(null);
  const [registry, setRegistry] = useState({});
  const raw = siteRaw(SITE);
  const names = Object.keys(blocks);

  useEffect(() => {
    let live = true;
    setSiteCode({}); setLock(null);
    if (!raw) return undefined;
    (async () => {
      const code = {};
      await Promise.all(names.map(async (n) => {
        const [css, js] = await Promise.all([text(`${raw}blocks/${n}/${n}.css`), text(`${raw}blocks/${n}/${n}.js`)]);
        code[n] = { css, js };
      }));
      const l = await text(`${raw}ds.lock.json`);
      if (live) { setSiteCode(code); setLock(l ? JSON.parse(l) : {}); }
    })();
    return () => { live = false; };
  }, [raw, names.join()]);

  useEffect(() => {
    text(`${hub}registry.json`).then((t) => setRegistry(Object.fromEntries((t ? JSON.parse(t) : { blocks: [] }).blocks.map((b) => [b.name, b]))));
  }, [hub]);

  const list = manifest.brands.map((b) => ({ ...brands[b.id], id: b.id, name: brands[b.id].name || b.name }));
  const loaded = lock !== null;

  // The original parity check: does each brand supply every field the block's CSS reads, with no hardcoded colours?
  const check = (n, b) => {
    const css = siteCode[n]?.css || '';
    if (!css.trim()) return { absent: true };
    const fields = [...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => fieldOf(m[1], manifest)).filter(Boolean))];
    const hardcoded = (css.replace(/var\([^)]*\)/g, '').match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi) || []).length;
    const missing = fields.filter((f) => !get(b, f) && !get({ tokens: manifest.tokens && Object.fromEntries(Object.entries(manifest.tokens).map(([k, v]) => [k, v.default])) }, f));
    return { fields, missing, hardcoded };
  };

  const used = names.flatMap((n) => check(n, list[0]).fields || []);
  const allFields = [...new Set(used)];
  const score = list.map((b) => {
    const ok = allFields.filter((f) => get(b, f) || (f.startsWith('tokens.') && manifest.tokens?.[f.slice(7)]));
    return `${b.name} ${allFields.length ? Math.round((100 * ok.length) / allFields.length) : 100}%`;
  });
  const synced = names.filter((n) => lock?.blocks?.[n]?.hash && lock.blocks[n].hash === registry[n]?.hash).length;

  return (
    <Box p="4" style={{ overflowX: 'auto', paddingBottom: 160 }}>
      <Flex direction="column" gap="3">
        <Text size="2" color="gray">
          Design system v{manifest.version}, Radix Themes {manifest.radixThemes}. {loaded ? `Site blocks in sync: ${synced}/${names.length}. ` : 'Loading site code… '}
          Coverage: {score.join(' · ')}. Block code is read from <Code size="1">{raw}</Code>.
        </Text>
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Block</Table.ColumnHeaderCell>
              {list.map((b) => <Table.ColumnHeaderCell key={b.id}>{b.name}</Table.ColumnHeaderCell>)}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {names.map((n) => {
              const bl = blocks[n]; const sc = siteCode[n];
              return (
                <Table.Row key={n}>
                  <Table.RowHeaderCell>
                    <Flex gap="2" align="center"><Text weight="bold">{n}</Text><Badge color={bl.tier === 'core' ? 'indigo' : 'gray'}>{bl.tier}</Badge></Flex>
                  </Table.RowHeaderCell>
                  {list.map((b) => {
                    if (!loaded) return <Table.Cell key={b.id}><Text size="1" color="gray">Loading…</Text></Table.Cell>;
                    if (!sc?.css?.trim()) return <Table.Cell key={b.id}><Text size="1" color="gray">– not on the site yet</Text></Table.Cell>;
                    const c = check(n, b); const bad = c.missing.length || c.hardcoded;
                    const note = [c.missing.length && `missing: ${c.missing.join(', ')}`, c.hardcoded && `${c.hardcoded} hardcoded value(s)`].filter(Boolean).join(' · ');
                    return <Table.Cell key={b.id}><Text size="2" color={bad ? 'red' : 'green'}>{bad ? '✗ ' : '✓ '}{note || 'full parity'}</Text></Table.Cell>;
                  })}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Box>
  );
}
