import DOMPurify from 'dompurify';

/**
 * Remove completamente tags HTML e scripts de inputs
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  }).trim();
};

/**
 * Sanitiza e normaliza emails
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  return DOMPurify.sanitize(email, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).toLowerCase().trim();
};

/**
 * Remove caracteres não numéricos de telefones, mantendo apenas dígitos e caracteres comuns
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  return phone.replace(/[^0-9+()-\s]/g, '').trim();
};

/**
 * Sanitiza nomes removendo caracteres perigosos mas mantendo acentos
 */
export const sanitizeName = (name: string): string => {
  if (!name) return '';
  
  return DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim();
};

/**
 * Sanitiza URLs verificando protocolo seguro
 */
export const sanitizeUrl = (url: string): string | null => {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Escapa HTML para exibição segura
 */
export const escapeHtml = (text: string): string => {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Máscara para dados sensíveis (email, telefone)
 */
export const maskSensitiveData = (data: string, showFirst: number = 2, showLast: number = 2): string => {
  if (!data || data.length <= showFirst + showLast) {
    return data;
  }
  
  const masked = '*'.repeat(data.length - showFirst - showLast);
  return data.substring(0, showFirst) + masked + data.substring(data.length - showLast);
};

/**
 * Máscara especial para emails
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + '***'
    : local;
  
  return `${maskedLocal}@${domain}`;
};
