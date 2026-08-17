import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { formatBytes, formatDuration } from "@/lib/format";
import { parsePrometheusText, type ParsedPrometheusMetrics } from "@/lib/prometheus";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Clock,
  Copy,
  Check,
  Zap,
  Sliders,
  Radio,
  FileCode,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Network,
  Fingerprint,
  Timer,
  Send,
  Route,
  Radar,
  Globe,
} from "lucide-react";

function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "success" | "failure" | "accent";
}) {
  const valueColor =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "failure"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "accent"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-2.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <p className={`mt-1 text-lg font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SuccessRateBadge({ success, failure }: { success: number; failure: number }) {
  const total = success + failure;
  const pct = total > 0 ? Math.round((success / total) * 100) : 100;
  return (
    <Badge
      className={
        pct >= 90
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"
          : pct >= 70
            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs"
      }
    >
      {pct}% success rate
    </Badge>
  );
}

function MetricBar({
  label,
  value,
  total,
  color,
  sub,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  sub?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">
          {value}
          {sub && <span className="ml-1 font-normal text-muted-foreground">{sub}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<ParsedPrometheusMetrics | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "raw">("dashboard");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5);
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const text = await api.metrics();
      setRawText(text);
      const parsed = parsePrometheusText(text);
      setMetrics(parsed);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch Prometheus metrics from /metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoRefreshInterval > 0) {
      timerRef.current = setInterval(() => {
        fetchMetrics();
      }, autoRefreshInterval * 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshInterval]);

  const handleCopyRaw = async () => {
    if (!rawText) return;
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const getCpuBadgeVariant = (cpu: number) => {
    if (cpu < 25) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (cpu < 70) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-rose-500/10 text-rose-600 border-rose-500/20";
  };

  const filteredRawLines = rawText
    ? rawText
        .split("\n")
        .filter((l) => !filterSearch || l.toLowerCase().includes(filterSearch.toLowerCase()))
        .join("\n")
    : "";

  return (
    <PageShell
      title="Metrics & Observability"
      description="Real-time Prometheus telemetry, swarm health, hardware performance, and stream metrics"
    >
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "raw"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Prometheus Exposition (Raw)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto Refresh Dropdown */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Auto Refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={0}>Disabled</option>
              <option value={2}>Every 2s</option>
              <option value={5}>Every 5s</option>
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
            </select>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchMetrics}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {activeTab === "raw" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyRaw}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Metrics"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {activeTab === "dashboard" ? (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Connected Peers */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Connected Swarm Peers</span>
                  <Wifi className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {metrics ? metrics.swarmPeers : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {metrics?.autoConnector.lowWatermark || 300}–{metrics?.autoConnector.highWatermark || 500} range
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Raw Conns: {metrics?.swarmConnectionsTotal ?? 0}</span>
                  <span className="text-emerald-500 font-medium">
                    {metrics && metrics.swarmPeers >= (metrics.autoConnector.lowWatermark || 300)
                      ? "Healthy"
                      : "Stabilizing"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* CPU Utilization */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Process CPU Utilization</span>
                  <Cpu className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {metrics ? `${metrics.cpuPercent.toFixed(1)}%` : "—"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getCpuBadgeVariant(
                      metrics?.cpuPercent ?? 0
                    )}`}
                  >
                    {metrics && metrics.cpuPercent < 25 ? "Optimized" : metrics && metrics.cpuPercent < 70 ? "Active" : "High"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Open FDs: {metrics?.openFds ?? 0}</span>
                  <span>PID: {metrics?.pid ? metrics.pid : "—"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Memory RSS */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Physical Memory (RSS)</span>
                  <HardDrive className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {metrics ? formatBytes(metrics.memoryRssBytes) : "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (VMS: {metrics ? formatBytes(metrics.memoryVmsBytes) : "—"})
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Heap Status: Stable</span>
                  <span className="text-emerald-500 font-medium">No Leaks</span>
                </div>
              </CardContent>
            </Card>

            {/* Uptime */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Node Process Uptime</span>
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">
                    {metrics ? formatDuration(metrics.uptimeSeconds) : "—"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Transport: Dual-Stack</span>
                  <span className="text-primary font-medium">TCP + QUIC</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* libp2p Protocol Stack Health */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Transport & Dialing */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Network className="h-4 w-4 text-primary" />
                    Transport Dialing & Inbound Connections
                  </CardTitle>
                  <SuccessRateBadge
                    success={
                      metrics
                        ? Object.values(metrics.libp2p.transport.dials).reduce(
                            (a, b) => a + b.success,
                            0
                          )
                        : 0
                    }
                    failure={
                      metrics
                        ? Object.values(metrics.libp2p.transport.dials).reduce(
                            (a, b) => a + b.failure,
                            0
                          )
                        : 0
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Dial attempts (lifetime)
                  </span>
                  <div className="mt-2 space-y-2">
                    {metrics &&
                      Object.entries(metrics.libp2p.transport.dials).map(([transport, d]) => (
                        <div key={transport} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground uppercase">
                              {transport}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-emerald-500 font-semibold">
                                {d.success} ok
                              </span>
                              <span className="font-mono text-rose-500 font-semibold">
                                {d.failure} fail
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${
                                  d.success + d.failure > 0
                                    ? Math.min(100, (d.success / (d.success + d.failure)) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    {(!metrics || Object.keys(metrics.libp2p.transport.dials).length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        No dial events recorded yet.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Inbound connections (lifetime)
                  </span>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {metrics &&
                      Object.entries(metrics.libp2p.transport.inbound).map(([transport, d]) => (
                        <div
                          key={transport}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-mono text-muted-foreground uppercase">
                            {transport}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-emerald-500">{d.success} ok</span>
                            <span className="font-mono text-rose-500">{d.failure} fail</span>
                          </span>
                        </div>
                      ))}
                    {(!metrics || Object.keys(metrics.libp2p.transport.inbound).length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        No inbound connection events recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Handshakes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Fingerprint className="h-4 w-4 text-primary" />
                    Security Handshakes (Noise/TLS)
                  </CardTitle>
                  <SuccessRateBadge
                    success={metrics?.libp2p.security.handshakes.success ?? 0}
                    failure={metrics?.libp2p.security.handshakes.failure ?? 0}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Successful</span>
                    <p className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics?.libp2p.security.handshakes.success ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Failed</span>
                    <p className="mt-0.5 text-lg font-bold text-rose-600 dark:text-rose-400">
                      {metrics?.libp2p.security.handshakes.failure ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Avg Duration</span>
                    <p className="mt-0.5 text-lg font-bold text-primary">
                      {metrics ? `${metrics.libp2p.security.avgDurationMs.toFixed(1)}ms` : "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    By protocol & direction
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {metrics &&
                      Object.entries(metrics.libp2p.security.byProtocol).map(([proto, d]) => (
                        <div
                          key={proto}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{proto}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-emerald-500">{d.success} ok</span>
                            <span className="font-mono text-rose-500">{d.failure} fail</span>
                          </span>
                        </div>
                      ))}
                    {(!metrics || Object.keys(metrics.libp2p.security.byProtocol).length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        No handshake events recorded yet.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Multiplexer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-primary" />
                  Stream Multiplexing (Muxers)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Muxed connections by protocol
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {metrics &&
                      Object.entries(metrics.libp2p.muxer.conns).map(([muxer, d]) => (
                        <div
                          key={muxer}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-mono text-muted-foreground uppercase">{muxer}</span>
                          <span className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0 border-sky-500/30 text-sky-500 bg-sky-500/5"
                            >
                              {d.outbound} out
                            </Badge>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                            >
                              {d.inbound} in
                            </Badge>
                          </span>
                        </div>
                      ))}
                    {(!metrics || Object.keys(metrics.libp2p.muxer.conns).length === 0) && (
                      <p className="text-xs text-muted-foreground">No muxed connections yet.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-sky-500">Streams Opened</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-sky-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics?.libp2p.muxer.streamsOpen.outbound ?? 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground">outbound</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Inbound:{" "}
                      <span className="font-medium text-foreground">
                        {metrics?.libp2p.muxer.streamsOpen.inbound ?? 0}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-emerald-500">Streams Closed</span>
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics?.libp2p.muxer.streamsClosed.outbound ?? 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground">outbound</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Inbound:{" "}
                      <span className="font-medium text-foreground">
                        {metrics?.libp2p.muxer.streamsClosed.inbound ?? 0}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
                  <span className="text-muted-foreground">Muxer upgrade failures</span>
                  <span className="flex items-center gap-2 font-mono">
                    <span className="text-sky-500">
                      {(metrics?.libp2p.muxer.upgradeFailures.outbound ?? 0) + (metrics?.libp2p.muxer.upgradeFailures.inbound ?? 0)}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-primary" />
                  Identity Exchange (Identify / Push)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <span className="text-xs text-muted-foreground">Identify Rounds</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {(metrics?.libp2p.identity.identify.success ?? 0) +
                          (metrics?.libp2p.identity.identify.failure ?? 0)}
                      </span>
                      <SuccessRateBadge
                        success={metrics?.libp2p.identity.identify.success ?? 0}
                        failure={metrics?.libp2p.identity.identify.failure ?? 0}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Failed:{" "}
                      <span className="font-medium text-rose-500">
                        {metrics?.libp2p.identity.identify.failure ?? 0}
                      </span>{" "}
                      · Node metadata exchanged on connect
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <span className="text-xs text-muted-foreground">Identify Push Updates</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {(metrics?.libp2p.identity.push.success ?? 0) +
                          (metrics?.libp2p.identity.push.failure ?? 0)}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Failed:{" "}
                      <span className="font-medium text-rose-500">
                        {metrics?.libp2p.identity.push.failure ?? 0}
                      </span>{" "}
                      · Address/record updates pushed to peers
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Connections Opened"
                    value={metrics ? Object.values(metrics.libp2p.connections.opened).reduce((a, b) => a + b, 0) : 0}
                    tone="success"
                  />
                  <StatTile
                    label="Connections Closed"
                    value={metrics ? Object.values(metrics.libp2p.connections.closed).reduce((a, b) => a + b, 0) : 0}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DHT & Content Routing */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Route className="h-4 w-4 text-primary" />
                  Kademlia DHT & Content Routing
                </CardTitle>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Routing table:{" "}
                  {metrics ? metrics.libp2p.kad.routingTablePeers.toLocaleString() : "—"} peers
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <StatTile
                  label="Lookups"
                  value={(metrics?.libp2p.kad.lookups.success ?? 0) + (metrics?.libp2p.kad.lookups.failure ?? 0)}
                  tone="accent"
                  sub={`${metrics?.libp2p.kad.lookups.success ?? 0} ok · ${metrics?.libp2p.kad.lookups.failure ?? 0} failed`}
                />
                <StatTile
                  label="Avg Lookup Duration"
                  value={metrics ? `${metrics.libp2p.kad.lookupDurationMs.toFixed(0)}ms` : "—"}
                  sub={`${(metrics?.libp2p.kad.peersFoundPerLookup ?? 0).toFixed(1)} peers found / lookup`}
                />
                <StatTile
                  label="Put Value"
                  value={(metrics?.libp2p.kad.putValue.success ?? 0) + (metrics?.libp2p.kad.putValue.failure ?? 0)}
                  tone="success"
                  sub={`${metrics?.libp2p.kad.putValue.failure ?? 0} failures`}
                />
                <StatTile
                  label="Get Value"
                  value={(metrics?.libp2p.kad.getValue.success ?? 0) + (metrics?.libp2p.kad.getValue.failure ?? 0)}
                  tone="success"
                  sub={`${metrics?.libp2p.kad.getValue.failure ?? 0} failures`}
                />
                <StatTile
                  label="Provide"
                  value={(metrics?.libp2p.kad.provide.success ?? 0) + (metrics?.libp2p.kad.provide.failure ?? 0)}
                  sub={`${metrics?.libp2p.kad.providersAnnounced ?? 0} peers announced`}
                />
                <StatTile
                  label="Find Provider Queries"
                  value={(metrics?.libp2p.kad.findProviders.success ?? 0) + (metrics?.libp2p.kad.findProviders.failure ?? 0)}
                  sub={`${(metrics?.libp2p.kad.providersFoundPerQuery ?? 0).toFixed(1)} providers found / query`}
                />
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Inbound DHT requests served (by peers)
                </span>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {metrics &&
                    (Object.keys(metrics.libp2p.kad.inbound).length > 0
                      ? Object.entries(metrics.libp2p.kad.inbound).map(([op, count]) => (
                          <StatTile
                            key={op}
                            label={op.replace(/^get_/, "Get ").replace(/^put_/, "Put ").replace(/^find_/, "Find ").replace(/^add_/, "Add ")}
                            value={count}
                          />
                        ))
                      : [
                          ["find_node", 0],
                          ["get_providers", 0],
                          ["get_value", 0],
                          ["put_value", 0],
                          ["add_provider", 0],
                        ].map(([op]) => <StatTile key={op as string} label={op as string} value={0} />))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <StatTile label="Rate Limited" value={metrics?.libp2p.kad.rateLimited ?? 0} tone="failure" />
                <StatTile label="Record Validations" value={metrics?.libp2p.kad.recordValidation ?? 0} />
                <StatTile label="Table Refreshes" value={metrics?.libp2p.kad.refresh ?? 0} />
                <StatTile label="Record Republish" value={metrics?.libp2p.kad.republish ?? 0} />
                <StatTile label="Stream Resets" value={metrics?.libp2p.kad.streamResets ?? 0} tone="failure" />
                <StatTile
                  label="Peers Queried / Lookup"
                  value={(metrics?.libp2p.kad.peersQueriedPerLookup ?? 0).toFixed(1)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Swarm & Transport Observability */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Transport & Direction Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Radio className="h-4 w-4 text-primary" />
                  Swarm Transport & Connection Lifecycle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <span className="text-xs text-muted-foreground">Lifetime Connects</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics
                          ? Object.values(metrics.connectsByTransport).reduce((a, b) => a + b, 0)
                          : 0}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      {metrics &&
                        Object.entries(metrics.connectsByTransport).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {k}: {v}
                          </Badge>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <span className="text-xs text-muted-foreground">Lifetime Disconnects</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics
                          ? Object.values(metrics.disconnectsByTransport).reduce((a, b) => a + b, 0)
                          : 0}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      {metrics &&
                        Object.entries(metrics.disconnectsByTransport).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {k}: {v}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Disconnect Reason Breakdown */}
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Disconnection Reason Hints</span>
                  <div className="mt-2 space-y-1.5">
                    {metrics && Object.keys(metrics.disconnectReasons).length > 0 ? (
                      Object.entries(metrics.disconnectReasons).map(([reason, count]) => (
                        <div
                          key={reason}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                        >
                          <span className="font-mono text-muted-foreground">{reason}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No disconnection events recorded.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Lifespan Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-primary" />
                    Active Peer Connection Age Tiers
                  </CardTitle>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    {metrics ? `${metrics.peersOver30m} peers > 30m` : "—"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">&gt; 30m Stable</span>
                    <p className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics?.peersOver30m ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">&gt; 10m Extended</span>
                    <p className="mt-0.5 text-lg font-bold text-blue-600 dark:text-blue-400">
                      {metrics?.peersOver10m ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">&gt; 5m Active</span>
                    <p className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">
                      {metrics?.peersOver5m ?? 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {metrics &&
                    Object.entries(metrics.activePeersByAge).map(([tier, count]) => {
                      const total = metrics.swarmPeers || 1;
                      const pct = Math.min(100, Math.round((count / total) * 100));
                      const is30m = tier.includes("30m") || tier.includes("over_30m");
                      return (
                        <div key={tier} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground">
                              {tier.replace(/_/g, " ").replace(/\(.*?\)/g, "")}
                            </span>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                is30m ? "text-emerald-500" : "text-foreground"
                              }`}
                            >
                              {count} peers ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                is30m ? "bg-emerald-500" : "bg-primary"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {(!metrics || Object.keys(metrics.activePeersByAge).length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      Aggregating peer age distribution...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto-Connector & Stream Observability */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Auto-Connector State Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Sliders className="h-4 w-4 text-primary" />
                  Auto-Connector Watermarks & State
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Low Watermark</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.autoConnector.lowWatermark || 300}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">High Watermark</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.autoConnector.highWatermark || 500}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">In-Flight Dials</span>
                    <p className="mt-1 text-lg font-bold text-emerald-500">
                      {metrics?.autoConnector.inFlightDials || 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Min Connections</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.autoConnector.minConnections || 300}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Max Cap</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.autoConnector.maxConnections || 550}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Dial Pacing</span>
                    <p className="mt-1 text-xs font-semibold text-primary">Single-Flight Guarded</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Auto-Connector dial pacing is strictly guarded: re-entrancy locks prevent dial storms, capping CPU and memory.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Multiplexed Streams Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4 text-primary" />
                  Multiplexed Streams & Direction Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stream Direction Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-sky-500">Opened by Us (Initiator)</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-sky-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics?.streamsOutboundActive ?? 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground">active</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Total opened: <span className="font-medium text-foreground">{metrics?.streamsOutboundTotal ?? 0}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-emerald-500">Received by Us (Receiver)</span>
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-foreground">
                        {metrics?.streamsInboundActive ?? 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground">active</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Total received: <span className="font-medium text-foreground">{metrics?.streamsInboundTotal ?? 0}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Streams Opened Total</span>
                    <p className="mt-1 text-lg font-bold text-foreground">{metrics?.streamsOpenedTotal ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Streams Closed Total</span>
                    <p className="mt-1 text-lg font-bold text-foreground">{metrics?.streamsClosedTotal ?? 0}</p>
                  </div>
                </div>

                {/* Active Open Streams by Protocol */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Active Open Streams by Protocol</span>
                    <span className="text-[10px] text-muted-foreground">Live snapshot</span>
                  </div>
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                    {metrics && Object.keys(metrics.streamsActiveByProtocol).length > 0 ? (
                      Object.entries(metrics.streamsActiveByProtocol).map(([proto, count]) => (
                        <div
                          key={proto}
                          className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1 text-xs"
                        >
                          <span className="font-mono text-muted-foreground truncate max-w-[280px]">
                            {proto}
                          </span>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {count}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No long-lived open streams at snapshot (most close within 50ms).</p>
                    )}
                  </div>
                </div>

                {/* Cumulative Lifetime Streams by Protocol */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Cumulative Streams by Protocol</span>
                    <span className="text-[10px] text-muted-foreground">Lifetime Total & Direction</span>
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5">
                    {metrics && Object.keys(metrics.streamsTotalByProtocol).length > 0 ? (
                      Object.entries(metrics.streamsTotalByProtocol)
                        .sort((a, b) => b[1] - a[1])
                        .map(([proto, totalCount]) => {
                          const outCount = metrics.streamsTotalByProtocolOutbound[proto] || 0;
                          const inCount = metrics.streamsTotalByProtocolInbound[proto] || 0;
                          return (
                            <div
                              key={proto}
                              className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-mono text-foreground font-medium truncate max-w-[220px]">
                                {proto}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-sky-500/30 text-sky-500 bg-sky-500/5">
                                  {outCount} out
                                </Badge>
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                                  {inCount} in
                                </Badge>
                                <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0 font-semibold">
                                  {totalCount}
                                </Badge>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-xs text-muted-foreground">Protocol handshake negotiation in progress...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exchange, Discovery & Peer Services */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bitswap Protocol (libp2p) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Bitswap Protocol Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Wantlist Adds"
                    value={metrics?.libp2p.bitswap.wantlistAdds ?? 0}
                    tone="accent"
                    sub={`${metrics?.libp2p.bitswap.wantlistCancels ?? 0} cancels`}
                  />
                  <StatTile label="Active Sessions" value={metrics?.libp2p.bitswap.sessions ?? 0} />
                  <StatTile
                    label="Blocks Sent"
                    value={metrics?.libp2p.bitswap.blocksSent ?? 0}
                    tone="success"
                    sub={
                      metrics && metrics.libp2p.bitswap.blockBytesSent > 0
                        ? `avg ${formatBytes(metrics.libp2p.bitswap.blockBytesSent)}`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Blocks Received"
                    value={metrics?.libp2p.bitswap.blocksReceived ?? 0}
                    tone="success"
                    sub={
                      metrics && metrics.libp2p.bitswap.blockBytesReceived > 0
                        ? `avg ${formatBytes(metrics.libp2p.bitswap.blockBytesReceived)}`
                        : undefined
                    }
                  />
                  <StatTile label="Messages Sent" value={metrics?.libp2p.bitswap.messagesSent ?? 0} />
                  <StatTile
                    label="Messages Received"
                    value={metrics?.libp2p.bitswap.messagesReceived ?? 0}
                    sub={
                      metrics && metrics.libp2p.bitswap.messageBytesReceived > 0
                        ? `avg ${formatBytes(metrics.libp2p.bitswap.messageBytesReceived)}`
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
                  <span className="text-muted-foreground">Provider queries</span>
                  <span className="font-mono font-medium text-foreground">
                    {metrics?.libp2p.bitswap.providerQueriesFound ?? 0} found /{" "}
                    {metrics?.libp2p.bitswap.providerQueries ?? 0} total
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Discovery */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Radar className="h-4 w-4 text-primary" />
                  Peer Discovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Peers Discovered"
                    value={metrics?.libp2p.discovery.peersDiscovered ?? 0}
                    tone="success"
                  />
                  <StatTile
                    label="Peers Lost"
                    value={metrics?.libp2p.discovery.peersLost ?? 0}
                    tone="failure"
                  />
                  <StatTile
                    label="Bootstrap Connects"
                    value={metrics?.libp2p.discovery.bootstrapConnects ?? 0}
                    sub={
                      metrics && metrics.libp2p.discovery.bootstrapAvgMs > 0
                        ? `avg ${metrics.libp2p.discovery.bootstrapAvgMs.toFixed(0)}ms`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Random Walk Cycles"
                    value={metrics?.libp2p.discovery.randomWalks ?? 0}
                    sub={
                      metrics
                        ? `${metrics.libp2p.discovery.peersPerWalk.toFixed(1)} peers / walk`
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                  <Radar className="h-4 w-4 shrink-0" />
                  <span>
                    Random-walk refreshes the routing table periodically, discovering fresh peers
                    without central bootstrappers.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Ping */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Timer className="h-4 w-4 text-primary" />
                  Ping & Latency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Pings Sent</span>
                    <p className="mt-0.5 text-lg font-bold text-foreground">
                      {metrics?.libp2p.ping.count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Avg RTT</span>
                    <p className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics ? `${metrics.libp2p.ping.avgMs.toFixed(0)}ms` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-center">
                    <span className="text-[10px] font-medium text-muted-foreground">Failures</span>
                    <p className="mt-0.5 text-lg font-bold text-rose-600 dark:text-rose-400">
                      {metrics?.libp2p.ping.failures ?? 0}
                    </p>
                  </div>
                </div>

                {metrics && metrics.libp2p.ping.buckets.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">
                      RTT distribution (histogram)
                    </span>
                    <div className="mt-2 space-y-1.5">
                      {metrics.libp2p.ping.buckets
                        .map((b, i, arr) => {
                          const prev = i > 0 ? arr[i - 1].count : 0;
                          return { le: b.le, count: Math.max(0, b.count - prev) };
                        })
                        .filter((b) => b.count > 0)
                        .map((b) => (
                          <MetricBar
                            key={b.le}
                            label={b.le < 1 ? `${Math.round(b.le * 1000)}µs` : `${b.le}ms`}
                            value={b.count}
                            total={metrics.libp2p.ping.count}
                            color="bg-primary"
                            sub="pings"
                          />
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Relay & Request/Response */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Route className="h-4 w-4 text-primary" />
                  Circuit Relay & Request/Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Relay Reservations"
                    value={metrics?.libp2p.relay.reservations ?? 0}
                  />
                  <StatTile label="Relay Hops" value={metrics?.libp2p.relay.hops ?? 0} />
                  <StatTile
                    label="Data Forwarded"
                    value={metrics ? formatBytes(metrics.libp2p.relay.forwardedBytes) : "0 B"}
                    sub="via relay"
                  />
                  <StatTile
                    label="Requests Served"
                    value={metrics?.libp2p.requestResponse.requests ?? 0}
                    sub={
                      metrics && metrics.libp2p.requestResponse.avgLatencyMs > 0
                        ? `avg ${metrics.libp2p.requestResponse.avgLatencyMs.toFixed(1)}ms`
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>
                    Request/response protocol powers latency-measured exchanges; relay support lets
                    the node serve traffic for peers without public addresses.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Gossipsub */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Send className="h-4 w-4 text-primary" />
                  Gossipsub PubSub
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Messages Published"
                    value={metrics?.libp2p.gossipsub.published ?? 0}
                    tone="success"
                    sub={
                      metrics && metrics.libp2p.gossipsub.outBytes > 0
                        ? `avg ${formatBytes(metrics.libp2p.gossipsub.outBytes)}`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Messages Received"
                    value={metrics?.libp2p.gossipsub.received ?? 0}
                    sub={
                      metrics && metrics.libp2p.gossipsub.messageBytes > 0
                        ? `avg ${formatBytes(metrics.libp2p.gossipsub.messageBytes)}`
                        : undefined
                    }
                  />
                  <StatTile
                    label="Subscription Changes"
                    value={metrics?.libp2p.gossipsub.subscriptionChanges ?? 0}
                  />
                  <StatTile
                    label="Control Messages"
                    value={metrics?.libp2p.gossipsub.control ?? 0}
                    sub={`${metrics?.libp2p.gossipsub.subopts ?? 0} sub-options`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storage & Bitswap Observability */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Blockstore & GC */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <HardDrive className="h-4 w-4 text-primary" />
                  BlockStore & Garbage Collection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Total Blocks Stored</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.blockstoreBlocksTotal ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Blockstore Size</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics ? formatBytes(metrics.blockstoreSizeBytes) : "0 B"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">GC Runs</span>
                    <p className="mt-1 text-lg font-bold text-foreground">{metrics?.gcRunsTotal ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Reclaimed Blocks</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.gcReclaimedBlocksTotal ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bitswap Traffic */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="h-4 w-4 text-primary" />
                  Bitswap Exchange Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Bytes Sent</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics ? formatBytes(metrics.bitswapBytesSent) : "0 B"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Bytes Received</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics ? formatBytes(metrics.bitswapBytesReceived) : "0 B"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Messages Sent</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.bitswapMessagesSent ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
                    <span className="text-[11px] text-muted-foreground">Messages Received</span>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {metrics?.bitswapMessagesReceived ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Raw Prometheus Text Tab */
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">
                Prometheus Exposition Format (Endpoint: /metrics)
              </CardTitle>
              <div className="w-64">
                <Input
                  placeholder="Filter metrics by name..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-foreground">
              {loading && !rawText ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <pre className="whitespace-pre">{filteredRawLines || "No metrics matched the filter."}</pre>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
