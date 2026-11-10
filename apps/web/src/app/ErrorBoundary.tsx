import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <main role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-3xl text-gold">{t('error.title')}</h1>
      <p className="text-parchment-dark">{message}</p>
    </main>
  );
}
