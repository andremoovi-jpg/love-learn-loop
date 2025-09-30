import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validatePasswordSecurity } from "@/utils/passwordSecurity";
import { useTranslation } from 'react-i18next';
import { FileUpload } from "@/components/FileUpload";

interface Profile {
  full_name: string;
  avatar_url: string;
  phone: string;
  total_points: number;
}

export default function Perfil() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    avatar_url: '',
    phone: '',
    total_points: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    try {
      // Update local state
      setProfile(prev => ({ ...prev, avatar_url: url }));

      // Save immediately to database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success('Foto de perfil atualizada!');
    } catch (error: any) {
      console.error('Error saving avatar:', error);
      toast.error('Erro ao salvar foto de perfil');
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // IMPORTANTE: Sempre UPDATE, nunca UPSERT para evitar duplicatas
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(t('profilePage.success.profileUpdated'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profilePage.errors.updateProfile'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('profilePage.errors.passwordsDontMatch'));
      return;
    }

    // Validação completa com verificação de vazamentos
    const passwordValidation = await validatePasswordSecurity(newPassword);
    if (!passwordValidation.valid) {
      toast.error(passwordValidation.errors.join('. '));
      return;
    }

    if (passwordValidation.leaked) {
      toast.error(t('profilePage.errors.passwordExposed'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success(t('profilePage.success.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || t('profilePage.errors.changePasswordError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-64">
          <TopBar breadcrumbs={[{ label: t('common.loading') }]} />
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
            { label: t('navigation.profile') }
          ]}
        />

        <main className="p-6 max-w-4xl">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('profilePage.title')}</h1>
              <p className="text-muted-foreground">
                {t('profilePage.subtitle')}
              </p>
            </div>

            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList>
                <TabsTrigger value="personal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('profilePage.personalInfo')}
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t('profilePage.security')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('profilePage.personalInfo')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={updateProfile} className="space-y-6">
                      <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="text-lg">
                            {profile.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="avatar">{t('profilePage.avatarLabel')}</Label>
                          <FileUpload
                            bucket="avatars"
                            accept={{
                              'image/*': ['.png', '.jpg', '.jpeg', '.gif']
                            }}
                            maxSize={5 * 1024 * 1024}
                            onUploadComplete={handleAvatarUpload}
                            currentUrl={profile.avatar_url}
                            label={t('profilePage.avatarPlaceholder')}
                          />
                          <p className="text-xs text-muted-foreground">
                            Formatos aceitos: PNG, JPG, GIF. Máximo 5MB.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">{t('profilePage.fullNameLabel')}</Label>
                          <Input
                            id="fullName"
                            value={profile.full_name}
                            onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                            placeholder={t('profilePage.fullNamePlaceholder')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">{t('profilePage.emailLabel')}</Label>
                          <Input
                            id="email"
                            value={user?.email || ''}
                            disabled
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">{t('profilePage.phoneLabel')}</Label>
                          <Input
                            id="phone"
                            value={profile.phone}
                            onChange={(e) => setProfile({...profile, phone: e.target.value})}
                            placeholder={t('profilePage.phonePlaceholder')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="points">{t('profilePage.pointsLabel')}</Label>
                          <Input
                            id="points"
                            value={profile.total_points}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      <Button type="submit" disabled={saving} className="gradient-primary">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('profilePage.saving')}
                          </>
                        ) : (
                          t('profilePage.saveChanges')
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('profilePage.changePasswordTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={changePassword} className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t('profilePage.currentPassword')}</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t('profilePage.newPassword')}</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('profilePage.confirmPassword')}</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>

                      <Button type="submit" disabled={saving} className="gradient-primary">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('profilePage.changing')}
                          </>
                        ) : (
                          t('profilePage.changePasswordButton')
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}