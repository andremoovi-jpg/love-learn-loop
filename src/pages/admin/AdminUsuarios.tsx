import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Plus,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Package,
  Award
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  total_points: number;
  created_at: string;
  email: string; // Agora obrigatório pois sempre vem da função
  total_products: number;
  status: 'active' | 'suspended';
  is_suspended?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
}

export default function AdminUsuarios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para os dialogs
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [userProducts, setUserProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers();
      loadProducts();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 Carregando usuários com função segura...');
      }

      // Use the new ultra-secure function with audit logging and rate limiting
      const { data: secureData, error: secureError } = await supabase
        .rpc('get_users_with_email_secure');

      if (secureError) {
        throw new Error(secureError.message);
      }

      if (!secureData || secureData.length === 0) {
        setUsers([]);
        if (import.meta.env.DEV) {
          console.log('⚠️ Nenhum usuário encontrado');
        }
        return;
      }

      // Data already comes with masked emails, phones, and product counts
      const formattedUsers = secureData.map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        phone: user.phone, // Already masked by the function
        total_points: user.total_points,
        email: user.email, // Already masked by the function
        total_products: user.total_products, // Already calculated by the function
        is_suspended: user.is_suspended,
        status: user.is_suspended ? 'suspended' as const : 'active' as const,
        created_at: user.created_at
      }));

      setUsers(formattedUsers);
      
      if (import.meta.env.DEV) {
        console.log('✅ Usuários carregados com segurança:', formattedUsers.length);
      }

    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('❌ Erro ao carregar usuários:', error);
      }
      
      // Show user-friendly error messages
      if (error.message.includes('Rate limit')) {
        toast.error('Muitas requisições. Aguarde um momento e tente novamente.');
      } else if (error.message.includes('Acesso negado')) {
        toast.error('Acesso negado. Verifique suas permissões de administrador.');
      } else {
        toast.error('Erro ao carregar usuários. Tente novamente mais tarde.');
      }

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setAvailableProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadUserProducts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select('product:products(id, name, slug)')
        .eq('user_id', userId);

      if (error) throw error;

      const products = data?.map(item => item.product).filter(Boolean) || [];
      setUserProducts(products as Product[]);
    } catch (error) {
      console.error('Erro ao carregar produtos do usuário:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const viewUser = async (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    await loadUserProducts(userProfile.user_id);
    setDetailsOpen(true);
  };

  const openAddProduct = async (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setSelectedProduct("");
    setAddProductOpen(true);
  };

  const addProductToUser = async () => {
    if (!selectedUser || !selectedProduct) return;

    try {
      // Verificar se o usuário já tem esse produto
      const { data: existing } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .eq('product_id', selectedProduct)
        .single();

      if (existing) {
        toast.error('Usuário já possui este produto');
        return;
      }

      // Adicionar produto ao usuário
      const { error } = await supabase
        .from('user_products')
        .insert({
          user_id: selectedUser.user_id,
          product_id: selectedProduct,
          progress: 0
        });

      if (error) throw error;

      toast.success('Produto adicionado com sucesso!');
      setAddProductOpen(false);
      loadUsers(); // Recarregar para atualizar contagem
    } catch (error: any) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const toggleUserStatus = async (userProfile: UserProfile) => {
    try {
      const newStatus = userProfile.status === 'active' ? true : false;

      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: newStatus })
        .eq('user_id', userProfile.user_id);

      if (error) throw error;

      toast.success(
        newStatus
          ? 'Usuário suspenso com sucesso'
          : 'Usuário ativado com sucesso'
      );

      loadUsers();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do usuário');
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
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar
          title="Usuários"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Usuários" }
          ]}
        />

        <main className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Usuários</h1>
                <p className="text-muted-foreground">Gerencie todos os usuários da plataforma</p>
              </div>
              <Input
                placeholder="Buscar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-md"
              />
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(userProfile => (
                    <TableRow key={userProfile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userProfile.avatar_url} />
                            <AvatarFallback>
                              {userProfile.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {userProfile.full_name || 'Usuário sem nome'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {userProfile.email || 'Email não disponível'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {userProfile.total_products}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {userProfile.total_points} pts
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={userProfile.status === 'active' ? 'default' : 'destructive'}
                          className={userProfile.status === 'active' ? 'bg-green-500' : ''}
                        >
                          {userProfile.status === 'active' ? 'Ativo' : 'Suspenso'}
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
                            <DropdownMenuItem onClick={() => viewUser(userProfile)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAddProduct(userProfile)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Produto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleUserStatus(userProfile)}>
                              {userProfile.status === 'active' ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Suspender
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                </div>
              )}
            </Card>
          </div>
        </main>

        {/* Dialog de Detalhes do Usuário */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>
                Informações completas do usuário
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {selectedUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedUser.full_name || 'Sem nome'}</h3>
                    <Badge
                      variant={selectedUser.status === 'active' ? 'default' : 'destructive'}
                      className={selectedUser.status === 'active' ? 'bg-green-500' : ''}
                    >
                      {selectedUser.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </Badge>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Cadastrado em {format(new Date(selectedUser.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.total_products} produtos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.total_points} pontos</span>
                    </div>
                  </div>
                </div>

                {/* Produtos do Usuário */}
                <div>
                  <h4 className="font-semibold mb-3">Produtos do Usuário</h4>
                  {userProducts.length > 0 ? (
                    <div className="space-y-2">
                      {userProducts.map(product => (
                        <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <span>{product.name}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/produto/${product.slug}`)}
                          >
                            Ver Produto
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum produto adquirido</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Adicionar Produto */}
        <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto</DialogTitle>
              <DialogDescription>
                Selecione um produto para adicionar ao usuário {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddProductOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addProductToUser} disabled={!selectedProduct}>
                  Adicionar Produto
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}