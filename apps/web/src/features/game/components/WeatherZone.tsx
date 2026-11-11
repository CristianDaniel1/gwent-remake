import type { GameState } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { box } from '../lib/layout';
import { LAYOUT, WEATHER_WIDTH_CQW } from '../data/layout';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';
import { PlayTarget } from './PlayTarget';

interface WeatherZoneProps {
  state: GameState;
  onPlay: (() => void) | null;
  focused: boolean;
}

export const WeatherZone = ({ state, onPlay, focused }: WeatherZoneProps) => {
  const { t: translate } = useTranslation();
  const label = translate('match.weather');
  return (
    <section style={box(LAYOUT.weather)} aria-label={label}>
      <CardStrip
        items={state.weather}
        widthCqw={WEATHER_WIDTH_CQW}
        getKey={(id) => id}
        renderItem={(id) => (
          <BoardCard state={state} id={id} details={{ title: label, cardIds: state.weather }} />
        )}
      />
      {onPlay && <PlayTarget label={label} focused={focused} onClick={onPlay} />}
    </section>
  );
};
