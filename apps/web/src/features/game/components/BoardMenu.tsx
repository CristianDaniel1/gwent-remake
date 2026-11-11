import { Keyboard, Settings } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from '@/features/settings';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { box } from '../lib/layout';
import { LAYOUT } from '../data/layout';
import type { BoardMatch } from '../interfaces/match';
import { EXIT_LABELS } from '../data/menu';
import { useUiStore } from '../store/ui.store';
import { ExitConfirmModal } from './ExitConfirmModal';
import { KeyboardHelp } from './KeyboardHelp';
import { MENU_ICON_BUTTON } from '../constants/styles';

interface BoardMenuProps {
  mode: BoardMatch['mode'];
  onExit: () => void;
}

export const BoardMenu = ({ mode, onExit }: BoardMenuProps) => {
  const { t: translate } = useTranslation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const helpOpen = useUiStore((store) => store.helpOpen);
  const setHelpOpen = useUiStore((store) => store.setHelpOpen);
  const exitLabel = translate(EXIT_LABELS[mode] as 'match.exit');

  const requestExit = () => {
    if (mode === 'replay' || mode === 'spectate') return onExit();
    sfx.play('warning');
    setConfirmingExit(true);
  };

  return (
    <>
      <button
        type="button"
        aria-label={exitLabel}
        title={exitLabel}
        onClick={requestExit}
        style={{ ...box(LAYOUT.exit), backgroundImage: `url(${assets.svg('exit')})` }}
        className="z-30 cursor-pointer bg-contain bg-no-repeat opacity-55 hover:opacity-100"
      />
      <button
        type="button"
        aria-label={translate('settings.open')}
        title={translate('settings.open')}
        onClick={() => setSettingsOpen(true)}
        style={box(LAYOUT.settings)}
        className={MENU_ICON_BUTTON}
      >
        <Settings aria-hidden className="size-full" />
      </button>
      <button
        type="button"
        aria-label={translate('match.shortcuts')}
        title={translate('match.shortcuts')}
        onClick={() => setHelpOpen(true)}
        style={box(LAYOUT.help)}
        className={MENU_ICON_BUTTON}
      >
        <Keyboard aria-hidden className="size-full" />
      </button>

      <AnimatePresence>
        {settingsOpen && <SettingsModal key="settings" onClose={() => setSettingsOpen(false)} />}
        {helpOpen && <KeyboardHelp key="help" onClose={() => setHelpOpen(false)} />}
        {confirmingExit && (
          <ExitConfirmModal key="exit" onExit={onExit} onResume={() => setConfirmingExit(false)} />
        )}
      </AnimatePresence>
    </>
  );
};
