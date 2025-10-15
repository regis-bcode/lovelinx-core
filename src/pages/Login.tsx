import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, FolderKanban } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  // SEO: title, meta description, canonical
  useEffect(() => {
    document.title = isSignup ? "Criar conta | Sistema de Projetos" : "Login | Sistema de Projetos";
    const desc = "Acesse ou crie sua conta no Sistema de Projetos para gerenciar Workspaces, Pastas e Projetos.";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = desc;

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, [isSignup]);
  
  const { login, signUp, isAuthenticated, resendConfirmationEmail } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await login(email, password);
      }
    } catch (error) {
      console.error(isSignup ? "Signup error:" : "Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const featureCards = [
    {
      title: "Painel de Projetos",
      description:
        "Visualize cronogramas, responsáveis e riscos em um painel único e vivo.",
    },
    {
      title: "Suporte BCODE",
      description: "Equipe especializada para orientar implantações e rotinas diárias.",
    },
    {
      title: "Universidade BCODE",
      description: "Capacitação contínua com trilhas de conhecimento e boas práticas.",
    },
    {
      title: "Insights Estratégicos",
      description: "Dashboards conectados aos OKRs e resultados das iniciativas.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-hero px-4 py-10">
      <header>
        <h1 className="sr-only">Login e Criar conta | Sistema de Projetos</h1>
        <link rel="canonical" href={window.location.href} />
        <meta
          name="description"
          content="Acesse ou crie sua conta no Sistema de Projetos para gerenciar Workspaces, Pastas e Projetos."
        />
      </header>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_0%_0%,rgba(41,163,229,0.22),transparent),radial-gradient(85%_120%_at_100%_0%,rgba(11,46,90,0.38),transparent),radial-gradient(120%_120%_at_50%_80%,rgba(74,141,255,0.18),transparent)]" />
      <div className="relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center">
        <div className="grid gap-6 rounded-3xl border border-white/30 bg-white/20 p-6 shadow-large backdrop-blur-xl lg:grid-cols-[1.35fr,1fr] lg:p-12">
          {/* Left column: Brand introduction */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-white shadow-soft">
            <div className="absolute -right-20 top-10 h-56 w-56 rounded-full border border-white/30 bg-white/10 blur-3xl" />
            <div className="absolute -bottom-12 left-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative space-y-8">
              <div className="flex items-center gap-4">
                <img src="/lovelinx-logo.svg" alt="Logotipo Lovelinx" className="h-12 w-12" />
                <div className="text-2xl font-semibold tracking-[0.2em] text-white/90 sm:text-3xl">
                  <span className="text-white">LOVELINX</span>{" "}
                  <span className="text-sky-200">CORE</span>
                </div>
              </div>
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.45em] text-white/80">
                  Painel Lovelinx
                </span>
                <h2 className="text-3xl font-semibold leading-snug text-sky-200 lg:text-4xl">
                  Painel de Acompanhamento de Projetos que une dados, equipes e decisões
                </h2>
                <p className="text-base text-white/80">
                  Acompanhe portfólios, squads e resultados em um ambiente seguro, integrado e atualizado em tempo real.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureCards.map((feature) => (
                  <div key={feature.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/80">
                    <span className="text-white">{feature.title}</span>
                    <p className="mt-2 text-xs leading-relaxed text-white/70">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: Authentication form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md space-y-8 rounded-3xl border border-primary/10 bg-white/80 p-8 shadow-soft backdrop-blur-md dark:bg-background/80">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_15px_40px_rgba(27,95,140,0.25)]">
                  <FolderKanban className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground">Acesse sua central Lovelinx Core</h2>
                <p className="text-sm text-muted-foreground">
                  {isSignup ? "Crie sua conta para iniciar a gestão integrada" : "Entre com suas credenciais para continuar"}
                </p>
              </div>

              <Card className="border border-primary/10 shadow-none">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-2xl text-center">
                    {isSignup ? "Criar conta" : "Login"}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {isSignup
                      ? "Cadastre-se com email e senha para começar"
                      : "Entre com email e senha para continuar"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-primary/15 bg-white/70 pl-4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-11 rounded-xl border border-primary/15 bg-white/70 pr-12 pl-4"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-primary/10"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="h-11 w-full rounded-full bg-gradient-to-r from-[#0B2E5A] via-[#1B5F8C] to-[#29A3E5] text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-large"
                      disabled={isLoading}
                    >
                      {isLoading ? (isSignup ? "Enviando..." : "Entrando...") : (isSignup ? "Criar conta" : "Entrar")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      className="h-11 w-full rounded-full border border-dashed border-primary/40 bg-white/60 text-sm font-semibold uppercase tracking-[0.2em] text-primary shadow-none"
                    >
                      Sou Cliente (Em Breve)
                    </Button>
                  </form>

                  {isSignup && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-accent"
                        onClick={async () => {
                          if (!email) return;
                          setIsLoading(true);
                          try {
                            await resendConfirmationEmail(email);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={!email || isLoading}
                      >
                        Reenviar e-mail de confirmação
                      </button>
                    </div>
                  )}

                  {!isSignup && (
                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-full border border-primary/20 bg-white/70 text-primary hover:border-primary/40 hover:bg-white"
                        onClick={async () => {
                          setEmail("admin@admin");
                          setPassword("admin");
                          setIsLoading(true);
                          try {
                            await login("admin@admin", "admin");
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                      >
                        Entrar como Admin (padrão)
                      </Button>
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isSignup ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline underline-offset-4 hover:text-accent"
                        onClick={() => setIsSignup((v) => !v)}
                      >
                        {isSignup ? "Entrar" : "Criar conta"}
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}