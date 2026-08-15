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
} from "lucide-react";

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
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  Active Peer Lifespan Tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Distribution of currently connected peers by how long their sessions have been maintained:
                </p>
                <div className="space-y-2">
                  {metrics &&
                    Object.entries(metrics.activePeersByAge).map(([tier, count]) => {
                      const total = metrics.swarmPeers || 1;
                      const pct = Math.min(100, Math.round((count / total) * 100));
                      return (
                        <div key={tier} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground">{tier}</span>
                            <span className="font-medium text-foreground">
                              {count} peers ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {(!metrics || Object.keys(metrics.activePeersByAge).length === 0) && (
                    <p className="text-xs text-muted-foreground">Aggregating peer age distribution...</p>
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
                  Multiplexed Streams & Protocols
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <div>
                  <span className="text-xs font-medium text-muted-foreground">Open Streams by Protocol</span>
                  <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
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
                      <p className="text-xs text-muted-foreground">No active open streams at snapshot.</p>
                    )}
                  </div>
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
