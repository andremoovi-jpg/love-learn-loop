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
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Webhook, Eye, RefreshCw, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WebhookEvent {
  id: string;
  integration_id: string;
  event_type: string;
  raw_payload: any;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
  integration?: {
    id: string;
    name: string;
    platform_type: string;
  };
}

const AdminWebhooks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const integrationFilter = searchParams.get('integration');

  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  // Redirect if not admin
  if (!user?.is_admin) {
    return <Navigate to="/dashboard" />;
  }

  const { data: webhookEvents = [], isLoading, refetch } = useQuery({
    queryKey: ['webhook-events', integrationFilter],
    queryFn: async () => {
      let query = supabase
        .from('webhook_events')
        .select(`
          *,
          integration:payment_integrations(id, name, platform_type)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filtrar por integração se especificado
      if (integrationFilter) {
        query = query.eq('integration_id', integrationFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching webhook events:', error);
        throw error;
      }

      return data as WebhookEvent[];
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const filteredEvents = webhookEvents.filter(event => {
    const matchesSearch = !searchTerm ||
      event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.error_message?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'processed' && event.processed) ||
      (statusFilter === 'failed' && !event.processed && event.error_message);

    const matchesEventType = eventTypeFilter === 'all' || event.event_type === eventTypeFilter;

    return matchesSearch && matchesStatus && matchesEventType;
  });

  const eventTypes = [...new Set(webhookEvents.map(event => event.event_type))];

  const viewPayload = (event: WebhookEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (event: WebhookEvent) => {
    if (event.processed) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Processado
        </Badge>
      );
    } else if (event.error_message) {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Falhou
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          Pendente
        </Badge>
      );
    }
  };

  const getPlatformEmoji = (platformType: string) => {
    const emojis: Record<string, string> = {
      hotmart: "🔥",
      eduzz: "📘",
      kiwify: "🥝",
      stripe: "💳",
      perfectpay: "💰",
      monetizze: "💵",
      braip: "🇧🇷",
      cartpanda: "🐼",
    };
    return emojis[platformType] || "📦";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar breadcrumbs={[
          { label: t('admin.dashboard'), href: '/admin' },
          { label: 'Webhooks' }
        ]} />

        <main className="p-6">
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

              <div className="flex-1 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Webhook className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-4xl font-bold">Webhooks Recebidos</h1>
                    <p className="text-muted-foreground">
                      Monitore todos os eventos recebidos das plataformas
                    </p>
                  </div>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
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
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
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

                <div className="text-sm text-muted-foreground flex items-center justify-center">
                  <strong>{filteredEvents.length}</strong>&nbsp;registros
                </div>
              </div>
            </Card>

            {/* Events Table */}
            <Card>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-4">Eventos Recebidos</h3>

                {isLoading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <Webhook className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg">
                      Nenhum webhook encontrado
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Configure uma integração e aguarde os primeiros eventos
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Integração</TableHead>
                        <TableHead>Tipo de Evento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-sm">
                            {formatDate(event.created_at)}
                          </TableCell>
                          <TableCell>
                            {event.integration ? (
                              <div className="flex items-center gap-2">
                                <span className="text-lg">
                                  {getPlatformEmoji(event.integration.platform_type)}
                                </span>
                                <span className="text-sm">{event.integration.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {event.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(event)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {event.error_message ? (
                              <span className="text-red-600 text-sm truncate block">
                                {event.error_message}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewPayload(event)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Dados
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

        {/* Payload Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Detalhes do Webhook - {selectedEvent?.event_type}
              </DialogTitle>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <strong className="text-sm">ID:</strong>
                    <p className="font-mono text-xs mt-1">{selectedEvent.id}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Status:</strong>
                    <div className="mt-1">{getStatusBadge(selectedEvent)}</div>
                  </div>
                  <div>
                    <strong className="text-sm">Integração:</strong>
                    <p className="text-sm mt-1">
                      {selectedEvent.integration?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <strong className="text-sm">Tipo de Evento:</strong>
                    <p className="text-sm mt-1">{selectedEvent.event_type}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Recebido em:</strong>
                    <p className="text-sm mt-1">{formatDate(selectedEvent.created_at)}</p>
                  </div>
                  <div>
                    <strong className="text-sm">Processado em:</strong>
                    <p className="text-sm mt-1">
                      {selectedEvent.processed_at
                        ? formatDate(selectedEvent.processed_at)
                        : '-'
                      }
                    </p>
                  </div>
                  {selectedEvent.error_message && (
                    <div className="col-span-2">
                      <strong className="text-sm">Erro:</strong>
                      <div className="text-red-600 text-sm mt-1 p-2 bg-red-50 rounded">
                        {selectedEvent.error_message}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payload */}
                <div>
                  <strong className="block mb-2 text-sm">Payload JSON Completo:</strong>
                  <ScrollArea className="h-96 w-full border rounded-md">
                    <pre className="p-4 text-xs">
                      {JSON.stringify(selectedEvent.raw_payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminWebhooks;