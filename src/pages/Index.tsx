import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t('index.welcome')}</h1>
        <p className="text-xl text-muted-foreground mb-6">{t('index.subtitle')}</p>
        <Button onClick={() => navigate('/login')}>
          {t('index.getStarted')}
        </Button>
      </div>
    </div>
  );
};

export default Index;
