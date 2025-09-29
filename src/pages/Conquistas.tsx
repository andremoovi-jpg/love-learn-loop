import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trophy, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked_at?: string;
}

export default function Conquistas() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [lockedAchievements, setLockedAchievements] = useState<Achievement[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAchievements();
    }
  }, [user]);

  const fetchAchievements = async () => {
    try {
      // Get user's total points
      const { data: profileData } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user!.id)
        .single();

      setTotalPoints(profileData?.total_points || 0);

      // Get all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: true });

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          unlocked_at,
          achievement:achievements(*)
        `)
        .eq('user_id', user!.id);

      if (allAchievements) {
        const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement.id) || []);
        
        const unlocked = allAchievements
          .filter(achievement => unlockedIds.has(achievement.id))
          .map(achievement => {
            const userAchievement = userAchievements?.find(ua => ua.achievement.id === achievement.id);
            return {
              ...achievement,
              unlocked_at: userAchievement?.unlocked_at
            };
          });

        const locked = allAchievements.filter(achievement => !unlockedIds.has(achievement.id));

        setUnlockedAchievements(unlocked);
        setLockedAchievements(locked);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="lg:pl-64">
        <TopBar 
          breadcrumbs={[
            { label: t('navigation.dashboard'), href: "/dashboard" },
            { label: t('navigation.achievements') }
          ]}
        />

        <main className="p-6 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-warning/10 rounded-full">
                <Trophy className="h-8 w-8 text-warning" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">{t('achievements.title')}</h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Star className="text-warning fill-current" />
                  <span className="text-2xl font-bold text-foreground">{totalPoints} {t('achievements.points')}</span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Continue aprendendo e desbloqueie novas conquistas. Cada conquista traz pontos que refletem seu progresso!
            </p>
          </div>

          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Conquistas Desbloqueadas</h2>
                <p className="text-muted-foreground">
                  Parabéns! Você desbloqueou {unlockedAchievements.length} conquista{unlockedAchievements.length !== 1 ? 's' : ''}.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {unlockedAchievements.map(achievement => (
                  <Card key={achievement.id} className="text-center hover:shadow-medium transition-base border-success/20 bg-success/5">
                    <CardContent className="p-6">
                      <div className="text-6xl mb-3">{achievement.icon}</div>
                      <h3 className="font-bold mb-2">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {achievement.description}
                      </p>
                      <Badge className="bg-success text-success-foreground">
                        +{achievement.points} pts
                      </Badge>
                      {achievement.unlocked_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Desbloqueado em {new Date(achievement.unlocked_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Próximas Conquistas</h2>
                <p className="text-muted-foreground">
                  Continue progredindo para desbloquear essas conquistas.
                </p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {lockedAchievements.map(achievement => (
                  <Card key={achievement.id} className="text-center opacity-60 grayscale hover:opacity-80 transition-base">
                    <CardContent className="p-6">
                      <div className="text-6xl mb-3">{achievement.icon}</div>
                      <h3 className="font-bold mb-2">{achievement.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {achievement.description}
                      </p>
                      <Badge variant="outline">
                        {achievement.points} pts
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {unlockedAchievements.length === 0 && lockedAchievements.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma conquista disponível</h3>
              <p className="text-muted-foreground">
                As conquistas aparecerão aqui conforme você progride na plataforma.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}