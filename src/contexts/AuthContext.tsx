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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Supabase authentication
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const u = data.user;
      if (!u) throw new Error("Usuário não encontrado");
      const mapped: User = {
        id: u.id,
        name: (u.user_metadata as any)?.full_name ?? u.email,
        email: u.email,
        avatar: (u.user_metadata as any)?.avatar_url ?? null,
      };
      setUser(mapped);
      localStorage.setItem("user", JSON.stringify(mapped));
      toast({ title: "Login realizado com sucesso!" });
    } catch (error) {
      toast({ title: "Erro no login", description: "Verifique suas credenciais.", variant: "destructive" });
      throw error as Error;
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
    localStorage.removeItem("user");
    toast({ title: "Logout realizado" });
  };

  // Initialize auth state and listen for changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      const mapped = u
        ? { id: u.id, name: (u.user_metadata as any)?.full_name ?? u.email, email: u.email, avatar: (u.user_metadata as any)?.avatar_url ?? null }
        : null;
      setUser(mapped);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      const mapped = u
        ? { id: u.id, name: (u?.user_metadata as any)?.full_name ?? u?.email, email: u?.email, avatar: (u?.user_metadata as any)?.avatar_url ?? null }
        : null;
      setUser(mapped);
      setIsLoading(false);
    });

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