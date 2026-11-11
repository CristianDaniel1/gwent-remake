import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Toggle } from '@/shared/ui/Toggle';
import { useSettingsStore } from '../store/settings.store';
import { LanguageSelect } from './LanguageSelect';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { t: translate } = useTranslation();
  const volumeId = useId();
  const { notifications, sound, soundVolume, music, update } = useSettingsStore(
    useShallow((store) => ({
      notifications: store.notifications,
      sound: store.sound,
      soundVolume: store.soundVolume,
      music: store.music,
      update: store.update,
    })),
  );

  return (
    <Modal
      title={translate('settings.title')}
      footer={<Button onClick={onClose}>{translate('match.close')}</Button>}
    >
      <div className="flex flex-col gap-[1cqw] px-[1cqw]">
        <LanguageSelect />
        <Toggle checked={notifications} onChange={(value) => update({ notifications: value })}>
          {translate('settings.notifications')}
        </Toggle>
        <Toggle checked={sound} onChange={(value) => update({ sound: value })}>
          {translate('settings.sound')}
        </Toggle>
        <label htmlFor={volumeId} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
          {translate('settings.soundVolume')}
          <input
            id={volumeId}
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={!sound}
            value={soundVolume}
            onChange={(event) => update({ soundVolume: Number(event.target.value) })}
            className="w-[12cqw] accent-gold"
          />
        </label>
        <Toggle checked={music} onChange={(value) => update({ music: value })}>
          {translate('settings.music')}
        </Toggle>
        <p className="max-w-[30cqw] text-[0.8cqw] text-[tan]">{translate('settings.musicHint')}</p>
      </div>
    </Modal>
  );
};
