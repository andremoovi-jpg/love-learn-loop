import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Eye, MessageSquare, Users } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PostWithProfile {
  id: string;
  user_id: string;
  content: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  reviewed_at: string;
  reviewed_by: string;
  profile?: {
    user_id: string;
    full_name: string;
    avatar_url: string;
  };
}

interface TopicWithProfile {
  id: string;
  title: string;
  content: string;
  author_id: string;
  community_id: string;
  views_count: number;
  replies_count: number;
  likes_count: number;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  created_at: string;
  slug: string;
  profile?: {
    user_id: string;
    full_name: string;
    avatar_url: string;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [contentType, setContentType] = useState<'posts' | 'topics'>('topics');

  // Query para posts de comunidade geral
  const { data: posts, isLoading: postsLoading } = useQuery<PostWithProfile[]>({
    queryKey: ['admin-posts', selectedStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        return data.map(post => ({
          ...post,
          profile: profilesMap.get(post.user_id)
        })) as PostWithProfile[];
      }

      return data as PostWithProfile[] || [];
    },
    enabled: contentType === 'posts',
  });

  // Query para tópicos do fórum
  const { data: topics, isLoading: topicsLoading } = useQuery<TopicWithProfile[]>({
    queryKey: ['admin-topics', selectedStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_topics')
        .select('*, community:communities(id, name, slug)')
        .eq('status', selectedStatus)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(t => t.author_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        return data.map(topic => ({
          ...topic,
          profile: profilesMap.get(topic.author_id)
        })) as TopicWithProfile[];
      }

      return data as TopicWithProfile[] || [];
    },
    enabled: contentType === 'topics',
  });

  const isLoading = contentType === 'posts' ? postsLoading : topicsLoading;

  // Query para estatísticas
  const { data: stats } = useQuery({
    queryKey: ['admin-stats', contentType],
    queryFn: async () => {
      const table = contentType === 'posts' ? 'community_posts' : 'forum_topics';
      
      const [pending, approved, rejected] = await Promise.all([
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'approved'),
        supabase.from(table).select('id', { count: 'exact' }).eq('status', 'rejected'),
      ]);

      return {
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
      };
    },
  });

  // Mutation para aprovar
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const table = contentType === 'posts' ? 'community_posts' : 'forum_topics';
      const { error } = await supabase
        .from(table)
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(contentType === 'posts' ? "Post aprovado!" : "Tópico aprovado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  // Mutation para rejeitar
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const table = contentType === 'posts' ? 'community_posts' : 'forum_topics';
      const { error } = await supabase
        .from(table)
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-topics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(contentType === 'posts' ? "Post rejeitado!" : "Tópico rejeitado!");
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pendente" },
      approved: { variant: "default", icon: CheckCircle, label: "Aprovado" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rejeitado" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Moderação</h1>
          <p className="text-muted-foreground mt-2">
            Aprove ou rejeite conteúdo da comunidade
          </p>
        </div>
        
        <Select value={contentType} onValueChange={(v) => setContentType(v as any)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="topics">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tópicos do Fórum
              </div>
            </SelectItem>
            <SelectItem value="posts">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Posts Gerais
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <span className="text-3xl font-bold">{stats?.pending || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-3xl font-bold">{stats?.approved || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <span className="text-3xl font-bold">{stats?.rejected || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Status */}
      <Tabs value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({stats?.pending || 0})
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovados ({stats?.approved || 0})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejeitados ({stats?.rejected || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contentType === 'topics' && topics && topics.length > 0 ? (
            <div className="space-y-4">
              {topics.map((topic) => (
                <Card key={topic.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={topic.profile?.avatar_url} />
                        <AvatarFallback>
                          {topic.profile?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="font-semibold">{topic.profile?.full_name || 'Usuário'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(topic.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                            {topic.community && (
                              <Badge variant="outline" className="mt-1">
                                {topic.community.name}
                              </Badge>
                            )}
                          </div>
                          {getStatusBadge(topic.status)}
                        </div>

                        <h3 className="font-bold text-lg mb-2">{topic.title}</h3>
                        <p className="text-foreground mb-4 whitespace-pre-wrap line-clamp-3">
                          {topic.content}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{topic.replies_count} respostas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{topic.views_count} visualizações</span>
                          </div>
                        </div>

                        {selectedStatus === 'pending' && (
                          <div className="flex items-center gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aprovar tópico?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Este tópico será publicado na comunidade e ficará visível para
                                    todos os membros.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => approveMutation.mutate(topic.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Rejeitar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rejeitar tópico?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Este tópico não será publicado. O autor receberá uma notificação
                                    informando que foi rejeitado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rejectMutation.mutate(topic.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contentType === 'posts' && posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={post.profile?.avatar_url} />
                        <AvatarFallback>
                          {post.profile?.full_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="font-semibold">{post.profile?.full_name || 'Usuário'}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          {getStatusBadge(post.status)}
                        </div>

                        <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post image"
                            className="rounded-lg max-h-96 object-cover mb-4"
                          />
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.comments_count} comentários</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{post.likes_count} curtidas</span>
                          </div>
                        </div>

                        {selectedStatus === 'pending' && (
                          <div className="flex items-center gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" className="gap-2">
                                  <CheckCircle className="h-4 w-4" />
                                  Aprovar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aprovar post?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Este post será publicado na comunidade e ficará visível para
                                    todos os membros.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => approveMutation.mutate(post.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="gap-2">
                                  <XCircle className="h-4 w-4" />
                                  Rejeitar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rejeitar post?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Este post não será publicado. O autor receberá uma notificação
                                    informando que o post foi rejeitado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rejectMutation.mutate(post.id)}
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}

                        {post.reviewed_at && (
                          <p className="text-xs text-muted-foreground mt-4">
                            Revisado em{' '}
                            {formatDistanceToNow(new Date(post.reviewed_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum conteúdo encontrado</h3>
                <p className="text-muted-foreground">
                  Não há {contentType === 'topics' ? 'tópicos' : 'posts'} com status "{selectedStatus === 'pending' ? 'pendente' : selectedStatus === 'approved' ? 'aprovado' : 'rejeitado'}"
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
