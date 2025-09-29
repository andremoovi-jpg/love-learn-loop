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
  const [profileLoading, setProfileLoading] = useState(false);
  const navigate = useNavigate();

  const enrichUserWithProfile = async (supabaseUser: any): Promise<User> => {
    if (import.meta.env.DEV) {
      console.log('🔍 Simplifying user profile for user ID');
    }
    
    // Simplified approach - no complex queries that can hang
    const enrichedUser = {
      ...supabaseUser,
      full_name: supabaseUser.user_metadata?.full_name || 'Usuário',
      total_points: 0,
      is_admin: false
    };

    if (import.meta.env.DEV) {
      console.log('✅ Simplified user ready');
    }
    
    // Load profile data asynchronously after auth is complete
    setTimeout(() => {
      loadUserProfile(supabaseUser.id);
    }, 100);
    
    return enrichedUser;
  };

  const loadUserProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      console.log('🔍 Carregando perfil do usuário:', userId);

      // Buscar profile completo (agora com is_admin)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('📋 Dados do perfil carregados:', { profileData, profileError });

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        return;
      }

      // Update user state with profile data (is_admin já vem do profiles)
      setUser(currentUser => {
        if (currentUser && currentUser.id === userId) {
          const updatedUser = {
            ...currentUser,
            full_name: profileData?.full_name || currentUser.user_metadata?.full_name || 'Usuário',
            avatar_url: profileData?.avatar_url,
            phone: profileData?.phone,
            total_points: profileData?.total_points || 0,
            is_admin: profileData?.is_admin || false
          };
          
          if (import.meta.env.DEV) {
            console.log('✅ Updated user with admin status');
          }
          return updatedUser;
        }
        return currentUser;
      });
    } catch (error) {
      console.error('❌ Error loading profile (non-blocking):', error);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let profileLoaded = false;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Set user with basic data first
          const basicUser = {
            ...session.user,
            full_name: session.user.user_metadata?.full_name || 'Usuário',
            total_points: 0,
            is_admin: false
          };
          
          setUser(basicUser);
          
          // Load profile data only once
          if (!profileLoaded) {
            profileLoaded = true;
            setTimeout(() => {
              loadUserProfile(session.user.id);
            }, 100);
          }
        } else {
          setUser(null);
          profileLoaded = false;
        }
        
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => navigate('/dashboard'), 500);
        }
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      
      if (session?.user) {
        const basicUser = {
          ...session.user,
          full_name: session.user.user_metadata?.full_name || 'Usuário',
          total_points: 0,
          is_admin: false
        };
        
        setUser(basicUser);
        
        // Load profile data only once
        if (!profileLoaded) {
          profileLoaded = true;
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 100);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    }).catch((error) => {
      console.error('❌ Error getting session:', error);
      setLoading(false);
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
      toast.success('Verifique seu email para confirmar sua conta!');
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (import.meta.env.DEV) {
      console.log('🔐 SignIn iniciado');
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (import.meta.env.DEV) {
        console.log('🔐 Resposta do Supabase:', { data: !!data, error: !!error });
      }

      if (error) {
        if (import.meta.env.DEV) {
          console.error('❌ Erro de login:', error);
        }
        toast.error('Credenciais inválidas');
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('✅ Login bem-sucedido');
      }
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
      loading: loading || profileLoading, 
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