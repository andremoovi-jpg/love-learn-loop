import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@/types";
import { useTranslation } from 'react-i18next';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Load user profile synchronously - NO setTimeout
  const loadUserProfile = async (userId: string) => {
    try {
      // Get auth user to check email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // FORCE admin for specific email
      if (authUser?.email === 'mooviturmalina@gmail.com') {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, phone, total_points, is_admin')
          .eq('user_id', userId)
          .maybeSingle();
        
        return {
          ...profileData,
          is_admin: true // ALWAYS admin for this email
        };
      }

      // Fetch complete profile (including is_admin)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, phone, total_points, is_admin')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        return null;
      }

      // Also check admin_users table
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // is_admin is true if in profiles OR admin_users
      return {
        ...profileData,
        is_admin: profileData?.is_admin === true || !!adminData
      };
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized) {
      console.log('⚠️ InitAuth: Already initialized, skipping...');
      return;
    }

    // Initialize auth synchronously
    const initAuth = async () => {
      try {
        console.log('🚀 InitAuth: Starting...', { isInitialized });
        setLoading(true);

        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🚀 InitAuth: Session fetched', { hasSession: !!session, error });

        if (error) {
          console.error('❌ InitAuth: Error getting session:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('🚀 InitAuth: Loading profile for user:', session.user.id);
          // Load profile data synchronously - NO setTimeout
          const profileData = await loadUserProfile(session.user.id);
          console.log('🚀 InitAuth: Profile loaded', { profileData });

          const enrichedUser: User = {
            ...session.user,
            full_name: profileData?.full_name || session.user.user_metadata?.full_name || 'Usuário',
            avatar_url: profileData?.avatar_url,
            phone: profileData?.phone,
            total_points: profileData?.total_points || 0,
            is_admin: profileData?.is_admin || false
          };

          console.log('✅ InitAuth: User set', { is_admin: enrichedUser.is_admin });
          setUser(enrichedUser);
          setSession(session);
        } else {
          console.log('🚀 InitAuth: No session, user set to null');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('❌ InitAuth: Error in initAuth:', error);
        setUser(null);
      } finally {
        console.log('✅ InitAuth: Complete, setting loading to false');
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initAuth();

    // Auth state change listener - CRITICAL: No async Supabase calls inside callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth State Change:', { event, hasSession: !!session, hasUser: !!session?.user });
      setSession(session);

      if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, redirecting to login');
        setUser(null);
        navigate('/login');
      } else if (session?.user) {
        // Set basic user first (synchronous)
        const basicUser: User = {
          ...session.user,
          full_name: session.user.user_metadata?.full_name || 'Usuário',
          avatar_url: undefined,
          phone: undefined,
          total_points: 0,
          is_admin: false
        };

        setUser(basicUser);

        // Defer Supabase calls with setTimeout to avoid deadlock
        setTimeout(async () => {
          const profileData = await loadUserProfile(session.user.id);

          const enrichedUser: User = {
            ...session.user,
            full_name: profileData?.full_name || session.user.user_metadata?.full_name || 'Usuário',
            avatar_url: profileData?.avatar_url,
            phone: profileData?.phone,
            total_points: profileData?.total_points || 0,
            is_admin: profileData?.is_admin || false
          };

          setUser(enrichedUser);
        }, 0);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t('register.success.verifyEmail'));
      }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Erro no signIn:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear state immediately
      setUser(null);
      setSession(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(t('auth.loginError'));
        return;
      }
      
      // Force redirect to login
      navigate('/login');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(t('auth.loginError'));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signUp, 
      signIn, 
      signOut,
      login: signIn, // Alias for backward compatibility
      logout: signOut // Alias for backward compatibility
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
