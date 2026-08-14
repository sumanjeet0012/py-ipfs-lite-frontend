import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PeerBadge } from "@/components/shared/PeerBadge";
import { RefreshCw } from "lucide-react";

export default function DebugPage() {
  const [peerstore, setPeerstore] = useState<any>(null);
  const [routingTable, setRoutingTable] = useState<any>(null);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [loadingPeerstore, setLoadingPeerstore] = useState(false);
  const [loadingRouting, setLoadingRouting] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [peerstoreError, setPeerstoreError] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchPeerstore = async () => {
    setLoadingPeerstore(true);
    setPeerstoreError(null);
    try {
      const data = await api.debugPeerstore();
      setPeerstore(data);
    } catch (e: any) {
      setPeerstoreError(e.message || "Failed to fetch peerstore");
    } finally {
      setLoadingPeerstore(false);
    }
  };

  const fetchRoutingTable = async () => {
    setLoadingRouting(true);
    setRoutingError(null);
    try {
      const data = await api.debugRoutingTable();
      setRoutingTable(data);
    } catch (e: any) {
      setRoutingError(e.message || "Failed to fetch routing table");
    } finally {
      setLoadingRouting(false);
    }
  };

  const fetchConnectionStats = async () => {
    setLoadingConnections(true);
    setConnectionError(null);
    try {
      const data = await api.connectionStats();
      setConnectionStats(data);
    } catch (e: any) {
      setConnectionError(e.message || "Failed to fetch connection stats");
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchPeerstore();
    fetchRoutingTable();
    fetchConnectionStats();
  }, []);

  const renderPeerTable = (peerList: any[], loading: boolean, error: string | null) => {
    if (loading) {
      return (
        <p className="text-sm text-muted-foreground">Loading...</p>
      );
    }
    if (error) {
      return (
        <p className="text-sm text-destructive">{error}</p>
      );
    }
    if (!peerList || peerList.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No peers found.</p>
      );
    }
    return (
      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Peer ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {peerList.map((item: any, i: number) => {
              const peerId =
                typeof item === "string"
                  ? item
                  : item?.peer || item?.Peer || item?.id || item?.ID || JSON.stringify(item);
              return (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <PeerBadge peerId={peerId} showFull />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const peers = Array.isArray(peerstore?.peers)
    ? peerstore.peers
    : Array.isArray(peerstore)
    ? peerstore
    : [];
  const routes = Array.isArray(routingTable?.peers)
    ? routingTable.peers
    : Array.isArray(routingTable)
    ? routingTable
    : [];

  return (
    <PageShell
      title="Debug"
      description="Peerstore, routing table, and diagnostics"
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Peerstore ({peers.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPeerstore}
                disabled={loadingPeerstore}
                aria-label="Refresh peerstore"
              >
                <RefreshCw
                  className={`size-4 ${loadingPeerstore ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderPeerTable(peers, loadingPeerstore, peerstoreError)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Routing Table ({routes.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRoutingTable}
                disabled={loadingRouting}
                aria-label="Refresh routing table"
              >
                <RefreshCw
                  className={`size-4 ${loadingRouting ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderPeerTable(routes, loadingRouting, routingError)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Connection Stats</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchConnectionStats}
                disabled={loadingConnections}
                aria-label="Refresh connection stats"
              >
                <RefreshCw
                  className={`size-4 ${loadingConnections ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConnections ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : connectionError ? (
              <p className="text-sm text-destructive">{connectionError}</p>
            ) : connectionStats ? (
              <JsonViewer data={connectionStats} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No connection stats available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
