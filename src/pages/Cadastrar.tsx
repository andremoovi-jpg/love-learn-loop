import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { sanitizeInput, isValidEmail, RateLimiter } from "@/utils/security";
import { validatePasswordSecurity } from "@/utils/passwordSecurity";
import { sanitizeName, sanitizeEmail } from "@/utils/sanitize";

export default function Cadastrar() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, signUp } = useAuth();
  
  // Rate limiter para tentativas de cadastro
  const rateLimiter = new RateLimiter();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = async () => {
    if (!fullName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha seu nome completo.",
        variant: "destructive",
      });
      return false;
    }

    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha seu email.",
        variant: "destructive",
      });
      return false;
    }

    if (!isValidEmail(email)) {
      toast({
        title: "Erro",
        description: "Por favor, digite um email válido.",
        variant: "destructive",
      });
      return false;
    }

    if (!password) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória.",
        variant: "destructive",
      });
      return false;
    }

    // Validação de força da senha e verificação de vazamentos
    const passwordValidation = await validatePasswordSecurity(password);
    if (!passwordValidation.valid) {
      toast({
        title: "Senha insegura",
        description: passwordValidation.errors.join('. '),
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar rate limiting
    if (!rateLimiter.check('signup', 3, 60000)) {
      toast({
        title: "Muitas tentativas",
        description: "Aguarde um minuto antes de tentar novamente.",
        variant: "destructive",
      });
      return;
    }
    
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    setLoading(true);
    
    try {
      // Sanitizar inputs usando funções específicas
      const sanitizedName = sanitizeName(fullName);
      const sanitizedEmail = sanitizeEmail(email);
      
      const { error } = await signUp(sanitizedEmail, password, sanitizedName);
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Erro",
            description: "Este email já está cadastrado. Tente fazer login.",
            variant: "destructive",
          });
        } else if (error.message.includes('weak_password') || error.message.includes('Password should be at least')) {
          toast({
            title: "Erro",
            description: "Senha muito fraca. Use uma senha mais forte.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro",
            description: error.message || "Erro ao criar conta. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar sua conta. Após confirmar, você poderá fazer login.",
        });
        // Reset form
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
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
            Crie sua conta para acessar nossa área de membros
          </p>
        </div>

        {/* Signup Form */}
        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Criar Conta</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="transition-base focus:ring-primary/20"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="pr-10 transition-base focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
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
                    <span>Criando conta...</span>
                  </div>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-base"
                >
                  Entre aqui
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