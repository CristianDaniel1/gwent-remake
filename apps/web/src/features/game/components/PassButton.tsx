import { useTranslation } from 'react-i18next';
import { box } from '../lib/layout';
import { LAYOUT } from '../data/layout';
import { PASS_HOLD_MS } from '../constants/timings';
import { useUiStore } from '../store/ui.store';

interface PassButtonProps {
  disabled: boolean;
  onPass: () => void;
}

export const PassButton = ({ disabled, onPass }: PassButtonProps) => {
  const { t: translate } = useTranslation('game');
  const holding = useUiStore((store) => store.passHolding);

  return (
    <button
      type="button"
      style={box(LAYOUT.pass)}
      disabled={disabled}
      onClick={onPass}
      className="pass-button relative overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(255,200,90,0.15),rgba(255,210,120,0.45))] ease-linear"
        style={{
          width: holding ? '100%' : '0%',
          transitionProperty: 'width',
          transitionDuration: holding ? `${PASS_HOLD_MS}ms` : '0ms',
        }}
      />
      <span className="relative">{translate('game.pass')}</span>
    </button>
  );
};
