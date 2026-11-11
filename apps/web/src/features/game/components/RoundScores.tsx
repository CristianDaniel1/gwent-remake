import type { PlayerId, RoundResult } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { ROUND_INDEXES } from '../data/rounds';

interface RoundScoresProps {
  history: readonly RoundResult[];
  players: readonly { id: PlayerId; name: string }[];
}

export const RoundScores = ({ history, players }: RoundScoresProps) => {
  const { t: translate } = useTranslation();
  return (
    <table className="text-[1.6cqw]">
      <thead>
        <tr>
          <th />
          {ROUND_INDEXES.map((index) => (
            <th key={index} className="px-[2cqw] font-normal text-[tan]">
              {translate('match.end.round', { n: index + 1 })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {players.map(({ id, name }) => (
          <tr key={id}>
            <th className="pr-[2cqw] text-right text-gold">{name}</th>
            {ROUND_INDEXES.map((index) => {
              const round = history[index];
              return (
                <td
                  key={index}
                  className={cn('text-center', round?.winner === id && 'font-bold text-gold')}
                >
                  {round ? round.scores[id] : '–'}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
