import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ChevronDown,
  Clock,
  Gauge,
  RefreshCw,
  Route,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { parsePrometheusText, type ParsedPrometheusMetrics } from "@/lib/prometheus";
import {
  RANGES,
  REFRESH_OPTIONS,
  colorFor,
  computeRates,
  extractCounters,
  extractGauges,
  formatTime,
  formatValue,
  toChartData,
  transportDefs,
  type ChartPoint,
  type GrafanaSample,
  type SeriesDef,
} from "@/lib/grafana";
import { formatDuration } from "@/lib/format";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MAX_SAMPLES = 4320;

const d = (id: string, label: string, unit?: string, color?: string): SeriesDef => ({
  id,
  label,
  unit,
  color: color ?? colorFor(id, 0),
});

const SERIES = {
  peers: [d("swarmPeers", "Connected peers", "peers", "#73BF69"), d("routingTable", "Routing table", "peers", "#6ED0E0")],
  cpu: [d("cpu", "CPU", "%", "#FF9830"), d("openFds", "Open FDs", "fds", "#B877D9")],
  streams: [d("streamsActive", "Active streams", "streams", "#5794F2"), d("blockstoreBlocks", "Blockstore blocks", "blocks", "#FADE2A")],
  handshakes: [d("handshake_ok", "Handshake ok", "ops/s", "#5794F2"), d("handshake_fail", "Handshake fail", "ops/s", "#F2495C")],
  streamsRate: [d("streams_opened", "Opened", "streams/s", "#5794F2"), d("streams_closed", "Closed", "streams/s", "#F2495C")],
  connsRate: [d("conns_opened", "Opened", "conns/s", "#73BF69"), d("conns_closed", "Closed", "conns/s", "#F2495C")],
  kadOps: [
    d("kad_lookup", "Lookups", "ops/s", "#5794F2"),
    d("kad_put", "Put value", "ops/s", "#73BF69"),
    d("kad_get", "Get value", "ops/s", "#FADE2A"),
    d("kad_provide", "Provide", "ops/s", "#B877D9"),
    d("kad_findproviders", "Find providers", "ops/s", "#6ED0E0"),
    d("streams_resets", "Stream resets", "ops/s", "#F2495C"),
  ],
  blocks: [d("blocks_sent", "Blocks sent", "blocks/s", "#73BF69"), d("blocks_received", "Blocks received", "blocks/s", "#5794F2")],
  bytes: [d("bytes_sent", "Bytes sent", "B/s", "#73BF69"), d("bytes_received", "Bytes received", "B/s", "#5794F2")],
  msgs: [d("msgs_sent", "Messages sent", "msg/s", "#73BF69"), d("msgs_received", "Messages received", "msg/s", "#5794F2")],
  wantlist: [d("wantlist_adds", "Wantlist adds", "ops/s", "#FF9830"), d("bitswapSessions", "Sessions", "sessions", "#B877D9")],
  gossip: [d("gossip_pub", "Published", "msg/s", "#6ED0E0"), d("gossip_recv", "Received", "msg/s", "#B877D9")],
  discovery: [d("discovery_peers", "Peers discovered", "peers/s", "#FADE2A"), d("bootstrap", "Bootstrap connects", "conns/s", "#5794F2")],
  identity: [d("identify_ok", "Identify", "ops/s", "#6ED0E0"), d("identify_push", "Identify push", "ops/s", "#B877D9")],
  relayPing: [d("relay_bytes", "Relay forwarded", "B/s", "#FF9830"), d("ping_ok", "Pings", "pings/s", "#73BF69")],
};

function RowBar({
  icon: Icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: typeof Activity;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-left transition-colors hover:bg-muted/70"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold tracking-widest text-foreground uppercase">{title}</span>
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">{children}</div>
      )}
    </div>
  );
}

function Panel({
  title,
  sub,
  span = "col-span-12 lg:col-span-6",
  children,
}: {
  title: string;
  sub?: string;
  span?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card", span)}>
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" />
        <h3 className="truncate text-xs font-semibold text-foreground">{title}</h3>
        {sub && <span className="hidden truncate text-[10px] text-muted-foreground md:inline">{sub}</span>}
      </div>
      <div className="flex-1 p-3">{children}</div>
    </div>
  );
}

function Sparkline({ data, id, color }: { data: ChartPoint[]; id: string; color: string }) {
  const gid = useId().replace(/:/g, "");
  return (
    <div className="h-10 w-full px-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 3, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={id}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gid})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatPanel({
  label,
  value,
  unit,
  color,
  id,
  data,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  color: string;
  id: string;
  data: ChartPoint[];
  icon?: typeof Activity;
  sub?: string;
}) {
  return (
    <div className="col-span-12 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card sm:col-span-6 lg:col-span-3">
      <div className="flex items-center justify-between px-3 pt-2.5">
        <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />}
      </div>
      <div className="flex items-baseline gap-1.5 px-3">
        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <Sparkline data={data} id={id} color={color} />
      {sub && <div className="px-3 pb-2.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
  series: SeriesDef[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <div className="mb-1.5 font-medium text-muted-foreground">{formatTime(label ?? Date.now())}</div>
      <div className="space-y-1">
        {payload.map((p) => {
          const unit = series.find((s) => s.id === p.dataKey)?.unit;
          return (
            <div key={String(p.dataKey)} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-1.5 text-foreground/85">
                <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {formatValue(typeof p.value === "number" ? p.value : null, unit)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendRow({ series, data }: { series: SeriesDef[]; data: ChartPoint[] }) {
  const last = data.length > 0 ? data[data.length - 1] : undefined;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-2">
      {series.map((s) => {
        const v = last ? last[s.id] : null;
        return (
          <div key={s.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatValue(v, s.unit)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TimeSeriesChart({
  data,
  series,
  height = 230,
}: {
  data: ChartPoint[];
  series: SeriesDef[];
  height?: number;
}) {
  const gid = useId().replace(/:/g, "");
  return (
    <div>
      <div className="relative">
        {data.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="rounded-md border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
              No data in range — collecting samples…
            </span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.id} id={`${gid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => formatTime(v).slice(0, 5)}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              minTickGap={48}
            />
            <YAxis
              width={56}
              tickFormatter={(v: number) => formatValue(v, series[0]?.unit)}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<ChartTooltip series={series} />}
              cursor={{ stroke: "rgba(255,255,255,0.18)", strokeDasharray: "4 4" }}
            />
            {series.map((s) => (
              <Area
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                stroke={s.color}
                strokeWidth={1.6}
                fill={`url(#${gid}-${s.id})`}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <LegendRow series={series} data={data} />
    </div>
  );
}

export default function GrafanaPage() {
  const [samples, setSamples] = useState<GrafanaSample[]>([]);
  const [lastMetrics, setLastMetrics] = useState<ParsedPrometheusMetrics | null>(null);
  const [lastScrape, setLastScrape] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshIdx, setRefreshIdx] = useState(1);
  const [rangeIdx, setRangeIdx] = useState(0);
  const prevCounters = useRef<Record<string, number> | null>(null);
  const lastTick = useRef(0);

  const poll = useCallback(async () => {
    try {
      const text = await api.metrics();
      const parsed = parsePrometheusText(text);
      const gauges = extractGauges(parsed);
      const counters = extractCounters(parsed);
      const now = Date.now();
      const rates = prevCounters.current
        ? computeRates(prevCounters.current, counters, (now - lastTick.current) / 1000)
        : {};
      prevCounters.current = counters;
      lastTick.current = now;
      setLastMetrics(parsed);
      setLastScrape(now);
      setError(null);
      setSamples((prev) => {
        const next = [...prev, { t: now, g: gauges, r: rates }];
        if (next.length > MAX_SAMPLES) next.splice(0, next.length - MAX_SAMPLES);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    if (refreshIdx === 0) return;
    const id = setInterval(poll, REFRESH_OPTIONS[refreshIdx].sec * 1000);
    return () => clearInterval(id);
  }, [refreshIdx, poll]);

  const rangeMs = RANGES[rangeIdx].ms;

  const views = useMemo(() => {
    const chart = (ids: string[], maxPoints = 300) =>
      toChartData(samples, ids, Date.now() - rangeMs, maxPoints);
    return {
      peers: chart(["swarmPeers", "routingTable"]),
      cpu: chart(["cpu", "openFds"]),
      streams: chart(["streamsActive", "blockstoreBlocks"]),
      handshakes: chart(["handshake_ok", "handshake_fail"]),
      streamsRate: chart(["streams_opened", "streams_closed"]),
      connsRate: chart(["conns_opened", "conns_closed"]),
      kadOps: chart(["kad_lookup", "kad_put", "kad_get", "kad_provide", "kad_findproviders", "streams_resets"]),
      blocks: chart(["blocks_sent", "blocks_received"]),
      bytes: chart(["bytes_sent", "bytes_received"]),
      msgs: chart(["msgs_sent", "msgs_received"]),
      wantlist: chart(["wantlist_adds", "bitswapSessions"]),
      gossip: chart(["gossip_pub", "gossip_recv"]),
      discovery: chart(["discovery_peers", "bootstrap"]),
      identity: chart(["identify_ok", "identify_push"]),
      relayPing: chart(["relay_bytes", "ping_ok"]),
      handshakeMs: chart(["handshakeMs"], 150),
      lookupMs: chart(["lookupMs"], 150),
      pingMs: chart(["pingMs"], 150),
    };
  }, [samples, rangeMs]);

  const latest = (id: string): number | null => {
    const s = samples[samples.length - 1];
    return s ? (s.g[id] ?? null) : null;
  };

  const dialOk = transportDefs(lastMetrics, "dial_ok");
  const dialFail = transportDefs(lastMetrics, "dial_fail");
  const inboundOk = transportDefs(lastMetrics, "inbound_ok");
  const dialOkIds = dialOk.map((s) => s.id);
  const dialFailIds = dialFail.map((s) => s.id);
  const inboundOkIds = inboundOk.map((s) => s.id);

  const dialOkData = useMemo(() => toChartData(samples, dialOkIds, Date.now() - rangeMs, 300), [samples, dialOkIds, rangeMs]);
  const dialFailData = useMemo(() => toChartData(samples, dialFailIds, Date.now() - rangeMs, 300), [samples, dialFailIds, rangeMs]);
  const inboundOkData = useMemo(() => toChartData(samples, inboundOkIds, Date.now() - rangeMs, 300), [samples, inboundOkIds, rangeMs]);

  const uptime = latest("uptime");

  return (
    <PageShell
      title="Grafana"
      description="Live Grafana-style observability for the py-ipfs-lite node — rates computed from Prometheus counters between scrapes"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5">
        <div>
          <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
            Dashboards / Observability
          </div>
          <h1 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Gauge className="h-4 w-4 text-primary" />
            py-ipfs-lite Node & libp2p Stack
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(rangeIdx)} onValueChange={(v) => setRangeIdx(Number(v))}>
            <SelectTrigger size="sm">
              <Clock className="size-3.5" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent align="end">
              {RANGES.map((r, i) => (
                <SelectItem key={r.label} value={String(i)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(refreshIdx)} onValueChange={(v) => setRefreshIdx(Number(v))}>
            <SelectTrigger size="sm">
              <RefreshCw className="size-3.5" />
              <SelectValue placeholder="Refresh" />
            </SelectTrigger>
            <SelectContent align="end">
              {REFRESH_OPTIONS.map((r, i) => (
                <SelectItem key={r.label} value={String(i)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-60",
                  error ? "bg-rose-400" : "animate-ping bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  error ? "bg-rose-500" : "bg-emerald-500"
                )}
              />
            </span>
            {error ? "Connection lost" : "Live"}
            {lastScrape && <span className="tabular-nums">· {formatTime(lastScrape)}</span>}
          </div>

          {error && (
            <Badge variant="outline" className="max-w-64 truncate border-rose-500/40 bg-rose-500/10 text-rose-500">
              {error}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <RowBar icon={Activity} title="System & Swarm">
          <StatPanel
            label="Connected Peers"
            value={latest("swarmPeers")?.toLocaleString() ?? "—"}
            color="#73BF69"
            id="swarmPeers"
            data={views.peers}
            icon={Activity}
            sub={`${samples.length} samples in memory`}
          />
          <StatPanel
            label="CPU Utilization"
            value={latest("cpu") != null ? `${latest("cpu")!.toFixed(1)}` : "—"}
            unit="%"
            color="#FF9830"
            id="cpu"
            data={views.cpu}
            icon={Gauge}
            sub={`${formatValue(latest("openFds"), "fds")} open fds`}
          />
          <StatPanel
            label="Memory RSS"
            value={formatValue(latest("memRss"), "bytes")}
            color="#5794F2"
            id="memRss"
            data={views.cpu}
            icon={Activity}
            sub="Physical memory of node process"
          />
          <StatPanel
            label="Uptime"
            value={uptime != null ? formatDuration(uptime) : "—"}
            color="#FADE2A"
            id="uptime"
            data={views.streams}
            icon={Activity}
            sub="Process uptime"
          />
          <Panel title="Swarm peers & Kademlia routing table" span="col-span-12 lg:col-span-7">
            <TimeSeriesChart data={views.peers} series={SERIES.peers} />
          </Panel>
          <Panel title="CPU & open file descriptors" span="col-span-12 lg:col-span-5">
            <TimeSeriesChart data={views.cpu} series={SERIES.cpu} height={200} />
          </Panel>
          <Panel title="Active streams & blockstore" span="col-span-12 lg:col-span-12">
            <TimeSeriesChart data={views.streams} series={SERIES.streams} height={160} />
          </Panel>
        </RowBar>

        <RowBar icon={ShieldCheck} title="Transport & Security">
          <Panel title="Transport dial rate" sub="successful dials per second by transport">
            <TimeSeriesChart data={dialOkData} series={dialOk} />
          </Panel>
          <Panel title="Dial failures" sub="failed dials per second by transport">
            <TimeSeriesChart data={dialFailData} series={dialFail} />
          </Panel>
          <Panel title="Inbound connection rate" sub="successful inbound connections per second">
            <TimeSeriesChart data={inboundOkData} series={inboundOk} />
          </Panel>
          <Panel title="Security handshakes" sub="noise / TLS handshake results per second">
            <TimeSeriesChart data={views.handshakes} series={SERIES.handshakes} />
          </Panel>
          <Panel title="Muxer stream lifecycle" sub="streams opened vs closed per second">
            <TimeSeriesChart data={views.streamsRate} series={SERIES.streamsRate} />
          </Panel>
          <Panel title="Connection lifecycle" sub="connections opened vs closed per second">
            <TimeSeriesChart data={views.connsRate} series={SERIES.connsRate} />
          </Panel>
        </RowBar>

        <RowBar icon={Route} title="DHT & Content Routing">
          <StatPanel
            label="Avg Handshake Duration"
            value={formatValue(latest("handshakeMs"), "ms")}
            color="#6ED0E0"
            id="handshakeMs"
            data={views.handshakeMs}
            icon={ShieldCheck}
          />
          <StatPanel
            label="Avg Lookup Duration"
            value={formatValue(latest("lookupMs"), "ms")}
            color="#FF9830"
            id="lookupMs"
            data={views.lookupMs}
            icon={Route}
          />
          <StatPanel
            label="Ping RTT"
            value={formatValue(latest("pingMs"), "ms")}
            color="#73BF69"
            id="pingMs"
            data={views.pingMs}
            icon={Gauge}
          />
          <Panel title="Kademlia operations" sub="lookups, put/get value, provide, find providers per second" span="col-span-12 lg:col-span-12">
            <TimeSeriesChart data={views.kadOps} series={SERIES.kadOps} />
          </Panel>
        </RowBar>

        <RowBar icon={Zap} title="Bitswap & Data">
          <Panel title="Bitswap blocks" sub="blocks sent vs received per second">
            <TimeSeriesChart data={views.blocks} series={SERIES.blocks} />
          </Panel>
          <Panel title="Bitswap throughput" sub="bytes sent vs received per second">
            <TimeSeriesChart data={views.bytes} series={SERIES.bytes} />
          </Panel>
          <Panel title="Bitswap session activity" sub="wantlist adds and active sessions">
            <TimeSeriesChart data={views.wantlist} series={SERIES.wantlist} />
          </Panel>
          <Panel title="Messages & gossip" sub="bitswap messages, gossipsub publish/receive per second" span="col-span-12 lg:col-span-6">
            <TimeSeriesChart data={views.msgs} series={SERIES.msgs} />
          </Panel>
          <Panel title="Gossipsub pub/sub" sub="published vs received messages per second" span="col-span-12 lg:col-span-6">
            <TimeSeriesChart data={views.gossip} series={SERIES.gossip} />
          </Panel>
          <Panel title="Discovery & bootstrap" sub="peers discovered and bootstrap connects per second">
            <TimeSeriesChart data={views.discovery} series={SERIES.discovery} />
          </Panel>
          <Panel title="Identity exchange" sub="identify rounds and push updates per second">
            <TimeSeriesChart data={views.identity} series={SERIES.identity} />
          </Panel>
          <Panel title="Relay & ping activity" sub="relay bytes forwarded and pings per second">
            <TimeSeriesChart data={views.relayPing} series={SERIES.relayPing} />
          </Panel>
        </RowBar>
      </div>
    </PageShell>
  );
}
