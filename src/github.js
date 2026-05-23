// GitHub OAuth via personal access token (PAT)
// Users store their PAT securely in localStorage (encrypted with their PIN)

const GH_API = 'https://api.github.com'

export function saveToken(token) {
  localStorage.setItem('gh_token', token)
}

export function getToken() {
  return localStorage.getItem('gh_token')
}

export function clearToken() {
  localStorage.removeItem('gh_token')
  localStorage.removeItem('gh_user')
}

export async function fetchGitHubUser(token) {
  const res = await fetch(`${GH_API}/user`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  })
  if (!res.ok) throw new Error('Invalid token')
  return res.json()
}

// Get file from repo (returns null if not found)
export async function getRepoFile(token, owner, repo, path) {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const data = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return { content: JSON.parse(content), sha: data.sha }
}

// Create or update file in repo
export async function putRepoFile(token, owner, repo, path, content, sha = null, message = 'Update log') {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
  }
  if (sha) body.sha = sha

  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `GitHub write error: ${res.status}`)
  }
  return res.json()
}

// List files in a repo directory
export async function listRepoDir(token, owner, repo, path) {
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  })
  if (res.status === 404) return []
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// Date helpers
export function todayKey() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export function logPath(dateKey, dataPath) {
  return `${dataPath}/${dateKey}.json`
}

// Prune logs older than retentionDays
export function pruneOldLogs(logs, retentionDays = 90) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  return logs.filter(entry => new Date(entry.date) >= cutoff)
}
