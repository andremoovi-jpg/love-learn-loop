import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopBar } from '@/components/layout/TopBar';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { MultiFileUpload } from '@/components/MultiFileUpload';

interface Community {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_locked: boolean;
}

export default function NovoTopico() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<Community | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ id: string; url: string; name?: string }>>([]);

  useEffect(() => {
    if (user) {
      loadCommunity();
    }
  }, [user, slug]);

  const loadCommunity = async () => {
    try {
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('id, name, slug')
        .eq('slug', slug)
        .single();

      if (communityError) throw communityError;
      setCommunity(communityData);

      // Verificar se o usuário é membro da comunidade
      const { data: memberData } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', communityData.id)
        .eq('user_id', user?.id)
        .single();

      if (!memberData) {
        toast.error('Você não tem acesso a esta comunidade');
        navigate('/dashboard');
        return;
      }

      // Carregar categorias
      const { data: categoriesData } = await supabase
        .from('community_categories')
        .select('*')
        .eq('community_id', communityData.id)
        .order('sort_order');

      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading community:', error);
      toast.error('Erro ao carregar comunidade');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    if (!community) {
      toast.error('Comunidade não encontrada');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('forum_topics')
        .insert({
          community_id: community.id,
          category_id: selectedCategory || null,
          author_id: user?.id,
          title: title.trim(),
          content: content.trim(),
          status: 'active',
          attachments: attachments.length > 0 ? attachments : []
        })
        .select('slug')
        .single();

      if (error) throw error;

      toast.success('Tópico criado com sucesso!');
      navigate(`/comunidade/${slug}/topico/${data.slug}`);
    } catch (error) {
      console.error('Error creating topic:', error);
      toast.error('Erro ao criar tópico');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/comunidade/${slug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Comunidade
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Criar Novo Tópico</h1>
              <p className="text-muted-foreground">
                {community?.name}
              </p>
            </div>
          </div>

          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle>Novo Tópico</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Categoria */}
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria (opcional)</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite o título do seu tópico..."
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/200 caracteres
                  </p>
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Descreva sua dúvida, compartilhe uma experiência ou inicie uma discussão..."
                    rows={10}
                    maxLength={5000}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {content.length}/5000 caracteres
                  </p>
                </div>

                {/* Anexos */}
                <div className="space-y-2">
                  <Label>Anexos (opcional)</Label>
                  <MultiFileUpload
                    bucket="attachments"
                    files={attachments}
                    onFilesChange={setAttachments}
                    maxFiles={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Máximo de 5 arquivos, 20MB cada. Imagens, PDFs e documentos suportados.
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/comunidade/${slug}`)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !title.trim() || !content.trim()}
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {submitting ? 'Criando...' : 'Criar Tópico'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}