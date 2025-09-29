import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MultiFileUploadProps {
  bucket: 'attachments' | 'community';
  files: Array<{ id: string; url: string; name?: string }>;
  onFilesChange: (files: Array<{ id: string; url: string; name?: string }>) => void;
  maxFiles?: number;
}

export function MultiFileUpload({
  bucket,
  files,
  onFilesChange,
  maxFiles = 5
}: MultiFileUploadProps) {
  const addFile = (url: string) => {
    const newFile = {
      id: crypto.randomUUID(),
      url,
      name: url.split('/').pop()
    };
    onFilesChange([...files, newFile]);
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Lista de arquivos existentes */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm truncate">{file.name || 'Arquivo'}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload de novo arquivo */}
      {files.length < maxFiles && (
        <FileUpload
          bucket={bucket}
          onUploadComplete={addFile}
          label={`Adicionar arquivo (${files.length}/${maxFiles})`}
          preview={false}
        />
      )}
    </div>
  );
}
