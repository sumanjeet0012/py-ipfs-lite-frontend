import { useState, useEffect } from "react";
import { api } from "@/lib/api";
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
} from "lucide-react";

export default function SwarmPage() {
  const [peers, setPeers] = useState<any[]>([]);
  const [peerCount, setPeerCount] = useState(0);
  const [peersLoading, setPeersLoading] = useState(false);
  const [connectAddr, setConnectAddr] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectResult, setConnectResult] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const fetchPeers = async () => {
    setPeersLoading(true);
    try {
      const res = await api.swarmPeers();
      setPeers(res.peers || []);
      setPeerCount(res.count || 0);
    } catch {
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
      const res = await api.swarmConnect(connectAddr);
      setConnectResult(res.Strings?.[0] || "Connected");
      setConnectAddr("");
      fetchPeers();
    } catch (e: any) {
      setConnectError(e.message);
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

  return (
    <PageShell title="Swarm" description="Peer connections and network">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Connect to Peer</CardTitle>
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
              />
              <Button
                onClick={handleConnect}
                disabled={!connectAddr.trim() || connectLoading}
              >
                {connectLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="mr-1 h-4 w-4" />
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Connected Peers</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{peerCount} peers</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchPeers}
                  disabled={peersLoading}
                  aria-label="Refresh peers"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${peersLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {peers.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No connected peers
              </p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Peer ID</TableHead>
                      <TableHead>Addresses</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {peers.map((p: any, i: number) => {
                      const peerId = p.peer || p.Peer || "";
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <PeerBadge peerId={peerId} />
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md space-y-0.5">
                              {(p.addrs || p.Addrs || [])
                                .slice(0, 2)
                                .map((addr: string, j: number) => (
                                  <div
                                    key={j}
                                    className="truncate text-xs text-muted-foreground"
                                  >
                                    {addr}
                                  </div>
                                ))}
                              {(p.addrs || p.Addrs || []).length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{(p.addrs || p.Addrs || []).length - 2} more
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDisconnect(peerId)}
                              disabled={disconnectLoading === peerId}
                              aria-label={`Disconnect from ${peerId.slice(0, 12)}`}
                            >
                              {disconnectLoading === peerId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Unplug className="h-4 w-4 text-destructive" />
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
