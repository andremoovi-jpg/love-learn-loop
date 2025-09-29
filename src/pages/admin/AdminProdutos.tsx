import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash, X, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Product } from "@/types";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface Module {
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  title: string;
  type: 'video' | 'pdf' | 'text';
  url: string;
}

export default function AdminProdutos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [cartpandaId, setCartpandaId] = useState("");
  const [type, setType] = useState("course");
  const [coverImage, setCoverImage] = useState("");
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    if (user?.is_admin) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditing(product);
      setName(product.name);
      setSlug(product.slug);
      setDescription(product.description || "");
      setCartpandaId(product.cartpanda_product_id || "");
      setType(product.product_type);
      setCoverImage(product.cover_image_url || "");
      
      // Parse content to modules
      if (product.content) {
        try {
          const content = typeof product.content === 'string' 
            ? JSON.parse(product.content) 
            : product.content;
          setModules(content.modules || []);
        } catch {
          setModules([]);
        }
      } else {
        setModules([]);
      }
    } else {
      setEditing(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setCartpandaId("");
    setType("course");
    setCoverImage("");
    setModules([]);
  };

  const addModule = () => {
    setModules([...modules, { title: "", lessons: [] }]);
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const updateModule = (index: number, field: string, value: string) => {
    const newModules = [...modules];
    (newModules[index] as any)[field] = value;
    setModules(newModules);
  };

  const addLesson = (moduleIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons.push({ title: "", type: "video", url: "" });
    setModules(newModules);
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const newModules = [...modules];
    newModules[moduleIndex].lessons = newModules[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
    setModules(newModules);
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: string, value: string) => {
    const newModules = [...modules];
    (newModules[moduleIndex].lessons[lessonIndex] as any)[field] = value;
    setModules(newModules);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Ensure we have proper content structure
      const contentData = modules.length > 0 
        ? { modules } 
        : {
            modules: [{
              title: 'Módulo 1 - Introdução',
              lessons: [{
                title: 'Aula 1 - Bem-vindo',
                type: 'video' as const,
                url: ''
              }]
            }]
          };

      const productData = {
        name,
        slug,
        description,
        cartpanda_product_id: cartpandaId,
        product_type: type,
        cover_image_url: coverImage,
        level: 'beginner', // Default level
        estimated_duration: '1 hora', // Default duration
        content: contentData as any, // Save as JSONB, not stringified
        is_active: true
      };

      if (editing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editing.id);
        
        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
        toast.success('Produto criado com sucesso!');
      }

      setDialogOpen(false);
      loadProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast.success('Produto excluído com sucesso!');
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
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
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          title="Produtos"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Produtos" }
          ]}
        />

        <main className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Produtos</h1>
                <p className="text-muted-foreground">Gerencie todos os produtos da plataforma</p>
              </div>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.id} className="p-6">
                  {product.cover_image_url && (
                    <img 
                      src={product.cover_image_url} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded mb-4" 
                    />
                  )}
                  <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                  <Badge className="mb-4">{product.product_type}</Badge>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openDialog(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => deleteProduct(product.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
                <Button onClick={() => openDialog()} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Produto
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>{editing ? 'Editar' : 'Novo'} Produto</DialogTitle>

          <form onSubmit={saveProduct} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">CartPanda ID</label>
                <Input value={cartpandaId} onChange={(e) => setCartpandaId(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Curso</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="mentorship">Mentoria</SelectItem>
                    <SelectItem value="program">Programa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">URL da Imagem de Capa</label>
              <Input 
                type="url" 
                value={coverImage} 
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>

            {/* Editor de Módulos */}
            <div>
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-bold">Módulos e Aulas</h3>
                <Button type="button" onClick={addModule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Módulo
                </Button>
              </div>

              {modules.map((module, mIdx) => (
                <Card key={mIdx} className="p-4 mb-4">
                  <div className="flex gap-4 mb-4">
                    <Input
                      placeholder="Título do Módulo"
                      value={module.title}
                      onChange={(e) => updateModule(mIdx, 'title', e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" onClick={() => removeModule(mIdx)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="ml-6 space-y-2">
                    {module.lessons.map((lesson, lIdx) => (
                      <div key={lIdx} className="flex gap-2">
                        <Input
                          placeholder="Título da Aula"
                          value={lesson.title}
                          onChange={(e) => updateLesson(mIdx, lIdx, 'title', e.target.value)}
                          className="flex-1"
                        />
                        <Select
                          value={lesson.type}
                          onValueChange={(v) => updateLesson(mIdx, lIdx, 'type', v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Vídeo</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="URL"
                          value={lesson.url}
                          onChange={(e) => updateLesson(mIdx, lIdx, 'url', e.target.value)}
                          className="flex-1"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => removeLesson(mIdx, lIdx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addLesson(mIdx)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aula
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}