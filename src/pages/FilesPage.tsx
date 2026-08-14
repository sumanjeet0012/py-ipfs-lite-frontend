import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CidInput } from "@/components/shared/CidInput";
import { FileDropzone } from "@/components/shared/FileDropzone";
import { ResultCard } from "@/components/shared/ResultCard";
import { Upload, Download, Loader2 } from "lucide-react";

function downloadBlob(buf: ArrayBuffer, filename: string) {
  const blob = new Blob([buf]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function FilesPage() {
  const [searchParams] = useSearchParams();
  const [catCid, setCatCid] = useState(searchParams.get("cid") || "");
  const [catResult, setCatResult] = useState<string>("");
  const [catHex, setCatHex] = useState<string>("");
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [catBuf, setCatBuf] = useState<ArrayBuffer | null>(null);

  const [addResult, setAddResult] = useState<any>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addDownloading, setAddDownloading] = useState(false);

  useEffect(() => {
    const cid = searchParams.get("cid");
    if (cid) {
      setCatCid(cid);
      handleCat(cid);
    }
  }, [searchParams]);

  const handleCat = async (cid: string) => {
    setCatLoading(true);
    setCatError(null);
    setCatResult("");
    setCatHex("");
    setCatBuf(null);
    try {
      const buf = await api.cat(cid);
      setCatBuf(buf);
      const bytes = new Uint8Array(buf);
      const sample = bytes.slice(0, 4096);
      const isBinary =
        buf.byteLength > 0 &&
        (sample.includes(0) || new TextDecoder().decode(sample).includes("\uFFFD"));
      if (isBinary) {
        const hex = Array.from(bytes.slice(0, 100))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        setCatHex(hex + (buf.byteLength > 100 ? " ..." : ""));
        setCatResult(`[Binary data — ${formatBytes(buf.byteLength)}]`);
      } else {
        const text = new TextDecoder().decode(buf);
        setCatResult(text);
        const hex = Array.from(bytes.slice(0, 100))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ");
        setCatHex(hex + (buf.byteLength > 100 ? " ..." : ""));
      }
    } catch (e: any) {
      setCatError(e.message || "Failed to fetch");
    } finally {
      setCatLoading(false);
    }
  };

  const handleDownloadCat = async () => {
    if (!catBuf || !catCid) return;
    downloadBlob(catBuf, catCid);
  };

  const handleAdd = async (file: File) => {
    setAddLoading(true);
    setAddError(null);
    setAddResult(null);
    try {
      const result = await api.addFile(file);
      setAddResult(result);
    } catch (e: any) {
      setAddError(e.message || "Failed to add file");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDownloadAdded = async () => {
    if (!addResult?.Hash) return;
    setAddDownloading(true);
    try {
      const buf = await api.cat(addResult.Hash);
      downloadBlob(buf, addResult.Name || addResult.Hash);
    } catch (e: any) {
      setAddError(e.message || "Failed to download");
    } finally {
      setAddDownloading(false);
    }
  };

  return (
    <PageShell title="Files" description="Add and retrieve files">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Add File</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileDropzone onFile={handleAdd} />
            {addLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
            {addError && (
              <ResultCard success={false} title="Error">
                {addError}
              </ResultCard>
            )}
            {addResult && (
              <ResultCard success={true} title="File Added">
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {addResult.Name}
                  </p>
                  <p>
                    <span className="text-muted-foreground">CID:</span>{" "}
                    <code className="text-accent">{addResult.Hash}</code>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Size:</span>{" "}
                    {addResult.Size} bytes
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadAdded}
                    disabled={addDownloading}
                  >
                    {addDownloading ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="mr-1 h-3 w-3" />
                    )}
                    Download
                  </Button>
                </div>
              </ResultCard>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Download className="h-5 w-5 text-accent" />
              </div>
              <CardTitle>Fetch File (Cat)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <CidInput
              value={catCid}
              onChange={setCatCid}
              onSubmit={() => handleCat(catCid)}
              placeholder="Enter CID to fetch..."
            />
            {catLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching from IPFS network...
              </div>
            )}
            {catError && (
              <ResultCard success={false} title="Error">
                {catError}
              </ResultCard>
            )}
            {catResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {catResult.length} chars
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadCat}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={catResult}
                  className="min-h-[200px] font-mono text-sm"
                />
                {catHex && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">
                      Hex (first 100 bytes):
                    </p>
                    <code className="block rounded bg-secondary p-2 text-xs break-all">
                      {catHex}
                    </code>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
