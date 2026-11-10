import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins conditional classes and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
