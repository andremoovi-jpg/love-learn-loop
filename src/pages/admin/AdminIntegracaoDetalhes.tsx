import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Edit, Webhook } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

interface ProductMapping {
  id: string;
  integration_id: string;
  product_id: string;
  external_product_id: string;
  external_product_name: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

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

export default function AdminIntegracaoDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [mappings, setMappings] = useState<ProductMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ProductMapping | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    product_id: "",
    external_product_id: "",
    external_product_name: "",
  });

  // Breadcrumbs
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Integrações", href: "/admin/integracoes" },
    { label: integration?.name || "Detalhes" },
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

      // Buscar integração
      const { data: integrationData, error: intError } = await supabase
        .from("payment_integrations")
        .select("*")
        .eq("id", id)
        .single();

      if (intError) throw intError;
      setIntegration(integrationData);

      // Buscar mapeamentos
      const { data: mappingsData, error: mappingsError } = await supabase
        .from("product_mappings")
        .select(`
          *,
          product:products(id, name, slug)
        `)
        .eq("integration_id", id)
        .order("created_at", { ascending: false });

      if (mappingsError) throw mappingsError;
      setMappings(mappingsData || []);

      // Buscar todos os produtos para o select
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData || []);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  // Abrir dialog para adicionar
  const handleAdd = () => {
    setEditingMapping(null);
    setFormData({
      product_id: "",
      external_product_id: "",
      external_product_name: "",
    });
    setDialogOpen(true);
  };

  // Abrir dialog para editar
  const handleEdit = (mapping: ProductMapping) => {
    setEditingMapping(mapping);
    setFormData({
      product_id: mapping.product_id,
      external_product_id: mapping.external_product_id,
      external_product_name: mapping.external_product_name || "",
    });
    setDialogOpen(true);
  };

  // Salvar mapeamento
  const handleSave = async () => {
    try {
      if (!formData.product_id || !formData.external_product_id) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }

      if (editingMapping) {
        // Atualizar
        const { error } = await supabase
          .from("product_mappings")
          .update({
            product_id: formData.product_id,
            external_product_id: formData.external_product_id,
            external_product_name: formData.external_product_name || null,
          })
          .eq("id", editingMapping.id);

        if (error) throw error;
        toast.success("Mapeamento atualizado com sucesso!");
      } else {
        // Criar
        const { error } = await supabase
          .from("product_mappings")
          .insert([{
            integration_id: id,
            product_id: formData.product_id,
            external_product_id: formData.external_product_id,
            external_product_name: formData.external_product_name || null,
          }]);

        if (error) throw error;
        toast.success("Mapeamento criado com sucesso!");
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar mapeamento");
    }
  };

  // Deletar mapeamento
  const handleDelete = async () => {
    if (!mappingToDelete) return;

    try {
      const { error } = await supabase
        .from("product_mappings")
        .delete()
        .eq("id", mappingToDelete);

      if (error) throw error;

      toast.success("Mapeamento excluído com sucesso!");
      setDeleteDialogOpen(false);
      setMappingToDelete(null);
      loadData();
    } catch (error: any) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao deletar mapeamento");
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

  if (!integration) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Integração não encontrada</h1>
          <Button onClick={() => navigate("/admin/integracoes")}>
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
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin/integracoes")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">
                    {PLATFORM_LOGOS[integration.platform_type] || "📦"}
                  </span>
                  <div>
                    <h1 className="text-4xl font-bold">{integration.name}</h1>
                    <p className="text-muted-foreground">
                      {PLATFORM_NAMES[integration.platform_type] || integration.platform_type}
                    </p>
                  </div>
                  <Badge variant={integration.is_active ? "default" : "secondary"}>
                    {integration.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate(`/admin/webhooks?integration=${integration.id}`)}
              >
                <Webhook className="mr-2 h-4 w-4" />
                Ver Webhooks
              </Button>
            </div>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informações da Integração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Webhook URL</Label>
                  <code className="block bg-muted px-3 py-2 rounded mt-1 text-sm">
                    {integration.webhook_url}
                  </code>
                </div>

                {integration.webhook_secret && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Webhook Secret</Label>
                    <code className="block bg-muted px-3 py-2 rounded mt-1 text-sm">
                      {integration.webhook_secret}
                    </code>
                  </div>
                )}

                {integration.last_webhook_at && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Último Webhook Recebido</Label>
                    <p className="text-sm mt-1">
                      {new Date(integration.last_webhook_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapeamentos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Produtos Mapeados</CardTitle>
                    <CardDescription>
                      Vincule os produtos da {PLATFORM_NAMES[integration.platform_type] || "plataforma"} com os produtos do seu sistema
                    </CardDescription>
                  </div>
                  <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Mapeamento
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mappings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold mb-2">Nenhum produto mapeado</h3>
                    <p className="text-muted-foreground mb-6">
                      Adicione o primeiro mapeamento para começar a processar compras
                    </p>
                    <Button onClick={handleAdd}>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Primeiro Mapeamento
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto Interno</TableHead>
                        <TableHead>ID Externo</TableHead>
                        <TableHead>Nome Externo</TableHead>
                        <TableHead>Data de Criação</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{mapping.product?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                /{mapping.product?.slug}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {mapping.external_product_id}
                            </code>
                          </TableCell>
                          <TableCell>
                            {mapping.external_product_name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(mapping.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(mapping)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMappingToDelete(mapping.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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

      {/* Dialog Adicionar/Editar Mapeamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMapping ? "Editar Mapeamento" : "Novo Mapeamento"}
            </DialogTitle>
            <DialogDescription>
              Vincule um produto da {PLATFORM_NAMES[integration.platform_type]} com um produto do seu sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Produto Interno */}
            <div>
              <Label>Produto Interno *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto do seu sistema" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Produto que será liberado quando houver compra
              </p>
            </div>

            {/* ID Externo */}
            <div>
              <Label>ID do Produto na {PLATFORM_NAMES[integration.platform_type]} *</Label>
              <Input
                placeholder="Ex: prod_12345, curso-completo, etc"
                value={formData.external_product_id}
                onChange={(e) => setFormData({ ...formData, external_product_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O ID que vem no webhook da {PLATFORM_NAMES[integration.platform_type]}
              </p>
            </div>

            {/* Nome Externo (opcional) */}
            <div>
              <Label>Nome do Produto na {PLATFORM_NAMES[integration.platform_type]} (opcional)</Label>
              <Input
                placeholder="Ex: Curso Completo de React 2024"
                value={formData.external_product_name}
                onChange={(e) => setFormData({ ...formData, external_product_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Para facilitar identificação (não afeta funcionamento)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingMapping ? "Salvar Alterações" : "Criar Mapeamento"}
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
              Esta ação não pode ser desfeita. O mapeamento será excluído permanentemente.
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
