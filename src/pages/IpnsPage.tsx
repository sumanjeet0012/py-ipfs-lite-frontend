import { useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { CidInput } from "@/components/shared/CidInput";
import { ResultCard } from "@/components/shared/ResultCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Search } from "lucide-react";

export default function IpnsPage() {
  const [publishPath, setPublishPath] = useState("");
  const [lifetime, setLifetime] = useState("24");
  const [publishResult, setPublishResult] = useState<any>(null);
  const [publishing, setPublishing] = useState(false);

  const [resolveName, setResolveName] = useState("");
  const [resolveResult, setResolveResult] = useState<any>(null);
  const [resolving, setResolving] = useState(false);

  const handlePublish = async () => {
    if (!publishPath.trim()) return;
    const lifetimeNum = parseInt(lifetime, 10);
    if (!lifetimeNum || lifetimeNum < 1) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const data = await api.namePublish(publishPath, `${lifetimeNum}h`);
      setPublishResult({ success: true, data });
    } catch (e: any) {
      setPublishResult({ success: false, message: e.message });
    } finally {
      setPublishing(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveName.trim()) return;
    setResolving(true);
    setResolveResult(null);
    try {
      const data = await api.nameResolve(resolveName);
      setResolveResult({ success: true, data });
    } catch (e: any) {
      setResolveResult({ success: false, message: e.message });
    } finally {
      setResolving(false);
    }
  };

  return (
    <PageShell
      title="IPNS"
      description="IPNS name publishing and resolution"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                IPFS Path
              </label>
              <Input
                value={publishPath}
                onChange={(e) => setPublishPath(e.target.value)}
                placeholder="/ipfs/Qm..."
                onKeyDown={(e) => e.key === "Enter" && publishPath.trim() && handlePublish()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">
                Lifetime (hours)
              </label>
              <Input
                type="number"
                value={lifetime}
                onChange={(e) => setLifetime(e.target.value)}
                placeholder="24"
                min="1"
              />
            </div>
            <Button onClick={handlePublish} disabled={publishing || !publishPath.trim() || !lifetime || parseInt(lifetime, 10) < 1}>
              <Send className="size-4" />
              {publishing ? "Publishing..." : "Publish"}
            </Button>
            {publishResult && (
              <ResultCard
                success={publishResult.success}
                title={
                  publishResult.success ? "Published" : "Publish Failed"
                }
              >
                {publishResult.success ? (
                  <div className="flex flex-col gap-1 font-mono text-xs">
                    <span>Name: {publishResult.data?.Name ?? JSON.stringify(publishResult.data)}</span>
                    {publishResult.data?.Value && <span>Value: {publishResult.data.Value}</span>}
                  </div>
                ) : (
                  <p>{publishResult.message}</p>
                )}
              </ResultCard>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CidInput
              value={resolveName}
              onChange={setResolveName}
              onSubmit={handleResolve}
              placeholder="Enter IPNS name..."
              label="IPNS Name"
            />
            <Button onClick={handleResolve} disabled={resolving || !resolveName.trim()}>
              <Search className="size-4" />
              {resolving ? "Resolving..." : "Resolve"}
            </Button>
            {resolveResult && (
              <ResultCard
                success={resolveResult.success}
                title={
                  resolveResult.success ? "Resolved" : "Resolve Failed"
                }
              >
                {resolveResult.success ? (
                  <p className="font-mono text-xs">
                    {resolveResult.data?.Path ?? JSON.stringify(resolveResult.data)}
                  </p>
                ) : (
                  <p>{resolveResult.message}</p>
                )}
              </ResultCard>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
