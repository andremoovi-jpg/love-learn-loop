import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTranslation } from 'react-i18next';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
  user_liked?: boolean;
}

export default function Comunidade() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      // Buscar posts
      const { data: posts, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (!posts || posts.length === 0) {
        setPosts([]);
        return;
      }

      // Buscar profiles dos usuários
      const userIds = [...new Set(posts.map(post => post.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      // Criar mapa de profiles
      const profilesMap = new Map(
        (profiles || []).map(profile => [profile.user_id, profile])
      );

      // Verificar se o usuário curtiu cada post
      const postsWithData = await Promise.all(
        posts.map(async (post) => {
          const { data: likeData } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user!.id)
            .single();

          const profile = profilesMap.get(post.user_id);

          return {
            ...post,
            user_liked: !!likeData,
            profile: profile ? {
              full_name: profile.full_name || 'Usuário',
              avatar_url: profile.avatar_url
            } : {
              full_name: 'Usuário',
              avatar_url: undefined
            }
          };
        })
      );

      setPosts(postsWithData);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast.error(t('community.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.trim()) {
      toast.error(t('community.errors.emptyPost'));
      return;
    }

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user!.id,
          content: newPost,
          likes_count: 0,
          comments_count: 0
        });

      if (error) throw error;

      toast.success(t('community.success.postCreated'));
      setNewPost("");
      setDialogOpen(false);
      loadPosts();
    } catch (error) {
      console.error('Erro ao criar post:', error);
      toast.error(t('community.errors.createError'));
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user!.id)
        .single();

      if (existing) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existing.id);

        await supabase.rpc('decrement_likes', { post_id: postId });
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user!.id });

        await supabase.rpc('increment_likes', { post_id: postId });
      }

      loadPosts();
    } catch (error) {
      console.error('Erro ao curtir:', error);
      toast.error(t('community.errors.likeError'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar
          title={t('community.title')}
          breadcrumbs={[{ label: t('navigation.community') }]}
        />

        <main className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">{t('community.title')}</h1>
                <p className="text-muted-foreground">
                  {t('community.subtitle')}
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('community.newPost')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>{t('community.createPost')}</DialogTitle>
                  <Textarea
                    placeholder={t('community.postPlaceholder')}
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={5}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      {t('community.cancel')}
                    </Button>
                    <Button onClick={createPost}>
                      {t('community.publish')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Posts */}
            <div className="space-y-6">
              {loading ? (
                <p className="text-center text-muted-foreground">{t('common.loading')}</p>
              ) : posts.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {t('community.beFirst')}
                  </p>
                </Card>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="p-6">
                    {/* Header do post */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.profile?.avatar_url} />
                        <AvatarFallback>
                          {post.profile?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold">{post.profile?.full_name || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <p className="mb-4 whitespace-pre-wrap">{post.content}</p>

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt=""
                        className="w-full rounded-lg mb-4"
                      />
                    )}

                    {/* Ações */}
                    <div className="flex gap-6 text-muted-foreground">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-2 hover:text-red-500 transition ${
                          post.user_liked ? 'text-red-500' : ''
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
                        {post.likes_count}
                      </button>
                      <button className="flex items-center gap-2 hover:text-primary transition">
                        <MessageCircle className="h-5 w-5" />
                        {post.comments_count}
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}