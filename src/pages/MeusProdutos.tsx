import { useState } from "react";
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

// Mock data - replace with real Supabase queries
const mockProducts = [
  {
    id: "1",
    name: "Curso Completo de Marketing Digital",
    slug: "marketing-digital-completo",
    description: "Aprenda as estratégias mais avançadas de marketing digital e transforme seu negócio com técnicas comprovadas pelos maiores especialistas.",
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
    description: "Guia completo com técnicas comprovadas para aumentar suas conversões e transformar visitantes em clientes fiéis.",
    cover_image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop",
    product_type: "ebook",
    total_modules: 8,
    estimated_duration: "2 horas",
    level: "Iniciante",
    progress: 100,
  },
  {
    id: "3",
    name: "Mentoria Individual: Estratégia de Negócios",
    slug: "mentoria-estrategia-negocios",
    description: "Sessões individuais de mentoria para desenvolver e implementar estratégias eficazes para seu negócio.",
    cover_image_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop",
    product_type: "mentoring",
    total_modules: 4,
    estimated_duration: "4 sessões",
    level: "Avançado",
    progress: 25,
  },
  {
    id: "4",
    name: "Curso de Copywriting Persuasivo",
    slug: "copywriting-persuasivo",
    description: "Domine a arte da escrita persuasiva e crie textos que vendem automaticamente.",
    cover_image_url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=225&fit=crop",
    product_type: "course",
    total_modules: 15,
    estimated_duration: "10 horas",
    level: "Intermediário",
    progress: 0,
  },
];

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
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || product.product_type === typeFilter;
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "not-started" && product.progress === 0) ||
                         (statusFilter === "in-progress" && product.progress > 0 && product.progress < 100) ||
                         (statusFilter === "completed" && product.progress === 100);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getProgressStats = () => {
    const total = mockProducts.length;
    const completed = mockProducts.filter(p => p.progress === 100).length;
    const inProgress = mockProducts.filter(p => p.progress > 0 && p.progress < 100).length;
    const notStarted = mockProducts.filter(p => p.progress === 0).length;

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
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showProgress
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                Nenhum produto encontrado
              </p>
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
            </div>
          )}
        </main>
      </div>
    </div>
  );
}