import { useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CidInput } from "@/components/shared/CidInput";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { ResultCard } from "@/components/shared/ResultCard";
import {
  Search,
  Download,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";

export default function BlocksPage() {
  const [activeTab, setActiveTab] = useState("stat");

  // Stat
  const [statCid, setStatCid] = useState("");
  const [statResult, setStatResult] = useState<any>(null);
  const [statLoading, setStatLoading] = useState(false);
  const [statError, setStatError] = useState<string | null>(null);

  // Get
  const [getCid, setGetCid] = useState("");
  const [getText, setGetText] = useState("");
  const [getHex, setGetHex] = useState("");
  const [getLoading, setGetLoading] = useState(false);
  const [getError, setGetError] = useState<string | null>(null);

  // Put
  const [putResult, setPutResult] = useState<any>(null);
  const [putLoading, setPutLoading] = useState(false);
  const [putError, setPutError] = useState<string | null>(null);

  // Rm
  const [rmCid, setRmCid] = useState("");
  const [rmResult, setRmResult] = useState<any>(null);
  const [rmLoading, setRmLoading] = useState(false);
  const [rmError, setRmError] = useState<string | null>(null);

  const handleStat = async () => {
    setStatLoading(true);
    setStatError(null);
    setStatResult(null);
    try {
      setStatResult(await api.blockStat(statCid));
    } catch (e: any) {
      setStatError(e.message);
    } finally {
      setStatLoading(false);
    }
  };

  const handleGet = async () => {
    setGetLoading(true);
    setGetError(null);
    setGetText("");
    setGetHex("");
    try {
      const buf = await api.blockGet(getCid);
      setGetText(new TextDecoder().decode(buf));
      setGetHex(
        Array.from(new Uint8Array(buf).slice(0, 100))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ") + (buf.byteLength > 100 ? " ..." : "")
      );
    } catch (e: any) {
      setGetError(e.message);
    } finally {
      setGetLoading(false);
    }
  };

  const handlePut = async (file: File) => {
    setPutLoading(true);
    setPutError(null);
    setPutResult(null);
    try {
      setPutResult(await api.blockPut(file));
    } catch (e: any) {
      setPutError(e.message);
    } finally {
      setPutLoading(false);
    }
  };

  const handleRm = async () => {
    setRmLoading(true);
    setRmError(null);
    setRmResult(null);
    try {
      setRmResult(await api.blockRm(rmCid));
    } catch (e: any) {
      setRmError(e.message);
    } finally {
      setRmLoading(false);
    }
  };

  return (
    <PageShell title="Blocks" description="Raw block operations">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="stat">
            <Search className="mr-1 h-4 w-4" /> Stat
          </TabsTrigger>
          <TabsTrigger value="get">
            <Download className="mr-1 h-4 w-4" /> Get
          </TabsTrigger>
          <TabsTrigger value="put">
            <Upload className="mr-1 h-4 w-4" /> Put
          </TabsTrigger>
          <TabsTrigger value="rm">
            <Trash2 className="mr-1 h-4 w-4" /> Remove
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stat">
          <Card>
            <CardHeader>
              <CardTitle>Block Stat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CidInput
                value={statCid}
                onChange={setStatCid}
                onSubmit={handleStat}
                placeholder="Enter block CID..."
              />
              {statLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                </div>
              )}
              {statError && (
                <ResultCard success={false} title="Error">
                  {statError}
                </ResultCard>
              )}
              {statResult && (
                <ResultCard success={true} title="Block Info">
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Key:</span>{" "}
                      <code>{statResult.Key}</code>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Size:</span>{" "}
                      <Badge>{statResult.Size} bytes</Badge>
                    </p>
                  </div>
                </ResultCard>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="get">
          <Card>
            <CardHeader>
              <CardTitle>Block Get</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CidInput
                value={getCid}
                onChange={setGetCid}
                onSubmit={handleGet}
                placeholder="Enter block CID..."
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
              {getText && (
                <div className="space-y-3">
                  <Badge variant="secondary">{getText.length} chars</Badge>
                  <Textarea
                    readOnly
                    value={getText}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  {getHex && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Hex (first 100 bytes):
                      </p>
                      <code className="block rounded bg-secondary p-2 text-xs break-all">
                        {getHex}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="put">
          <Card>
            <CardHeader>
              <CardTitle>Block Put</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileDropzone onFile={handlePut} />
              {putLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </div>
              )}
              {putError && (
                <ResultCard success={false} title="Error">
                  {putError}
                </ResultCard>
              )}
              {putResult && (
                <ResultCard success={true} title="Block Stored">
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Key:</span>{" "}
                      <code className="text-accent">{putResult.Key}</code>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Size:</span>{" "}
                      {putResult.Size} bytes
                    </p>
                  </div>
                </ResultCard>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rm">
          <Card>
            <CardHeader>
              <CardTitle>Block Remove</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CidInput
                value={rmCid}
                onChange={setRmCid}
                onSubmit={handleRm}
                placeholder="Enter block CID to remove..."
              />
              <Button
                variant="destructive"
                onClick={handleRm}
                disabled={!rmCid || rmLoading}
              >
                {rmLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                Remove Block
              </Button>
              {rmError && (
                <ResultCard success={false} title="Error">
                  {rmError}
                </ResultCard>
              )}
              {rmResult && (
                <ResultCard success={true} title="Block Removed">
                  <code className="text-sm">{rmResult.Hash}</code>
                </ResultCard>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
