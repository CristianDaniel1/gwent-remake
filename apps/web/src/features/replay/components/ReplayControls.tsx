import {
  ArrowUpDown,
  Download,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { SPEEDS, type Speed } from '../hooks/usePlayback';

type ReplayControlsProps = {
  frame: number;
  last: number;
  playing: boolean;
  speed: Speed;
  /** Frame index where each round starts (marks on the timeline). */
  roundStarts: readonly number[];
  /** "Round 2" etc. */
  roundLabel: string;
  /** What happened last and what comes next (or the result at the end). */
  caption: string;
  hint: string | null;
  /** Name of the player on the other side, for the "view as" button. */
  otherName: string;
  onSeek: (frame: number) => void;
  onToggle: () => void;
  onSpeed: (speed: Speed) => void;
  onSwapSides: () => void;
  onExport: () => void;
};

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.1cqw] border-gold/60 text-gold transition-colors hover:bg-gold/20 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent',
        primary ? 'size-[2.4cqw] bg-gold/15' : 'size-[1.9cqw]',
      )}
    >
      <Icon aria-hidden className="size-[55%]" />
    </button>
  );
}

/** Replay bar under the hand: transport buttons, timeline with round marks and captions. */
export function ReplayControls({
  frame,
  last,
  playing,
  speed,
  roundStarts,
  roundLabel,
  caption,
  hint,
  otherName,
  onSeek,
  onToggle,
  onSpeed,
  onSwapSides,
  onExport,
}: ReplayControlsProps) {
  const { t } = useTranslation();
  const step = t('replay.step', { n: frame, total: last });

  return (
    <div
      role="group"
      aria-label={t('replay.title')}
      className="absolute bottom-0 left-[24.5%] z-40 flex h-[9.4%] w-[51%] flex-col justify-center gap-[0.35cqw] rounded-t-[0.6cqw] border-x border-t border-gold/40 bg-ink/90 px-[1cqw] text-[0.95cqw]"
    >
      <div className="flex items-center gap-[0.5cqw]">
        <IconButton
          icon={SkipBack}
          label={t('replay.first')}
          onClick={() => onSeek(0)}
          disabled={frame === 0}
        />
        <IconButton
          icon={StepBack}
          label={t('replay.previous')}
          onClick={() => onSeek(frame - 1)}
          disabled={frame === 0}
        />
        <IconButton
          icon={playing ? Pause : Play}
          label={playing ? t('replay.pause') : t('replay.play')}
          onClick={onToggle}
          primary
        />
        <IconButton
          icon={StepForward}
          label={t('replay.next')}
          onClick={() => onSeek(frame + 1)}
          disabled={frame === last}
        />
        <IconButton
          icon={SkipForward}
          label={t('replay.last')}
          onClick={() => onSeek(last)}
          disabled={frame === last}
        />

        <div className="relative mx-[0.4cqw] flex flex-1 items-center">
          <input
            type="range"
            min={0}
            max={last}
            value={frame}
            aria-label={t('replay.timeline')}
            aria-valuetext={`${step} · ${roundLabel}`}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full cursor-pointer accent-[goldenrod]"
          />
          {/* Round marks */}
          {last > 0 &&
            roundStarts.map((start) => (
              <span
                key={start}
                aria-hidden
                className="pointer-events-none absolute top-[-0.5cqw] h-[0.45cqw] w-[0.15cqw] bg-gold"
                style={{ left: `${(start / last) * 100}%` }}
              />
            ))}
        </div>

        <span className="w-[7cqw] shrink-0 text-center font-mono text-[0.85cqw] text-[tan]">
          {step}
        </span>
        <label className="flex shrink-0 items-center gap-[0.3cqw] text-[0.85cqw] text-[tan]">
          <span className="sr-only">{t('replay.speed')}</span>
          <select
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value) as Speed)}
            className="cursor-pointer rounded border border-gold/40 bg-ink px-[0.3cqw] text-parchment"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
        <IconButton
          icon={ArrowUpDown}
          label={t('replay.viewAs', { name: otherName })}
          onClick={onSwapSides}
        />
        <IconButton icon={Download} label={t('replay.export')} onClick={onExport} />
      </div>

      <div className="flex items-center justify-between gap-[1cqw] truncate text-[0.9cqw]">
        <p role="status" className="truncate">
          <span className="text-gold">{roundLabel}</span> · {caption}
        </p>
        {hint && <p className="shrink-0 truncate text-[tan] italic">{hint}</p>}
      </div>
    </div>
  );
}
