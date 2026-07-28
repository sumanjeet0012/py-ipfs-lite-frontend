import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

export default function DebugPage() {
  const [peerstore, setPeerstore] = useState<any>(null);
  const [routingTable, setRoutingTable] = useState<any>(null);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [loadingPeerstore, setLoadingPeerstore] = useState(false);
  const [loadingRouting, setLoadingRouting] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const fetchPeerstore = async () => {
    setLoadingPeerstore(true);
    try {
      const data = await api.debugPeerstore();
      setPeerstore(data);
    } catch (e) {
      console.error("Failed to fetch peerstore", e);
    } finally {
      setLoadingPeerstore(false);
    }
  };

  const fetchRoutingTable = async () => {
    setLoadingRouting(true);
    try {
      const data = await api.debugRoutingTable();
      setRoutingTable(data);
    } catch (e) {
      console.error("Failed to fetch routing table", e);
    } finally {
      setLoadingRouting(false);
    }
  };

  const fetchConnectionStats = async () => {
    setLoadingConnections(true);
    try {
      const data = await api.connectionStats();
      setConnectionStats(data);
    } catch (e) {
      console.error("Failed to fetch connection stats", e);
    } finally {
      setLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchPeerstore();
    fetchRoutingTable();
    fetchConnectionStats();
  }, []);

  const renderPeerTable = (peers: any[] | undefined) => {
    if (!peers || peers.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No peers found.</p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Peer ID</TableHead>
            <TableHead>Addresses</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {peers.map((peer: any, i: number) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">
                {peer.ID}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {peer.Addrs?.join(", ") ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const peers = peerstore?.Peers ?? [];
  const routes = routingTable?.Peers ?? [];

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
              >
                <RefreshCw
                  className={`size-4 ${loadingPeerstore ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderPeerTable(peers)}</CardContent>
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
              >
                <RefreshCw
                  className={`size-4 ${loadingRouting ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>{renderPeerTable(routes)}</CardContent>
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
              >
                <RefreshCw
                  className={`size-4 ${loadingConnections ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {connectionStats ? (
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
