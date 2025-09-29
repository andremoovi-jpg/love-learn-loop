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

  // Load user profile synchronously - NO setTimeout
  const loadUserProfile = async (userId: string) => {
    try {
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

      return profileData;
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize auth synchronously
    const initAuth = async () => {
      try {
        setLoading(true);

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // Load profile data synchronously - NO setTimeout
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
          setSession(session);
        } else {
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/login');
      } else if (session?.user) {
        // Load profile synchronously on auth change
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

        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
        }
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
      toast.success('Verifique seu email para confirmar sua conta!');
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
        toast.error('Credenciais inválidas');
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Erro no signIn:', error);
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
