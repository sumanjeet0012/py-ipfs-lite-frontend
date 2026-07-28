import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/cn";
import { Upload, FileIcon } from "lucide-react";

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
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
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
