import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';

export const ErrorBoundary = () => {
  const error = useRouteError();
  const { t: translate } = useTranslation();
  const message = errorMessage(error);

  return (
    <main role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl text-gold">{translate('error.title')}</h1>
      <p className="text-parchment-dark">{message}</p>
    </main>
  );
};
