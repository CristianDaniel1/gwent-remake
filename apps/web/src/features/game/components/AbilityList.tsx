import type { CardDef } from '@gwent/engine';
import type { CSSProperties } from 'react';
import { useCardText } from '@/shared/i18n/useCardText';
import { abilityIcon } from '@/shared/lib/card-visuals';
import { cn } from '@/shared/lib/cn';

interface AbilityListProps {
  def: CardDef;
  className?: string;
  style?: CSSProperties;
}

export const AbilityList = ({ def, className, style }: AbilityListProps) => {
  const cardText = useCardText();
  const { abilities } = cardText(def);
  const icon = abilityIcon(def);
  if (!abilities.length) return null;

  return (
    <div
      aria-live="polite"
      style={style}
      className={cn(
        'relative border-y-[0.1cqw] border-white/35 bg-[rgba(20,20,20,0.95)] py-[0.6cqw] text-center text-[tan] shadow-[0_0_1cqw_rgba(0,0,0,0.7)]',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden
          className="absolute top-[0.75cqw] left-[0.8cqw] size-[1.9cqw] bg-cover bg-center"
          style={{ backgroundImage: `url(${icon})` }}
        />
      )}
      {abilities.map((ability) => (
        <p
          key={ability.name + ability.description}
          className={cn('text-[0.88cqw] leading-snug', icon ? 'px-[3cqw]' : 'px-[1cqw]')}
        >
          {ability.name && (
            <strong className="block text-[1cqw] text-gold-light capitalize">{ability.name}</strong>
          )}
          {ability.description}
        </p>
      ))}
    </div>
  );
};
