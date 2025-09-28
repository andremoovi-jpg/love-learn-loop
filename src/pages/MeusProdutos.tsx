import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/ui/product-card";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserProduct {
  id: string;
  progress: number;
  purchased_at: string;
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

const filterOptions = [
  { value: "all", label: "Todos os produtos" },
  { value: "course", label: "Cursos" },
  { value: "ebook", label: "E-books" },
  { value: "mentoring", label: "Mentorias" },
];

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "not-started", label: "Não iniciado" },
  { value: "in-progress", label: "Em progresso" },
  { value: "completed", label: "Concluído" },
];

export default function MeusProdutos() {
  const { user } = useAuth();
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchUserProducts();
    }
  }, [user]);

  const fetchUserProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_products')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', user!.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setUserProducts(data || []);
    } catch (error) {
      console.error('Error fetching user products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = userProducts.filter((userProduct) => {
    const product = userProduct.product;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || product.product_type === typeFilter;
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "not-started" && userProduct.progress === 0) ||
                         (statusFilter === "in-progress" && userProduct.progress > 0 && userProduct.progress < 100) ||
                         (statusFilter === "completed" && userProduct.progress === 100);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getProgressStats = () => {
    const total = userProducts.length;
    const completed = userProducts.filter(p => p.progress === 100).length;
    const inProgress = userProducts.filter(p => p.progress > 0 && p.progress < 100).length;
    const notStarted = userProducts.filter(p => p.progress === 0).length;

    return { total, completed, inProgress, notStarted };
  };

  const stats = getProgressStats();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Meus Produtos" }
          ]}
        />

        <main className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Meus Produtos</h1>
              <p className="text-muted-foreground">
                Gerencie e acesse todos os seus produtos adquiridos
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-warning">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">Em Progresso</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</p>
                <p className="text-sm text-muted-foreground">Não Iniciados</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {(typeFilter !== "all" || statusFilter !== "all" || searchTerm) && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              
              {searchTerm && (
                <Badge variant="secondary" className="gap-2">
                  Busca: "{searchTerm}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                  >
                    ✕
                  </Button>
                </Badge>
              )}

              {typeFilter !== "all" && (
                <Badge variant="secondary" className="gap-2">
                  {filterOptions.find(opt => opt.value === typeFilter)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setTypeFilter("all")}
                  >
                    ✕
                  </Button>
                </Badge>
              )}

              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-2">
                  {statusOptions.find(opt => opt.value === statusFilter)?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setStatusFilter("all")}
                  >
                    ✕
                  </Button>
                </Badge>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((userProduct) => (
                <ProductCard
                  key={userProduct.id}
                  product={{
                    ...userProduct.product,
                    progress: userProduct.progress
                  }}
                  showProgress
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                {userProducts.length === 0 ? "Nenhum produto adquirido ainda" : "Nenhum produto encontrado"}
              </p>
              {userProducts.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}