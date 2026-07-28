const BASE = import.meta.env.VITE_API_URL || ""

function errorMessage(status: number, statusText: string, body: string): string {
  try {
    const parsed = JSON.parse(body)
    if (parsed.detail) return `${status}: ${parsed.detail}`
  } catch {}
  return `${status} ${statusText}`
}

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  return res.json()
}

async function post(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { method: "POST" })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  return res.json()
}

async function getRaw(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  return res.arrayBuffer()
}

async function getRawWithInfo(path: string): Promise<{ buf: ArrayBuffer; contentType: string }> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  const contentType = res.headers.get("content-type") || ""
  const buf = await res.arrayBuffer()
  return { buf, contentType }
}

async function multipartPost(path: string, file: File): Promise<any> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  return res.json()
}

async function jsonPost(path: string, data: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(errorMessage(res.status, res.statusText, body))
  }
  return res.json()
}

export const api = {
  version: () => get("/api/v0/version"),

  id: () => get("/api/v0/id"),

  addFile: (file: File) => multipartPost("/api/v0/add", file),

  cat: (cid: string) => getRaw(`/api/v0/cat?arg=${encodeURIComponent(cid)}`),

  blockStat: (cid: string) => post(`/api/v0/block/stat?arg=${encodeURIComponent(cid)}`),

  blockGet: (cid: string) => getRaw(`/api/v0/block/get?arg=${encodeURIComponent(cid)}`),

  blockPut: (file: File) => multipartPost("/api/v0/block/put", file),

  blockRm: (cid: string) => post(`/api/v0/block/rm?arg=${encodeURIComponent(cid)}`),

  dagPut: (data: object, codec = "dag-cbor") =>
    jsonPost(`/api/v0/dag/put?store-codec=${encodeURIComponent(codec)}`, data),

  dagGet: (cid: string) =>
    getRawWithInfo(`/api/v0/dag/get?arg=${encodeURIComponent(cid)}`),

  pinAdd: (cid: string, recursive = true) =>
    post(`/api/v0/pin/add?arg=${encodeURIComponent(cid)}&recursive=${recursive}`),

  pinRm: (cid: string) => post(`/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`),

  pinLs: (type = "all") => get(`/api/v0/pin/ls?type=${encodeURIComponent(type)}`),

  swarmPeers: () => get("/api/v0/swarm/peers"),

  swarmConnect: (addr: string) => post(`/api/v0/swarm/connect?arg=${encodeURIComponent(addr)}`),

  swarmDisconnect: (id: string) => post(`/api/v0/swarm/disconnect?arg=${encodeURIComponent(id)}`),

  connectionStats: () => get("/api/v0/swarm/connection_stats"),

  repoStat: () => get("/api/v0/repo/stat"),

  repoVersion: () => get("/api/v0/repo/version"),

  refsLocal: () => post("/api/v0/refs/local"),

  repoGc: () => post("/api/v0/repo/gc"),

  namePublish: (path: string, lifetime = "24h") =>
    post(`/api/v0/name/publish?arg=${encodeURIComponent(path)}&lifetime=${encodeURIComponent(lifetime)}`),

  nameResolve: (name: string) => get(`/api/v0/name/resolve?arg=${encodeURIComponent(name)}`),

  debugPeerstore: () => get("/api/v0/debug/peerstore"),

  debugRoutingTable: () => get("/api/v0/debug/routing_table"),
}
