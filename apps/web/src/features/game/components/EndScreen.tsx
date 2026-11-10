import type { GameState, PlayerId } from '@gwent/engine';
import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import type { RecordingStatus } from '../hooks/useMatchRecording';

type EndScreenProps = {
  state: GameState;
  human: PlayerId;
  bot: PlayerId;
  opponentName: string;
  /** Status of sending the match to the server history. */
  recording: RecordingStatus;
  /** Extra note (e.g. rematch status online). */
  note: string | null;
  playAgainLabel: string;
  onPlayAgain: () => void;
  onMenu: () => void;
  /** Opens the replay of this match (only when it is available). */
  onWatchReplay?: (() => void) | undefined;
};

/** Match result with the score of each round. */
export function EndScreen({
  state,
  human,
  bot,
  opponentName,
  recording,
  note,
  playAgainLabel,
  onPlayAgain,
  onMenu,
  onWatchReplay,
}: EndScreenProps) {
  const { t } = useTranslation();
  const outcome = state.result === 'draw' ? 'draw' : state.result === human ? 'win' : 'lose';
  const rows = [
    { player: human, name: t('match.you') },
    { player: bot, name: opponentName },
  ];

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-label={t(`match.end.${outcome}`)}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-[1.5cqw] bg-black/85"
    >
      <div
        aria-hidden
        className="h-[14cqw] w-[30cqw] bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${assets.icon(`end_${outcome}`)})` }}
      />
      <h2 className="text-[3cqw] text-gold">{t(`match.end.${outcome}`)}</h2>
      <table className="text-[1.6cqw]">
        <thead>
          <tr>
            <th />
            {[1, 2, 3].map((n) => (
              <th key={n} className="px-[2cqw] font-normal text-[tan]">
                {t('match.end.round', { n })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, name }) => (
            <tr key={player}>
              <th className="pr-[2cqw] text-right text-gold">{name}</th>
              {[0, 1, 2].map((i) => {
                const round = state.roundHistory[i];
                return (
                  <td
                    key={i}
                    className={cn('text-center', round?.winner === player && 'font-bold text-gold')}
                  >
                    {round ? round.scores[player] : '–'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {recording !== 'idle' && (
        <p
          role="status"
          className={cn('text-[1cqw]', recording === 'saved' ? 'text-lime-300' : 'text-[tan]')}
        >
          {t(`record.${recording}`)}
        </p>
      )}
      {note && (
        <p role="status" className="text-[1cqw] text-[tan]">
          {note}
        </p>
      )}
      <div className="flex gap-[1cqw]">
        <Button onClick={onPlayAgain}>{playAgainLabel}</Button>
        {onWatchReplay && <Button onClick={onWatchReplay}>{t('replay.watch')}</Button>}
        <Button onClick={onMenu}>{t('match.end.menu')}</Button>
      </div>
    </m.div>
  );
}
