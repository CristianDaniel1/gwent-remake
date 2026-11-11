import { FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { assets } from '@/shared/lib/assets';
import { parseReplayFile } from '@/shared/lib/replay-file';
import { BackButton } from '@/shared/ui/BackButton';
import { FileButton } from '@/shared/ui/FileButton';
import { Stage } from '@/shared/ui/Stage';
import { useMatchHistory, useProfile, useServerStatus } from './api/queries';
import { MatchHistoryTable } from './components/MatchHistoryTable';
import { ProfileForm } from './components/ProfileForm';

export const HistoryPage = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const { online, checking } = useServerStatus();
  const profile = useProfile();
  const history = useMatchHistory();
  const [fileError, setFileError] = useState(false);

  const openFile = (text: string) => {
    const replay = parseReplayFile(text);
    setFileError(!replay);
    if (replay) void navigate('/replay/local?from=history', { state: replay });
  };

  const content = () => {
    if (checking) return null;
    if (!online) return <p className="max-w-[40cqw] text-center">{translate('server.offline')}</p>;
    if (!profile) return <ProfileForm />;
    if (history.isError) return <p role="alert">{translate('server.error')}</p>;
    if (!history.data) return null;
    if (!history.data.length) return <p>{translate('history.empty')}</p>;
    return <MatchHistoryTable matches={history.data} />;
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center gap-[1.5cqw] overflow-y-auto bg-black/85 px-[4cqw] py-[3cqw]">
        <BackButton onClick={() => void navigate('/')} />
        <div className="absolute top-[1cqw] right-[1cqw] flex flex-col items-end gap-[0.3cqw] text-[1cqw]">
          <span className="flex items-center gap-[0.4cqw]">
            <FolderOpen aria-hidden className="size-[1.2cqw] text-gold" />
            <FileButton
              label={translate('history.openFile')}
              onText={openFile}
              onError={() => setFileError(true)}
              className="cursor-pointer hover:text-gold"
            />
          </span>
          {fileError && (
            <p role="alert" className="text-red-300">
              {translate('history.invalidFile')}
            </p>
          )}
        </div>
        <h1 className="text-[2.4cqw] text-gold">{translate('history.title')}</h1>
        {profile && online && (
          <p className="text-[1cqw] text-[tan]">
            {translate('server.playingAs', { name: profile.name })}
          </p>
        )}
        {content()}
      </div>
    </Stage>
  );
};
