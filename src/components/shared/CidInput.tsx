import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface CidInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  label?: string;
}

export function CidInput({
  value,
  onChange,
  placeholder = "Enter CID...",
  onSubmit,
  label,
}: CidInputProps) {
  const isInvalid = value.length > 0 && value.length < 10;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex-1",
            isInvalid && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
          )}
        />
        {onSubmit && (
          <Button variant="default" onClick={onSubmit}>
            <Search className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
