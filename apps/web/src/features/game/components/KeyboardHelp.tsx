import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

type KeyboardHelpProps = { onClose: () => void };

/** Shortcut legend: keyboard (`kbd` section of the game texts) and controller. */
export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  const { t } = useTranslation('game');
  const { t: tCommon } = useTranslation();
  const space = tCommon('match.spaceKey');
  const hold = tCommon('match.hold');
  const rows: Array<[keys: string, pad: string, text: string]> = [
    ['← → / A D', '✚ ← → / LB RB', t('kbd.moveHand')],
    [`Enter / ${space}`, 'A', t('kbd.pickCard')],
    ['↑ ↓ ← → / W S A D', '✚', t('kbd.chooseWhere')],
    [`Enter / ${space}`, 'A', t('kbd.playRow')],
    ['P / F', `X (${hold})`, `${t('kbd.passRound')} ${t('kbd.hold1s')}`],
    ['L / E', 'LT / RT', t('kbd.useLeader')],
    ['V / Z', 'Y', tCommon('match.kbdDetails')],
    ['Esc / Q / Backspace', 'B', t('kbd.cancel')],
    ['H / ?', 'Start / Select', t('kbd.toggleHelp')],
  ];
  return (
    <Modal title={t('kbd.title')} footer={<Button onClick={onClose}>{t('kbd.close')}</Button>}>
      <table className="text-[1.05cqw]">
        <thead>
          <tr className="text-[0.9cqw] text-gold-light/70">
            <th className="pr-[1.5cqw] text-right font-normal">{tCommon('match.keyboard')}</th>
            <th className="pr-[1.5cqw] text-right font-normal">{tCommon('match.gamepad')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(([keys, pad, text], i) => (
            <tr key={i}>
              <th className="pr-[1.5cqw] text-right font-mono font-normal whitespace-nowrap text-gold">
                {keys}
              </th>
              <td className="pr-[1.5cqw] text-right font-mono whitespace-nowrap text-gold">
                {pad}
              </td>
              <td className="py-[0.2cqw]">{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
