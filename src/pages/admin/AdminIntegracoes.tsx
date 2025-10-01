import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, Eye, Trash2, Copy, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

// Tipos
interface Integration {
  id: string;
  name: string;
  platform_type: string;
  webhook_url: string;
  webhook_secret: string | null;
  api_key: string | null;
  is_active: boolean;
  last_webhook_at: string | null;
  created_at: string;
  webhook_count?: number;
  product_mappings_count?: number;
}

// Logos das plataformas (você pode adicionar imagens reais depois)
const PLATFORM_LOGOS: Record<string, string> = {
  hotmart: "🔥",
  eduzz: "📘",
  kiwify: "🥝",
  stripe: "💳",
  perfectpay: "💰",
  monetizze: "💵",
  braip: "🇧🇷",
  cartpanda: "🐼",
};

const PLATFORM_NAMES: Record<string, string> = {
  hotmart: "Hotmart",
  eduzz: "Eduzz",
  kiwify: "Kiwify",
  stripe: "Stripe",
  perfectpay: "PerfectPay",
  monetizze: "Monetizze",
  braip: "Braip",
  cartpanda: "CartPanda",
};

export default function AdminIntegracoes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    platform_type: "",
    webhook_url: "",
    webhook_secret: "",
    api_key: "",
    is_active: true,
  });

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Integrações" },
  ];

  // Carregar integrações
  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);

      // Buscar integrações
      const { data: integrationsData, error: intError } = await supabase
        .from("payment_integrations")
        .select("*")
        .order("created_at", { ascending: false });

      if (intError) throw intError;

      // Para cada integração, buscar estatísticas
      const integrationsWithStats = await Promise.all(
        (integrationsData || []).map(async (integration) => {
          // Contar webhooks recebidos (últimos 7 dias)
          const { count: webhookCount } = await supabase
            .from("webhook_events")
            .select("*", { count: "exact", head: true })
            .eq("integration_id", integration.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

          // Contar produtos mapeados
          const { count: mappingsCount } = await supabase
            .from("product_mappings")
            .select("*", { count: "exact", head: true })
            .eq("integration_id", integration.id);

          return {
            ...integration,
            webhook_count: webhookCount || 0,
            product_mappings_count: mappingsCount || 0,
          };
        })
      );

      setIntegrations(integrationsWithStats);
    } catch (error: any) {
      console.error("Erro ao carregar integrações:", error);
      toast.error("Erro ao carregar integrações");
    } finally {
      setLoading(false);
    }
  };

  // Abrir dialog para adicionar
  const handleAdd = () => {
    setEditingIntegration(null);
    setFormData({
      name: "",
      platform_type: "",
      webhook_url: `https://n8n.seudominio.com/webhook/${Math.random().toString(36).substring(7)}`,
      webhook_secret: Math.random().toString(36).substring(2, 15),
      api_key: "",
      is_active: true,
    });
    setDialogOpen(true);
  };

  // Abrir dialog para editar
  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      platform_type: integration.platform_type,
      webhook_url: integration.webhook_url,
      webhook_secret: integration.webhook_secret || "",
      api_key: integration.api_key || "",
      is_active: integration.is_active,
    });
    setDialogOpen(true);
  };

  // Salvar integração
  const handleSave = async () => {
    try {
      if (!formData.name || !formData.platform_type || !formData.webhook_url) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }

      if (editingIntegration) {
        // Atualizar
        const { error } = await supabase
          .from("payment_integrations")
          .update({
            name: formData.name,
            platform_type: formData.platform_type,
            webhook_url: formData.webhook_url,
            webhook_secret: formData.webhook_secret || null,
            api_key: formData.api_key || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingIntegration.id);

        if (error) throw error;
        toast.success("Integração atualizada com sucesso!");
      } else {
        // Criar
        const { error } = await supabase
          .from("payment_integrations")
          .insert([{
            name: formData.name,
            platform_type: formData.platform_type,
            webhook_url: formData.webhook_url,
            webhook_secret: formData.webhook_secret || null,
            api_key: formData.api_key || null,
            is_active: formData.is_active,
          }]);

        if (error) throw error;
        toast.success("Integração criada com sucesso!");
      }

      setDialogOpen(false);
      loadIntegrations();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar integração");
    }
  };

  // Deletar integração
  const handleDelete = async () => {
    if (!integrationToDelete) return;

    try {
      const { error } = await supabase
        .from("payment_integrations")
        .delete()
        .eq("id", integrationToDelete);

      if (error) throw error;

      toast.success("Integração excluída com sucesso!");
      setDeleteDialogOpen(false);
      setIntegrationToDelete(null);
      loadIntegrations();
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar integração");
    }
  };

  // Copiar webhook URL
  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada para a área de transferência!");
  };

  // Toggle ativo/inativo
  const toggleActive = async (integration: Integration) => {
    try {
      const { error } = await supabase
        .from("payment_integrations")
        .update({ is_active: !integration.is_active })
        .eq("id", integration.id);

      if (error) throw error;

      toast.success(
        integration.is_active ? "Integração desativada" : "Integração ativada"
      );
      loadIntegrations();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:ml-64 flex-1">
        <TopBar breadcrumbs={breadcrumbs} />

        <main className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Integrações de Pagamento</h1>
              <p className="text-muted-foreground">
                Gerencie suas integrações com plataformas de pagamento
              </p>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integração
            </Button>
          </div>

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
          ) : integrations.length === 0 ? (
            // Empty state
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">🔌</div>
              <h3 className="text-2xl font-bold mb-2">Nenhuma integração ainda</h3>
              <p className="text-muted-foreground mb-6">
                Adicione sua primeira integração para começar a receber compras automaticamente
              </p>
              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Integração
              </Button>
            </Card>
          ) : (
            // Cards de integrações
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">
                          {PLATFORM_LOGOS[integration.platform_type] || "📦"}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {integration.name}
                          </CardTitle>
                          <CardDescription>
                            {PLATFORM_NAMES[integration.platform_type] || integration.platform_type}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={integration.is_active ? "default" : "secondary"}>
                        {integration.is_active ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Ativa
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Inativa
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Webhook URL */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-muted px-2 py-1 rounded text-xs truncate">
                          {integration.webhook_url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyWebhookUrl(integration.webhook_url)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Webhooks (7d)</p>
                        <p className="text-2xl font-bold">{integration.webhook_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Produtos</p>
                        <p className="text-2xl font-bold">{integration.product_mappings_count}</p>
                      </div>
                    </div>

                    {/* Último webhook */}
                    {integration.last_webhook_at && (
                      <div>
                        <p className="text-xs text-muted-foreground">Último webhook</p>
                        <p className="text-sm">
                          {new Date(integration.last_webhook_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/admin/integracoes/${integration.id}`)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/webhooks?integration=${integration.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(integration)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIntegrationToDelete(integration.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Switch ativo/inativo */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Label className="text-sm">Receber webhooks</Label>
                      <Switch
                        checked={integration.is_active}
                        onCheckedChange={() => toggleActive(integration)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Dialog Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? "Editar Integração" : "Nova Integração"}
            </DialogTitle>
            <DialogDescription>
              Configure os dados da integração com a plataforma de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome */}
            <div>
              <Label>Nome da Integração *</Label>
              <Input
                placeholder="Ex: Hotmart Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome para identificar esta integração no sistema
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <Label>Plataforma *</Label>
              <Select
                value={formData.platform_type}
                onValueChange={(value) => setFormData({ ...formData, platform_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotmart">🔥 Hotmart</SelectItem>
                  <SelectItem value="eduzz">📘 Eduzz</SelectItem>
                  <SelectItem value="kiwify">🥝 Kiwify</SelectItem>
                  <SelectItem value="stripe">💳 Stripe</SelectItem>
                  <SelectItem value="perfectpay">💰 PerfectPay</SelectItem>
                  <SelectItem value="monetizze">💵 Monetizze</SelectItem>
                  <SelectItem value="braip">🇧🇷 Braip</SelectItem>
                  <SelectItem value="cartpanda">🐼 CartPanda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Webhook URL */}
            <div>
              <Label>Webhook URL *</Label>
              <Input
                placeholder="https://n8n.seudominio.com/webhook/..."
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL gerada pelo n8n para receber os webhooks desta plataforma
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <Label>Webhook Secret</Label>
              <Input
                placeholder="Secret key para validar webhooks"
                value={formData.webhook_secret}
                onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Chave secreta fornecida pela plataforma (opcional)
              </p>
            </div>

            {/* API Key */}
            <div>
              <Label>API Key</Label>
              <Input
                placeholder="API Key da plataforma"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Necessário para algumas plataformas (opcional)
              </p>
            </div>

            {/* Ativa */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Integração ativa (receber webhooks)</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingIntegration ? "Salvar Alterações" : "Criar Integração"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os webhooks e mapeamentos de produtos
              relacionados a esta integração também serão excluídos.
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
    </div>
  );
}
