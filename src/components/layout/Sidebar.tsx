import { NavLink } from "react-router-dom";
import { 
  Home, 
  BookOpen, 
  Tag, 
  Users, 
  Trophy, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X,
  UserCog,
  Package,
  TrendingUp,
  BarChart3,
  Webhook,
  MessageSquare,
  Plug
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { supabase } from "@/integrations/supabase/client";

interface UserCommunity {
  id: string;
  name: string;
  slug: string;
  icon_url?: string;
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [userCommunities, setUserCommunities] = useState<UserCommunity[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(false);
  
  const navigation = [
    { name: t('navigation.dashboard'), href: "/dashboard", icon: Home },
    { name: t('navigation.products'), href: "/meus-produtos", icon: BookOpen },
    { name: t('navigation.offers'), href: "/ofertas", icon: Tag },
    { name: t('navigation.communities'), href: "/minhas-comunidades", icon: MessageSquare },
    { name: t('navigation.achievements'), href: "/conquistas", icon: Trophy },
    { name: t('navigation.profile'), href: "/perfil", icon: User },
  ];

  const adminNavigation = [
    { name: t('admin.dashboard'), href: "/admin", icon: Settings },
    { name: t('admin.users'), href: "/admin/usuarios", icon: UserCog },
    { name: t('admin.products'), href: "/admin/produtos", icon: Package },
    { name: t('admin.upsells'), href: "/admin/upsells", icon: TrendingUp },
    { name: t('admin.reports'), href: "/admin/relatorios", icon: BarChart3 },
    { name: "Integrações", href: "/admin/integracoes", icon: Plug },
    { name: t('admin.webhooks'), href: "/admin/webhooks", icon: Webhook },
    { name: "Comunidades", href: "/admin/comunidades", icon: MessageSquare },
  ];

  // FORCE admin for specific email
  const isAdmin = user?.is_admin || user?.email === 'mooviturmalina@gmail.com';
  
  // Load user communities
  useEffect(() => {
    if (user) {
      loadUserCommunities();
    }
  }, [user]);

  const loadUserCommunities = async () => {
    if (!user?.id || isLoadingCommunities) {
      console.log('[Sidebar] Skipping community load:', { 
        hasUser: !!user?.id, 
        isLoadingCommunities 
      });
      return;
    }
    
    setIsLoadingCommunities(true);
    console.log('[Sidebar] Loading communities for user:', user.id);
    
    try {

      // Buscar apenas comunidades onde o usuário é membro ativo
      const { data: memberships } = await supabase
        .from('community_members')
        .select(`
          community_id,
          is_banned,
          communities!inner (
            id,
            name,
            slug,
            icon_url,
            is_active,
            product_id,
            products!inner (
              is_active
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_banned', false);

      console.log('[Sidebar] Community memberships:', memberships);

      if (memberships && memberships.length > 0) {
        const activeCommunities = memberships
          .filter(m => 
            m.communities?.is_active && 
            m.communities?.products?.is_active
          )
          .map(m => ({
            id: m.communities!.id,
            name: m.communities!.name,
            slug: m.communities!.slug,
            icon_url: m.communities!.icon_url || undefined
          }));

        console.log('[Sidebar] Active communities:', activeCommunities);
        setUserCommunities(activeCommunities);
      } else {
        console.log('[Sidebar] No active memberships found');
        setUserCommunities([]);
      }
    } catch (error) {
      console.error('[Sidebar] Error loading user communities:', error);
    } finally {
      setIsLoadingCommunities(false);
    }
  };

  // Debug: Log user admin status
  console.log('🔍 Sidebar - User admin status:', {
    hasUser: !!user,
    isAdmin,
    email: user?.email
  });

  const handleLogout = () => {
    logout();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border flex-shrink-0">
        <h1 className="text-2xl font-bold gradient-premium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {t('sidebar.appName')}
        </h1>
      </div>

      {/* User Profile */}
      <div className="p-6 border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.full_name || t('sidebar.user')}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-base ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`
            }
            onClick={() => setIsMobileOpen(false)}
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}

        {userCommunities.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {t('sidebar.communities') || 'Suas Comunidades'}
              </div>
            </div>
            {userCommunities.map((community) => (
              <NavLink
                key={community.id}
                to={`/comunidade/${community.slug}`}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-base ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`
                }
                onClick={() => setIsMobileOpen(false)}
              >
                <MessageSquare className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{community.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                {t('sidebar.administration')}
              </div>
            </div>
            {adminNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-base ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`
                }
                onClick={(e) => {
                  console.log('🖱️ Admin link clicked:', item.href, item.name);
                  setIsMobileOpen(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border flex-shrink-0">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="mr-3 h-5 w-5" />
          {t('sidebar.logout')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar shadow-medium z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm shadow-soft"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-sidebar shadow-strong">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}