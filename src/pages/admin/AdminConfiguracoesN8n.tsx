import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle, AlertCircle, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface WebhookConfig {
  execute_campaign: string;
  process_purchase: string;
  track_events: string;
}

export default function AdminConfiguracoesN8n() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookConfig>({
    execute_campaign: "",
    process_purchase: "",
    track_events: "",
  });

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Configurações n8n" },
  ];

  // Carregar configurações
  useEffect(() => {
    if (user?.is_admin) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "n8n_webhooks")
        .single();

      if (error) {
        // Se não existe, criar
        if (error.code === "PGRST116") {
          await createDefaultSettings();
          return;
        }
        throw error;
      }

      if (data) {
        setWebhooks(data.setting_value as unknown as WebhookConfig);
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .insert({
          setting_key: "n8n_webhooks",
          setting_value: {
            execute_campaign: "",
            process_purchase: "",
            track_events: "",
          },
          description: "URLs dos webhooks do n8n",
        });

      if (error) throw error;

      setWebhooks({
        execute_campaign: "",
        process_purchase: "",
        track_events: "",
      });
    } catch (error: any) {
      console.error("Erro ao criar configurações:", error);
      toast.error("Erro ao criar configurações padrão");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validação básica de URLs
      const validateUrl = (url: string) => {
        if (!url) return true; // Opcional
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      if (webhooks.execute_campaign && !validateUrl(webhooks.execute_campaign)) {
        toast.error("URL do webhook 'Executar Campanha' inválida");
        return;
      }

      if (webhooks.process_purchase && !validateUrl(webhooks.process_purchase)) {
        toast.error("URL do webhook 'Processar Compra' inválida");
        return;
      }

      if (webhooks.track_events && !validateUrl(webhooks.track_events)) {
        toast.error("URL do webhook 'Tracking' inválida");
        return;
      }

      // Salvar no banco
      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: webhooks as any,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", "n8n_webhooks");

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async (url: string, name: string) => {
    if (!url) {
      toast.error("Configure a URL primeiro");
      return;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      if (response.ok) {
        toast.success(`✅ Webhook "${name}" respondeu com sucesso!`);
      } else {
        toast.warning(`⚠️ Webhook "${name}" retornou status ${response.status}`);
      }
    } catch (error) {
      toast.error(`❌ Erro ao testar webhook "${name}"`);
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">Configurações n8n</h1>
                <p className="text-muted-foreground">
                  Configure os webhooks do n8n para conectar o sistema
                </p>
              </div>
            </div>

            {/* Instruções */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Como configurar</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>Importe os workflows (JSON) no seu n8n</li>
                  <li>Abra cada workflow e copie a URL do webhook</li>
                  <li>Cole as URLs abaixo</li>
                  <li>Clique em "Salvar Configurações"</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Card de Configuração */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhooks do n8n
                </CardTitle>
                <CardDescription>
                  URLs dos webhooks gerados pelo n8n
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Webhook 1: Executar Campanha */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="execute-campaign">
                      <span className="font-semibold">1. Executar Campanha</span>
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    {webhooks.execute_campaign && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhooks.execute_campaign, "Executar Campanha")}
                      >
                        Testar
                      </Button>
                    )}
                  </div>
                  <Input
                    id="execute-campaign"
                    placeholder="https://n8n.seudominio.com/webhook/execute-campaign"
                    value={webhooks.execute_campaign}
                    onChange={(e) =>
                      setWebhooks({ ...webhooks, execute_campaign: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Obrigatório:</strong> Webhook principal que executa as campanhas de email/WhatsApp
                  </p>
                </div>

                {/* Webhook 2: Processar Compra */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="process-purchase">
                      <span className="font-semibold">2. Processar Compra</span>
                      <span className="text-muted-foreground ml-1">(Opcional)</span>
                    </Label>
                    {webhooks.process_purchase && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhooks.process_purchase, "Processar Compra")}
                      >
                        Testar
                      </Button>
                    )}
                  </div>
                  <Input
                    id="process-purchase"
                    placeholder="https://n8n.seudominio.com/webhook/process-purchase"
                    value={webhooks.process_purchase}
                    onChange={(e) =>
                      setWebhooks({ ...webhooks, process_purchase: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional: Processa webhooks de compra (Hotmart, Eduzz, etc) e libera produtos automaticamente
                  </p>
                </div>

                {/* Webhook 3: Tracking */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="track-events">
                      <span className="font-semibold">3. Tracking de Eventos</span>
                      <span className="text-muted-foreground ml-1">(Opcional)</span>
                    </Label>
                    {webhooks.track_events && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testWebhook(webhooks.track_events, "Tracking")}
                      >
                        Testar
                      </Button>
                    )}
                  </div>
                  <Input
                    id="track-events"
                    placeholder="https://n8n.seudominio.com/webhook/track-events"
                    value={webhooks.track_events}
                    onChange={(e) =>
                      setWebhooks({ ...webhooks, track_events: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Opcional: Rastreia aberturas de email e cliques em links
                  </p>
                </div>

                {/* Botão Salvar */}
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            {webhooks.execute_campaign && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Sistema Configurado</AlertTitle>
                <AlertDescription>
                  O webhook principal está configurado. O sistema está pronto para executar campanhas!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
