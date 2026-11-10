import { m, useIsPresent } from 'motion/react';
import { useId, type ReactNode } from 'react';

type ModalProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Dialog over the stage, with a dimmed background. Use inside AnimatePresence to animate the exit. */
export function Modal({ title, children, footer }: ModalProps) {
  const titleId = useId();
  // During the exit animation the dialog is still in the DOM: it must not receive clicks or focus.
  const isPresent = useIsPresent();
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      inert={!isPresent}
      aria-hidden={!isPresent}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/75"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90%] max-w-[90%] flex-col items-center gap-[1cqw] rounded-[0.4cqw] border border-gold/40 bg-ink/95 p-[1.5cqw]"
      >
        <h2 id={titleId} className="text-[1.8cqw] text-gold-light">
          {title}
        </h2>
        <div className="flex max-w-full flex-wrap justify-center gap-[0.8cqw] overflow-y-auto">
          {children}
        </div>
        {footer && <div className="flex gap-[0.8cqw]">{footer}</div>}
      </div>
    </m.div>
  );
}
