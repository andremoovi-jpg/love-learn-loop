import { BookOpen, Trophy, Users, TrendingUp, Play, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ProductCard } from "@/components/ui/product-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

// Mock data - replace with real Supabase queries
const mockProducts = [
  {
    id: "1",
    name: "Curso Completo de Marketing Digital",
    slug: "marketing-digital-completo",
    description: "Aprenda as estratégias mais avançadas de marketing digital e transforme seu negócio.",
    cover_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop",
    product_type: "course",
    total_modules: 12,
    estimated_duration: "8 horas",
    level: "Intermediário",
    progress: 65,
  },
  {
    id: "2", 
    name: "E-book: Vendas que Convertem",
    slug: "ebook-vendas-convertem",
    description: "Guia completo com técnicas comprovadas para aumentar suas conversões.",
    cover_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop",
    product_type: "ebook",
    total_modules: 8,
    estimated_duration: "2 horas",
    level: "Iniciante",
    progress: 100,
  },
];

const recentActivity = [
  {
    id: "1",
    title: "Concluiu o módulo 'Funis de Vendas'",
    product: "Marketing Digital Completo",
    timestamp: "2 horas atrás",
    type: "completion"
  },
  {
    id: "2",
    title: "Conquistou o badge 'Primeiro Curso'",
    product: null,
    timestamp: "1 dia atrás", 
    type: "achievement"
  },
  {
    id: "3",
    title: "Iniciou o curso 'Marketing Digital'",
    product: "Marketing Digital Completo",
    timestamp: "3 dias atrás",
    type: "start"
  },
];

export default function Dashboard() {
  const { user } = useAuth();

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
              value="2"
              icon={BookOpen}
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard
              title="Progresso Geral"
              value="82%"
              icon={TrendingUp}
              trend={{ value: 5, isPositive: true }}
              gradient
            />
            <StatCard
              title="Conquistas"
              value="7"
              icon={Trophy}
              trend={{ value: 2, isPositive: true }}
            />
            <StatCard
              title="Pontos Totais"
              value={user?.total_points || 0}
              icon={Users}
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
                  {mockProducts
                    .filter(p => p.progress > 0 && p.progress < 100)
                    .map((product) => (
                    <div key={product.id} className="flex items-center space-x-4 p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-base">
                      <img
                        src={product.cover_image_url}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold">{product.name}</h4>
                        <div className="flex items-center justify-between">
                          <Progress value={product.progress} className="flex-1 mr-4 h-2" />
                          <span className="text-sm text-muted-foreground">
                            {product.progress}%
                          </span>
                        </div>
                      </div>
                      <Button asChild size="sm" className="gradient-primary">
                        <Link to={`/produto/${product.slug}`}>
                          Continuar
                        </Link>
                      </Button>
                    </div>
                  ))}
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
                  {mockProducts.slice(0, 2).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      showProgress
                    />
                  ))}
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
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{activity.title}</p>
                          {activity.product && (
                            <p className="text-muted-foreground">{activity.product}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
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