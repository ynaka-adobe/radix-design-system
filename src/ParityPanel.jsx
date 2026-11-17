import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, Text, Badge, Card, Code } from '@radix-ui/themes';
import { previewDoc, fieldOf } from './ds.js';

const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const text = async (u) => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? r.text() : ''; } catch (e) { return ''; } };

// https://<ref>--<repo>--<owner>.aem.page/ maps to the site repo on GitHub, which serves CORS-enabled raw files.
export function siteRaw(site) {
  const m = /^https?:\/\/([^.]+)\.aem\.(?:page|live)/.exec(site || '');
  const [ref, repo, owner] = (m?.[1] || '').split('--');
  return owner && repo ? `https://raw.githubusercontent.com/${owner}/${repo}/${ref || 'main'}/` : '';
}

const frame = { width: '100%', height: 300, border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-3)', background: '#fff' };

function Cell({ brand, manifest, name, css, js, sample, status }) {
  const doc = useMemo(() => previewDoc({ brand, manifest, name, css, js, sample }), [brand, manifest, name, css, js, sample]);
  return (
    <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
      <iframe title={`${name} ${brand.name}`} sandbox="allow-scripts" srcDoc={doc} style={frame} />
      {status}
    </Flex>
  );
}

export default function ParityPanel({ manifest, brands, blocks, site, hub = './' }) {
  const [siteCode, setSiteCode] = useState({});
  const [lock, setLock] = useState(null);
  const [registry, setRegistry] = useState({});
  const raw = siteRaw(site);
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

  if (!raw) return <Box p="4"><Text color="red">Set a Site URL like https://main--repo--owner.aem.page/ in Brands and tokens to compare against the real site.</Text></Box>;

  const cols = `repeat(${list.length + 1}, minmax(220px, 1fr))`;
  return (
    <Box p="4" style={{ overflowX: 'auto', paddingBottom: 160 }}>
      <Flex direction="column" gap="3" style={{ minWidth: 220 * (list.length + 1) }}>
        <Text size="2" color="gray">
          Design system v{manifest.version}, Radix Themes {manifest.radixThemes}. {loaded ? `Site blocks in sync: ${synced}/${names.length}. ` : 'Loading site code… '}
          Coverage: {score.join(' · ')}. Block code is read from <Code size="1">{raw}</Code>; columns come from the brand list.
        </Text>
        <Box style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>
          <Text weight="bold">Design system</Text>
          {list.map((b, i) => <Text key={b.id} weight="bold">{i === 0 ? `${b.name} (main brand, EDS blocks)` : `${b.name} (EDS blocks)`}</Text>)}
        </Box>
        {names.map((n) => {
          const bl = blocks[n]; const reg = registry[n]; const sc = siteCode[n];
          const inSync = lock?.blocks?.[n]?.hash === reg?.hash;
          return (
            <Card key={n}><Flex direction="column" gap="2">
              <Flex gap="2" align="center"><Text weight="bold">{n}</Text><Badge color={bl.tier === 'core' ? 'indigo' : 'gray'}>{bl.tier}</Badge>
                {loaded && sc?.css && <Badge color={inSync ? 'green' : 'amber'}>{inSync ? 'site in sync' : 'site differs from design system'}</Badge>}
              </Flex>
              <Box style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>
                <Cell brand={list[0]} manifest={manifest} name={n} css={bl.css} js={bl.js} sample={bl.sample}
                  status={<Text size="1" color="gray">Design system · react app</Text>} />
                {list.map((b) => {
                  if (!loaded) return <Text key={b.id} size="1" color="gray">Loading…</Text>;
                  if (!sc?.css?.trim()) return <Text key={b.id} size="1" color="gray">– not synced to the site yet, nothing to check</Text>;
                  const c = check(n, b); const bad = c.missing.length || c.hardcoded;
                  const note = [c.missing.length && `missing: ${c.missing.join(', ')}`, c.hardcoded && `${c.hardcoded} hardcoded value(s)`].filter(Boolean).join(' · ');
                  return (
                    <Cell key={b.id} brand={b} manifest={manifest} name={n} css={sc.css} js={sc.js} sample={bl.sample}
                      status={<Text size="1" color={bad ? 'red' : 'green'}>{bad ? '✗ ' : '✓ '}{note || 'full parity'}</Text>} />
                  );
                })}
              </Box>
            </Flex></Card>
          );
        })}
      </Flex>
    </Box>
  );
}
