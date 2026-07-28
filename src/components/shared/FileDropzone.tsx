import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Upload, FileIcon, X } from "lucide-react";

interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
}

export function FileDropzone({ onFile, accept }: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
        onFile(acceptedFiles[0]);
      }
    },
    [onFile]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedFile(null);
    },
    []
  );

  const acceptMap = accept
    ? { [accept.split("/")[0]]: [accept] }
    : undefined;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
    >
      <input {...getInputProps()} />
      {selectedFile ? (
        <>
          <FileIcon className="size-8 text-primary" />
          <p className="text-sm text-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(selectedFile.size)}
          </p>
          <button
            type="button"
            onClick={handleClear}
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear
          </button>
        </>
      ) : (
        <>
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm text-foreground">
            {isDragActive ? "Drop file here" : "Drag & drop a file, or click to select"}
          </p>
          {accept && (
            <p className="text-xs text-muted-foreground">
              Accepted: {accept}
            </p>
          )}
        </>
      )}
    </div>
  );
}
