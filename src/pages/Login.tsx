import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 Iniciando login para:', email);
    
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔄 Chamando função login...');
      const result = await login(email, password);
      console.log('🔄 Resultado do login:', result);
      
      if (result.error) {
        console.error('❌ Erro retornado pelo login:', result.error);
        toast({
          title: "Erro",
          description: "Credenciais inválidas. Tente novamente.",
          variant: "destructive",
        });
      } else {
        console.log('✅ Login bem-sucedido!');
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });
      }
    } catch (error) {
      console.error('❌ Erro no catch do handleSubmit:', error);
      toast({
        title: "Erro",
        description: "Credenciais inválidas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      console.log('🔄 Resetando loading...');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/20 via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold gradient-premium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            MemberLovs
          </h1>
          <p className="text-muted-foreground">
            Faça login para acessar sua área de membros
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Entrar</CardTitle>
            <CardDescription>
              Digite seu email e senha para acessar sua conta
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="transition-base focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pr-10 transition-base focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-primary hover:text-primary/80 transition-base"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary border-0 shadow-soft hover:shadow-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </div>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link
                  to="/cadastrar"
                  className="font-medium text-primary hover:text-primary/80 transition-base"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Precisa de ajuda?{" "}
          <Link to="/support" className="font-medium text-primary hover:text-primary/80 transition-base">
            Entre em contato
          </Link>
        </p>
      </div>
    </div>
  );
}