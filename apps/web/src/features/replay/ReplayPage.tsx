import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { assets } from '@/shared/lib/assets';
import { BackButton } from '@/shared/ui/BackButton';
import { Stage } from '@/shared/ui/Stage';
import { ReplayViewer } from './components/ReplayViewer';
import { useReplaySource } from './hooks/useReplaySource';

export const ReplayPage = () => {
  const { t: translate } = useTranslation();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { replay, isLocal, loading } = useReplaySource(id);
  const exit = () => void navigate(params.get('from') === 'history' || !isLocal ? '/history' : '/');

  if (replay) return <ReplayViewer replay={replay} onExit={exit} />;

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] bg-black/85 text-[1.3cqw]">
        <p role="status">{loading ? translate('replay.loading') : translate('replay.notFound')}</p>
        <BackButton onClick={exit} className="" />
      </div>
    </Stage>
  );
};
