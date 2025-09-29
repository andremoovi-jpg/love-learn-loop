import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  bucket: 'avatars' | 'products' | 'attachments' | 'community';
  accept?: Record<string, string[]>;
  maxSize?: number;
  onUploadComplete: (url: string) => void;
  currentUrl?: string;
  className?: string;
  label?: string;
  preview?: boolean;
}

export function FileUpload({
  bucket,
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  },
  maxSize = 10 * 1024 * 1024, // 10MB default
  onUploadComplete,
  currentUrl,
  className,
  label = 'Arraste arquivos aqui ou clique para selecionar',
  preview = true
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [fileName, setFileName] = useState<string>('');

  // Update preview when currentUrl changes
  useEffect(() => {
    if (currentUrl) {
      setPreviewUrl(currentUrl);
    }
  }, [currentUrl]);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);
      setFileName(file.name);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Simular progresso para melhor UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('✅ Upload completo, URL:', publicUrl);

      setUploadProgress(100);
      setPreviewUrl(publicUrl);
      onUploadComplete(publicUrl);

      toast.success('Upload realizado com sucesso!');
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || 'Erro ao fazer upload');
      setUploadProgress(0);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validar tamanho
      if (file.size > maxSize) {
        toast.error(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`);
        return;
      }

      // Preview local imediato para imagens
      if (file.type.startsWith('image/') && preview) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      }

      uploadFile(file);
    }
  }, [maxSize, preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1
  });

  const removeFile = () => {
    setPreviewUrl(null);
    setFileName('');
    setUploadProgress(0);
    onUploadComplete('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          uploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />

        {previewUrl && preview && previewUrl.startsWith('http') && (
          <div className="mb-4">
            {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="mx-auto max-h-32 rounded-lg object-cover"
              />
            ) : (
              <div className="flex items-center justify-center">
                <FileIcon className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Solte o arquivo aqui' : label}
          </p>
          <p className="text-xs text-muted-foreground">
            Máximo: {maxSize / 1024 / 1024}MB
          </p>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="w-full max-w-xs space-y-2">
              <p className="text-sm text-center">{fileName}</p>
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                {uploadProgress}%
              </p>
            </div>
          </div>
        )}
      </div>

      {previewUrl && !uploading && (
        <div className="flex items-center justify-between p-2 border rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm truncate max-w-[200px]">
              {fileName || 'Arquivo enviado'}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
