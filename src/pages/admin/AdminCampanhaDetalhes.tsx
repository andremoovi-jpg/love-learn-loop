import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Users,
  Send as SendIcon,
  CheckCircle,
  XCircle,
  MousePointerClick,
  Eye,
  Edit,
  Play,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// Tipos
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'both';
  status: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface CampaignSend {
  id: string;
  campaign_id: string;
  user_id: string;
  channel: 'email' | 'whatsapp';
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
  recipient: string;
  profiles?: {
    full_name: string;
  };
}

export default function AdminCampanhaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Campanhas", href: "/admin/campanhas" },
    { label: campaign?.name || "Detalhes" },
  ];

  // Carregar dados
  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Buscar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData as Campaign);

      // Buscar envios
      const { data: sendsData, error: sendsError } = await supabase
        .from("campaign_sends")
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      if (sendsError) throw sendsError;
      setSends(sendsData as CampaignSend[] || []);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar detalhes da campanha");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar envios
  const filteredSends = sends.filter((send) => {
    const matchesSearch =
      !searchTerm ||
      send.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      send.recipient?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || send.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calcular taxas
  const getDeliveryRate = () => {
    if (!campaign || campaign.total_sent === 0) return 0;
    return (campaign.total_delivered / campaign.total_sent) * 100;
  };

  const getOpenRate = () => {
    if (!campaign || campaign.total_delivered === 0) return 0;
    return (campaign.total_opened / campaign.total_delivered) * 100;
  };

  const getClickRate = () => {
    if (!campaign || campaign.total_opened === 0) return 0;
    return (campaign.total_clicked / campaign.total_opened) * 100;
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; className?: string }> = {
      pending: { label: "Pendente", variant: "secondary" },
      sent: { label: "Enviado", variant: "default", className: "bg-blue-500" },
      delivered: { label: "Entregue", variant: "default", className: "bg-green-500" },
      opened: { label: "Aberto", variant: "default", className: "bg-purple-500" },
      clicked: { label: "Clicado", variant: "default", className: "bg-orange-500" },
      failed: { label: "Falhou", variant: "destructive" },
      bounced: { label: "Rejeitado", variant: "destructive" },
    };

    const cfg = config[status] || config.pending;
    return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>;
  };

  // Campaign status badge
  const getCampaignStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; className?: string }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      scheduled: { label: "Agendada", variant: "default", className: "bg-blue-500" },
      sending: { label: "Enviando", variant: "default", className: "bg-yellow-500" },
      completed: { label: "Concluída", variant: "default", className: "bg-green-500" },
      cancelled: { label: "Cancelada", variant: "destructive" },
    };

    const cfg = config[status] || config.draft;
    return <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>;
  };

  // Tipo de campanha
  const getCampaignTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      email: "📧 Email",
      whatsapp: "📱 WhatsApp",
      both: "📧📱 Email + WhatsApp",
    };
    return types[type] || type;
  };

  // Canal icon
  const getChannelIcon = (channel: string) => {
    return channel === "email" ? (
      <Mail className="h-4 w-4" />
    ) : (
      <MessageCircle className="h-4 w-4" />
    );
  };

  // Executar campanha
  const handleExecute = async () => {
    if (!campaign) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          status: "sending",
          started_at: new Date().toISOString()
        })
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success("Campanha iniciada! O n8n está processando.");
      loadData();
    } catch (error: any) {
      console.error("Erro ao executar:", error);
      toast.error("Erro ao executar campanha");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Campanha não encontrada</h1>
          <Button onClick={() => navigate("/admin/campanhas")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar breadcrumbs={breadcrumbs} />

        <main className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/campanhas")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{campaign.name}</h1>
                  {getCampaignStatusBadge(campaign.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{getCampaignTypeLabel(campaign.type)}</span>
                  <span>•</span>
                  <span>Criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}</span>
                  {campaign.started_at && (
                    <>
                      <span>•</span>
                      <span>Iniciada em {new Date(campaign.started_at).toLocaleDateString("pt-BR")}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {(campaign.status === "draft" || campaign.status === "scheduled") && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/campanhas/${campaign.id}/editar`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                )}
                {campaign.status === "scheduled" && (
                  <Button onClick={handleExecute}>
                    <Play className="mr-2 h-4 w-4" />
                    Executar
                  </Button>
                )}
              </div>
            </div>

            {/* Estatísticas Gerais */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Estatísticas Gerais
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* Total */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Total de Destinatários
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_recipients}</p>
                  </CardContent>
                </Card>

                {/* Enviados */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <SendIcon className="h-4 w-4" />
                      Enviados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_sent}</p>
                  </CardContent>
                </Card>

                {/* Entregues */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Entregues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_delivered}</p>
                  </CardContent>
                </Card>

                {/* Abertos */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Abertos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_opened}</p>
                  </CardContent>
                </Card>

                {/* Clicados */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <MousePointerClick className="h-4 w-4" />
                      Clicados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_clicked}</p>
                  </CardContent>
                </Card>

                {/* Falhas */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      Falhas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{campaign.total_failed}</p>
                  </CardContent>
                </Card>

                {/* Taxa de Entrega */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Taxa de Entrega</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{getDeliveryRate().toFixed(1)}%</p>
                  </CardContent>
                </Card>

                {/* Taxa de Abertura */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Taxa de Abertura</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{getOpenRate().toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Taxa de Entrega</span>
                    <span className="font-medium">{getDeliveryRate().toFixed(1)}%</span>
                  </div>
                  <Progress value={getDeliveryRate()} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Taxa de Abertura</span>
                    <span className="font-medium">{getOpenRate().toFixed(1)}%</span>
                  </div>
                  <Progress value={getOpenRate()} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Taxa de Clique</span>
                    <span className="font-medium">{getClickRate().toFixed(1)}%</span>
                  </div>
                  <Progress value={getClickRate()} className="h-2" />
                </div>
              </div>
            </div>

            {/* Lista de Envios */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📋 Envios ({filteredSends.length})</CardTitle>
                    <CardDescription>
                      Lista de todos os destinatários desta campanha
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filtros */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="opened">Aberto</SelectItem>
                      <SelectItem value="clicked">Clicado</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabela */}
                {filteredSends.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {sends.length === 0 ? (
                      <>
                        <p className="text-lg mb-2">Nenhum envio ainda</p>
                        <p className="text-sm">
                          Os envios aparecerão aqui quando a campanha for executada
                        </p>
                      </>
                    ) : (
                      <p>Nenhum envio encontrado com os filtros selecionados</p>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSends.map((send) => (
                        <TableRow key={send.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {send.profiles?.full_name || "Usuário"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {send.recipient || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getChannelIcon(send.channel)}
                              <span className="capitalize">{send.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(send.status)}
                              {send.error_message && (
                                <p className="text-xs text-red-600">
                                  {send.error_message}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {send.clicked_at ? (
                                <p>Clicado: {new Date(send.clicked_at).toLocaleString("pt-BR")}</p>
                              ) : send.opened_at ? (
                                <p>Aberto: {new Date(send.opened_at).toLocaleString("pt-BR")}</p>
                              ) : send.delivered_at ? (
                                <p>Entregue: {new Date(send.delivered_at).toLocaleString("pt-BR")}</p>
                              ) : send.sent_at ? (
                                <p>Enviado: {new Date(send.sent_at).toLocaleString("pt-BR")}</p>
                              ) : (
                                <p className="text-muted-foreground">Aguardando...</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
