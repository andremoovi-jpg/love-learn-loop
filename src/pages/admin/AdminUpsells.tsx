import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Edit, Trash, ToggleLeft, ToggleRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upsell, Product } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function AdminUpsells() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [upsellDialog, setUpsellDialog] = useState(false);
  const [editingUpsell, setEditingUpsell] = useState<Upsell | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [parentId, setParentId] = useState("");
  const [upsellId, setUpsellId] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [checkoutUrl, setCheckoutUrl] = useState("");

  useEffect(() => {
    if (user?.is_admin) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [upsellsRes, productsRes] = await Promise.all([
        supabase
          .from('upsells')
          .select(`
            *,
            parent_product:products!parent_product_id(*),
            upsell_product:products!upsell_product_id(*)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name')
      ]);

      if (upsellsRes.error) throw upsellsRes.error;
      if (productsRes.error) throw productsRes.error;

      setUpsells(upsellsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (upsell?: Upsell) => {
    if (upsell) {
      setEditingUpsell(upsell);
      setTitle(upsell.title);
      setDesc(upsell.description || "");
      setParentId(upsell.parent_product_id);
      setUpsellId(upsell.upsell_product_id);
      setPrice(upsell.price.toString());
      setDiscount(upsell.discount_percentage?.toString() || "0");
      setCheckoutUrl(upsell.cartpanda_checkout_url || "");
    } else {
      setEditingUpsell(null);
      resetForm();
    }
    setUpsellDialog(true);
  };

  const resetForm = () => {
    setTitle("");
    setDesc("");
    setParentId("");
    setUpsellId("");
    setPrice("");
    setDiscount("0");
    setCheckoutUrl("");
  };

  const saveUpsell = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const upsellData = {
        title,
        description: desc,
        parent_product_id: parentId,
        upsell_product_id: upsellId,
        price: parseFloat(price),
        discount_percentage: parseInt(discount),
        cartpanda_checkout_url: checkoutUrl,
        is_active: true
      };

      if (editingUpsell) {
        const { error } = await supabase
          .from('upsells')
          .update(upsellData)
          .eq('id', editingUpsell.id);
        
        if (error) throw error;
        toast.success('Upsell atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('upsells')
          .insert(upsellData);
        
        if (error) throw error;
        toast.success('Upsell criado com sucesso!');
      }

      setUpsellDialog(false);
      loadData();
    } catch (error) {
      console.error('Erro ao salvar upsell:', error);
      toast.error('Erro ao salvar upsell');
    }
  };

  const toggleUpsell = async (upsellId: string) => {
    const upsell = upsells.find(u => u.id === upsellId);
    if (!upsell) return;

    try {
      const { error } = await supabase
        .from('upsells')
        .update({ is_active: !upsell.is_active })
        .eq('id', upsellId);

      if (error) throw error;
      toast.success(`Upsell ${!upsell.is_active ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const deleteUpsell = async (upsellId: string) => {
    if (!confirm('Tem certeza que deseja excluir este upsell?')) return;

    try {
      const { error } = await supabase
        .from('upsells')
        .delete()
        .eq('id', upsellId);

      if (error) throw error;
      toast.success('Upsell excluído com sucesso!');
      loadData();
    } catch (error) {
      console.error('Erro ao excluir upsell:', error);
      toast.error('Erro ao excluir upsell');
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground">Somente administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando upsells...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar breadcrumbs={[
          { label: t('admin.dashboard'), href: '/admin' },
          { label: t('admin.upsells') }
        ]} />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">{t('admin.upsells')}</h1>
                  <p className="text-muted-foreground">Gerencie as ofertas de upsell da plataforma</p>
                </div>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Upsell
                </Button>
              </div>
            </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Produto Pai</TableHead>
                <TableHead>Upsell</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upsells.map(upsell => (
                <TableRow key={upsell.id}>
                  <TableCell className="font-medium">{upsell.title}</TableCell>
                  <TableCell>{upsell.parent_product.name}</TableCell>
                  <TableCell>{upsell.upsell_product.name}</TableCell>
                  <TableCell>R$ {upsell.price.toFixed(2)}</TableCell>
                  <TableCell>
                    {upsell.discount_percentage ? (
                      <Badge variant="secondary">{upsell.discount_percentage}%</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={upsell.is_active ? 'default' : 'secondary'}
                      className={upsell.is_active ? 'bg-green-500' : ''}
                    >
                      {upsell.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(upsell)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleUpsell(upsell.id)}>
                          {upsell.is_active ? (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteUpsell(upsell.id)}
                          className="text-red-600"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {upsells.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum upsell encontrado</p>
              <Button onClick={() => openDialog()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Upsell
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog Upsell */}
      <Dialog open={upsellDialog} onOpenChange={setUpsellDialog}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{editingUpsell ? 'Editar' : 'Novo'} Upsell</DialogTitle>

          <form onSubmit={saveUpsell} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Produto Pai</label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Produto Upsell</label>
                <Select value={upsellId} onValueChange={setUpsellId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => p.id !== parentId).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Desconto (%)</label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL Checkout (CartPanda)</label>
              <Input 
                type="url" 
                value={checkoutUrl} 
                onChange={(e) => setCheckoutUrl(e.target.value)}
                placeholder="https://checkout.cartpanda.com/..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setUpsellDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
        </main>
      </div>
    </div>
  );
}