import { cn } from '@/shared/lib/cn';

interface CarouselProgressProps {
  used: number;
  total: number;
}

export const CarouselProgress = ({ used, total }: CarouselProgressProps) => (
  <div
    aria-hidden
    className="absolute top-[6%] left-1/2 flex -translate-x-1/2 gap-[1cqw] rounded-[2cqw] bg-ink/70 px-[1.2cqw] py-[0.7cqw]"
  >
    {Array.from({ length: total }, (_, index) => (
      <span
        key={index}
        className={cn(
          'size-[1cqw] rounded-full border-[0.12cqw] border-gold transition-all duration-300',
          index < used ? 'scale-115 bg-gold shadow-[0_0_0.8cqw] shadow-gold' : 'bg-white/10',
        )}
      />
    ))}
  </div>
);
