import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { PageShell } from "@/components/layout/PageShell";
import { StatGrid } from "@/components/shared/StatGrid";
import { ResultCard } from "@/components/shared/ResultCard";
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
import { RefreshCw, Trash2 } from "lucide-react";

export default function RepoPage() {
  const [stats, setStats] = useState<any>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [gcResult, setGcResult] = useState<any>(null);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loadingGc, setLoadingGc] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.repoStat();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch repo stats", e);
    }
  };

  const fetchRefs = async () => {
    setLoadingRefs(true);
    try {
      const data = await api.refsLocal();
      setRefs(data.Refs ?? []);
    } catch (e) {
      console.error("Failed to fetch refs", e);
    } finally {
      setLoadingRefs(false);
    }
  };

  const handleGc = async () => {
    setLoadingGc(true);
    setGcResult(null);
    try {
      const data = await api.repoGc();
      setGcResult({ success: true, data });
    } catch (e: any) {
      setGcResult({ success: false, message: e.message });
    } finally {
      setLoadingGc(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRefs();
  }, []);

  const statItems = stats
    ? [
        { label: "NumObjects", value: stats.NumObjects ?? 0 },
        {
          label: "RepoSize",
          value: formatBytes(Number(stats.RepoSize ?? 0)),
        },
        { label: "RepoPath", value: stats.RepoPath ?? "-" },
        { label: "Version", value: stats.Version ?? "-" },
      ]
    : [];

  return (
    <PageShell title="Repo" description="Repository statistics and management">
      <div className="flex flex-col gap-6">
        {stats && <StatGrid stats={statItems} />}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Local References</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRefs}
                disabled={loadingRefs}
              >
                <RefreshCw
                  className={`size-4 ${loadingRefs ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {refs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No references found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refs.map((ref, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        {ref.Ref}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Garbage Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleGc}
              disabled={loadingGc}
            >
              <Trash2 className="size-4" />
              {loadingGc ? "Running..." : "Run GC"}
            </Button>
            {gcResult && (
              <div className="mt-4">
                <ResultCard
                  success={gcResult.success}
                  title={gcResult.success ? "GC Completed" : "GC Failed"}
                >
                  {gcResult.success ? (
                    <p className="font-mono text-xs">
                      {JSON.stringify(gcResult.data)}
                    </p>
                  ) : (
                    <p>{gcResult.message}</p>
                  )}
                </ResultCard>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
