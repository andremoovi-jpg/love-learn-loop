// Sanitização de inputs
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove tags HTML
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Validação de email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de força da senha
export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter número');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter caractere especial');
  }

  // Verificar senhas comuns
  const commonPasswords = ['password', '123456', '12345678', 'admin', 'qwerty'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Senha muito comum, escolha outra');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Rate limiting no frontend
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  check(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Limpar tentativas antigas
    const validAttempts = attempts.filter(time => now - time < windowMs);

    if (validAttempts.length >= maxAttempts) {
      return false; // Rate limit excedido
    }

    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
}

// Constantes de segurança
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000, // 1 minuto
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// Validação de arquivos
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    return { valid: false, error: 'Arquivo muito grande. Máximo 5MB.' };
  }

  const allowedTypes = [...SECURITY_CONFIG.ALLOWED_IMAGE_TYPES, ...SECURITY_CONFIG.ALLOWED_DOCUMENT_TYPES];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido.' };
  }

  return { valid: true };
};

// Proteção contra XSS
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Validação de URL
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Máscara para dados sensíveis
export const maskSensitiveData = (data: string, showFirst: number = 2, showLast: number = 2): string => {
  if (!data || data.length <= showFirst + showLast) {
    return data;
  }
  
  const masked = '*'.repeat(data.length - showFirst - showLast);
  return data.substring(0, showFirst) + masked + data.substring(data.length - showLast);
};