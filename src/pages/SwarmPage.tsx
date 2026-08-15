import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResultCard } from "@/components/shared/ResultCard";
import { PeerBadge } from "@/components/shared/PeerBadge";
import {
  Users,
  Plug,
  Unplug,
  RefreshCw,
  Loader2,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";

export default function SwarmPage() {
  const [peers, setPeers] = useState<any[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [peersLoading, setPeersLoading] = useState(true);
  const [connectAddr, setConnectAddr] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectResult, setConnectResult] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [transportFilter, setTransportFilter] = useState<string>("all");

  const fetchPeers = async () => {
    setPeersLoading(true);
    try {
      const res = await api.swarmPeers();
      const peersList = res.peers || res.Peers || [];
      const list = Array.isArray(peersList) ? peersList : [];
      setPeers(list);
      setPeerCount(res.count ?? list.length);
    } catch {
      setPeers([]);
      setPeerCount(0);
    } finally {
      setPeersLoading(false);
    }
  };

  useEffect(() => {
    fetchPeers();
  }, []);

  const handleConnect = async () => {
    if (!connectAddr.trim()) return;
    setConnectLoading(true);
    setConnectError(null);
    setConnectResult(null);
    try {
      const res = await api.swarmConnect(connectAddr.trim());
      setConnectResult(res.Strings?.[0] || res.message || "Connected");
      setConnectAddr("");
      fetchPeers();
    } catch (e: any) {
      setConnectError(e.message || "Failed to connect to peer");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async (peerId: string) => {
    setDisconnectLoading(peerId);
    setDisconnectError(null);
    try {
      await api.swarmDisconnect(peerId);
      fetchPeers();
    } catch (e: any) {
      setDisconnectError(e.message || "Disconnect failed");
    } finally {
      setDisconnectLoading(null);
    }
  };

  // Stats calculation
  const peersOver30m = peers.filter((p) => (p.duration_seconds || 0) >= 1800);
  const peers10mTo30m = peers.filter(
    (p) => (p.duration_seconds || 0) >= 600 && (p.duration_seconds || 0) < 1800
  );
  const peers5mTo10m = peers.filter(
    (p) => (p.duration_seconds || 0) >= 300 && (p.duration_seconds || 0) < 600
  );
  const peersUnder5m = peers.filter((p) => (p.duration_seconds || 0) < 300);

  const tcpPeers = peers.filter((p) => p.transport === "tcp");
  const quicPeers = peers.filter((p) => p.transport === "quic-v1" || p.transport === "quic");

  // Filtering
  const filteredPeers = peers.filter((p) => {
    const peerId =
      typeof p === "string" ? p : p?.peer || p?.Peer || p?.id || p?.ID || "";
    const duration = p.duration_seconds || 0;
    const transport = p.transport || "unknown";

    if (searchQuery && !peerId.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (ageFilter === "over_30m" && duration < 1800) return false;
    if (ageFilter === "10m_to_30m" && (duration < 600 || duration >= 1800)) return false;
    if (ageFilter === "5m_to_10m" && (duration < 300 || duration >= 600)) return false;
    if (ageFilter === "under_5m" && duration >= 300) return false;

    if (transportFilter === "tcp" && transport !== "tcp") return false;
    if (transportFilter === "quic" && transport !== "quic-v1" && transport !== "quic")
      return false;

    return true;
  });

  const getAgeBadge = (duration: number) => {
    if (duration >= 1800) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
          30m+ Stable
        </Badge>
      );
    }
    if (duration >= 600) {
      return (
        <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[10px] font-medium">
          10m+ Extended
        </Badge>
      );
    }
    if (duration >= 300) {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-medium">
          5m–10m
        </Badge>
      );
    }
    if (duration >= 120) {
      return (
        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-medium">
          2m–5m
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-medium">
        &lt;2m New
      </Badge>
    );
  };

  return (
    <PageShell
      title="Swarm"
      description="Active peer connections, connection age tiers, and network transport management"
    >
      <div className="space-y-6">
        {/* Connection Lifespan Breakdown Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card
            onClick={() => setAgeFilter(ageFilter === "over_30m" ? "all" : "over_30m")}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              ageFilter === "over_30m" ? "ring-2 ring-primary border-transparent" : ""
            }`}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>&gt; 30m Stable</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {peersOver30m.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({peerCount > 0 ? Math.round((peersOver30m.length / peerCount) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Long-lived backbone peers</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => setAgeFilter(ageFilter === "10m_to_30m" ? "all" : "10m_to_30m")}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              ageFilter === "10m_to_30m" ? "ring-2 ring-primary border-transparent" : ""
            }`}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>10m – 30m Peers</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {peers10mTo30m.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({peerCount > 0 ? Math.round((peers10mTo30m.length / peerCount) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Extended active sessions</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => setAgeFilter(ageFilter === "5m_to_10m" ? "all" : "5m_to_10m")}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              ageFilter === "5m_to_10m" ? "ring-2 ring-primary border-transparent" : ""
            }`}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>5m – 10m Peers</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {peers5mTo10m.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({peerCount > 0 ? Math.round((peers5mTo10m.length / peerCount) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Moderate duration peers</span>
            </CardContent>
          </Card>

          <Card
            onClick={() => setAgeFilter(ageFilter === "under_5m" ? "all" : "under_5m")}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              ageFilter === "under_5m" ? "ring-2 ring-primary border-transparent" : ""
            }`}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>&lt; 5m Cycling</span>
                <RefreshCw className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {peersUnder5m.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({peerCount > 0 ? Math.round((peersUnder5m.length / peerCount) * 100) : 0}%)
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">DHT queries & new dials</span>
            </CardContent>
          </Card>
        </div>

        {/* Connect to Peer Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Plug className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Connect to Peer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="/ip4/104.131.131.82/tcp/4001/p2p/QmaCp..."
                value={connectAddr}
                onChange={(e) => setConnectAddr(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && connectAddr.trim() && handleConnect()
                }
                className="h-9 text-xs"
              />
              <Button
                onClick={handleConnect}
                disabled={!connectAddr.trim() || connectLoading}
                className="h-9 text-xs"
              >
                {connectLoading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plug className="mr-1 h-3.5 w-3.5" />
                )}
                Connect
              </Button>
            </div>
            {connectError && (
              <ResultCard success={false} title="Error">
                {connectError}
              </ResultCard>
            )}
            {connectResult && (
              <ResultCard success={true} title="Connected">
                {connectResult}
              </ResultCard>
            )}
            {disconnectError && (
              <ResultCard success={false} title="Disconnect Failed">
                {disconnectError}
              </ResultCard>
            )}
          </CardContent>
        </Card>

        {/* Connected Peers List with Age, Transport, and Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Connected Swarm Peers ({filteredPeers.length} of {peerCount})
                  </CardTitle>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Peer ID */}
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search peer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                {/* Age Filter */}
                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Ages</option>
                  <option value="over_30m">&gt; 30m Stable ({peersOver30m.length})</option>
                  <option value="10m_to_30m">10m–30m ({peers10mTo30m.length})</option>
                  <option value="5m_to_10m">5m–10m ({peers5mTo10m.length})</option>
                  <option value="under_5m">&lt; 5m ({peersUnder5m.length})</option>
                </select>

                {/* Transport Filter */}
                <select
                  value={transportFilter}
                  onChange={(e) => setTransportFilter(e.target.value)}
                  className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Transports</option>
                  <option value="quic">QUIC-v1 ({quicPeers.length})</option>
                  <option value="tcp">TCP ({tcpPeers.length})</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPeers}
                  disabled={peersLoading}
                  className="h-8 gap-1 text-xs"
                  aria-label="Refresh peers"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${peersLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {peersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredPeers.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No connected peers match the selected filters.
              </p>
            ) : (
              <div className="max-h-[550px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Peer ID</TableHead>
                      <TableHead>Connection Age</TableHead>
                      <TableHead>Transport / Dir</TableHead>
                      <TableHead>Addresses</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPeers.map((p: any, i: number) => {
                      const peerId =
                        typeof p === "string"
                          ? p
                          : p?.peer || p?.Peer || p?.id || p?.ID || "";
                      const rawAddrs = p?.addrs || p?.Addrs || [];
                      const addrs = Array.isArray(rawAddrs) ? rawAddrs : [];
                      const duration = p.duration_seconds || 0;
                      const transport = p.transport || "unknown";
                      const direction = p.direction || "unknown";

                      return (
                        <TableRow key={peerId || i}>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {i + 1}
                          </TableCell>
                          <TableCell>
                            <PeerBadge peerId={peerId} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium">
                                {formatDuration(duration)}
                              </span>
                              {getAgeBadge(duration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={transport === "quic-v1" ? "default" : "secondary"}
                                className="text-[10px] font-mono"
                              >
                                {transport}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                ({direction})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs space-y-0.5">
                              {addrs.slice(0, 1).map((addr: string, j: number) => (
                                <div
                                  key={j}
                                  className="truncate font-mono text-[11px] text-muted-foreground"
                                  title={addr}
                                >
                                  {addr}
                                </div>
                              ))}
                              {addrs.length > 1 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{addrs.length - 1} more multiaddrs
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => peerId && handleDisconnect(peerId)}
                              disabled={disconnectLoading === peerId || !peerId}
                              aria-label={
                                peerId
                                  ? `Disconnect from ${peerId.slice(0, 12)}`
                                  : "Disconnect"
                              }
                              className="h-7 w-7 p-0"
                            >
                              {disconnectLoading === peerId ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Unplug className="h-3.5 w-3.5 text-destructive" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
