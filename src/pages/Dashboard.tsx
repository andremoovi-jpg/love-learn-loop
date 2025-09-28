import { useState, useEffect } from "react";
import { BookOpen, Trophy, Users, TrendingUp, Play, Clock, Package, Star } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface UserProduct {
  id: string;
  progress: number;
  last_accessed_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    cover_image_url: string;
    product_type: string;
    estimated_duration: string;
    level: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user products
      const { data: userProductsData } = await supabase
        .from('user_products')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user!.id)
        .order('last_accessed_at', { ascending: false });

      setUserProducts(userProductsData || []);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgProgress = userProducts.length > 0 
    ? Math.round(userProducts.reduce((acc, p) => acc + p.progress, 0) / userProducts.length)
    : 0;

  const lastProduct = userProducts.find(p => p.progress > 0 && p.progress < 100);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          title="Dashboard"
          breadcrumbs={[
            { label: "Dashboard" }
          ]}
        />

        <main className="p-6 space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              Bem-vindo de volta, {user?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-muted-foreground">
              Aqui está seu resumo de atividades e próximos passos.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Produtos Ativos"
              value={userProducts.length}
              icon={Package}
            />
            <StatCard
              title="Progresso Médio"
              value={`${avgProgress}%`}
              icon={TrendingUp}
              gradient
            />
            <StatCard
              title="Conquistas"
              value="0"
              icon={Trophy}
            />
            <StatCard
              title="Pontos Totais"
              value={profile?.total_points || 0}
              icon={Star}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Continue Learning */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Play className="h-5 w-5 text-primary" />
                    <span>Continue Aprendendo</span>
                  </CardTitle>
                  <CardDescription>
                    Retome seus estudos de onde parou
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lastProduct ? (
                    <div className="flex items-center space-x-4 p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-base">
                      <img
                        src={lastProduct.product.cover_image_url}
                        alt={lastProduct.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold">{lastProduct.product.name}</h4>
                        <div className="flex items-center justify-between">
                          <Progress value={lastProduct.progress} className="flex-1 mr-4 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {lastProduct.progress}%
                          </span>
                        </div>
                      </div>
                      <Button asChild size="sm" className="gradient-primary">
                        <Link to={`/produto/${lastProduct.product.slug}`}>
                          Continuar
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum produto em andamento
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* My Products */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Meus Produtos</h2>
                  <Button asChild variant="outline">
                    <Link to="/meus-produtos">Ver todos</Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userProducts.slice(0, 2).map((userProduct) => (
                    <ProductCard
                      key={userProduct.id}
                      product={{
                        ...userProduct.product,
                        progress: userProduct.progress
                      }}
                      showProgress
                    />
                  ))}
                  {userProducts.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 col-span-2">
                      Nenhum produto adquirido ainda
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <span>Atividade Recente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">Bem-vindo à MemberLovs!</p>
                        <p className="text-xs text-muted-foreground">Hoje</p>
                      </div>
                    </div>
                    {userProducts.length === 0 && (
                      <div className="flex items-start space-x-3 text-sm">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Aguardando primeiro produto</p>
                          <p className="text-muted-foreground">Entre em contato para adicionar produtos</p>
                          <p className="text-xs text-muted-foreground">-</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/ofertas">
                      <Trophy className="mr-2 h-4 w-4" />
                      Ver Ofertas Especiais
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/comunidade">
                      <Users className="mr-2 h-4 w-4" />
                      Acessar Comunidade
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link to="/conquistas">
                      <Trophy className="mr-2 h-4 w-4" />
                      Ver Conquistas
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}