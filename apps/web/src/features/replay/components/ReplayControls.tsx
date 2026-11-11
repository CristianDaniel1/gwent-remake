import {
  ArrowUpDown,
  Download,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Speed } from '../interfaces/playback';
import { SPEEDS } from '../data/playback';
import { IconButton } from './IconButton';

interface ReplayControlsProps {
  frame: number;
  last: number;
  playing: boolean;
  speed: Speed;
  roundStarts: readonly number[];
  roundLabel: string;
  caption: string;
  hint: string | null;
  otherName: string;
  onSeek: (frame: number) => void;
  onToggle: () => void;
  onSpeed: (speed: Speed) => void;
  onSwapSides: () => void;
  onExport: () => void;
}

export const ReplayControls = ({
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
}: ReplayControlsProps) => {
  const { t: translate } = useTranslation();
  const step = translate('replay.step', { n: frame, total: last });

  return (
    <div
      role="group"
      aria-label={translate('replay.title')}
      className="absolute bottom-0 left-[24.5%] z-40 flex h-[9.4%] w-[51%] flex-col justify-center gap-[0.35cqw] rounded-t-[0.6cqw] border-x border-t border-gold/40 bg-ink/90 px-[1cqw] text-[0.95cqw]"
    >
      <div className="flex items-center gap-[0.5cqw]">
        <IconButton
          icon={SkipBack}
          label={translate('replay.first')}
          onClick={() => onSeek(0)}
          disabled={frame === 0}
        />
        <IconButton
          icon={StepBack}
          label={translate('replay.previous')}
          onClick={() => onSeek(frame - 1)}
          disabled={frame === 0}
        />
        <IconButton
          icon={playing ? Pause : Play}
          label={playing ? translate('replay.pause') : translate('replay.play')}
          onClick={onToggle}
          primary
        />
        <IconButton
          icon={StepForward}
          label={translate('replay.next')}
          onClick={() => onSeek(frame + 1)}
          disabled={frame === last}
        />
        <IconButton
          icon={SkipForward}
          label={translate('replay.last')}
          onClick={() => onSeek(last)}
          disabled={frame === last}
        />

        <div className="relative mx-[0.4cqw] flex flex-1 items-center">
          <input
            type="range"
            min={0}
            max={last}
            value={frame}
            aria-label={translate('replay.timeline')}
            aria-valuetext={`${step} · ${roundLabel}`}
            onChange={(event) => onSeek(Number(event.target.value))}
            className="w-full cursor-pointer accent-[goldenrod]"
          />
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
          <span className="sr-only">{translate('replay.speed')}</span>
          <select
            value={speed}
            onChange={(event) => onSpeed(Number(event.target.value) as Speed)}
            className="cursor-pointer rounded border border-gold/40 bg-ink px-[0.3cqw] text-parchment"
          >
            {SPEEDS.map((speedOption) => (
              <option key={speedOption} value={speedOption}>
                {speedOption}x
              </option>
            ))}
          </select>
        </label>
        <IconButton
          icon={ArrowUpDown}
          label={translate('replay.viewAs', { name: otherName })}
          onClick={onSwapSides}
        />
        <IconButton icon={Download} label={translate('replay.export')} onClick={onExport} />
      </div>

      <div className="flex items-center justify-between gap-[1cqw] truncate text-[0.9cqw]">
        <p role="status" className="truncate">
          <span className="text-gold">{roundLabel}</span> · {caption}
        </p>
        {hint && <p className="shrink-0 truncate text-[tan] italic">{hint}</p>}
      </div>
    </div>
  );
};
