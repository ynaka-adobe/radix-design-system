import { useState } from 'react';
import { Flex, Text, Button, Badge, Card, TextField, Link, Callout } from '@radix-ui/themes';
import { createBranch, getToken, setToken, REPO } from './github.js';

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

export default function ApplyBar({ files, impact }) {
  const paths = Object.keys(files);
  const [token, setTok] = useState(getToken());
  const [branch, setBranch] = useState(`design/${stamp()}`);
  const [state, setState] = useState({ status: 'idle' });

  const apply = async () => {
    setState({ status: 'working' });
    try {
      setToken(token);
      const lines = [
        'Design system update', '',
        ...paths.map((p) => `- ${p}`), '',
        impact.length ? `Impacted blocks: ${impact.map((i) => `${i.block} (${i.why.join('; ')})`).join(', ')}` : 'No blocks impacted.',
      ];
      const r = await createBranch({ token, branch, message: lines.join('\n'), files });
      setState({ status: 'done', ...r });
    } catch (e) {
      setState({ status: 'error', message: e.message });
    }
  };

  return (
    <Card size="2" style={{ position: 'sticky', bottom: 0, zIndex: 5, borderRadius: 0 }}>
      <Flex direction="column" gap="2">
        <Flex gap="3" align="center" wrap="wrap">
          <Text size="2" weight="bold">{paths.length ? `${paths.length} file${paths.length > 1 ? 's' : ''} changed` : 'No changes yet'}</Text>
          {impact.map((i) => <Badge key={i.block} color="amber" title={i.why.join('; ')}>{i.block} impacted</Badge>)}
          <Flex gap="2" align="center" style={{ marginLeft: 'auto' }} wrap="wrap">
            <TextField.Root size="2" value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch name" style={{ width: 200 }} />
            <TextField.Root size="2" type="password" placeholder={`GitHub token for ${REPO}`} value={token} onChange={(e) => setTok(e.target.value)} aria-label="GitHub token" style={{ width: 220 }} autoComplete="off" />
            <Button disabled={!paths.length || !token || state.status === 'working'} onClick={apply}>{state.status === 'working' ? 'Creating branch…' : 'Apply: create branch'}</Button>
          </Flex>
        </Flex>
        {paths.length > 0 && <Text size="1" color="gray">{paths.join(' · ')}</Text>}
        {state.status === 'done' && (
          <Callout.Root size="1" color="green"><Callout.Text>
            Branch <b>{state.branch}</b> created. <Link href={state.compareUrl} target="_blank" rel="noreferrer">Open a pull request</Link>. Authors can preview it from the Experience Workspace app under Design system source.
          </Callout.Text></Callout.Root>
        )}
        {state.status === 'error' && <Callout.Root size="1" color="red"><Callout.Text>Could not create the branch: {state.message}</Callout.Text></Callout.Root>}
        <Text size="1" color="gray">The token needs Contents: read and write on this repo. It stays in this tab and is never saved.</Text>
      </Flex>
    </Card>
  );
}
