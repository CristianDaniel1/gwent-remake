import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '@/features/settings';
import i18n from '@/shared/i18n';
import { renderWithProviders } from '@/test/render';
import { MenuPage } from './MenuPage';

afterEach(async () => {
  useSettingsStore.setState({ language: null });
  await i18n.changeLanguage('pt-BR');
});

describe('MenuPage', () => {
  it('shows the title and the menu options', () => {
    renderWithProviders(<MenuPage />);
    expect(screen.getByRole('heading', { name: 'Gwent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jogar contra o computador' })).toBeEnabled();
  });

  it('changes the language in the settings and keeps the choice', async () => {
    renderWithProviders(<MenuPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    const dialog = screen.getByRole('dialog', { name: 'Configurações' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Idioma'), 'es');

    expect(useSettingsStore.getState().language).toBe('es');
    expect(
      await screen.findByRole('button', { name: 'Jugar contra la computadora' }),
    ).toBeInTheDocument();
  });

  it('toggles the notifications', async () => {
    renderWithProviders(<MenuPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Mostrar notificações na partida' }),
    );
    expect(useSettingsStore.getState().notifications).toBe(false);
  });
});
