import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUpload } from "@/components/FileUpload";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Clock,
  Link,
  File,
  HelpCircle,
  Download,
  ChevronUp,
  ChevronDown,
  Copy,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_image_url: string;
  product_type: string;
  level: string;
  estimated_duration: string;
  cartpanda_product_id?: string;
  content?: {
    modules: Module[];
  };
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'text' | 'pdf' | 'quiz' | 'download' | 'embed' | 'video_with_attachments';
  content?: string; // Para texto ou HTML
  url?: string; // Para vídeos, PDFs, ou links externos
  video_url?: string; // URL do vídeo quando tem anexos
  duration?: string;
  attachments?: Attachment[];
  quiz_questions?: QuizQuestion[];
  order: number;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size?: string;
  type: 'pdf' | 'doc' | 'xls' | 'zip' | 'image' | 'other';
  description?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export default function AdminProdutos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    cover_image_url: '',
    product_type: 'course',
    level: 'beginner',
    estimated_duration: '',
    cartpanda_product_id: '',
    content: {
      modules: [] as Module[]
    }
  });

  // Module/Lesson editing states
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

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

      // Parse content field if it's a string
      const parsedProducts = (data || []).map(product => ({
        ...product,
        content: typeof product.content === 'string'
          ? JSON.parse(product.content)
          : product.content
      }));

      setProducts(parsedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        cover_image_url: product.cover_image_url,
        product_type: product.product_type,
        level: product.level,
        estimated_duration: product.estimated_duration,
        cartpanda_product_id: product.cartpanda_product_id || '',
        content: product.content || { modules: [] }
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        cover_image_url: '',
        product_type: 'course',
        level: 'beginner',
        estimated_duration: '',
        cartpanda_product_id: '',
        content: { modules: [] }
      });
    }
    setDialogOpen(true);
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addModule = () => {
    const newModule: Module = {
      id: generateId(),
      title: `Módulo ${formData.content.modules.length + 1}`,
      description: '',
      order: formData.content.modules.length,
      lessons: []
    };

    setFormData({
      ...formData,
      content: {
        modules: [...formData.content.modules, newModule]
      }
    });

    setEditingModule(newModule);
    setSelectedModuleId(newModule.id);
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    setFormData({
      ...formData,
      content: {
        modules: formData.content.modules.map(m =>
          m.id === moduleId ? { ...m, ...updates } : m
        )
      }
    });
  };

  const deleteModule = (moduleId: string) => {
    if (!confirm('Tem certeza que deseja excluir este módulo e todas as suas aulas?')) return;

    setFormData({
      ...formData,
      content: {
        modules: formData.content.modules
          .filter(m => m.id !== moduleId)
          .map((m, idx) => ({ ...m, order: idx }))
      }
    });

    if (selectedModuleId === moduleId) {
      setSelectedModuleId(null);
    }
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const modules = [...formData.content.modules];
    const index = modules.findIndex(m => m.id === moduleId);

    if (direction === 'up' && index > 0) {
      [modules[index], modules[index - 1]] = [modules[index - 1], modules[index]];
    } else if (direction === 'down' && index < modules.length - 1) {
      [modules[index], modules[index + 1]] = [modules[index + 1], modules[index]];
    }

    setFormData({
      ...formData,
      content: {
        modules: modules.map((m, idx) => ({ ...m, order: idx }))
      }
    });
  };

  const addLesson = (moduleId: string, type: Lesson['type']) => {
    const module = formData.content.modules.find(m => m.id === moduleId);
    if (!module) return;

    const newLesson: Lesson = {
      id: generateId(),
      title: `Aula ${module.lessons.length + 1}`,
      description: '',
      type,
      order: module.lessons.length,
      duration: '5 min',
      url: '',
      content: '',
      attachments: [],
      quiz_questions: []
    };

    updateModule(moduleId, {
      lessons: [...module.lessons, newLesson]
    });

    setEditingLesson(newLesson);
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    const module = formData.content.modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      lessons: module.lessons.map(l =>
        l.id === lessonId ? { ...l, ...updates } : l
      )
    });
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return;

    const module = formData.content.modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      lessons: module.lessons
        .filter(l => l.id !== lessonId)
        .map((l, idx) => ({ ...l, order: idx }))
    });

    if (editingLesson?.id === lessonId) {
      setEditingLesson(null);
    }
  };

  const moveLesson = (moduleId: string, lessonId: string, direction: 'up' | 'down') => {
    const module = formData.content.modules.find(m => m.id === moduleId);
    if (!module) return;

    const lessons = [...module.lessons];
    const index = lessons.findIndex(l => l.id === lessonId);

    if (direction === 'up' && index > 0) {
      [lessons[index], lessons[index - 1]] = [lessons[index - 1], lessons[index]];
    } else if (direction === 'down' && index < lessons.length - 1) {
      [lessons[index], lessons[index + 1]] = [lessons[index + 1], lessons[index]];
    }

    updateModule(moduleId, {
      lessons: lessons.map((l, idx) => ({ ...l, order: idx }))
    });
  };

  const duplicateModule = (moduleId: string) => {
    const module = formData.content.modules.find(m => m.id === moduleId);
    if (!module) return;

    const newModule: Module = {
      ...module,
      id: generateId(),
      title: `${module.title} (Cópia)`,
      order: formData.content.modules.length,
      lessons: module.lessons.map(l => ({
        ...l,
        id: generateId()
      }))
    };

    setFormData({
      ...formData,
      content: {
        modules: [...formData.content.modules, newModule]
      }
    });

    toast.success('Módulo duplicado com sucesso!');
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.slug) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Ensure modules have proper structure
      const contentToSave = {
        modules: formData.content.modules.length > 0
          ? formData.content.modules
          : [{
              id: generateId(),
              title: 'Módulo 1 - Introdução',
              description: 'Módulo inicial do produto',
              order: 0,
              lessons: [{
                id: generateId(),
                title: 'Aula 1 - Bem-vindo',
                description: 'Aula de boas-vindas',
                type: 'text' as const,
                content: 'Bem-vindo ao curso!',
                duration: '5 min',
                order: 0
              }]
            }]
      };

      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        cover_image_url: formData.cover_image_url,
        product_type: formData.product_type,
        level: formData.level,
        estimated_duration: formData.estimated_duration,
        cartpanda_product_id: formData.cartpanda_product_id || null,
        content: contentToSave as any
      };

      console.log('Salvando produto:', productData);

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

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
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(`Erro ao salvar produto: ${error.message}`);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Produto excluído com sucesso!');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  const getLessonIcon = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'text': return <FileText className="h-4 w-4" />;
      case 'pdf': return <File className="h-4 w-4" />;
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      case 'download': return <Download className="h-4 w-4" />;
      case 'embed': return <Link className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getLessonTypeName = (type: Lesson['type']) => {
    switch (type) {
      case 'video': return 'Vídeo';
      case 'text': return 'Texto';
      case 'pdf': return 'PDF';
      case 'quiz': return 'Quiz';
      case 'download': return 'Download';
      case 'embed': return 'Embed';
      default: return 'Texto';
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
              <Button onClick={() => openDialog()} className="gradient-primary">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Módulos</TableHead>
                    <TableHead>CartPanda ID</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => {
                    const moduleCount = product.content?.modules?.length || 0;
                    const lessonCount = product.content?.modules?.reduce(
                      (acc, m) => acc + (m.lessons?.length || 0), 0
                    ) || 0;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.cover_image_url && (
                              <img
                                src={product.cover_image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">/{product.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.product_type === 'course' ? 'Curso' :
                             product.product_type === 'ebook' ? 'E-book' :
                             'Mentoria'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {product.level === 'beginner' ? 'Iniciante' :
                             product.level === 'intermediate' ? 'Intermediário' :
                             'Avançado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{moduleCount} módulos</p>
                            <p className="text-muted-foreground">{lessonCount} aulas</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.cartpanda_product_id || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {products.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum produto cadastrado</p>
                </div>
              )}
            </Card>
          </div>
        </main>

        {/* Dialog de Produto */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <DialogDescription>
                Configure todos os detalhes do produto
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="content">Conteúdo</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nome *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Slug *</label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                      })}
                      placeholder="nome-do-produto"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Imagem de Capa</label>
                  <FileUpload
                    bucket="products"
                    accept={{
                      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
                    }}
                    maxSize={10 * 1024 * 1024}
                    onUploadComplete={(url) => {
                      setFormData(prev => ({ ...prev, cover_image_url: url }));
                    }}
                    currentUrl={formData.cover_image_url}
                    label="Arraste a imagem do produto ou clique para selecionar"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tipo</label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="course">Curso</SelectItem>
                        <SelectItem value="ebook">E-book</SelectItem>
                        <SelectItem value="mentorship">Mentoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Nível</label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Iniciante</SelectItem>
                        <SelectItem value="intermediate">Intermediário</SelectItem>
                        <SelectItem value="advanced">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Duração Estimada</label>
                    <Input
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
                      placeholder="Ex: 4 horas"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">CartPanda Product ID</label>
                  <Input
                    value={formData.cartpanda_product_id}
                    onChange={(e) => setFormData({ ...formData, cartpanda_product_id: e.target.value })}
                    placeholder="ID do produto no CartPanda (opcional)"
                  />
                </div>
              </TabsContent>

              <TabsContent value="content" className="flex-1 overflow-hidden flex flex-col">
                <div className="flex gap-4 mb-4">
                  <Button onClick={addModule} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Módulo
                  </Button>
                  <div className="flex-1 text-sm text-muted-foreground flex items-center">
                    {formData.content.modules.length} módulos •
                    {formData.content.modules.reduce((acc, m) => acc + m.lessons.length, 0)} aulas totais
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  {formData.content.modules.map((module, moduleIdx) => (
                    <Card key={module.id} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <Input
                            value={module.title}
                            onChange={(e) => updateModule(module.id, { title: e.target.value })}
                            placeholder="Título do módulo"
                            className="font-semibold mb-2"
                          />
                          <Textarea
                            value={module.description}
                            onChange={(e) => updateModule(module.id, { description: e.target.value })}
                            placeholder="Descrição do módulo (opcional)"
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveModule(module.id, 'up')}
                            disabled={moduleIdx === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveModule(module.id, 'down')}
                            disabled={moduleIdx === formData.content.modules.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateModule(module.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteModule(module.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Accordion type="single" collapsible>
                        <AccordionItem value="lessons">
                          <AccordionTrigger>
                            {module.lessons.length} aulas
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {/* Add Lesson Buttons */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'video')}
                                >
                                  <Video className="mr-2 h-4 w-4" />
                                  + Vídeo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'text')}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  + Texto
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'pdf')}
                                >
                                  <File className="mr-2 h-4 w-4" />
                                  + PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'quiz')}
                                >
                                  <HelpCircle className="mr-2 h-4 w-4" />
                                  + Quiz
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'download')}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  + Anexo
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => addLesson(module.id, 'video_with_attachments')}
                                >
                                  <Video className="mr-2 h-4 w-4" />
                                  + Vídeo com Anexos
                                </Button>
                              </div>

                              {/* Lessons List */}
                              {module.lessons.map((lesson, lessonIdx) => (
                                <Card key={lesson.id} className="p-3">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                      {getLessonIcon(lesson.type)}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        value={lesson.title}
                                        onChange={(e) => updateLesson(module.id, lesson.id, {
                                          title: e.target.value
                                        })}
                                        placeholder="Título da aula"
                                        className="font-medium"
                                      />
                                      <Textarea
                                        value={lesson.description}
                                        onChange={(e) => updateLesson(module.id, lesson.id, {
                                          description: e.target.value
                                        })}
                                        placeholder="Descrição da aula"
                                        rows={2}
                                        className="text-sm"
                                      />

                                      {/* Content based on type */}
                                      {lesson.type === 'video' && (
                                        <Input
                                          value={lesson.url || ''}
                                          onChange={(e) => updateLesson(module.id, lesson.id, {
                                            url: e.target.value
                                          })}
                                          placeholder="URL do vídeo (YouTube, Vimeo, etc)"
                                        />
                                      )}

                                      {lesson.type === 'text' && (
                                        <Textarea
                                          value={lesson.content || ''}
                                          onChange={(e) => updateLesson(module.id, lesson.id, {
                                            content: e.target.value
                                          })}
                                          placeholder="Conteúdo da aula (suporta HTML)"
                                          rows={5}
                                        />
                                      )}

                                      {lesson.type === 'pdf' && (
                                        <Input
                                          value={lesson.url || ''}
                                          onChange={(e) => updateLesson(module.id, lesson.id, {
                                            url: e.target.value
                                          })}
                                          placeholder="URL do PDF"
                                        />
                                      )}

                                      {lesson.type === 'quiz' && (
                                        <div className="space-y-2">
                                          <p className="text-sm text-muted-foreground">
                                            Quiz: Configure as perguntas após salvar o produto
                                          </p>
                                        </div>
                                      )}

                                      {lesson.type === 'download' && (
                                        <div className="space-y-2">
                                          <Input
                                            value={lesson.url || ''}
                                            onChange={(e) => updateLesson(module.id, lesson.id, {
                                              url: e.target.value
                                            })}
                                            placeholder="URL do arquivo para download"
                                          />
                                          <Input
                                            placeholder="Nome do arquivo"
                                          />
                                        </div>
                                      )}

                                      {lesson.type === 'video_with_attachments' && (
                                        <div className="space-y-3">
                                          {/* URL do Vídeo */}
                                          <div>
                                            <label className="text-xs font-medium text-muted-foreground">URL do Vídeo</label>
                                            <Input
                                              value={lesson.video_url || ''}
                                              onChange={(e) => updateLesson(module.id, lesson.id, {
                                                video_url: e.target.value
                                              })}
                                              placeholder="URL do vídeo (YouTube, Vimeo, etc)"
                                            />
                                          </div>

                                          {/* Anexos */}
                                          <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                              Anexos da Aula
                                            </label>

                                            {/* Lista de anexos existentes */}
                                            {(lesson.attachments || []).map((attachment, idx) => (
                                              <div key={attachment.id} className="flex items-center gap-2 mb-2 p-2 border rounded">
                                                <File className="h-4 w-4 text-muted-foreground" />
                                                <Input
                                                  value={attachment.name}
                                                  onChange={(e) => {
                                                    const newAttachments = [...(lesson.attachments || [])];
                                                    newAttachments[idx] = { ...attachment, name: e.target.value };
                                                    updateLesson(module.id, lesson.id, { attachments: newAttachments });
                                                  }}
                                                  placeholder="Nome do arquivo"
                                                  className="flex-1"
                                                />
                                                <Input
                                                  value={attachment.url}
                                                  onChange={(e) => {
                                                    const newAttachments = [...(lesson.attachments || [])];
                                                    newAttachments[idx] = { ...attachment, url: e.target.value };
                                                    updateLesson(module.id, lesson.id, { attachments: newAttachments });
                                                  }}
                                                  placeholder="URL do arquivo"
                                                  className="flex-1"
                                                />
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    const newAttachments = lesson.attachments?.filter((_, i) => i !== idx) || [];
                                                    updateLesson(module.id, lesson.id, { attachments: newAttachments });
                                                  }}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}

                                            {/* Botão para adicionar novo anexo */}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                const newAttachment: Attachment = {
                                                  id: generateId(),
                                                  name: '',
                                                  url: '',
                                                  type: 'pdf'
                                                };
                                                updateLesson(module.id, lesson.id, {
                                                  attachments: [...(lesson.attachments || []), newAttachment]
                                                });
                                              }}
                                              className="w-full"
                                            >
                                              <Plus className="mr-2 h-4 w-4" />
                                              Adicionar Anexo
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {lesson.type === 'download' && (
                                        <div className="space-y-2">
                                          <Input
                                            value={lesson.url || ''}
                                            onChange={(e) => updateLesson(module.id, lesson.id, {
                                              url: e.target.value
                                            })}
                                            placeholder="URL do arquivo para download"
                                          />
                                          <Input
                                            placeholder="Nome do arquivo"
                                          />
                                        </div>
                                      )}

                                      <div className="flex items-center gap-4">
                                        <Input
                                          value={lesson.duration || ''}
                                          onChange={(e) => updateLesson(module.id, lesson.id, {
                                            duration: e.target.value
                                          })}
                                          placeholder="Duração"
                                          className="w-32"
                                        />
                                        <Badge variant="outline">
                                          {getLessonTypeName(lesson.type)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => moveLesson(module.id, lesson.id, 'up')}
                                        disabled={lessonIdx === 0}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => moveLesson(module.id, lesson.id, 'down')}
                                        disabled={lessonIdx === module.lessons.length - 1}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => deleteLesson(module.id, lesson.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  ))}

                  {formData.content.modules.length === 0 && (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Nenhum módulo adicionado ainda
                      </p>
                      <Button onClick={addModule} className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Primeiro Módulo
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="gradient-primary">
                <Save className="mr-2 h-4 w-4" />
                {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}