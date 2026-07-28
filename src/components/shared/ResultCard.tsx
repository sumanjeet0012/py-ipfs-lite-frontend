import { cn } from "@/lib/cn";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface ResultCardProps {
  success: boolean;
  title: string;
  children: React.ReactNode;
}

export function ResultCard({ success, title, children }: ResultCardProps) {
  return (
    <Card
      className={cn(
        "border-l-4",
        success ? "border-l-green-500" : "border-l-red-500"
      )}
    >
      <CardContent>
        <div className="flex items-center gap-2">
          {success ? (
            <CheckCircle className="size-5 text-green-500" />
          ) : (
            <XCircle className="size-5 text-red-500" />
          )}
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
