import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Session } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@/types";

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
  const navigate = useNavigate();

  const enrichUserWithProfile = async (supabaseUser: any): Promise<User> => {
    console.log('🔍 Simplifying user profile for:', supabaseUser.id);
    
    // Simplified approach - no complex queries that can hang
    const enrichedUser = {
      ...supabaseUser,
      full_name: supabaseUser.user_metadata?.full_name || 'Usuário',
      total_points: 0,
      is_admin: false
    };

    console.log('✅ Simplified user ready:', enrichedUser.email);
    
    // Load profile data asynchronously after auth is complete
    setTimeout(() => {
      loadUserProfile(supabaseUser.id);
    }, 100);
    
    return enrichedUser;
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔄 Loading profile data for:', userId);
      
      const [profileResult, adminResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('admin_users').select('*').eq('user_id', userId).maybeSingle()
      ]);

      let profileData = null;
      let isAdmin = false;

      if (profileResult.status === 'fulfilled' && profileResult.value.data) {
        profileData = profileResult.value.data;
      }

      if (adminResult.status === 'fulfilled' && adminResult.value.data) {
        isAdmin = true;
        console.log('👑 User is admin:', userId);
      }

      // Update user state with profile data
      setUser(currentUser => {
        if (currentUser && currentUser.id === userId) {
          const updatedUser = {
            ...currentUser,
            full_name: profileData?.full_name || currentUser.user_metadata?.full_name || 'Usuário',
            avatar_url: profileData?.avatar_url,
            phone: profileData?.phone,
            total_points: profileData?.total_points || 0,
            is_admin: isAdmin
          };
          console.log('✅ Updated user with admin status:', updatedUser.is_admin);
          return updatedUser;
        }
        return currentUser;
      });

      console.log('✅ Profile data loaded successfully, is_admin:', isAdmin);
    } catch (error) {
      console.error('❌ Error loading profile (non-blocking):', error);
    }
  };

  useEffect(() => {
    console.log('🚀 Auth hook initializing...');
    
    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      console.log('⚠️ Safety timeout - setting loading to false');
      setLoading(false);
    }, 10000); // 10 segundos
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        clearTimeout(safetyTimeout);
        console.log('🔄 Auth state change:', event, 'Session:', !!session);
        setSession(session);
        
        if (session?.user) {
          console.log('👤 User found, setting basic profile...');
          
          // Set user immediately with basic data
          const basicUser = {
            ...session.user,
            full_name: session.user.user_metadata?.full_name || 'Usuário',
            total_points: 0,
            is_admin: false
          };
          
          console.log('👤 Setting basic user:', basicUser.email, 'ID:', basicUser.id);
          setUser(basicUser);
          
          // Load full profile data asynchronously
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 100);
        } else {
          console.log('❌ No user session');
          setUser(null);
        }
        
        console.log('✅ Setting loading to false from state change');
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('🎯 Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 500);
        }
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // THEN check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      clearTimeout(safetyTimeout);
      console.log('📋 Session check result:', !!session, 'Error:', error);
      setSession(session);
      
      if (session?.user) {
        console.log('👤 Existing user found, setting basic profile...');
        
        // Set user immediately with basic data
        const basicUser = {
          ...session.user,
          full_name: session.user.user_metadata?.full_name || 'Usuário',
          total_points: 0,
          is_admin: false
        };
        
        setUser(basicUser);
        
        // Load full profile data asynchronously
        setTimeout(() => {
          loadUserProfile(session.user.id);
        }, 100);
      } else {
        console.log('❌ No existing session');
        setUser(null);
      }
      
      console.log('✅ Initial loading complete');
      setLoading(false);
    }).catch((error) => {
      clearTimeout(safetyTimeout);
      console.error('❌ Error getting session:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
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
      toast.success('Verifique seu email para confirmar sua conta!');
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 SignIn iniciado para:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('🔐 Resposta do Supabase:', { data: !!data, error });

      if (error) {
        console.error('❌ Erro de login:', error);
        toast.error('Credenciais inválidas');
        throw error;
      }

      console.log('✅ Login bem-sucedido, usuário:', data.user?.email);
      return { error: null };
    } catch (error) {
      console.error('❌ Erro no catch do signIn:', error);
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout');
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