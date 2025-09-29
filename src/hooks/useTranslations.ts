import { useTranslation } from 'react-i18next';

export function useTranslations() {
  const { t, i18n } = useTranslation();

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  const formatCurrency = (amount: number) => {
    const currencies: Record<string, string> = {
      pt: 'BRL',
      en: 'USD',
      es: 'EUR'
    };

    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currencies[i18n.language] || 'USD'
    }).format(amount);
  };

  const formatNumber = (number: number) => {
    return new Intl.NumberFormat(i18n.language).format(number);
  };

  return {
    t,
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
    formatDate,
    formatCurrency,
    formatNumber
  };
}
