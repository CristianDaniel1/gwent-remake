import { MUSIC_URL } from '../constants/music';
import { useSettingsStore } from '../store/settings.store';

export const MusicPlayer = () => {
  const music = useSettingsStore((store) => store.music);
  if (!music) return null;
  return (
    <iframe
      title="music"
      src={MUSIC_URL}
      allow="autoplay; encrypted-media"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
    />
  );
};
