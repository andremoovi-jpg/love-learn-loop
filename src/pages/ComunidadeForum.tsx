import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare, Users, Trophy, Pin, Lock, CheckCircle,
  Search, Plus, Heart, MessageCircle, Eye, Shield, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TopBar } from '@/components/layout/TopBar';

interface Community {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  member_count: number;
  post_count: number;
  product: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_locked: boolean;
}

interface Topic {
  id: string;
  title: string;
  slug: string;
  content: string;
  views_count: number;
  replies_count: number;
  likes_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  created_at: string;
  last_reply_at: string;
  author: {
    full_name: string;
    avatar_url: string;
  };
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export default function ComunidadeForum() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<Community | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'unanswered'>('recent');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'member' | 'moderator' | 'admin'>('member');
  const [userStats, setUserStats] = useState({
    reputation: 0,
    posts: 0,
    solutions: 0,
    badges: [] as any[]
  });

  useEffect(() => {
    if (user) {
      loadCommunity();
    }
  }, [user, slug]);

  useEffect(() => {
    if (community && user) {
      loadUserRole();
    }
  }, [community, user]);

  const loadCommunity = async () => {
    try {
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select(`
          *,
          product:products(name)
        `)
        .eq('slug', slug)
        .single();

      if (communityError) throw communityError;
      setCommunity(communityData);

      const { data: categoriesData } = await supabase
        .from('community_categories')
        .select('*')
        .eq('community_id', communityData.id)
        .order('sort_order');

      setCategories(categoriesData || []);

      const { data: topicsData } = await supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!author_id(full_name, avatar_url),
          category:community_categories(id, name, color)
        `)
        .eq('community_id', communityData.id)
        .eq('status', 'active')
        .order('is_pinned', { ascending: false })
        .order('last_reply_at', { ascending: false });

      setTopics(topicsData || []);
    } catch (error) {
      console.error('Error loading community:', error);
      toast.error('Erro ao carregar comunidade');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRole = async () => {
    if (!community?.id || !user?.id) return;
    
    try {
      const { data } = await supabase
        .from('community_members')
        .select('role, reputation_points, posts_count, solutions_count, badges')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setUserRole(data.role as 'member' | 'moderator' | 'admin');
        setUserStats({
          reputation: data.reputation_points || 0,
          posts: data.posts_count || 0,
          solutions: data.solutions_count || 0,
          badges: Array.isArray(data.badges) ? data.badges : []
        });
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const createNewTopic = () => {
    navigate(`/comunidade/${slug}/novo-topico`);
  };

  const filteredTopics = topics.filter(topic => {
    const matchesCategory = selectedCategory === 'all' || topic.category?.id === selectedCategory;
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sortedTopics = [...filteredTopics].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likes_count - a.likes_count;
      case 'unanswered':
        return a.replies_count - b.replies_count;
      default:
        return new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime();
    }
  });

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
      
      {/* Header da Comunidade */}
      <div
        className="relative h-48 bg-gradient-to-r from-primary/20 to-primary/10"
        style={{
          backgroundImage: community?.cover_image_url ? `url(${community.cover_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto px-4 h-full flex items-end pb-6">
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-2">{community?.name}</h1>
            <p className="text-white/90">{community?.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                <Users className="h-3 w-3 mr-1" />
                {community?.member_count} membros
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white">
                <MessageSquare className="h-3 w-3 mr-1" />
                {community?.post_count} tópicos
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Esquerda */}
          <div className="lg:col-span-1 space-y-4">
            {/* Card de Estatísticas do Usuário */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Seu Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reputação</span>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="font-bold">{userStats.reputation}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posts</span>
                    <span className="font-medium">{userStats.posts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Soluções</span>
                    <span className="font-medium">{userStats.solutions}</span>
                  </div>
                  {userRole === 'moderator' && (
                    <Badge className="w-full justify-center">
                      <Shield className="h-3 w-3 mr-1" />
                      Moderador
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categorias */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory('all')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Todas as Categorias
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <span className="mr-2">{category.icon}</span>
                      <span className="flex-1 text-left">{category.name}</span>
                      {category.is_locked && <Lock className="h-3 w-3 ml-2" />}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Contribuidores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Top Contribuidores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`text-lg font-bold ${i === 1 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {i}°
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Usuário {i}</p>
                        <p className="text-xs text-muted-foreground">{1000 - i * 100} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3 space-y-4">
            {/* Barra de Ações */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar tópicos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mais Recentes</SelectItem>
                      <SelectItem value="popular">Mais Populares</SelectItem>
                      <SelectItem value="unanswered">Sem Resposta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={createNewTopic}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Tópico
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Lista de Tópicos */}
            <div className="space-y-3">
              {sortedTopics.map((topic) => (
                <Card
                  key={topic.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/comunidade/${slug}/topico/${topic.slug}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={topic.author.avatar_url} />
                        <AvatarFallback>{topic.author.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {topic.is_pinned && (
                                <Badge variant="secondary" className="gap-1">
                                  <Pin className="h-3 w-3" />
                                  Fixado
                                </Badge>
                              )}
                              {topic.is_solved && (
                                <Badge variant="default" className="bg-green-500 gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Resolvido
                                </Badge>
                              )}
                              {topic.is_locked && (
                                <Badge variant="secondary" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Fechado
                                </Badge>
                              )}
                              {topic.category && (
                                <Badge
                                  variant="outline"
                                  style={{ borderColor: topic.category.color, color: topic.category.color }}
                                >
                                  {topic.category.name}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mt-1 line-clamp-2">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {topic.content}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            <span>{topic.replies_count} respostas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{topic.views_count} visualizações</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{topic.likes_count}</span>
                          </div>
                          <div className="ml-auto flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">
                              {formatDistanceToNow(new Date(topic.last_reply_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {sortedTopics.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum tópico encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Seja o primeiro a iniciar uma discussão nesta comunidade!
                  </p>
                  <Button onClick={createNewTopic}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Tópico
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}