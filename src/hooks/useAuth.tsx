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


  const loadUserProfile = async (supabaseUser: any): Promise<User> => {
    try {
      // Buscar profile completo (is_admin já vem sincronizado do trigger)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      // Return enhanced user with profile data
      return {
        ...supabaseUser,
        full_name: profileData?.full_name || supabaseUser.user_metadata?.full_name || 'Usuário',
        avatar_url: profileData?.avatar_url,
        phone: profileData?.phone,
        total_points: profileData?.total_points || 0,
        is_admin: profileData?.is_admin || false
      };
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // Return user with basic data on error
      return {
        ...supabaseUser,
        full_name: supabaseUser.user_metadata?.full_name || 'Usuário',
        total_points: 0,
        is_admin: false
      };
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Load profile data SYNCHRONOUSLY (no setTimeout)
          const userData = await loadUserProfile(session.user);
          setUser(userData);
        } else {
          setUser(null);
        }
        
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          navigate('/dashboard');
        }
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      setSession(session);
      
      if (session?.user) {
        // Load profile data SYNCHRONOUSLY
        const userData = await loadUserProfile(session.user);
        setUser(userData);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
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