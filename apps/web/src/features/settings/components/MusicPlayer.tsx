import { useSettingsStore } from '../store/settings.store';

/** Mix of The Witcher 3 Gwent music (YouTube). */
const VIDEO = 'UE9fPWy1_o4';
const SRC = `https://www.youtube-nocookie.com/embed/${VIDEO}?autoplay=1&loop=1&playlist=${VIDEO}&controls=0`;

/**
 * Background music. Nothing is loaded from YouTube while the music
 * is off (it needs internet when on).
 */
export function MusicPlayer() {
  const music = useSettingsStore((s) => s.music);
  if (!music) return null;
  return (
    <iframe
      title="music"
      src={SRC}
      allow="autoplay; encrypted-media"
      aria-hidden
      tabIndex={-1}
      className="pointer-events-none fixed -left-[9999px] h-px w-px opacity-0"
    />
  );
}
