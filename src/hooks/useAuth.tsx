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
    console.log('🔍 Enriching user profile for:', supabaseUser.id);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      console.log('👤 Profile data:', profile, 'Error:', profileError);

      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .single();

      console.log('👑 Admin data:', adminUser, 'Error:', adminError);

      const enrichedUser = {
        ...supabaseUser,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        avatar_url: profile?.avatar_url,
        phone: profile?.phone,
        total_points: profile?.total_points || 0,
        is_admin: !!adminUser
      };

      console.log('✅ Enriched user:', enrichedUser);
      return enrichedUser;
    } catch (error) {
      console.error('❌ Error enriching user profile:', error);
      const fallbackUser = {
        ...supabaseUser,
        full_name: supabaseUser.user_metadata?.full_name,
        total_points: 0,
        is_admin: false
      };
      console.log('🔄 Fallback user:', fallbackUser);
      return fallbackUser;
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
      async (event, session) => {
        clearTimeout(safetyTimeout);
        console.log('🔄 Auth state change:', event, 'Session:', !!session);
        setSession(session);
        if (session?.user) {
          console.log('👤 User found, enriching profile...');
          try {
            const enrichedUser = await enrichUserWithProfile(session.user);
            setUser(enrichedUser);
          } catch (error) {
            console.error('❌ Error enriching user in state change:', error);
            setUser({
              ...session.user,
              full_name: session.user.user_metadata?.full_name,
              total_points: 0,
              is_admin: false
            });
          }
        } else {
          console.log('❌ No user session');
          setUser(null);
        }
        console.log('✅ Setting loading to false from state change');
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session) {
          navigate('/dashboard');
        }
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // THEN check for existing session
    console.log('🔍 Checking for existing session...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      clearTimeout(safetyTimeout);
      console.log('📋 Session check result:', !!session, 'Error:', error);
      setSession(session);
      if (session?.user) {
        console.log('👤 Existing user found, enriching profile...');
        try {
          const enrichedUser = await enrichUserWithProfile(session.user);
          setUser(enrichedUser);
        } catch (error) {
          console.error('❌ Error enriching existing user:', error);
          setUser({
            ...session.user,
            full_name: session.user.user_metadata?.full_name,
            total_points: 0,
            is_admin: false
          });
        }
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast.error('Credenciais inválidas');
    }
    
    return { error };
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