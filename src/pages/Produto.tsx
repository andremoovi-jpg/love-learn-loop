import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UpsellCard } from "@/components/ui/upsell-card";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Play, ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_image_url: string;
  content: any;
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

  useEffect(() => {
    if (slug && user) {
      fetchProductData();
    }
  }, [slug, user]);

  const fetchProductData = async () => {
    try {
      // Fetch product
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!productData) {
        setLoading(false);
        return;
      }

      setProduct(productData);

      // Fetch user's product access
      const { data: userProductData } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user!.id)
        .eq('product_id', productData.id)
        .single();

      if (!userProductData) {
        // User doesn't have access to this product
        setLoading(false);
        return;
      }

      setUserProduct(userProductData);

      // Update last accessed
      await supabase
        .from('user_products')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', userProductData.id);

      // Fetch related upsells
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
      console.error('Error fetching product data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLessonCompleted = (moduleIdx: number, lessonIdx: number) => {
    if (!userProduct) return false;
    const lessonKey = `module_${moduleIdx}_lesson_${lessonIdx}`;
    return userProduct.completed_lessons.includes(lessonKey);
  };

  const isModuleCompleted = (moduleIdx: number) => {
    if (!product) return false;
    const module = product.content.modules[moduleIdx];
    return module.lessons.every((_, lessonIdx) => isLessonCompleted(moduleIdx, lessonIdx));
  };

  const markAsCompleted = async () => {
    if (!userProduct || !product) return;

    const lessonKey = `module_${currentModuleIdx}_lesson_${currentLessonIdx}`;
    
    if (userProduct.completed_lessons.includes(lessonKey)) return;

    const updatedLessons = [...userProduct.completed_lessons, lessonKey];
    
    const totalLessons = product.content.modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const progress = Math.round((updatedLessons.length / totalLessons) * 100);

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

      // Auto advance to next lesson
      nextLesson();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Erro ao salvar progresso');
    }
  };

  const selectLesson = (moduleIdx: number, lessonIdx: number) => {
    setCurrentModuleIdx(moduleIdx);
    setCurrentLessonIdx(lessonIdx);
  };

  const previousLesson = () => {
    if (currentLessonIdx > 0) {
      setCurrentLessonIdx(currentLessonIdx - 1);
    } else if (currentModuleIdx > 0) {
      const prevModule = product!.content.modules[currentModuleIdx - 1];
      setCurrentModuleIdx(currentModuleIdx - 1);
      setCurrentLessonIdx(prevModule.lessons.length - 1);
    }
  };

  const nextLesson = () => {
    const currentModule = product!.content.modules[currentModuleIdx];
    if (currentLessonIdx < currentModule.lessons.length - 1) {
      setCurrentLessonIdx(currentLessonIdx + 1);
    } else if (currentModuleIdx < product!.content.modules.length - 1) {
      setCurrentModuleIdx(currentModuleIdx + 1);
      setCurrentLessonIdx(0);
    }
  };

  const hasPrevious = currentModuleIdx > 0 || currentLessonIdx > 0;
  const hasNext = currentModuleIdx < product?.content.modules.length - 1 || 
                  currentLessonIdx < (product?.content.modules[currentModuleIdx]?.lessons.length - 1);

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

  if (!product) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!userProduct) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: product.name }
          ]} />
          <main className="p-6">
            <div className="text-center py-12">
              <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-4">Acesso Restrito</h2>
              <p className="text-muted-foreground">
                Você não tem acesso a este produto. Entre em contato com o suporte.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentLesson = product.content.modules[currentModuleIdx]?.lessons[currentLessonIdx];

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
                    {currentLesson.type === 'video' && currentLesson.url ? (
                      <ReactPlayer
                        url={currentLesson.url}
                        width="100%"
                        height="100%"
                        controls
                        onEnded={() => {
                          if (!isLessonCompleted(currentModuleIdx, currentLessonIdx)) {
                            markAsCompleted();
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center text-white">
                          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p>Conteúdo de texto disponível abaixo</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lesson Info */}
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{currentLesson.title}</h1>
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                    
                    {currentLesson.type === 'text' && currentLesson.content && (
                      <div className="mt-6 prose prose-gray max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
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