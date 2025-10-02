import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, RefreshCw, Save, CheckCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// Tipos
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'both';
  status: string;
  filters: CampaignFilters;
  total_recipients: number;
}

interface CampaignFilters {
  has_products?: string[];
  not_has_products?: string[];
  last_purchase_days?: number;
  user_status?: 'active' | 'inactive' | 'all';
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

interface PreviewUser {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminCampanhaEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados da campanha
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<'email' | 'whatsapp' | 'both'>("email");

  // Filtros
  const [useHasProducts, setUseHasProducts] = useState(false);
  const [hasProducts, setHasProducts] = useState<string[]>([]);
  const [useNotHasProducts, setUseNotHasProducts] = useState(false);
  const [notHasProducts, setNotHasProducts] = useState<string[]>([]);
  const [useLastPurchase, setUseLastPurchase] = useState(false);
  const [lastPurchaseDays, setLastPurchaseDays] = useState(30);
  const [useUserStatus, setUseUserStatus] = useState(false);
  const [userStatus, setUserStatus] = useState<'active' | 'inactive' | 'all'>('all');

  // Preview
  const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Produtos disponíveis
  const [products, setProducts] = useState<Product[]>([]);

  // Templates
  const [emailSubject, setEmailSubject] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [whatsappTemplate, setWhatsappTemplate] = useState("");

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Campanhas", href: "/admin/campanhas" },
    { label: campaign?.name || "Editar" },
  ];

  // Carregar dados iniciais
  useEffect(() => {
    if (user && id) {
      loadData();
    }
  }, [user, id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar campanha
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;

      setCampaign(campaignData as Campaign);
      setName(campaignData.name);
      setType(campaignData.type as 'email' | 'whatsapp' | 'both');

      // Carregar filtros se existirem
      const filters = (campaignData.filters || {}) as CampaignFilters;
      if (filters.has_products?.length > 0) {
        setUseHasProducts(true);
        setHasProducts(filters.has_products);
      }
      if (filters.not_has_products?.length > 0) {
        setUseNotHasProducts(true);
        setNotHasProducts(filters.not_has_products);
      }
      if (filters.last_purchase_days) {
        setUseLastPurchase(true);
        setLastPurchaseDays(filters.last_purchase_days);
      }
      if (filters.user_status) {
        setUseUserStatus(true);
        setUserStatus(filters.user_status);
      }

      // Carregar templates
      setEmailSubject(campaignData.email_subject || "");
      setEmailTemplate(campaignData.email_template || "");
      setWhatsappTemplate(campaignData.whatsapp_template || "");

      // Carregar produtos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData || []);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar campanha");
    } finally {
      setLoading(false);
    }
  };

  // Atualizar preview de destinatários
  const updatePreview = async () => {
    try {
      setLoadingPreview(true);

      // Construir filtros
      const filters: CampaignFilters = {};
      if (useHasProducts && hasProducts.length > 0) {
        filters.has_products = hasProducts;
      }
      if (useNotHasProducts && notHasProducts.length > 0) {
        filters.not_has_products = notHasProducts;
      }
      if (useLastPurchase) {
        filters.last_purchase_days = lastPurchaseDays;
      }
      if (useUserStatus) {
        filters.user_status = userStatus;
      }

      // Chamar função do Supabase para calcular destinatários
      const { data, error } = await supabase.rpc('calculate_campaign_recipients', {
        campaign_filters: filters as any
      });

      if (error) throw error;

      const result = data as unknown as { total: number; users: PreviewUser[] };
      setTotalRecipients(result?.total || 0);
      setPreviewUsers(result?.users?.slice(0, 10) || []);

    } catch (error: any) {
      console.error("Erro ao calcular preview:", error);
      toast.error("Erro ao calcular destinatários");
    } finally {
      setLoadingPreview(false);
    }
  };

  // Salvar campanha
  const handleSave = async (markAsScheduled = false) => {
    try {
      setSaving(true);

      if (!name.trim()) {
        toast.error("Digite um nome para a campanha");
        return;
      }

      // Validações de template
      if (type === "email" || type === "both") {
        if (!emailSubject.trim()) {
          toast.error("Digite um assunto para o email");
          return;
        }
        if (!emailTemplate.trim()) {
          toast.error("Digite o corpo do email");
          return;
        }
      }

      if (type === "whatsapp" || type === "both") {
        if (!whatsappTemplate.trim()) {
          toast.error("Digite a mensagem do WhatsApp");
          return;
        }
      }

      // Construir filtros
      const filters: CampaignFilters = {};
      if (useHasProducts && hasProducts.length > 0) {
        filters.has_products = hasProducts;
      }
      if (useNotHasProducts && notHasProducts.length > 0) {
        filters.not_has_products = notHasProducts;
      }
      if (useLastPurchase) {
        filters.last_purchase_days = lastPurchaseDays;
      }
      if (useUserStatus) {
        filters.user_status = userStatus;
      }

      // Calcular total de destinatários
      const { data: recipientsData } = await supabase.rpc('calculate_campaign_recipients', {
        campaign_filters: filters as any
      });

      const result = recipientsData as unknown as { total: number; users: PreviewUser[] } | null;
      const totalRecipients = result?.total || 0;

      // Atualizar campanha
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: name.trim(),
          type,
          filters: filters as any,
          email_subject: type === "email" || type === "both" ? emailSubject.trim() : null,
          email_template: type === "email" || type === "both" ? emailTemplate.trim() : null,
          whatsapp_template: type === "whatsapp" || type === "both" ? whatsappTemplate.trim() : null,
          total_recipients: totalRecipients,
          status: markAsScheduled ? "scheduled" : "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        markAsScheduled
          ? "Campanha agendada com sucesso!"
          : "Campanha salva com sucesso!"
      );

      navigate("/admin/campanhas");

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  // Toggle produto no filtro
  const toggleProductInFilter = (productId: string, filterType: 'has' | 'not_has') => {
    if (filterType === 'has') {
      setHasProducts(prev =>
        prev.includes(productId)
          ? prev.filter(id => id !== productId)
          : [...prev, productId]
      );
    } else {
      setNotHasProducts(prev =>
        prev.includes(productId)
          ? prev.filter(id => id !== productId)
          : [...prev, productId]
      );
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
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/campanhas")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold">Editar Campanha</h1>
                <p className="text-muted-foreground">
                  Configure a audiência e os filtros da campanha
                </p>
              </div>
            </div>

            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>📝 Informações Básicas</CardTitle>
                <CardDescription>
                  Defina o nome e o tipo da campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome da Campanha *</Label>
                  <Input
                    placeholder="Ex: Upsell Curso Node para quem comprou React"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Tipo de Campanha *</Label>
                  <Select value={type} onValueChange={(value: any) => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                      <SelectItem value="both">📧📱 Email + WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Filtros de Audiência */}
            <Card>
              <CardHeader>
                <CardTitle>🎯 Filtros de Audiência</CardTitle>
                <CardDescription>
                  Defina quem vai receber esta campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Possui produtos */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-products"
                      checked={useHasProducts}
                      onCheckedChange={(checked) => setUseHasProducts(!!checked)}
                    />
                    <Label htmlFor="has-products" className="font-medium">
                      Usuário POSSUI estes produtos
                    </Label>
                  </div>

                  {useHasProducts && (
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Selecione os produtos que o usuário deve ter:
                      </p>
                      <ScrollArea className="h-48 border rounded-md p-4">
                        {products.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`has-${product.id}`}
                              checked={hasProducts.includes(product.id)}
                              onCheckedChange={() => toggleProductInFilter(product.id, 'has')}
                            />
                            <Label htmlFor={`has-${product.id}`} className="font-normal">
                              {product.name}
                            </Label>
                          </div>
                        ))}
                      </ScrollArea>
                      {hasProducts.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          ✅ {hasProducts.length} produto(s) selecionado(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* NÃO possui produtos */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="not-has-products"
                      checked={useNotHasProducts}
                      onCheckedChange={(checked) => setUseNotHasProducts(!!checked)}
                    />
                    <Label htmlFor="not-has-products" className="font-medium">
                      Usuário NÃO POSSUI estes produtos
                    </Label>
                  </div>

                  {useNotHasProducts && (
                    <div className="ml-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Selecione os produtos que o usuário NÃO deve ter:
                      </p>
                      <ScrollArea className="h-48 border rounded-md p-4">
                        {products.map((product) => (
                          <div key={product.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`not-has-${product.id}`}
                              checked={notHasProducts.includes(product.id)}
                              onCheckedChange={() => toggleProductInFilter(product.id, 'not_has')}
                            />
                            <Label htmlFor={`not-has-${product.id}`} className="font-normal">
                              {product.name}
                            </Label>
                          </div>
                        ))}
                      </ScrollArea>
                      {notHasProducts.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          ❌ {notHasProducts.length} produto(s) selecionado(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Última compra */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="last-purchase"
                      checked={useLastPurchase}
                      onCheckedChange={(checked) => setUseLastPurchase(!!checked)}
                    />
                    <Label htmlFor="last-purchase" className="font-medium">
                      Última compra nos últimos X dias
                    </Label>
                  </div>

                  {useLastPurchase && (
                    <div className="ml-6">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={lastPurchaseDays}
                          onChange={(e) => setLastPurchaseDays(parseInt(e.target.value) || 30)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">dias</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status do usuário */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="user-status"
                      checked={useUserStatus}
                      onCheckedChange={(checked) => setUseUserStatus(!!checked)}
                    />
                    <Label htmlFor="user-status" className="font-medium">
                      Status do usuário
                    </Label>
                  </div>

                  {useUserStatus && (
                    <RadioGroup
                      value={userStatus}
                      onValueChange={(value: any) => setUserStatus(value)}
                      className="ml-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="active" id="active" />
                        <Label htmlFor="active">Apenas usuários ativos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inactive" id="inactive" />
                        <Label htmlFor="inactive">Apenas usuários inativos</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">Todos os usuários</Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview de Destinatários */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>👁️ Preview de Destinatários</CardTitle>
                    <CardDescription>
                      Veja quantos usuários serão atingidos com estes filtros
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={updatePreview}
                    disabled={loadingPreview}
                  >
                    {loadingPreview ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Atualizar Preview
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {totalRecipients > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{totalRecipients}</span>
                      <span className="text-muted-foreground">
                        usuário(s) serão atingidos
                      </span>
                    </div>

                    {previewUsers.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Primeiros 10 destinatários:
                        </p>
                        <div className="space-y-2">
                          {previewUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {user.full_name?.charAt(0) || 'U'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Clique em "Atualizar Preview" para ver os destinatários</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template de Email */}
            {(type === "email" || type === "both") && (
              <Card>
                <CardHeader>
                  <CardTitle>📧 Template de Email</CardTitle>
                  <CardDescription>
                    Configure o assunto e o corpo do email que será enviado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Assunto */}
                  <div>
                    <Label>Assunto do Email *</Label>
                    <Input
                      placeholder="Ex: Oferta Especial para Você!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>

                  {/* Corpo do Email */}
                  <div>
                    <Label>Corpo do Email *</Label>
                    <Textarea
                      placeholder={`Olá {{nome}},\n\nTemos uma oferta especial para você...\n\nAbraços,\nEquipe`}
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {emailTemplate.length} caracteres
                    </p>
                  </div>

                  {/* Variáveis disponíveis */}
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium text-sm mb-2">💡 Variáveis disponíveis:</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <code className="bg-background px-2 py-1 rounded">{"{{nome}}"}</code>
                        <span>- Nome completo do usuário</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="bg-background px-2 py-1 rounded">{"{{email}}"}</code>
                        <span>- Email do usuário</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  {emailSubject && emailTemplate && (
                    <div>
                      <Label className="mb-2 block">👁️ Preview</Label>
                      <div className="border rounded-lg p-4 bg-background">
                        <div className="border-b pb-2 mb-3">
                          <p className="text-xs text-muted-foreground">Assunto:</p>
                          <p className="font-medium">
                            {emailSubject
                              .replace(/\{\{nome\}\}/g, "João Silva")
                              .replace(/\{\{email\}\}/g, "joao@example.com")}
                          </p>
                        </div>
                        <div className="whitespace-pre-wrap text-sm">
                          {emailTemplate
                            .replace(/\{\{nome\}\}/g, "João Silva")
                            .replace(/\{\{email\}\}/g, "joao@example.com")}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Template de WhatsApp */}
            {(type === "whatsapp" || type === "both") && (
              <Card>
                <CardHeader>
                  <CardTitle>📱 Template de WhatsApp</CardTitle>
                  <CardDescription>
                    Configure a mensagem que será enviada via WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mensagem */}
                  <div>
                    <Label>Mensagem *</Label>
                    <Textarea
                      placeholder={`Olá {{nome}}! 👋\n\nTemos uma oferta especial para você...\n\nAbraços! ✨`}
                      value={whatsappTemplate}
                      onChange={(e) => setWhatsappTemplate(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{whatsappTemplate.length} caracteres</span>
                      {whatsappTemplate.length > 1000 && (
                        <span className="text-orange-500">
                          ⚠️ Mensagem longa (recomendado: até 1000 caracteres)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Variáveis disponíveis */}
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-medium text-sm mb-2">💡 Variáveis disponíveis:</p>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <code className="bg-background px-2 py-1 rounded">{"{{nome}}"}</code>
                        <span>- Nome completo do usuário</span>
                      </div>
                    </div>
                    <p className="text-xs mt-2 text-muted-foreground">
                      💬 Dica: Use emojis para deixar a mensagem mais amigável!
                    </p>
                  </div>

                  {/* Preview */}
                  {whatsappTemplate && (
                    <div>
                      <Label className="mb-2 block">👁️ Preview</Label>
                      <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200 dark:border-green-800">
                          <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="font-medium text-sm">WhatsApp</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-900 p-3 rounded-lg">
                          {whatsappTemplate.replace(/\{\{nome\}\}/g, "João Silva")}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ações */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/campanhas")}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Rascunho
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Agendada
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
