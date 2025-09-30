import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useTranslation } from 'react-i18next';
import { Users, MessageSquare, ArrowRight, Lock } from 'lucide-react';

interface Community {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  slug: string;
  member_count: number;
  post_count: number;
  product: {
    name: string;
    cover_image_url: string;
  };
}

export default function MinhasComunidades() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserCommunities();
    }
  }, [user]);

  const loadUserCommunities = async () => {
    try {
      // Buscar todas as comunidades que o usuário tem acesso
      // (RLS policies já fazem a verificação de produtos regulares e independentes)
      const { data: allCommunities, error } = await supabase
        .from('communities')
        .select(`
          id,
          name,
          description,
          cover_image_url,
          slug,
          member_count,
          post_count,
          product_id,
          products!left(name, cover_image_url)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar comunidades onde usuário não está banido
      if (!allCommunities || allCommunities.length === 0) {
        setCommunities([]);
        setLoading(false);
        return;
      }

      const communityIds = allCommunities.map(c => c.id);
      const { data: memberData } = await supabase
        .from('community_members')
        .select('community_id, is_banned')
        .eq('user_id', user?.id)
        .in('community_id', communityIds);

      const bannedCommunityIds = new Set(
        memberData?.filter(m => m.is_banned).map(m => m.community_id) || []
      );

      const accessibleCommunities = allCommunities
        .filter(c => !bannedCommunityIds.has(c.id))
        .map(c => ({
          ...c,
          product: c.products || { name: c.name, cover_image_url: c.cover_image_url }
        }));

      setCommunities(accessibleCommunities as Community[]);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="lg:pl-64">
        <TopBar
          breadcrumbs={[
            { label: t('navigation.dashboard'), href: "/dashboard" },
            { label: 'Minhas Comunidades' }
          ]}
        />

        <main className="p-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Minhas Comunidades</h1>
            <p className="text-muted-foreground">
              Acesse as comunidades exclusivas dos seus produtos
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted" />
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : communities.length === 0 ? (
            <Card className="p-12 text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhuma comunidade disponível
              </h3>
              <p className="text-muted-foreground mb-4">
                Adquira produtos para ter acesso às comunidades exclusivas
              </p>
              <Button onClick={() => navigate('/ofertas')}>
                Ver Ofertas
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {communities.map((community) => (
                <Card
                  key={community.id}
                  className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/comunidade/${community.slug}`)}
                >
                  {/* Cover Image */}
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                    {community.cover_image_url && (
                      <img
                        src={community.cover_image_url}
                        alt={community.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white font-bold text-lg mb-1">
                        {community.name}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {community.product.name}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {community.description}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{community.member_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          <span>{community.post_count}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
