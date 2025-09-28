import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, Plus, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  total_points: number;
  created_at: string;
  email?: string;
  total_products: number;
  status: 'active' | 'inactive';
}

export default function AdminUsuarios() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      console.log('=== INICIANDO CARREGAMENTO DE USUÁRIOS ===');
      console.log('User atual:', user?.email, 'Admin:', user?.is_admin);

      // Primeiro, buscar profiles simples para ver se funciona
      console.log('🔍 Buscando profiles...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 Resultado profiles:', { 
        count: profiles?.length, 
        error: profilesError?.message,
        profiles: profiles?.slice(0, 2) // Primeiros 2 para debug
      });

      if (profilesError) {
        console.error('❌ ERRO ao buscar profiles:', profilesError);
        throw profilesError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ Nenhum profile encontrado');
        setUsers([]);
        return;
      }

      // Agora buscar contagem de produtos por usuário
      console.log('🔍 Buscando contagem de produtos...');
      
      const { data: userProducts, error: productsError } = await supabase
        .from('user_products')
        .select('user_id');

      console.log('📊 Resultado user_products:', { 
        count: userProducts?.length, 
        error: productsError?.message 
      });

      // Criar mapa de contagem de produtos
      const productsMap = new Map<string, number>();
      if (userProducts) {
        userProducts.forEach(item => {
          const count = productsMap.get(item.user_id) || 0;
          productsMap.set(item.user_id, count + 1);
        });
      }

      // Combinar dados
      const usersWithDetails = profiles.map(profile => ({
        ...profile,
        email: `user-${profile.user_id.slice(0, 8)}@example.com`,
        total_products: productsMap.get(profile.user_id) || 0,
        status: 'active' as const
      }));

      console.log('✅ Usuários processados:', usersWithDetails.length);
      setUsers(usersWithDetails);

    } catch (error: any) {
      console.error('=== ERRO CAPTURADO ===');
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('Full error:', error);
      
      toast.error(`Erro ao carregar usuários: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const viewUser = (userId: string) => {
    toast.info(`Visualizando usuário ${userId}`);
    // Implementar navegação para detalhes do usuário
  };

  const addProduct = (userId: string) => {
    toast.info(`Adicionando produto para usuário ${userId}`);
    // Implementar dialog para adicionar produto
  };

  const toggleStatus = (userId: string) => {
    toast.info(`Alterando status do usuário ${userId}`);
    // Implementar toggle de status
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
                        {userProfile.email}
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
                          variant={userProfile.status === 'active' ? 'default' : 'secondary'}
                          className={userProfile.status === 'active' ? 'bg-green-500' : ''}
                        >
                          {userProfile.status === 'active' ? 'Ativo' : 'Inativo'}
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
                            <DropdownMenuItem onClick={() => viewUser(userProfile.user_id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => addProduct(userProfile.user_id)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Adicionar Produto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus(userProfile.user_id)}>
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
      </div>
    </div>
  );
}