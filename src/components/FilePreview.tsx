import { FileText, Image, Video, FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
  url: string;
  name?: string;
  type?: string;
  showDownload?: boolean;
}

export function FilePreview({ url, name, type, showDownload = true }: FilePreviewProps) {
  const getFileIcon = () => {
    if (type === 'pdf' || url.endsWith('.pdf')) return FileText;
    if (type === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return Image;
    if (type === 'video' || url.match(/\.(mp4|webm|ogg)$/i)) return Video;
    return FileIcon;
  };

  const Icon = getFileIcon();

  const handleDownload = () => {
    window.open(url, '_blank');
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
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
