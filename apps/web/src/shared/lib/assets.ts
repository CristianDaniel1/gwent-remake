import { ASSETS_BASE } from '../constants/assets';

/** Builds the URLs of the images and sounds. */
export const assets = {
  board: () => `${ASSETS_BASE}/img/board.jpg`,
  cardSm: (filename: string) => `${ASSETS_BASE}/img/sm/${filename}.jpg`,
  cardLg: (filename: string) => `${ASSETS_BASE}/img/lg/${filename}.jpg`,
  icon: (name: string, extension: 'png' | 'jpg' = 'png') =>
    `${ASSETS_BASE}/img/icons/${name}.${extension}`,
  svg: (name: string) => `${ASSETS_BASE}/svg/${name}.svg`,
  sfx: (name: string) => `${ASSETS_BASE}/sfx/${name}.mp3`,
} as const;
