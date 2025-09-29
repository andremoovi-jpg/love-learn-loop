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
import { useUserProducts } from "@/hooks/useUserProducts";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from 'react-i18next';

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


export default function MeusProdutos() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
          product:products(
            id,
            name,
            slug,
            description,
            cover_image_url,
            product_type,
            level,
            estimated_duration,
            content
          )
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

  const filterOptions = [
    { value: "all", label: t('myProducts.filters.all') },
    { value: "course", label: t('myProducts.filters.courses') },
    { value: "ebook", label: t('myProducts.filters.ebooks') },
    { value: "mentoring", label: t('myProducts.filters.mentoring') },
  ];

  const statusOptions = [
    { value: "all", label: t('myProducts.filters.allStatus') },
    { value: "not-started", label: t('myProducts.filters.notStarted') },
    { value: "in-progress", label: t('myProducts.filters.inProgress') },
    { value: "completed", label: t('myProducts.filters.completed') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          breadcrumbs={[
            { label: t('navigation.dashboard'), href: "/dashboard" },
            { label: t('navigation.myProducts') }
          ]}
        />

        <main className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('myProducts.title')}</h1>
              <p className="text-muted-foreground">
                {t('myProducts.subtitle')}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{t('myProducts.stats.total')}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">{t('myProducts.stats.completed')}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-warning">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">{t('myProducts.stats.inProgress')}</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg text-center">
                <p className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</p>
                <p className="text-sm text-muted-foreground">{t('myProducts.stats.notStarted')}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('myProducts.searchPlaceholder')}
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
              <span className="text-sm text-muted-foreground">{t('myProducts.filters.activeFilters')}</span>
              
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
                {t('myProducts.filters.clearFilters')}
              </Button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">{t('myProducts.loading')}</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((userProduct) => (
                <ProductCard
                  key={userProduct.id}
                  product={{
                    ...userProduct.product,
                    total_modules: (userProduct.product as any)?.total_modules || 
                      (userProduct.product as any)?.content?.modules?.length || 0,
                    progress: userProduct.progress
                  }}
                  showProgress
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                {userProducts.length === 0 ? t('myProducts.noProducts') : t('myProducts.noProductsFound')}
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
                  {t('myProducts.filters.clearFilters')}
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}