/**
 * Draws a random match seed.
 *
 * @returns A 32-bit seed.
 */
export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32) >>> 0;
