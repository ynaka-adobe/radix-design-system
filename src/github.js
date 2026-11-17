// Creates a git branch with a commit, from the browser, through the GitHub API.
// The token is the user's own (fine-grained, Contents: read and write on this repo). Kept in this tab only.
export const REPO = 'ynaka-adobe/radix-design-system';

export const getToken = () => { try { return sessionStorage.getItem('ds-github-token') || ''; } catch (e) { return ''; } };
export const setToken = (t) => { try { sessionStorage.setItem('ds-github-token', t); } catch (e) { /* storage unavailable */ } };

async function api(token, path, options = {}, repo = REPO) {
  const r = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...options,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  });
  const body = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${body.message || r.statusText}`);
  return body;
}

/** Branch names that already exist for drafts (public, no token needed). */
export async function listDrafts() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/branches?per_page=100`, { cache: 'no-store' });
    return r.ok ? (await r.json()).map((b) => b.name).filter((n) => n !== 'main') : [];
  } catch (e) { return []; }
}

/**
 * Save files to a draft branch. If the branch exists, add a commit on top of it; otherwise create it from main.
 * files: { 'path/in/repo': 'text content' }. Returns { branch, compareUrl, updated }.
 */
export async function saveDraft({
  token, branch, message, files, base = 'main', repo = REPO,
}) {
  if (!/^[\w.-]+$/.test(branch)) throw new Error('Branch names use letters, numbers, dots, dashes and underscores only. No slashes, so the branch can be a preview host name.');
  let parent; let updated = false;
  try { parent = (await api(token, `git/ref/heads/${branch}`, {}, repo)).object.sha; updated = true; } catch (e) {
    if (!String(e.message).startsWith('404')) throw e;
    parent = (await api(token, `git/ref/heads/${base}`, {}, repo)).object.sha;
  }
  const baseCommit = await api(token, `git/commits/${parent}`, {}, repo);
  const tree = await api(token, 'git/trees', {
    method: 'POST',
    body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: Object.entries(files).map(([path, content]) => ({ path, mode: '100644', type: 'blob', content })) }),
  }, repo);
  const commit = await api(token, 'git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) }, repo);
  if (updated) await api(token, `git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) }, repo);
  else await api(token, 'git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }) }, repo);
  return { branch, updated, sha: commit.sha, compareUrl: `https://github.com/${repo}/compare/${base}...${branch}?expand=1` };
}

const owner = REPO.split('/')[0];

/** Open a pull request for the draft, or return the one that is already open. */
export async function ensurePullRequest({ token, branch, title, body, base = 'main' }) {
  const open = await api(token, `pulls?head=${owner}:${encodeURIComponent(branch)}&state=open`);
  if (open.length) return { number: open[0].number, url: open[0].html_url };
  const pr = await api(token, 'pulls', { method: 'POST', body: JSON.stringify({ title, body, head: branch, base }) });
  return { number: pr.number, url: pr.html_url };
}

/** A commit is addressable by its hash as soon as it exists. Wait until the raw files can be read. */
export async function waitForCommit(sha, tries = 20) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/public/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) return;
    } catch (e) { /* retry */ }
    await new Promise((res) => { setTimeout(res, 1500); });
  }
  throw new Error('The preview is not ready yet. Try Generate preview again in a moment.');
}

export async function mergePullRequest({ token, number, branch }) {
  await api(token, `pulls/${number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'squash' }) });
  try { await api(token, `git/refs/heads/${branch}`, { method: 'DELETE' }); } catch (e) { /* the branch can stay */ }
}

/** The Edge Delivery site that consumes this design system. */
export const SITE_REPO = 'ynaka-adobe/ew-radix-brands';
const HUB_URL = 'https://ynaka-adobe.github.io/radix-design-system/';

/** Wait until the published design system is newer than the moment of publishing. */
export async function waitForHubDeploy(since, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(`${HUB_URL}registry.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok && Date.parse((await r.json()).generatedAt) > since) return;
    } catch (e) { /* retry */ }
    await new Promise((res) => { setTimeout(res, 4000); });
  }
  throw new Error('The design system has not finished publishing yet.');
}

/** Start the site workflow that brings changed blocks into the site as a pull request. */
export async function startSiteSync(token) {
  await api(token, 'actions/workflows/ds-sync.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) }, SITE_REPO);
}

/** Wait for the site's sync pull request to be created or updated after `since`. */
export async function waitForSitePullRequest(token, since, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    const prs = await api(token, `pulls?head=${owner}:design-system-sync&state=open`, {}, SITE_REPO);
    const pr = prs.find((x) => Date.parse(x.updated_at) > since);
    if (pr) return { number: pr.number, url: pr.html_url };
    await new Promise((res) => { setTimeout(res, 4000); });
  }
  throw new Error('The site pull request has not appeared yet.');
}

export async function mergeSitePullRequest(token, number) {
  await api(token, `pulls/${number}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'squash' }) }, SITE_REPO);
  try { await api(token, 'git/refs/heads/design-system-sync', { method: 'DELETE' }, SITE_REPO); } catch (e) { /* the branch can stay */ }
}

/** Edge Delivery serves every branch of the site at its own host: https://<branch>--<site>--<org>.aem.page/ */
export const siteHost = (branch) => `https://${branch}--${SITE_REPO.split('/')[1]}--${owner}.aem.page/`;

/** Make sure the site has a branch with this name (from main), so Edge Delivery serves it at its own host. */
export async function ensureSiteBranch(token, branch) {
  if (!/^[\w.-]+$/.test(branch)) throw new Error('Branch names use letters, numbers, dots, dashes and underscores only.');
  try { await api(token, `git/ref/heads/${branch}`, {}, SITE_REPO); return; } catch (e) {
    if (!String(e.message).startsWith('404')) throw e;
  }
  const main = (await api(token, 'git/ref/heads/main', {}, SITE_REPO)).object.sha;
  await api(token, 'git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: main }) }, SITE_REPO);
}

/** Wait until Code Sync serves the branch. A stylesheet load works across origins, unlike fetch. */
export async function waitForSiteBranch(branch, file = 'styles/styles.css', tries = 40) {
  const probe = () => new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.onload = () => { link.remove(); resolve(true); };
    link.onerror = () => { link.remove(); resolve(false); };
    link.media = 'print';
    link.href = `${siteHost(branch)}${file}?t=${Date.now()}`;
    document.head.append(link);
  });
  for (let i = 0; i < tries; i += 1) {
    if (await probe()) return;
    await new Promise((res) => { setTimeout(res, 3000); });
  }
  throw new Error('The site branch preview is not ready yet.');
}

export async function deleteSiteBranch(token, branch) {
  try { await api(token, `git/refs/heads/${branch}`, { method: 'DELETE' }, SITE_REPO); } catch (e) { /* already gone */ }
}
