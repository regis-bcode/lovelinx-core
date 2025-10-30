import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const mapSupabaseUser = (u: any): User => ({
  id: u.id,
  name: (u.user_metadata as any)?.full_name ?? u.email,
  email: u.email,
  avatar: (u.user_metadata as any)?.avatar_url ?? null,
});

const persistMappedUser = (mapped: User | null) => {
  if (typeof window === "undefined") return;

  try {
    if (mapped) {
      localStorage.setItem("user", JSON.stringify(mapped));
    } else {
      localStorage.removeItem("user");
    }
  } catch (error) {
    console.warn("Failed to persist user in storage:", error);
  }
};

const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as User) : null;
  } catch (error) {
    console.warn("Failed to parse stored user:", error);
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Supabase authentication
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const DEFAULT_EMAIL = "admin@admin.com.br";
    const DEFAULT_PASSWORD = "admin";

    const mapAndPersistUser = (u: any) => {
      const mapped = mapSupabaseUser(u);
      setUser(mapped);
      persistMappedUser(mapped);
    };

    try {
      // First attempt
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Usuário não encontrado");
      mapAndPersistUser(data.user);
      toast({ title: "Login realizado com sucesso!" });
    } catch (err: any) {
      // Fallback: ensure default user exists, then retry
      if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
        try {
          await supabase.functions.invoke('bootstrap-default-user', {
            body: { email, password },
          });

          const { data: data2, error: error2 } = await supabase.auth.signInWithPassword({ email, password });
          if (error2) throw error2;
          if (!data2.user) throw new Error("Usuário não encontrado");
          mapAndPersistUser(data2.user);
          toast({ title: "Login realizado com sucesso!" });
          return;
        } catch (fallbackErr) {
          toast({ title: "Erro no login", description: "Não foi possível acessar com o usuário padrão.", variant: "destructive" });
          throw fallbackErr as Error;
        }
      } else {
        toast({ title: "Erro no login", description: "Verifique suas credenciais.", variant: "destructive" });
        throw err as Error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) throw error;
      toast({ title: "Cadastro enviado", description: "Verifique seu email para confirmar." });
    } catch (error) {
      toast({ title: "Erro no cadastro", description: "Não foi possível criar a conta.", variant: "destructive" });
      throw error as Error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) throw error;
      toast({ title: "E-mail de confirmação reenviado", description: "Verifique sua caixa de entrada e o SPAM." });
    } catch (error) {
      toast({ title: "Falha ao reenviar", description: "Não foi possível reenviar o e-mail agora.", variant: "destructive" });
      throw error as Error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    persistMappedUser(null);
    toast({ title: "Logout realizado" });
  };

  // Initialize auth state and listen for changes
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const mapped = session?.user ? mapSupabaseUser(session.user) : null;
      setUser(mapped);
      try {
        persistMappedUser(mapped);
      } catch (storageError) {
        console.warn("Failed to persist auth user:", storageError);
      }
    });

    const initializeSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const mapped = data.session?.user ? mapSupabaseUser(data.session.user) : null;
        setUser(mapped);
        persistMappedUser(mapped);
      } catch (error) {
        console.error("Failed to initialize auth session:", error);
        const fallbackUser = getStoredUser();
        if (fallbackUser) {
          setUser(fallbackUser);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    signUp,
    resendConfirmationEmail,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};