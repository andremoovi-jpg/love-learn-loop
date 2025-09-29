import sha1 from 'crypto-js/sha1';

/**
 * Verifica se uma senha foi encontrada em vazamentos de dados usando a API Have I Been Pwned
 * Usa k-anonymity para não enviar a senha completa
 */
export const checkPasswordLeaked = async (password: string): Promise<boolean> => {
  try {
    const hash = sha1(password).toString().toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    
    if (!response.ok) {
      // Em caso de erro na API, permitir mas logar
      console.warn('Could not check password leak status');
      return false;
    }

    const data = await response.text();
    const hashes = data.split('\n');
    
    // Verificar se o sufixo está na lista
    return hashes.some(line => line.startsWith(suffix));
  } catch (error) {
    // Em caso de erro, permitir mas logar
    console.warn('Password leak check failed:', error);
    return false;
  }
};

/**
 * Valida força da senha e verifica vazamentos
 */
export const validatePasswordSecurity = async (password: string): Promise<{
  valid: boolean;
  errors: string[];
  leaked?: boolean;
}> => {
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
  const commonPasswords = ['password', '123456', '12345678', 'admin', 'qwerty', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Senha muito comum, escolha outra');
  }

  // Verificar vazamentos (apenas se passar validações básicas)
  let leaked = false;
  if (errors.length === 0) {
    leaked = await checkPasswordLeaked(password);
    if (leaked) {
      errors.push('Esta senha foi encontrada em vazamentos de dados. Por favor, escolha outra senha.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    leaked
  };
};
