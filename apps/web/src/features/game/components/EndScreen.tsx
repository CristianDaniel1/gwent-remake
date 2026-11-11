import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { useMatchRecording } from '../hooks/useMatchRecording';
import type { BoardMatch } from '../interfaces/match';
import { outcomeFor } from '../lib/outcome';
import { RoundScores } from './RoundScores';

interface EndScreenProps {
  match: BoardMatch;
  opponentName: string;
  note: string | null;
  playAgainLabel: string;
  onPlayAgain: () => void;
  onMenu: () => void;
  onWatchReplay?: (() => void) | undefined;
}

export const EndScreen = ({
  match,
  opponentName,
  note,
  playAgainLabel,
  onPlayAgain,
  onMenu,
  onWatchReplay,
}: EndScreenProps) => {
  const { t: translate } = useTranslation();
  const recording = useMatchRecording(match);
  const { state, human, opponent } = match;
  const outcome = outcomeFor(state.result, human);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-label={translate(`match.end.${outcome}`)}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-[1.5cqw] bg-black/85"
    >
      <div
        aria-hidden
        className="h-[14cqw] w-[30cqw] bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${assets.icon(`end_${outcome}`)})` }}
      />
      <h2 className="text-[3cqw] text-gold">{translate(`match.end.${outcome}`)}</h2>
      <RoundScores
        history={state.roundHistory}
        players={[
          { id: human, name: translate('match.you') },
          { id: opponent, name: opponentName },
        ]}
      />
      {recording !== 'idle' && (
        <p
          role="status"
          className={cn('text-[1cqw]', recording === 'saved' ? 'text-lime-300' : 'text-[tan]')}
        >
          {translate(`record.${recording}`)}
        </p>
      )}
      {note && (
        <p role="status" className="text-[1cqw] text-[tan]">
          {note}
        </p>
      )}
      <div className="flex gap-[1cqw]">
        <Button onClick={onPlayAgain}>{playAgainLabel}</Button>
        {onWatchReplay && <Button onClick={onWatchReplay}>{translate('replay.watch')}</Button>}
        <Button onClick={onMenu}>{translate('match.end.menu')}</Button>
      </div>
    </m.div>
  );
};
