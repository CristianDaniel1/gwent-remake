import { opponentOf } from '@gwent/engine';
import { ReplayFileSchema, type MatchSummary } from '@gwent/shared';
import { ArrowLeft, FolderOpen, Play } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { assets } from '@/shared/lib/assets';
import { mutatorText } from '@/shared/i18n/mutator-text';
import { cn } from '@/shared/lib/cn';
import { FileButton } from '@/shared/ui/FileButton';
import { Stage } from '@/shared/ui/Stage';
import { useMatchHistory, useProfile, useServerStatus } from './api/queries';
import { ProfileForm } from './components/ProfileForm';

const RESULT_STYLE = { win: 'text-gold', loss: 'text-red-300', draw: 'text-parchment' } as const;

/** Round scores from the profile's point of view ("mine–theirs"). */
const scoresOf = (match: MatchSummary) =>
  match.rounds.map((r) => `${r.scores[match.side]}–${r.scores[opponentOf(match.side)]}`).join('  ');

/** Matches recorded on the server (most recent first), each with its replay. */
export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const tCards = useTranslation('cards').t;
  const navigate = useNavigate();
  const { online, checking } = useServerStatus();
  const profile = useProfile();
  const history = useMatchHistory();
  const [fileError, setFileError] = useState(false);
  const factionName = (f: string) => tCards(`faction.${f}.name` as never) as unknown as string;
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  /** Opens an exported replay file (works without the server). */
  const openFile = (text: string) => {
    let replay: unknown = null;
    try {
      replay = JSON.parse(text);
    } catch {
      // handled below as an invalid file
    }
    const parsed = ReplayFileSchema.safeParse(replay);
    setFileError(!parsed.success);
    if (parsed.success) void navigate('/replay/local?from=history', { state: parsed.data });
  };

  const content = () => {
    if (checking) return null;
    if (!online) return <p className="max-w-[40cqw] text-center">{t('server.offline')}</p>;
    if (!profile) return <ProfileForm />;
    if (history.isError) return <p role="alert">{t('server.error')}</p>;
    if (history.data?.length === 0) return <p>{t('history.empty')}</p>;
    return (
      <table className="w-[80cqw] text-[1.05cqw]">
        <thead className="text-[tan]">
          <tr>
            <th className="text-left font-normal">{t('history.date')}</th>
            <th className="text-left font-normal">{t('history.matchup')}</th>
            <th className="text-left font-normal">{t('history.opponent')}</th>
            <th className="text-left font-normal">{t('history.result')}</th>
            <th className="text-left font-normal">{t('history.rounds')}</th>
            <th className="text-left font-normal">{t('history.replay')}</th>
          </tr>
        </thead>
        <tbody>
          {history.data?.map((match) => {
            const when = date.format(new Date(match.createdAt));
            return (
              <tr key={match.id} className="border-t border-gold/15">
                <td className="py-[0.4cqw]">{when}</td>
                <td className="flex items-center gap-[0.4cqw] py-[0.4cqw]">
                  {[match.faction, match.opponent].map((f, i) => (
                    <span key={i} className="flex items-center gap-[0.3cqw]">
                      {i === 1 && <span className="text-[tan]">×</span>}
                      <span
                        aria-hidden
                        className="size-[1.4cqw] bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${assets.icon(`deck_shield_${f}`)})` }}
                      />
                      {factionName(f)}
                    </span>
                  ))}
                </td>
                <td className="py-[0.4cqw]">
                  {match.mode === 'online' ? match.opponentName : t('history.vsBot')}
                  {match.mutators.length > 0 && (
                    <span className="block text-[0.8cqw] text-[tan]">
                      {match.mutators.map((id) => mutatorText(t, id).name).join(' · ')}
                    </span>
                  )}
                </td>
                <td className={cn('py-[0.4cqw] font-bold', RESULT_STYLE[match.result])}>
                  {t(`history.${match.result}`)}
                </td>
                <td className="py-[0.4cqw] font-mono">{scoresOf(match)}</td>
                <td className="py-[0.4cqw]">
                  <button
                    type="button"
                    aria-label={t('history.watch', { date: when })}
                    title={t('history.watch', { date: when })}
                    onClick={() => void navigate(`/replay/${match.id}`)}
                    className="flex size-[2cqw] cursor-pointer items-center justify-center rounded-full border border-gold/60 text-gold hover:bg-gold/20"
                  >
                    <Play aria-hidden className="size-[55%]" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center gap-[1.5cqw] overflow-y-auto bg-black/85 px-[4cqw] py-[3cqw]">
        <button
          type="button"
          onClick={() => void navigate('/')}
          className="absolute top-[1cqw] left-[1cqw] flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
        >
          <ArrowLeft aria-hidden className="size-[1.2cqw]" />
          {t('deckBuilder.back')}
        </button>
        <div className="absolute top-[1cqw] right-[1cqw] flex flex-col items-end gap-[0.3cqw] text-[1cqw]">
          <span className="flex items-center gap-[0.4cqw]">
            <FolderOpen aria-hidden className="size-[1.2cqw] text-gold" />
            <FileButton
              label={t('history.openFile')}
              onText={openFile}
              className="cursor-pointer hover:text-gold"
            />
          </span>
          {fileError && (
            <p role="alert" className="text-red-300">
              {t('history.invalidFile')}
            </p>
          )}
        </div>
        <h1 className="text-[2.4cqw] text-gold">{t('history.title')}</h1>
        {profile && online && (
          <p className="text-[1cqw] text-[tan]">{t('server.playingAs', { name: profile.name })}</p>
        )}
        {content()}
      </div>
    </Stage>
  );
}
