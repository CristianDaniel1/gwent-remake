import type { MatchSummary } from '@gwent/shared';
import { useTranslation } from 'react-i18next';
import { MatchHistoryRow } from './MatchHistoryRow';
import { HISTORY_COLUMNS } from '../data/history';

interface MatchHistoryTableProps {
  matches: readonly MatchSummary[];
}

export const MatchHistoryTable = ({ matches }: MatchHistoryTableProps) => {
  const { t: translate, i18n } = useTranslation();
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <table className="w-[80cqw] text-[1.05cqw]">
      <thead className="text-[tan]">
        <tr>
          {HISTORY_COLUMNS.map((column) => (
            <th key={column} className="text-left font-normal">
              {translate(`history.${column}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {matches.map((match) => (
          <MatchHistoryRow
            key={match.id}
            match={match}
            date={dateFormat.format(new Date(match.createdAt))}
          />
        ))}
      </tbody>
    </table>
  );
};
