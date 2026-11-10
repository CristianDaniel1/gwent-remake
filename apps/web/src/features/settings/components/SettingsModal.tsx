import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useSettingsStore } from '../store/settings.store';
import { LanguageSelect } from './LanguageSelect';

type SettingsModalProps = { onClose: () => void };

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[1.1cqw] accent-gold"
      />
      {children}
    </label>
  );
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const volumeId = useId();

  return (
    <Modal
      title={t('settings.title')}
      footer={<Button onClick={onClose}>{t('match.close')}</Button>}
    >
      <div className="flex flex-col gap-[1cqw] px-[1cqw]">
        <LanguageSelect />
        <Toggle
          checked={settings.notifications}
          onChange={(notifications) => settings.update({ notifications })}
        >
          {t('settings.notifications')}
        </Toggle>
        <Toggle checked={settings.sound} onChange={(sound) => settings.update({ sound })}>
          {t('settings.sound')}
        </Toggle>
        <label htmlFor={volumeId} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
          {t('settings.soundVolume')}
          <input
            id={volumeId}
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={!settings.sound}
            value={settings.soundVolume}
            onChange={(e) => settings.update({ soundVolume: Number(e.target.value) })}
            className="w-[12cqw] accent-gold"
          />
        </label>
        <Toggle checked={settings.music} onChange={(music) => settings.update({ music })}>
          {t('settings.music')}
        </Toggle>
        <p className="max-w-[30cqw] text-[0.8cqw] text-[tan]">{t('settings.musicHint')}</p>
      </div>
    </Modal>
  );
}
