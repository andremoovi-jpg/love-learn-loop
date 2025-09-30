import { FileText, Image, Video, FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

interface FilePreviewProps {
  url: string;
  name?: string;
  type?: string;
  showDownload?: boolean;
  topicId?: string;
  replyId?: string;
}

export function FilePreview({ url, name, type, showDownload = true, topicId, replyId }: FilePreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = () => {
    if (type === 'pdf' || url.endsWith('.pdf')) return FileText;
    if (type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return Image;
    if (type === 'video' || url.match(/\.(mp4|webm|ogg)$/i)) return Video;
    return FileIcon;
  };

  const Icon = getFileIcon();

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Extrair caminho do arquivo da URL
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/attachments\/(.+)/);
      const filePath = pathMatch ? pathMatch[1] : url.split('/attachments/')[1];

      if (!filePath) {
        throw new Error('Invalid file path');
      }

      // Chamar edge function para gerar signed URL segura
      const { data, error } = await supabase.functions.invoke('download-attachment', {
        body: { filePath, topicId, replyId }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Failed to generate download URL');

      // Abrir URL assinada
      window.open(data.url, '_blank');
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo. Verifique suas permissões.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[200px]">
          {name || 'Arquivo'}
        </span>
      </div>

      {showDownload && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
