import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

interface KeyboardHelpProps {
  onClose: () => void;
}

export const KeyboardHelp = ({ onClose }: KeyboardHelpProps) => {
  const { t: translate } = useTranslation('game');
  const { t: translateCommon } = useTranslation();
  const space = translateCommon('match.spaceKey');
  const hold = translateCommon('match.hold');
  const rows: Array<[keys: string, pad: string, text: string]> = [
    ['← → / A D', '✚ ← → / LB RB', translate('kbd.moveHand')],
    [`Enter / ${space}`, 'A', translate('kbd.pickCard')],
    ['↑ ↓ ← → / W S A D', '✚', translate('kbd.chooseWhere')],
    [`Enter / ${space}`, 'A', translate('kbd.playRow')],
    ['P / F', `X (${hold})`, `${translate('kbd.passRound')} ${translate('kbd.hold1s')}`],
    ['L / E', 'LT / RT', translate('kbd.useLeader')],
    ['V / Z', 'Y', translateCommon('match.kbdDetails')],
    ['Esc / Q / Backspace', 'B', translate('kbd.cancel')],
    ['H / ?', 'Start / Select', translate('kbd.toggleHelp')],
  ];
  return (
    <Modal
      title={translate('kbd.title')}
      footer={<Button onClick={onClose}>{translate('kbd.close')}</Button>}
    >
      <table className="text-[1.05cqw]">
        <thead>
          <tr className="text-[0.9cqw] text-gold-light/70">
            <th className="pr-[1.5cqw] text-right font-normal">
              {translateCommon('match.keyboard')}
            </th>
            <th className="pr-[1.5cqw] text-right font-normal">
              {translateCommon('match.gamepad')}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map(([keys, pad, text], index) => (
            <tr key={index}>
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
};
