import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatGrid } from "@/components/shared/StatGrid";
import {
  Server,
  Users,
  Database,
  Copy,
  ExternalLink,
  Loader2,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState<any>(null);
  const [identity, setIdentity] = useState<any>(null);
  const [repoStat, setRepoStat] = useState<any>(null);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [fetchCid, setFetchCid] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [v, id, rs, sp] = await Promise.allSettled([
        api.version(),
        api.id(),
        api.repoStat(),
        api.swarmPeers(),
      ]);
      if (v.status === "fulfilled") setVersion(v.value);
      if (id.status === "fulfilled") setIdentity(id.value);
      if (rs.status === "fulfilled") setRepoStat(rs.value);
      if (sp.status === "fulfilled") setPeerCount(sp.value.count ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  const copyId = () => {
    if (identity?.ID) {
      navigator.clipboard.writeText(identity.ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stats = [
    { label: "Version", value: version?.Version ?? "..." },
    { label: "Objects", value: repoStat?.NumObjects ?? "..." },
    {
      label: "Repo Size",
      value: repoStat ? formatBytes(repoStat.RepoSize) : "...",
    },
    { label: "Connected Peers", value: peerCount },
  ];

  return (
    <PageShell
      title="Dashboard"
      description="Node overview and quick actions"
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Node Identity</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Peer ID:</span>
                <code className="flex-1 truncate rounded bg-secondary px-2 py-1 text-sm">
                  {identity?.ID ?? "N/A"}
                </code>
                <Button variant="ghost" size="sm" onClick={copyId}>
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied!" : ""}
                </Button>
              </div>
              {identity?.Addresses && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    Addresses:
                  </span>
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    {identity.Addresses.map((addr: string, i: number) => (
                      <div
                        key={i}
                        className="truncate rounded bg-secondary/50 px-2 py-0.5 text-xs font-mono"
                      >
                        {addr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <StatGrid stats={stats} />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <ExternalLink className="h-5 w-5 text-accent" />
                </div>
                <CardTitle>Quick Fetch</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a CID to fetch..."
                  value={fetchCid}
                  onChange={(e) => setFetchCid(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    fetchCid &&
                    navigate(`/files?cid=${fetchCid}`)
                  }
                />
                <Button
                  onClick={() => fetchCid && navigate(`/files?cid=${fetchCid}`)}
                  disabled={!fetchCid}
                >
                  Fetch
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Database className="h-5 w-5 text-success" />
                </div>
                <CardTitle>Repository</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Path:</span>
                  <p className="font-mono text-xs">
                    {repoStat?.RepoPath ?? "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>
                  <p>
                    <Badge variant="secondary">
                      {repoStat?.Version ?? "N/A"}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
