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
import { useTranslation } from 'react-i18next';

export default function Cadastrar() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, signUp} = useAuth();
  
  // Rate limiter para tentativas de cadastro
  const rateLimiter = new RateLimiter();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = async () => {
    if (!fullName.trim()) {
      toast({
        title: t('common.error'),
        description: t('register.errors.nameRequired'),
        variant: "destructive",
      });
      return false;
    }

    if (!email.trim()) {
      toast({
        title: t('common.error'),
        description: t('register.errors.emailRequired'),
        variant: "destructive",
      });
      return false;
    }

    if (!isValidEmail(email)) {
      toast({
        title: t('common.error'),
        description: t('register.errors.invalidEmail'),
        variant: "destructive",
      });
      return false;
    }

    if (!password) {
      toast({
        title: t('common.error'),
        description: t('register.errors.passwordRequired'),
        variant: "destructive",
      });
      return false;
    }

    // Validação de força da senha e verificação de vazamentos
    const passwordValidation = await validatePasswordSecurity(password);
    if (!passwordValidation.valid) {
      toast({
        title: t('register.errors.insecurePassword'),
        description: passwordValidation.errors.join('. '),
        variant: "destructive",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: t('register.errors.passwordsDontMatch'),
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
        title: t('register.errors.tooManyAttempts'),
        description: t('register.errors.waitBeforeRetry'),
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
            title: t('common.error'),
            description: t('register.errors.emailAlreadyRegistered'),
            variant: "destructive",
          });
        } else if (error.message.includes('weak_password') || error.message.includes('Password should be at least')) {
          toast({
            title: t('common.error'),
            description: t('register.errors.weakPassword'),
            variant: "destructive",
          });
        } else {
          toast({
            title: t('common.error'),
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t('register.success.accountCreated'),
          description: t('register.success.verifyEmail'),
        });
        // Reset form
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: t('register.errors.unexpectedError'),
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
            {t('sidebar.appName')}
          </h1>
          <p className="text-muted-foreground">
            {t('register.subtitle')}
          </p>
        </div>

        {/* Signup Form */}
        <Card className="shadow-medium border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">{t('register.title')}</CardTitle>
            <CardDescription>
              {t('register.subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('register.fullNameLabel')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('register.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="transition-base focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('register.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('register.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="transition-base focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('register.passwordPlaceholder')}
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
                <Label htmlFor="confirmPassword">{t('register.confirmPasswordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t('register.confirmPasswordPlaceholder')}
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
                    <span>{t('register.creatingAccount')}</span>
                  </div>
                ) : (
                  t('register.createAccountButton')
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('register.alreadyHaveAccount')}{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-base"
                >
                  {t('register.signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          {t('register.needHelp')}{" "}
          <Link to="/support" className="font-medium text-primary hover:text-primary/80 transition-base">
            {t('register.contact')}
          </Link>
        </p>
      </div>
    </div>
  );
}