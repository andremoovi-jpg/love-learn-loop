import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Package, Target, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

interface Reports {
  totalRevenue: string;
  upsellConversion: string;
  productsSold: number;
  completionRate: string;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  engagement: Array<{
    product_id: string;
    product_name: string;
    active_users: number;
    avg_progress: number;
    completion_rate: number;
  }>;
}

export default function AdminRelatorios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [reports, setReports] = useState<Reports>({
    totalRevenue: "0",
    upsellConversion: "0",
    productsSold: 0,
    completionRate: "0",
    topProducts: [],
    engagement: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.is_admin) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      // Carregar dados básicos
      const [productsRes, userProductsRes] = await Promise.all([
        supabase.from('products').select('id, name').eq('is_active', true),
        supabase.from('user_products').select(`
          id, progress, completed_at,
          product:products(id, name)
        `)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (userProductsRes.error) throw userProductsRes.error;

      const products = productsRes.data || [];
      const userProducts = userProductsRes.data || [];

      // Calcular métricas
      const totalSales = userProducts.length;
      const completedProducts = userProducts.filter(up => up.completed_at).length;
      const avgProgress = userProducts.length > 0 
        ? userProducts.reduce((acc, up) => acc + (up.progress || 0), 0) / userProducts.length 
        : 0;

      // Top produtos (mock data - seria calculado com vendas reais)
      const topProducts = products.slice(0, 5).map((product, index) => ({
        id: product.id,
        name: product.name,
        sales: Math.floor(Math.random() * 100) + 20,
        revenue: (Math.floor(Math.random() * 5000) + 1000)
      }));

      // Engajamento por produto
      const engagement = products.map(product => {
        const productUserProducts = userProducts.filter(up => up.product?.id === product.id);
        const activeUsers = productUserProducts.length;
        const avgProductProgress = activeUsers > 0 
          ? productUserProducts.reduce((acc, up) => acc + (up.progress || 0), 0) / activeUsers 
          : 0;
        const completedCount = productUserProducts.filter(up => up.completed_at).length;
        const completionRate = activeUsers > 0 ? (completedCount / activeUsers) * 100 : 0;

        return {
          product_id: product.id,
          product_name: product.name,
          active_users: activeUsers,
          avg_progress: Math.round(avgProductProgress),
          completion_rate: Math.round(completionRate)
        };
      });

      setReports({
        totalRevenue: "25.750", // Mock data
        upsellConversion: "12.5", // Mock data
        productsSold: totalSales,
        completionRate: Math.round((completedProducts / totalSales) * 100).toString(),
        topProducts,
        engagement
      });

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
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
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar breadcrumbs={[
          { label: t('admin.dashboard'), href: '/admin' },
          { label: t('admin.reports') }
        ]} />
        
        <main className="p-6">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{t('admin.reports')}</h1>
                <p className="text-muted-foreground">Análise de performance da plataforma</p>
              </div>
            </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="Receita Total" 
            value={`R$ ${reports.totalRevenue}`}
            icon={DollarSign}
          />
          <StatCard 
            title="Conversão Upsell" 
            value={`${reports.upsellConversion}%`}
            icon={TrendingUp}
          />
          <StatCard 
            title="Produtos Vendidos" 
            value={reports.productsSold.toString()}
            icon={Package}
          />
          <StatCard 
            title="Taxa Conclusão" 
            value={`${reports.completionRate}%`}
            icon={Target}
          />
        </div>

        {/* Top produtos */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Produtos Mais Vendidos</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Vendas</TableHead>
                <TableHead>Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.topProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {product.sales}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {reports.topProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma venda encontrada</p>
            </div>
          )}
        </Card>

        {/* Engajamento */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Engajamento por Produto</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Usuários Ativos</TableHead>
                <TableHead>Progresso Médio</TableHead>
                <TableHead>Taxa Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.engagement.map(item => (
                <TableRow key={item.product_id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                      {item.active_users}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.avg_progress} className="w-24" />
                      <span className="text-sm text-muted-foreground">
                        {item.avg_progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.completion_rate > 50 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.completion_rate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {reports.engagement.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum dado de engajamento encontrado</p>
            </div>
          )}
        </Card>
          </div>
        </main>
      </div>
    </div>
  );
}