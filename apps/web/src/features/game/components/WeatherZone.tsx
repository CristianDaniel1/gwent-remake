import type { GameState } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { box, LAYOUT } from '../layout';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';

const WEATHER_WIDTH_CQW = LAYOUT.weather[2] / 19.2;

type WeatherZoneProps = {
  state: GameState;
  /** A selected weather/Scorch card can be played here. */
  onPlay: (() => void) | null;
  /** Target chosen with the keyboard. */
  focused: boolean;
};

export function WeatherZone({ state, onPlay, focused }: WeatherZoneProps) {
  const { t } = useTranslation();
  return (
    <section style={box(LAYOUT.weather)} aria-label={t('match.weather')}>
      <CardStrip
        items={state.weather}
        widthCqw={WEATHER_WIDTH_CQW}
        getKey={(id) => id}
        renderItem={(id) => (
          <BoardCard
            state={state}
            id={id}
            details={{ title: t('match.weather'), cardIds: state.weather }}
          />
        )}
      />
      {onPlay && (
        <button
          type="button"
          data-target
          aria-label={t('match.weather')}
          onClick={onPlay}
          className={cn(
            'play-target absolute inset-0 cursor-pointer',
            focused && 'play-target-focused',
          )}
        />
      )}
    </section>
  );
}
