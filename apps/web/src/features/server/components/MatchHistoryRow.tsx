import { opponentOf } from '@gwent/engine';
import type { MatchSummary } from '@gwent/shared';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { mutatorText } from '@/shared/i18n/mutator-text';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { cn } from '@/shared/lib/cn';
import { FactionShield } from '@/shared/ui/FactionShield';
import { RESULT_STYLES } from '../constants/styles';

const roundScores = (match: MatchSummary) =>
  match.rounds
    .map((round) => `${round.scores[match.side]}–${round.scores[opponentOf(match.side)]}`)
    .join('  ');

interface MatchHistoryRowProps {
  match: MatchSummary;
  date: string;
}

export const MatchHistoryRow = ({ match, date }: MatchHistoryRowProps) => {
  const { t: translate } = useTranslation();
  const factionText = useFactionText();
  const navigate = useNavigate();
  const watchLabel = translate('history.watch', { date });

  return (
    <tr className="border-t border-gold/15">
      <td className="py-[0.4cqw]">{date}</td>
      <td className="flex items-center gap-[0.4cqw] py-[0.4cqw]">
        {[match.faction, match.opponent].map((faction, index) => (
          <span key={index} className="flex items-center gap-[0.3cqw]">
            {index === 1 && <span className="text-[tan]">×</span>}
            <FactionShield faction={faction} className="size-[1.4cqw]" />
            {factionText(faction)}
          </span>
        ))}
      </td>
      <td className="py-[0.4cqw]">
        {match.mode === 'online' ? match.opponentName : translate('history.vsBot')}
        {!!match.mutators.length && (
          <span className="block text-[0.8cqw] text-[tan]">
            {match.mutators.map((id) => mutatorText(translate, id).name).join(' · ')}
          </span>
        )}
      </td>
      <td className={cn('py-[0.4cqw] font-bold', RESULT_STYLES[match.result])}>
        {translate(`history.${match.result}`)}
      </td>
      <td className="py-[0.4cqw] font-mono">{roundScores(match)}</td>
      <td className="py-[0.4cqw]">
        <button
          type="button"
          aria-label={watchLabel}
          title={watchLabel}
          onClick={() => void navigate(`/replay/${match.id}`)}
          className="flex size-[2cqw] cursor-pointer items-center justify-center rounded-full border border-gold/60 text-gold hover:bg-gold/20"
        >
          <Play aria-hidden className="size-[55%]" />
        </button>
      </td>
    </tr>
  );
};
