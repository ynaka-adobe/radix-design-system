// Creates a git branch with a commit, from the browser, through the GitHub API.
// The token is the user's own (fine-grained, Contents: read and write on this repo). Kept in this tab only.
export const REPO = 'ynaka-adobe/radix-design-system';

export const getToken = () => { try { return sessionStorage.getItem('ds-github-token') || ''; } catch (e) { return ''; } };
export const setToken = (t) => { try { sessionStorage.setItem('ds-github-token', t); } catch (e) { /* storage unavailable */ } };

async function api(token, path, options = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...options,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${body.message || r.statusText}`);
  return body;
}

/** files: { 'path/in/repo': 'text content' }. Returns { branch, compareUrl }. */
export async function createBranch({ token, branch, message, files, base = 'main' }) {
  if (!/^[\w./-]+$/.test(branch) || branch.includes('..')) throw new Error('Branch names use letters, numbers, / . _ - only.');
  const ref = await api(token, `git/ref/heads/${base}`);
  const baseCommit = await api(token, `git/commits/${ref.object.sha}`);
  const tree = await api(token, 'git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) }),
  });
  const commit = await api(token, 'git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }) });
  await api(token, 'git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) });
  return { branch, compareUrl: `https://github.com/${REPO}/compare/${base}...${branch}?expand=1` };
}
