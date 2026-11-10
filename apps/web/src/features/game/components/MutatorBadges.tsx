import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mutatorText } from '@/shared/i18n/mutator-text';

/** Extra rules of the match, shown at the top of the board (description on hover). */
export function MutatorBadges({ mutators }: { mutators: readonly string[] }) {
  const { t } = useTranslation();
  if (mutators.length === 0) return null;
  return (
    <ul
      aria-label={t('mutators.active')}
      className="absolute top-[0.6%] left-1/2 z-30 flex -translate-x-1/2 gap-[0.4cqw]"
    >
      {mutators.map((id) => {
        const text = mutatorText(t, id);
        return (
          <li
            key={id}
            title={text.description}
            className="flex items-center gap-[0.25cqw] rounded border border-gold/50 bg-ink/85 px-[0.5cqw] py-[0.15cqw] text-[0.85cqw] text-gold-light"
          >
            <Sparkles aria-hidden className="size-[0.9cqw] text-gold" />
            {text.name}
            <span className="sr-only">: {text.description}</span>
          </li>
        );
      })}
    </ul>
  );
}
