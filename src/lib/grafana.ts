import type { ParsedPrometheusMetrics } from "./prometheus";
import { formatBytes, formatDuration } from "./format";

export const GRAFANA_COLORS = [
  "#5794F2",
  "#73BF69",
  "#F2495C",
  "#FF9830",
  "#FADE2A",
  "#6ED0E0",
  "#B877D9",
  "#FF780A",
];

export const TRANSPORT_COLORS: Record<string, string> = {
  tcp: "#5794F2",
  quic: "#73BF69",
  websocket: "#B877D9",
};

export interface GrafanaSample {
  t: number;
  g: Record<string, number>;
  r: Record<string, number>;
}

export interface ChartPoint {
  t: number;
  [id: string]: number | null;
}

export interface SeriesDef {
  id: string;
  label: string;
  unit?: string;
  color: string;
}

export const RANGES = [
  { label: "Last 15 minutes", ms: 15 * 60_000 },
  { label: "Last 30 minutes", ms: 30 * 60_000 },
  { label: "Last 1 hour", ms: 60 * 60_000 },
  { label: "Last 3 hours", ms: 3 * 60 * 60_000 },
  { label: "Last 6 hours", ms: 6 * 60 * 60_000 },
  { label: "Last 12 hours", ms: 12 * 60 * 60_000 },
  { label: "Last 24 hours", ms: 24 * 60 * 60_000 },
];

export const REFRESH_OPTIONS = [
  { label: "Off", sec: 0 },
  { label: "5s", sec: 5 },
  { label: "10s", sec: 10 },
  { label: "30s", sec: 30 },
  { label: "1m", sec: 60 },
  { label: "5m", sec: 300 },
];

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

export function extractGauges(m: ParsedPrometheusMetrics): Record<string, number> {
  return {
    swarmPeers: m.swarmPeers,
    routingTable: m.libp2p.kad.routingTablePeers,
    cpu: m.cpuPercent,
    memRss: m.memoryRssBytes,
    openFds: m.openFds,
    uptime: m.uptimeSeconds,
    handshakeMs: m.libp2p.security.avgDurationMs,
    lookupMs: m.libp2p.kad.lookupDurationMs,
    pingMs: m.libp2p.ping.avgMs,
    streamsActive: m.streamsOutboundActive + m.streamsInboundActive,
    bitswapSessions: m.libp2p.bitswap.sessions,
    blockstoreBlocks: m.blockstoreBlocksTotal,
  };
}

export function extractCounters(m: ParsedPrometheusMetrics): Record<string, number> {
  const t = m.libp2p.transport;
  const out: Record<string, number> = {
    handshake_ok: m.libp2p.security.handshakes.success,
    handshake_fail: m.libp2p.security.handshakes.failure,
    streams_opened: m.libp2p.muxer.streamsOpen.outbound + m.libp2p.muxer.streamsOpen.inbound,
    streams_closed: m.libp2p.muxer.streamsClosed.outbound + m.libp2p.muxer.streamsClosed.inbound,
    conns_opened: sum(m.libp2p.connections.opened),
    conns_closed: sum(m.libp2p.connections.closed),
    identify_ok: m.libp2p.identity.identify.success,
    identify_push: m.libp2p.identity.push.success,
    kad_lookup: m.libp2p.kad.lookups.success + m.libp2p.kad.lookups.failure,
    kad_put: m.libp2p.kad.putValue.success + m.libp2p.kad.putValue.failure,
    kad_get: m.libp2p.kad.getValue.success + m.libp2p.kad.getValue.failure,
    kad_provide: m.libp2p.kad.provide.success + m.libp2p.kad.provide.failure,
    kad_findproviders: m.libp2p.kad.findProviders.success + m.libp2p.kad.findProviders.failure,
    blocks_sent: m.libp2p.bitswap.blocksSent,
    blocks_received: m.libp2p.bitswap.blocksReceived,
    bytes_sent: m.bitswapBytesSent,
    bytes_received: m.bitswapBytesReceived,
    msgs_sent: m.libp2p.bitswap.messagesSent,
    msgs_received: m.libp2p.bitswap.messagesReceived,
    wantlist_adds: m.libp2p.bitswap.wantlistAdds,
    gossip_pub: m.libp2p.gossipsub.published,
    gossip_recv: m.libp2p.gossipsub.received,
    ping_ok: m.libp2p.ping.count,
    discovery_peers: m.libp2p.discovery.peersDiscovered,
    bootstrap: m.libp2p.discovery.bootstrapConnects,
    relay_bytes: m.libp2p.relay.forwardedBytes,
    streams_resets: m.libp2p.kad.streamResets,
  };
  for (const [transport, d] of Object.entries(t.dials)) {
    out[`dial_ok_${transport}`] = d.success;
    out[`dial_fail_${transport}`] = d.failure;
  }
  for (const [transport, d] of Object.entries(t.inbound)) {
    out[`inbound_ok_${transport}`] = d.success;
    out[`inbound_fail_${transport}`] = d.failure;
  }
  return out;
}

export function computeRates(
  prev: Record<string, number>,
  curr: Record<string, number>,
  dtSec: number
): Record<string, number> {
  const out: Record<string, number> = {};
  const dt = Math.max(1, dtSec);
  for (const key of Object.keys(curr)) {
    const before = prev[key] ?? 0;
    const after = curr[key] ?? 0;
    out[key] = after >= before ? (after - before) / dt : 0;
  }
  return out;
}

export function toChartData(
  samples: GrafanaSample[],
  ids: string[],
  fromMs: number,
  maxPoints = 400
): ChartPoint[] {
  const filtered = samples.filter((s) => s.t >= fromMs);
  if (filtered.length <= maxPoints) {
    return filtered.map((s) => {
      const p: ChartPoint = { t: s.t };
      for (const id of ids) {
        const v = s.g[id] ?? s.r[id];
        p[id] = v ?? null;
      }
      return p;
    });
  }
  const bucketSize = Math.ceil(filtered.length / maxPoints);
  const out: ChartPoint[] = [];
  for (let i = 0; i < filtered.length; i += bucketSize) {
    const chunk = filtered.slice(i, i + bucketSize);
    const p: ChartPoint = { t: chunk[chunk.length - 1].t };
    for (const id of ids) {
      const vals = chunk
        .map((c) => c.g[id] ?? c.r[id])
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      p[id] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    out.push(p);
  }
  return out;
}

export function colorFor(id: string, index = 0): string {
  if (id.startsWith("dial_ok_") || id.startsWith("inbound_ok_")) {
    const t = id.replace(/^(dial_ok_|inbound_ok_)/, "");
    return TRANSPORT_COLORS[t] ?? GRAFANA_COLORS[index % GRAFANA_COLORS.length];
  }
  return GRAFANA_COLORS[index % GRAFANA_COLORS.length];
}

export function transportDefs(
  m: ParsedPrometheusMetrics | null,
  kind: "dial_ok" | "dial_fail" | "inbound_ok" | "inbound_fail"
): SeriesDef[] {
  const transports = m
    ? Object.keys(m.libp2p.transport.dials)
    : ["tcp", "quic", "websocket"];
  return transports.map((t) => {
    const fail = kind === "dial_fail" || kind === "inbound_fail";
    return {
      id: `${kind}_${t}`,
      label: kind.includes("inbound") ? (fail ? `${t} failed` : `${t} inbound`) : fail ? `${t} failed` : `${t} dials`,
      unit: kind.includes("inbound") ? "conns/s" : "dials/s",
      color: fail ? "#F2495C" : colorFor(t, 0),
    };
  });
}

const compact = (v: number) =>
  v >= 1000
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)
    : v >= 100
      ? v.toFixed(0)
      : v.toFixed(1);

export function formatValue(v: number | null | undefined, unit?: string): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "ms") return v >= 100 ? `${Math.round(v)} ms` : `${v.toFixed(1)} ms`;
  if (unit === "sec") return formatDuration(v);
  if (unit === "bytes") return formatBytes(v);
  if (unit === "B/s") return `${formatBytes(v)}/s`;
  return `${compact(v)}${unit ? ` ${unit}` : ""}`;
}

export function formatTime(t: number): string {
  return new Date(t).toLocaleTimeString("en-GB", { hour12: false });
}
