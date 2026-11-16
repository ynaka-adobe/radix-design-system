import { useState } from 'react';
import {
  Flex, Text, Button, Badge, Card, TextField, Link, Callout,
} from '@radix-ui/themes';
import {
  saveDraft, ensurePullRequest, waitForCommit, mergePullRequest, getToken, setToken, REPO,
} from './github.js';

const SITE = 'https://main--ew-radix-brands--ynaka-adobe.aem.page/';
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

/**
 * Save draft, Generate preview, Publish. The draft branch and pull request are implementation details:
 * the branch name is generated once per session, so saving again simply updates the same draft.
 */
export default function ApplyBar({ files, impact, brandId }) {
  const paths = Object.keys(files);
  const key = JSON.stringify(files);
  const [token, setTok] = useState(getToken());
  const [branch] = useState(() => `design/update-${stamp()}`);
  const [s, setS] = useState({ stage: 'idle' });

  const dirty = s.savedKey !== key;
  const busy = ['saving', 'previewing', 'publishing'].includes(s.stage);
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
      const ds = `https://raw.githubusercontent.com/${REPO}/${s.sha}/public/`;
      setS((x) => ({
        ...x, stage: 'ready', fallback: 'ready', pr: pr.number, prUrl: pr.url, previewUrl: `${SITE}?ds=${encodeURIComponent(ds)}&brand=${brandId}`,
      }));
    } catch (e) { fail(e); }
  };

  const publish = async () => {
    setS((x) => ({ ...x, stage: 'publishing', error: '' }));
    try {
      await mergePullRequest({ token, number: s.pr, branch });
      setS((x) => ({ ...x, stage: 'published', fallback: 'published' }));
    } catch (e) { fail(e); }
  };

  const status = {
    idle: paths.length ? `${paths.length} file${paths.length > 1 ? 's' : ''} changed` : 'No changes yet',
    saving: 'Saving draft…',
    saved: dirty ? 'Changes since the last draft save' : 'Draft saved',
    previewing: 'Generating preview…',
    ready: dirty ? 'Changes since the last draft save' : 'Preview ready',
    publishing: 'Publishing…',
    published: 'Published',
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
          </Flex>
        </Flex>
        {paths.length > 0 && <Text size="1" color="gray">{paths.join(' · ')}</Text>}
        {s.stage === 'saved' && !dirty && <Callout.Root size="1" color="green"><Callout.Text>Draft saved. It is not live. Generate a preview to see it on the site.</Callout.Text></Callout.Root>}
        {s.stage === 'ready' && !dirty && <Callout.Root size="1" color="green"><Callout.Text>Preview ready. <Link href={s.previewUrl} target="_blank" rel="noreferrer">Open the site with this change</Link>, then Publish when you are happy with it. <Link href={s.prUrl} target="_blank" rel="noreferrer">Pull request</Link></Callout.Text></Callout.Root>}
        {s.stage === 'published' && <Callout.Root size="1" color="green"><Callout.Text>Published. The live design system updates in about a minute. Reload this page to start a new change.</Callout.Text></Callout.Root>}
        {s.error && <Callout.Root size="1" color="red"><Callout.Text>{s.error}</Callout.Text></Callout.Root>}
        <Text size="1" color="gray">The token needs Contents and Pull requests: read and write on this repo. It stays in this tab and is never saved.</Text>
      </Flex>
    </Card>
  );
}
