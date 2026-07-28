import { useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CidInput } from "@/components/shared/CidInput";
import { ResultCard } from "@/components/shared/ResultCard";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";

export default function DagPage() {
  // Put
  const [putJson, setPutJson] = useState('{\n  "hello": "world"\n}');
  const [putCodec, setPutCodec] = useState("dag-json");
  const [putResult, setPutResult] = useState<any>(null);
  const [putLoading, setPutLoading] = useState(false);
  const [putError, setPutError] = useState<string | null>(null);

  // Get
  const [getCid, setGetCid] = useState("");
  const [getResult, setGetResult] = useState<any>(null);
  const [getLoading, setGetLoading] = useState(false);
  const [getError, setGetError] = useState<string | null>(null);

  const handlePut = async () => {
    setPutLoading(true);
    setPutError(null);
    setPutResult(null);
    try {
      const data = JSON.parse(putJson);
      setPutResult(await api.dagPut(data, putCodec));
    } catch (e: any) {
      setPutError(e.message);
    } finally {
      setPutLoading(false);
    }
  };

  const handleGet = async () => {
    setGetLoading(true);
    setGetError(null);
    setGetResult(null);
    try {
      setGetResult(await api.dagGet(getCid));
    } catch (e: any) {
      setGetError(e.message);
    } finally {
      setGetLoading(false);
    }
  };

  return (
    <PageShell title="DAG" description="IPLD DAG node operations">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ArrowUpFromLine className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Put Node</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">
                Codec
              </label>
              <Select value={putCodec} onValueChange={(v) => v && setPutCodec(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dag-json">dag-json</SelectItem>
                  <SelectItem value="dag-cbor">dag-cbor</SelectItem>
                  <SelectItem value="raw">raw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={putJson}
              onChange={(e) => setPutJson(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter JSON data..."
            />
            <Button onClick={handlePut} disabled={putLoading}>
              {putLoading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="mr-1 h-4 w-4" />
              )}
              Store Node
            </Button>
            {putError && (
              <ResultCard success={false} title="Error">
                {putError}
              </ResultCard>
            )}
            {putResult && (
              <ResultCard success={true} title="Node Stored">
                <p className="text-sm">
                  <span className="text-muted-foreground">CID:</span>{" "}
                  <code className="text-accent">{putResult.Cid["/"]}</code>
                </p>
              </ResultCard>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <ArrowDownToLine className="h-5 w-5 text-accent" />
              </div>
              <CardTitle>Get Node</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CidInput
              value={getCid}
              onChange={setGetCid}
              onSubmit={handleGet}
              placeholder="Enter DAG CID..."
            />
            {getLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            )}
            {getError && (
              <ResultCard success={false} title="Error">
                {getError}
              </ResultCard>
            )}
            {getResult && (
              <div className="space-y-2">
                {getResult.Cid && (
                  <p className="text-sm text-muted-foreground">
                    CID: <code className="text-accent">{getResult.Cid["/"]}</code>
                  </p>
                )}
                {getResult.node_data ? (
                  <JsonViewer data={getResult.node_data} />
                ) : (
                  <JsonViewer data={getResult} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
