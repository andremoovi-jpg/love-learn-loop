import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Mail,
  MessageCircle,
  Edit,
  Trash2,
  Play,
  Eye,
  Users,
  Send as SendIcon,
  MousePointerClick,
  CheckCircle,
  Clock,
  Rocket,
  XCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'both';
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';
  filters: any;
  email_subject: string | null;
  email_template: string | null;
  whatsapp_template: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminCampanhas() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [campaignToExecute, setCampaignToExecute] = useState<Campaign | null>(null);

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Campanhas" },
  ];

  // Load campaigns
  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCampaigns((data || []) as Campaign[]);
    } catch (error: any) {
      console.error("Erro ao carregar campanhas:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  // Create new campaign (draft)
  const handleCreate = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{
          name: `Nova Campanha ${new Date().toLocaleDateString("pt-BR")}`,
          type: "email",
          status: "draft",
          filters: {},
          total_recipients: 0,
          total_sent: 0,
          total_delivered: 0,
          total_failed: 0,
          total_opened: 0,
          total_clicked: 0,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Campanha criada! Configure os detalhes.");
      navigate(`/admin/campanhas/${data.id}/editar`);
    } catch (error: any) {
      console.error("Erro ao criar campanha:", error);
      toast.error("Erro ao criar campanha");
    }
  };

  // Delete campaign
  const handleDelete = async () => {
    if (!campaignToDelete) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignToDelete);

      if (error) throw error;

      toast.success("Campanha excluída com sucesso!");
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      loadCampaigns();
    } catch (error: any) {
      console.error("Erro ao deletar campanha:", error);
      toast.error("Erro ao deletar campanha");
    }
  };

  // Execute campaign
  const handleExecute = async () => {
    if (!campaignToExecute) return;

    try {
      // 1. Atualizar status da campanha para "sending"
      const { error: updateError } = await supabase
        .from("campaigns")
        .update({
          status: "sending",
          started_at: new Date().toISOString()
        })
        .eq("id", campaignToExecute.id);

      if (updateError) throw updateError;

      // 2. Buscar URL do webhook n8n configurado
      const { data: webhookConfig, error: configError } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "n8n_webhooks")
        .single();

      if (configError) {
        console.error("Erro ao buscar configuração n8n:", configError);
        toast.error("Webhook do n8n não configurado. Vá em Configurações > n8n");
        
        // Reverter status
        await supabase
          .from("campaigns")
          .update({ status: "scheduled" })
          .eq("id", campaignToExecute.id);
        return;
      }

      // 3. Extrair URL do webhook execute_campaign
      const webhooks = webhookConfig?.setting_value as any;
      const n8nUrl = webhooks?.execute_campaign;

      if (!n8nUrl) {
        toast.error("Webhook 'execute_campaign' não configurado. Configure em Configurações > n8n");
        
        // Reverter status
        await supabase
          .from("campaigns")
          .update({ status: "scheduled" })
          .eq("id", campaignToExecute.id);
        return;
      }

      // 4. Chamar webhook do n8n para executar a campanha
      const n8nResponse = await fetch(n8nUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaign_id: campaignToExecute.id
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`Erro ao chamar n8n: ${n8nResponse.status} ${n8nResponse.statusText}`);
      }

      toast.success("Campanha enviada para processamento com sucesso!");
      setExecuteDialogOpen(false);
      setCampaignToExecute(null);
      loadCampaigns();

    } catch (error: any) {
      console.error("Error executing campaign:", error);
      toast.error(error.message || "Erro ao executar campanha");

      // Reverter status se houve erro
      await supabase
        .from("campaigns")
        .update({ status: "scheduled" })
        .eq("id", campaignToExecute.id);
    }
  };

  // Filter campaigns by status
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (statusFilter === "all") return true;
    return campaign.status === statusFilter;
  });

  // Campaign type icon
  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-5 w-5" />;
      case "whatsapp":
        return <MessageCircle className="h-5 w-5" />;
      case "both":
        return (
          <div className="flex gap-1">
            <Mail className="h-4 w-4" />
            <MessageCircle className="h-4 w-4" />
          </div>
        );
      default:
        return <SendIcon className="h-5 w-5" />;
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      draft: {
        label: "Rascunho",
        variant: "secondary",
        icon: <FileText className="h-3 w-3 mr-1" />,
      },
      scheduled: {
        label: "Agendada",
        variant: "default",
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      sending: {
        label: "Enviando",
        variant: "default",
        icon: <Rocket className="h-3 w-3 mr-1" />,
      },
      completed: {
        label: "Concluída",
        variant: "default",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      cancelled: {
        label: "Cancelada",
        variant: "destructive",
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <Badge
        variant={config.variant}
        className={
          status === "completed" ? "bg-green-500" :
          status === "sending" ? "bg-yellow-500" :
          status === "scheduled" ? "bg-blue-500" :
          ""
        }
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Campaign type label
  const getCampaignTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      email: "Email",
      whatsapp: "WhatsApp",
      both: "Email + WhatsApp",
    };
    return types[type] || type;
  };

  // Permission checks
  const canEdit = (campaign: Campaign) => {
    return ["draft", "scheduled"].includes(campaign.status);
  };

  const canExecute = (campaign: Campaign) => {
    return campaign.status === "scheduled";
  };

  const canDelete = (campaign: Campaign) => {
    return ["draft", "scheduled", "cancelled"].includes(campaign.status);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar breadcrumbs={breadcrumbs} />

        <main className="p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">Campanhas de Marketing</h1>
                <p className="text-muted-foreground">
                  Crie e gerencie campanhas de Email e WhatsApp segmentadas
                </p>
              </div>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="scheduled">Agendada</SelectItem>
                      <SelectItem value="sending">Enviando</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>{filteredCampaigns.length}</strong> campanha(s)
                </div>
              </div>
            </Card>

            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="h-32 bg-muted" />
                    <CardContent className="h-48 bg-muted/50" />
                  </Card>
                ))}
              </div>
            ) : filteredCampaigns.length === 0 ? (
              // Empty state
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">📧</div>
                <h3 className="text-2xl font-bold mb-2">
                  {statusFilter === "all"
                    ? "Nenhuma campanha criada ainda"
                    : "Nenhuma campanha com este status"
                  }
                </h3>
                <p className="text-muted-foreground mb-6">
                  {statusFilter === "all"
                    ? "Crie sua primeira campanha de marketing para enviar mensagens segmentadas"
                    : "Tente selecionar outro filtro"
                  }
                </p>
                {statusFilter === "all" && (
                  <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Campanha
                  </Button>
                )}
              </Card>
            ) : (
              // Campaign cards
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getCampaignTypeIcon(campaign.type)}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-1">
                              {campaign.name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {getCampaignTypeLabel(campaign.type)}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Statistics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Users className="h-3 w-3" />
                            Destinatários
                          </div>
                          <p className="text-2xl font-bold">{campaign.total_recipients}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <SendIcon className="h-3 w-3" />
                            Enviados
                          </div>
                          <p className="text-2xl font-bold">{campaign.total_sent}</p>
                        </div>
                      </div>

                      {/* Email statistics */}
                      {(campaign.type === "email" || campaign.type === "both") && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Mail className="h-3 w-3" />
                              Abertos
                            </div>
                            <p className="text-lg font-bold">{campaign.total_opened}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <MousePointerClick className="h-3 w-3" />
                              Cliques
                            </div>
                            <p className="text-lg font-bold">{campaign.total_clicked}</p>
                          </div>
                        </div>
                      )}

                      {/* Date */}
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Criada em {new Date(campaign.created_at).toLocaleDateString("pt-BR")}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {canEdit(campaign) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/admin/campanhas/${campaign.id}/editar`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className={canEdit(campaign) ? "" : "flex-1"}
                          onClick={() => navigate(`/admin/campanhas/${campaign.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>

                        {canExecute(campaign) && (
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setCampaignToExecute(campaign);
                              setExecuteDialogOpen(true);
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Executar
                          </Button>
                        )}

                        {canDelete(campaign) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCampaignToDelete(campaign.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Execute Confirmation Dialog */}
      <AlertDialog open={executeDialogOpen} onOpenChange={setExecuteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar Campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta campanha será enviada para <strong>{campaignToExecute?.total_recipients || 0} destinatários</strong>.
              O n8n processará os envios automaticamente.
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute} className="bg-green-600">
              Sim, Executar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
