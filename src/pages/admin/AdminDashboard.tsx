import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Package, DollarSign, TrendingUp, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

interface AdminStats {
  totalUsers: number;
  activeProducts: number;
  monthlySales: string;
  conversionRate: string;
}

interface Activity {
  id: string;
  user_name: string;
  action: string;
  product_name?: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeProducts: 0,
    monthlySales: "0",
    conversionRate: "0"
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Carregar estatísticas
      const [usersRes, productsRes, userProductsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('user_products').select('id', { count: 'exact' })
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        activeProducts: productsRes.count || 0,
        monthlySales: "12.500", // Mock data - seria calculado com vendas reais
        conversionRate: "8.5" // Mock data
      });

      // Carregar atividades recentes (mock data)
      setActivities([
        {
          id: "1",
          user_name: "João Silva",
          action: "Comprou produto",
          product_name: "Curso React Avançado",
          created_at: new Date().toISOString()
        },
        {
          id: "2", 
          user_name: "Maria Santos",
          action: "Completou módulo",
          product_name: "E-book TypeScript",
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
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
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          title="Dashboard Admin"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Dashboard" }
          ]}
        />

        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard Admin</h1>
            <p className="text-muted-foreground">Visão geral da plataforma</p>
          </div>

          <div className="space-y-8">
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard 
                title="Total Usuários" 
                value={stats.totalUsers.toString()} 
                icon={Users} 
              />
              <StatCard 
                title="Produtos Ativos" 
                value={stats.activeProducts.toString()} 
                icon={Package} 
              />
              <StatCard 
                title="Vendas (mês)" 
                value={`R$ ${stats.monthlySales}`} 
                icon={DollarSign} 
              />
              <StatCard 
                title="Taxa Conversão" 
                value={`${stats.conversionRate}%`} 
                icon={TrendingUp} 
              />
            </div>

            {/* Últimas atividades */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Atividades Recentes</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map(activity => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.user_name}</TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell>{activity.product_name || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}