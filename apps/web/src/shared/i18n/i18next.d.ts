import 'i18next';
import type { defaultNS, resources } from './resources';

// Translation keys typed from pt-BR (the reference language)
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['pt-BR'];
  }
}
