// URLs of the images and sounds in public/assets.
const BASE = `${import.meta.env.BASE_URL}assets`;

export const assets = {
  board: () => `${BASE}/img/board.jpg`,
  cardSm: (filename: string) => `${BASE}/img/sm/${filename}.jpg`,
  cardLg: (filename: string) => `${BASE}/img/lg/${filename}.jpg`,
  icon: (name: string, ext: 'png' | 'jpg' = 'png') => `${BASE}/img/icons/${name}.${ext}`,
  svg: (name: string) => `${BASE}/svg/${name}.svg`,
  sfx: (name: string) => `${BASE}/sfx/${name}.mp3`,
} as const;
