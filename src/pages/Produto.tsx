import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { UpsellCard } from "@/components/ui/upsell-card";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Play, ArrowLeft, ArrowRight, Loader2, Lock, AlertCircle, BookOpen, Download, File, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import DOMPurify from 'dompurify';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_image_url: string;
  content?: {
    modules?: Module[];
  };
  has_access?: boolean;
}

interface Module {
  title: string;
  description?: string;
  lessons: Lesson[];
}

interface Lesson {
  title: string;
  description?: string;
  type: 'video' | 'text' | 'pdf' | 'quiz' | 'download' | 'embed' | 'video_with_attachments';
  url?: string;
  video_url?: string;
  content?: string;
  duration: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type?: string;
    description?: string;
  }>;
}

interface UserProduct {
  id: string;
  progress: number;
  completed_lessons: string[];
}

export default function Produto() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [userProduct, setUserProduct] = useState<UserProduct | null>(null);
  const [upsells, setUpsells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug && user) {
      fetchProductData();
    }
  }, [slug, user]);

  const fetchProductData = async () => {
    try {
      console.log('🔍 Buscando produto:', slug);

      // Primeiro buscar o produto diretamente
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (productError) {
        console.error('❌ Erro ao buscar produto:', productError);
        setError('Produto não encontrado');
        setLoading(false);
        return;
      }

      if (!productData) {
        console.error('❌ Produto não encontrado');
        setError('Produto não encontrado');
        setLoading(false);
        return;
      }

      console.log('✅ Produto encontrado:', productData.name);
      console.log('📦 Conteúdo do produto:', productData.content);

      // Garantir estrutura do content - cast to any to bypass TypeScript issues
      const content = productData.content as any;
      if (!content || !content.modules || content.modules.length === 0) {
        console.warn('⚠️ Produto sem módulos, criando estrutura padrão');
        productData.content = {
          modules: [{
            title: 'Conteúdo em Preparação',
            description: 'O conteúdo deste produto está sendo preparado',
            lessons: [{
              title: 'Em breve',
              description: 'O conteúdo estará disponível em breve',
              type: 'text' as const,
              content: 'Este produto ainda não possui conteúdo configurado. Entre em contato com o suporte para mais informações.',
              duration: '0 min'
            }]
          }]
        };
      }

      setProduct(productData as any);

      // Verificar acesso do usuário
      const { data: userProductData } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user!.id)
        .eq('product_id', productData.id)
        .single();

      if (!userProductData) {
        console.log('⚠️ Usuário não tem acesso ao produto');
        setProduct({ ...productData, has_access: false } as any);
        setLoading(false);
        return;
      }

      console.log('✅ Usuário tem acesso ao produto');
      setProduct({ ...productData, has_access: true } as any);

      // Garantir que completed_lessons seja um array
      if (!userProductData.completed_lessons || !Array.isArray(userProductData.completed_lessons)) {
        userProductData.completed_lessons = [];
      }

      setUserProduct(userProductData);

      // Atualizar último acesso
      await supabase
        .from('user_products')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', userProductData.id);

      // Buscar upsells relacionados
      const { data: upsellsData } = await supabase
        .from('upsells')
        .select(`
          *,
          parent_product:products!parent_product_id(name),
          upsell_product:products!upsell_product_id(name, cover_image_url, product_type)
        `)
        .eq('parent_product_id', productData.id)
        .eq('is_active', true);

      setUpsells(upsellsData || []);
    } catch (error) {
      console.error('❌ Erro geral:', error);
      setError('Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  };

  // Funções helper com verificações de segurança
  const getModules = () => {
    return product?.content?.modules || [];
  };

  const getModule = (idx: number) => {
    const modules = getModules();
    return modules[idx] || null;
  };

  const getLessons = (moduleIdx: number) => {
    const module = getModule(moduleIdx);
    return module?.lessons || [];
  };

  const getLesson = (moduleIdx: number, lessonIdx: number) => {
    const lessons = getLessons(moduleIdx);
    return lessons[lessonIdx] || null;
  };

  const getTotalLessons = () => {
    const modules = getModules();
    return modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
  };

  const isLessonCompleted = (moduleIdx: number, lessonIdx: number) => {
    if (!userProduct) return false;
    const lessonKey = `module_${moduleIdx}_lesson_${lessonIdx}`;
    return userProduct.completed_lessons.includes(lessonKey);
  };

  const isModuleCompleted = (moduleIdx: number) => {
    const lessons = getLessons(moduleIdx);
    if (!lessons.length) return false;
    return lessons.every((_, lessonIdx) => isLessonCompleted(moduleIdx, lessonIdx));
  };

  const markAsCompleted = async () => {
    if (!userProduct || !product) return;

    const lessonKey = `module_${currentModuleIdx}_lesson_${currentLessonIdx}`;

    if (userProduct.completed_lessons.includes(lessonKey)) return;

    const updatedLessons = [...userProduct.completed_lessons, lessonKey];
    const totalLessons = getTotalLessons();
    const progress = totalLessons > 0 ? Math.round((updatedLessons.length / totalLessons) * 100) : 0;

    try {
      const { error } = await supabase
        .from('user_products')
        .update({
          completed_lessons: updatedLessons,
          progress: progress,
          completed_at: progress === 100 ? new Date().toISOString() : null
        })
        .eq('id', userProduct.id);

      if (error) throw error;

      setUserProduct({
        ...userProduct,
        completed_lessons: updatedLessons,
        progress
      });

      toast.success('Aula marcada como concluída!');

      // Auto avançar para próxima aula
      if (hasNext()) {
        nextLesson();
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
      toast.error('Erro ao salvar progresso');
    }
  };

  const selectLesson = (moduleIdx: number, lessonIdx: number) => {
    // Verificar se os índices são válidos
    const module = getModule(moduleIdx);
    if (!module) return;

    const lesson = getLesson(moduleIdx, lessonIdx);
    if (!lesson) return;

    setCurrentModuleIdx(moduleIdx);
    setCurrentLessonIdx(lessonIdx);
  };

  const previousLesson = () => {
    if (currentLessonIdx > 0) {
      setCurrentLessonIdx(currentLessonIdx - 1);
    } else if (currentModuleIdx > 0) {
      const prevModuleLessons = getLessons(currentModuleIdx - 1);
      setCurrentModuleIdx(currentModuleIdx - 1);
      setCurrentLessonIdx(Math.max(0, prevModuleLessons.length - 1));
    }
  };

  const nextLesson = () => {
    const currentModuleLessons = getLessons(currentModuleIdx);
    const modules = getModules();

    if (currentLessonIdx < currentModuleLessons.length - 1) {
      setCurrentLessonIdx(currentLessonIdx + 1);
    } else if (currentModuleIdx < modules.length - 1) {
      setCurrentModuleIdx(currentModuleIdx + 1);
      setCurrentLessonIdx(0);
    }
  };

  const hasPrevious = () => {
    return currentModuleIdx > 0 || currentLessonIdx > 0;
  };

  const hasNext = () => {
    const modules = getModules();
    const currentModuleLessons = getLessons(currentModuleIdx);
    return currentModuleIdx < modules.length - 1 ||
           currentLessonIdx < currentModuleLessons.length - 1;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[{ label: "Carregando..." }]} />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[{ label: "Erro" }]} />
          <main className="p-6">
            <Card className="max-w-md mx-auto">
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Erro ao carregar produto</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button className="mt-4" onClick={() => window.location.href = '/dashboard'}>
                  Voltar ao Dashboard
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return <Navigate to="/dashboard" replace />;
  }

  // No access
  if (!product.has_access || !userProduct) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: product.name }
          ]} />
          <main className="p-6">
            <Card className="max-w-2xl mx-auto">
              <div className="text-center p-12">
                <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
                <p className="text-muted-foreground mb-6">
                  Você não tem acesso a este produto.
                </p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com o suporte para adquirir "{product.name}"
                </p>
                <Button className="mt-6" onClick={() => window.location.href = '/ofertas'}>
                  Ver Ofertas Disponíveis
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const modules = getModules();
  const currentLesson = getLesson(currentModuleIdx, currentLessonIdx);

  // No content configured
  if (modules.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Meus Produtos", href: "/meus-produtos" },
            { label: product.name }
          ]} />
          <main className="p-6">
            <Card className="max-w-2xl mx-auto">
              <div className="text-center p-12">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-4">Conteúdo em Preparação</h2>
                <p className="text-muted-foreground">
                  O conteúdo deste produto está sendo preparado e estará disponível em breve.
                </p>
                <Button className="mt-6" onClick={() => window.location.href = '/dashboard'}>
                  Voltar ao Dashboard
                </Button>
              </div>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Meus Produtos", href: "/meus-produtos" },
            { label: product.name }
          ]}
        />

        <main className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sidebar - Modules */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Conteúdo</h2>
                  <Progress value={userProduct.progress} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {userProduct.progress}% concluído
                  </p>
                </div>

                <Accordion type="single" collapsible defaultValue="module-0">
                  {product.content.modules.map((module, mIdx) => (
                    <AccordionItem key={mIdx} value={`module-${mIdx}`}>
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-2">
                          {isModuleCompleted(mIdx) && (
                            <CheckCircle className="h-4 w-4 text-success" />
                          )}
                          <span>{module.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1">
                          {module.lessons.map((lesson, lIdx) => (
                            <button
                              key={lIdx}
                              onClick={() => selectLesson(mIdx, lIdx)}
                              className={cn(
                                "w-full text-left p-3 rounded text-sm transition-base",
                                "hover:bg-accent hover:text-accent-foreground",
                                currentModuleIdx === mIdx && currentLessonIdx === lIdx
                                  ? "bg-primary text-primary-foreground"
                                  : "text-foreground",
                                isLessonCompleted(mIdx, lIdx) && "text-success"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isLessonCompleted(mIdx, lIdx) ? (
                                  <CheckCircle className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{lesson.title}</div>
                                  <div className="text-xs opacity-75">
                                    {lesson.duration}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Video Player */}
              {currentLesson && (
                <div className="space-y-6">
                  <div className="bg-black rounded-lg aspect-video overflow-hidden">
                    {(currentLesson.type === 'video' || currentLesson.type === 'video_with_attachments') &&
                     (currentLesson.url || currentLesson.video_url) ? (
                      <ReactPlayer
                        url={currentLesson.url || currentLesson.video_url}
                        width="100%"
                        height="100%"
                        controls
                        onEnded={() => {
                          if (!isLessonCompleted(currentModuleIdx, currentLessonIdx)) {
                            markAsCompleted();
                          }
                        }}
                      />
                    ) : currentLesson.type === 'pdf' && currentLesson.url ? (
                      <iframe
                        src={currentLesson.url}
                        className="w-full h-full"
                        title={currentLesson.title}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <div className="text-center">
                          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p className="text-muted-foreground">
                            {currentLesson.type === 'text' ? 'Conteúdo de texto disponível abaixo' : 'Conteúdo não disponível'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attachments Section */}
                  {currentLesson.attachments && currentLesson.attachments.length > 0 && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Materiais Complementares
                      </h3>
                      <div className="space-y-2">
                        {currentLesson.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {attachment.type === 'pdf' ? (
                                <File className="h-5 w-5 text-red-500" />
                              ) : attachment.type === 'doc' ? (
                                <FileText className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Download className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium">{attachment.name || 'Anexo'}</p>
                                {attachment.description && (
                                  <p className="text-sm text-muted-foreground">{attachment.description}</p>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <Download className="mr-2 h-4 w-4" />
                              Baixar
                            </Button>
                          </a>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Lesson Info */}
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{currentLesson.title}</h1>
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                    
                    {currentLesson.type === 'text' && currentLesson.content && (
                      <div className="mt-6 prose prose-gray max-w-none">
                        <div dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(currentLesson.content, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
                            ALLOWED_ATTR: ['class']
                          })
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Mark as Complete Button */}
                  <Button
                    onClick={markAsCompleted}
                    disabled={isLessonCompleted(currentModuleIdx, currentLessonIdx)}
                    className="gradient-primary"
                  >
                    {isLessonCompleted(currentModuleIdx, currentLessonIdx) ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Concluído
                      </>
                    ) : (
                      'Marcar como Concluído'
                    )}
                  </Button>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={previousLesson}
                      disabled={!hasPrevious}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      onClick={nextLesson}
                      disabled={!hasNext}
                    >
                      Próxima
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Related Upsells */}
              {upsells.length > 0 && (
                <section>
                  <h3 className="text-2xl font-bold mb-6">Aprimore seus resultados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upsells.map(upsell => (
                      <UpsellCard key={upsell.id} upsell={upsell} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}