import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { apiServer } from './msw';
import { bootSettings } from '@/features/settings';
import i18n from '@/shared/i18n';

void i18n.changeLanguage('pt-BR');
bootSettings();

window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};

beforeAll(() => apiServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  apiServer.resetHandlers();
});
afterAll(() => apiServer.close());
