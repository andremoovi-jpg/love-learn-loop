import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { sanitizeInput, isValidEmail, RateLimiter } from "@/utils/security";
import { sanitizeEmail } from "@/utils/sanitize";
import { useTranslation } from 'react-i18next';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const { toast } = useToast();
  
  // Rate limiter para tentativas de login
  const rateLimiter = new RateLimiter();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar rate limiting
    if (!rateLimiter.check('login', 5, 60000)) {
      toast({
        title: t('login.errors.tooManyAttempts'),
        description: t('login.errors.tooManyAttemptsMessage'),
        variant: "destructive",
      });
      return;
    }
    
    if (!email || !password) {
      toast({
        title: t('common.error'),
        description: t('login.errors.fillAllFields'),
        variant: "destructive",
      });
      return;
    }

    if (!isValidEmail(email)) {
      toast({
        title: t('common.error'),
        description: t('login.errors.invalidEmail'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Sanitizar input do email usando função específica
      const sanitizedEmail = sanitizeEmail(email);
      
      const result = await login(sanitizedEmail, password);
      
      if (result.error) {
        if (result.error.message?.includes('Invalid login credentials')) {
          toast({
            title: t('common.error'),
            description: t('login.errors.wrongCredentials'),
            variant: "destructive",
          });
        } else if (result.error.message?.includes('Email not confirmed')) {
          toast({
            title: t('login.errors.emailNotConfirmed'),
            description: t('login.errors.emailNotConfirmedMessage'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('common.error'),
            description: result.error.message,
            variant: "destructive",
          });
        }
        setLoading(false);
      } else {
        toast({
          title: t('common.success'),
          description: t('login.success.loginSuccess'),
        });
        
        // ✅ User já foi atualizado pelo signIn, o <Navigate> fará o redirecionamento
        // Não precisa de navigate() manual nem setTimeout
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: t('login.errors.unexpectedError'),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/20 via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold gradient-premium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('sidebar.appName')}
          </h1>
          <p className="text-muted-foreground">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">{t('auth.login')}</CardTitle>
            <CardDescription>
              {t('login.subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="transition-base focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('login.passwordPlaceholder')}
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
                    {t('login.forgotPassword')}
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
                    <span>{t('login.signingIn')}</span>
                  </div>
                ) : (
                  t('login.loginButton')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('login.noAccount')}{" "}
                <Link
                  to="/cadastrar"
                  className="font-medium text-primary hover:text-primary/80 transition-base"
                >
                  {t('login.createAccount')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          {t('login.needHelp')}{" "}
          <Link to="/support" className="font-medium text-primary hover:text-primary/80 transition-base">
            {t('login.contact')}
          </Link>
        </p>
      </div>
    </div>
  );
}