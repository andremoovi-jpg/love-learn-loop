import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Webhook, Eye, RefreshCw, Filter, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WebhookLog {
  id: string;
  event_type: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

const AdminWebhooks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');

  // Redirect if not admin
  if (!user?.is_admin) {
    return <Navigate to="/dashboard" />;
  }

  const { data: webhookLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching webhook logs:', error);
        throw error;
      }

      return data as WebhookLog[];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const filteredLogs = webhookLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.error_message?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'processed' && log.processed) ||
      (statusFilter === 'failed' && !log.processed);
    
    const matchesEvent = eventFilter === 'all' || log.event_type === eventFilter;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  const eventTypes = [...new Set(webhookLogs.map(log => log.event_type))];

  const viewPayload = (log: WebhookLog) => {
    setSelectedLog(log);
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusBadge = (log: WebhookLog) => {
    if (log.processed) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Processado</Badge>;
    } else {
      return <Badge variant="destructive">Falhou</Badge>;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Webhook className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold">{t('admin.webhooks')}</h1>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Buscar por evento ou erro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="processed">Processados</SelectItem>
                      <SelectItem value="failed">Falharam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Eventos</SelectItem>
                      {eventTypes.map(event => (
                        <SelectItem key={event} value={event}>
                          {event}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground flex items-center">
                  Total: {filteredLogs.length} registros
                </div>
              </div>
            </Card>

            {/* Logs Table */}
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Logs de Webhooks</h3>
                
                {isLoading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum webhook encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {log.error_message ? (
                              <span className="text-red-600 text-sm truncate block">
                                {log.error_message}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewPayload(log)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Payload
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      {/* Payload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Payload - {selectedLog?.event_type}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <strong>ID:</strong> {selectedLog.id}
                </div>
                <div>
                  <strong>Status:</strong> {getStatusBadge(selectedLog)}
                </div>
                <div>
                  <strong>Criado:</strong> {formatDate(selectedLog.created_at)}
                </div>
                <div>
                  <strong>Atualizado:</strong> {formatDate(selectedLog.updated_at)}
                </div>
                {selectedLog.error_message && (
                  <div className="col-span-2">
                    <strong>Erro:</strong> 
                    <div className="text-red-600 mt-1">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}
              </div>

              {/* Payload */}
              <div>
                <strong className="block mb-2">Payload JSON:</strong>
                <ScrollArea className="h-96 w-full border rounded-md">
                  <pre className="p-4 text-sm">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWebhooks;