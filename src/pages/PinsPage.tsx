import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CidInput } from "@/components/shared/CidInput";
import { ResultCard } from "@/components/shared/ResultCard";
import {
  Pin,
  PinOff,
  List,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function PinsPage() {
  // Pin
  const [pinCid, setPinCid] = useState("");
  const [pinResult, setPinResult] = useState<any>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Unpin
  const [unpinCid, setUnpinCid] = useState("");
  const [unpinResult, setUnpinResult] = useState<any>(null);
  const [unpinLoading, setUnpinLoading] = useState(false);
  const [unpinError, setUnpinError] = useState<string | null>(null);

  // List
  const [pins, setPins] = useState<Record<string, { Type: string }>>({});
  const [pinsLoading, setPinsLoading] = useState(false);

  const fetchPins = async () => {
    setPinsLoading(true);
    try {
      const res = await api.pinLs();
      setPins(res.Keys || {});
    } catch {
    } finally {
      setPinsLoading(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, []);

  const handlePin = async () => {
    setPinLoading(true);
    setPinError(null);
    setPinResult(null);
    try {
      setPinResult(await api.pinAdd(pinCid));
      fetchPins();
    } catch (e: any) {
      setPinError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  const handleUnpin = async () => {
    setUnpinLoading(true);
    setUnpinError(null);
    setUnpinResult(null);
    try {
      setUnpinResult(await api.pinRm(unpinCid));
      fetchPins();
    } catch (e: any) {
      setUnpinError(e.message);
    } finally {
      setUnpinLoading(false);
    }
  };

  const pinEntries = Object.entries(pins);

  return (
    <PageShell title="Pins" description="Pin and unpin content">
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pin className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Pin</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CidInput
                value={pinCid}
                onChange={setPinCid}
                onSubmit={handlePin}
                placeholder="Enter CID to pin..."
              />
              <Button onClick={handlePin} disabled={!pinCid || pinLoading}>
                {pinLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Pin className="mr-1 h-4 w-4" />
                )}
                Pin
              </Button>
              {pinError && (
                <ResultCard success={false} title="Error">
                  {pinError}
                </ResultCard>
              )}
              {pinResult && (
                <ResultCard success={true} title="Pinned">
                  <code className="text-sm">{pinResult.Pins?.[0]}</code>
                </ResultCard>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <PinOff className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle>Unpin</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CidInput
                value={unpinCid}
                onChange={setUnpinCid}
                onSubmit={handleUnpin}
                placeholder="Enter CID to unpin..."
              />
              <Button
                variant="destructive"
                onClick={handleUnpin}
                disabled={!unpinCid || unpinLoading}
              >
                {unpinLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <PinOff className="mr-1 h-4 w-4" />
                )}
                Unpin
              </Button>
              {unpinError && (
                <ResultCard success={false} title="Error">
                  {unpinError}
                </ResultCard>
              )}
              {unpinResult && (
                <ResultCard success={true} title="Unpinned">
                  <code className="text-sm">{unpinResult.Pins?.[0]}</code>
                </ResultCard>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <List className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>Pinned Content</CardTitle>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchPins}
                disabled={pinsLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${pinsLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pinEntries.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No pinned content
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CID</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pinEntries.map(([cid, info]) => (
                      <TableRow key={cid}>
                        <TableCell>
                          <code className="text-xs">{cid}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{info.Type}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
