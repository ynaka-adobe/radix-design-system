import { useState } from 'react';
import {
  Flex, Text, Button, Badge, Card, TextField, Link, Callout,
} from '@radix-ui/themes';
import {
  saveDraft, ensurePullRequest, waitForCommit, mergePullRequest, getToken, setToken, REPO,
  waitForHubDeploy, startSiteSync, waitForSitePullRequest, mergeSitePullRequest, SITE_REPO,
  siteHost, waitForSiteBranch, deleteSiteBranch,
} from './github.js';

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

/**
 * Save draft, Generate preview, Publish. The draft branch and pull request are implementation details:
 * the branch name is generated once per session, so saving again simply updates the same draft.
 */
export default function ApplyBar({ files, impact, brandId }) {
  const paths = Object.keys(files);
  const key = JSON.stringify(files);
  const [token, setTok] = useState(getToken());
  const [branch] = useState(() => `design-update-${stamp()}`);
  const [s, setS] = useState({ stage: 'idle' });

  const dirty = s.savedKey !== key;
  const busy = ['saving', 'previewing', 'publishing', 'waiting', 'syncing', 'mergingSite'].includes(s.stage);
  const summary = impact.length ? `Impacted blocks: ${impact.map((i) => `${i.block} (${i.why.join('; ')})`).join(', ')}` : 'No blocks impacted.';
  const fail = (e) => setS((x) => ({ ...x, stage: x.fallback || 'idle', error: e.message }));

  const save = async () => {
    setS((x) => ({ ...x, stage: 'saving', error: '', fallback: x.stage === 'idle' ? 'idle' : 'saved' }));
    try {
      setToken(token);
      const message = ['Design system update', '', ...paths.map((p) => `- ${p}`), '', summary].join('\n');
      const r = await saveDraft({ token, branch, message, files });
      setS({ stage: 'saved', sha: r.sha, savedKey: key, fallback: 'saved' });
    } catch (e) { fail(e); }
  };

  const preview = async () => {
    setS((x) => ({ ...x, stage: 'previewing', error: '' }));
    try {
      const pr = await ensurePullRequest({
        token, branch, title: `Design update (${paths.length} file${paths.length > 1 ? 's' : ''})`, body: `${paths.map((p) => `- ${p}`).join('\n')}\n\n${summary}`,
      });
      await waitForCommit(s.sha);
      // Block code changed: put it on a branch of the site with the same name, so Edge Delivery serves
      // the real code at https://<branch>--<site>--<org>.aem.page/
      const siteFiles = Object.fromEntries(Object.entries(files)
        .filter(([p]) => /^eds\/blocks\/[^/]+\/[^/]+\.(css|js)$/.test(p))
        .map(([p, c]) => [p.replace(/^eds\//, ''), c]));
      let host = siteHost('main'); let note = '';
      if (Object.keys(siteFiles).length) {
        try {
          await saveDraft({ token, repo: SITE_REPO, branch, message: `Design update preview\n\n${paths.map((p) => `- ${p}`).join('\n')}`, files: siteFiles });
          await waitForSiteBranch(branch, Object.keys(siteFiles)[0]);
          host = siteHost(branch);
        } catch (e) { note = `Branch preview unavailable (${e.message}). Showing the main site with the draft design system.`; }
      }
      const ds = `https://raw.githubusercontent.com/${REPO}/${s.sha}/public/`;
      setS((x) => ({
        ...x, stage: 'ready', fallback: 'ready', pr: pr.number, prUrl: pr.url, note, siteBranch: host !== siteHost('main'), previewUrl: `${host}?ds=${encodeURIComponent(ds)}&brand=${brandId}`,
      }));
    } catch (e) { fail(e); }
  };

  const hasBlocks = paths.some((p) => p.startsWith('eds/blocks/'));

  const publish = async () => {
    setS((x) => ({ ...x, stage: 'publishing', error: '' }));
    const since = Date.now();
    try {
      await mergePullRequest({ token, number: s.pr, branch });
      if (s.siteBranch) await deleteSiteBranch(token, branch);
    } catch (e) { fail(e); return; }
    if (!hasBlocks) { setS((x) => ({ ...x, stage: 'published', fallback: 'published' })); return; }
    // Block code changed: deliver it to the site as a pull request.
    try {
      setS((x) => ({ ...x, stage: 'waiting', fallback: 'published' }));
      await waitForHubDeploy(since);
      setS((x) => ({ ...x, stage: 'syncing' }));
      await startSiteSync(token);
      const pr = await waitForSitePullRequest(token, since);
      setS((x) => ({ ...x, stage: 'sitePr', sitePr: pr }));
    } catch (e) { setS((x) => ({ ...x, stage: 'published', error: `Published, but the site sync did not start: ${e.message}` })); }
  };

  const mergeSite = async () => {
    setS((x) => ({ ...x, stage: 'mergingSite', error: '' }));
    try {
      await mergeSitePullRequest(token, s.sitePr.number);
      setS((x) => ({ ...x, stage: 'delivered' }));
    } catch (e) { setS((x) => ({ ...x, stage: 'sitePr', error: e.message })); }
  };

  const status = {
    idle: paths.length ? `${paths.length} file${paths.length > 1 ? 's' : ''} changed` : 'No changes yet',
    saving: 'Saving draft…',
    saved: dirty ? 'Changes since the last draft save' : 'Draft saved',
    previewing: 'Generating preview…',
    ready: dirty ? 'Changes since the last draft save' : 'Preview ready',
    publishing: 'Publishing…',
    published: 'Published',
    waiting: 'Published. Waiting for the design system to deploy…',
    syncing: 'Syncing the block to the site…',
    sitePr: 'Site pull request ready',
    mergingSite: 'Merging into the site…',
    delivered: 'Delivered to the site',
  }[s.stage];

  return (
    <Card size="2" style={{ position: 'sticky', bottom: 0, zIndex: 5, borderRadius: 0 }}>
      <Flex direction="column" gap="2">
        <Flex gap="3" align="center" wrap="wrap">
          <Text size="2" weight="bold">{status}</Text>
          {impact.map((i) => <Badge key={i.block} color="amber" title={i.why.join('; ')}>{i.block} impacted</Badge>)}
          <Flex gap="2" align="center" style={{ marginLeft: 'auto' }} wrap="wrap">
            <TextField.Root size="2" type="password" placeholder={`GitHub token for ${REPO}`} value={token} onChange={(e) => setTok(e.target.value)} aria-label="GitHub token" style={{ width: 220 }} autoComplete="off" />
            <Button variant={s.stage === 'idle' || dirty ? 'solid' : 'soft'} disabled={!paths.length || !token || busy || (!dirty && s.stage !== 'idle') || s.stage === 'published'} onClick={save}>Save draft</Button>
            <Button variant={s.stage === 'saved' && !dirty ? 'solid' : 'soft'} disabled={!['saved', 'ready'].includes(s.stage) || dirty || busy} onClick={preview}>Generate preview</Button>
            {s.stage === 'ready' && !dirty && <Button asChild variant="soft"><a href={s.previewUrl} target="_blank" rel="noreferrer">Open preview</a></Button>}
            <Button color="green" disabled={s.stage !== 'ready' || dirty || busy} onClick={publish}>Publish</Button>
            {s.stage === 'sitePr' && <Button color="green" onClick={mergeSite}>Merge into the site</Button>}
          </Flex>
        </Flex>
        {paths.length > 0 && <Text size="1" color="gray">{paths.join(' · ')}{s.sha ? ` · branch ${branch}` : ''}</Text>}
        {s.stage === 'saved' && !dirty && <Callout.Root size="1" color="green"><Callout.Text>Draft saved. It is not live. Generate a preview to see it on the site.</Callout.Text></Callout.Root>}
        {s.stage === 'ready' && !dirty && <Callout.Root size="1" color="green"><Callout.Text>Preview ready. <Link href={s.previewUrl} target="_blank" rel="noreferrer">Open the site with this change</Link>{s.siteBranch ? ` (branch ${branch})` : ''}, then Publish when you are happy with it. <Link href={s.prUrl} target="_blank" rel="noreferrer">Pull request</Link></Callout.Text></Callout.Root>}
        {s.stage === 'sitePr' && <Callout.Root size="1" color="green"><Callout.Text>The block is ready for the site. <Link href={s.sitePr.url} target="_blank" rel="noreferrer">Review the pull request</Link> in {SITE_REPO}, then merge it.</Callout.Text></Callout.Root>}
        {s.stage === 'delivered' && <Callout.Root size="1" color="green"><Callout.Text>Delivered. The block is now in the site's code. Reload this page to start a new change.</Callout.Text></Callout.Root>}
        {s.stage === 'published' && <Callout.Root size="1" color="green"><Callout.Text>Published. The live design system updates in about a minute. Reload this page to start a new change.</Callout.Text></Callout.Root>}
        {s.note && s.stage === 'ready' && <Text size="1" color="amber">{s.note}</Text>}
        {s.error && <Callout.Root size="1" color="red"><Callout.Text>{s.error}</Callout.Text></Callout.Root>}
        <Text size="1" color="gray">The token needs Contents and Pull requests: read and write on this repo. To deliver blocks to the site it also needs Contents, Actions and Pull requests: write on {SITE_REPO}. It stays in this tab and is never saved.</Text>
      </Flex>
    </Card>
  );
}
