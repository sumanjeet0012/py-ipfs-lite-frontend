const BASE = import.meta.env.VITE_API_URL || ""

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`)
  return res.json()
}

async function post(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, { method: "POST" })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`)
  return res.json()
}

async function getRaw(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`)
  return res.arrayBuffer()
}

async function multipartPost(path: string, file: File): Promise<any> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`)
  return res.json()
}

async function jsonPost(path: string, data: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  version: () => get("/api/v0/version"),

  id: () => get("/api/v0/id"),

  addFile: (file: File) => multipartPost("/api/v0/add", file),

  cat: (cid: string) => getRaw(`/api/v0/cat?arg=${cid}`),

  blockStat: (cid: string) => post(`/api/v0/block/stat?arg=${cid}`),

  blockGet: (cid: string) => getRaw(`/api/v0/block/get?arg=${cid}`),

  blockPut: (file: File) => multipartPost("/api/v0/block/put", file),

  blockRm: (cid: string) => post(`/api/v0/block/rm?arg=${cid}`),

  dagPut: (data: object, codec = "dag-cbor") =>
    jsonPost(`/api/v0/dag/put?store-codec=${codec}`, data),

  dagGet: (cid: string) => get(`/api/v0/dag/get?arg=${cid}`),

  pinAdd: (cid: string, recursive = true) =>
    post(`/api/v0/pin/add?arg=${cid}&recursive=${recursive}`),

  pinRm: (cid: string) => post(`/api/v0/pin/rm?arg=${cid}`),

  pinLs: (type = "all") => get(`/api/v0/pin/ls?type=${type}`),

  swarmPeers: () => get("/api/v0/swarm/peers"),

  swarmConnect: (addr: string) => post(`/api/v0/swarm/connect?arg=${addr}`),

  swarmDisconnect: (id: string) => post(`/api/v0/swarm/disconnect?arg=${id}`),

  connectionStats: () => get("/api/v0/swarm/connection_stats"),

  repoStat: () => get("/api/v0/repo/stat"),

  repoVersion: () => get("/api/v0/repo/version"),

  refsLocal: () => post("/api/v0/refs/local"),

  repoGc: () => post("/api/v0/repo/gc"),

  namePublish: (path: string, lifetime = "24h") =>
    post(`/api/v0/name/publish?arg=${path}&lifetime=${lifetime}`),

  nameResolve: (name: string) => get(`/api/v0/name/resolve?arg=${name}`),

  debugPeerstore: () => get("/api/v0/debug/peerstore"),

  debugRoutingTable: () => get("/api/v0/debug/routing_table"),
}
