// Served from /wallpapers/: the fork ships them in its public dir, the
// installer copies them next to a stock Twenty build
export const SKIN_WALLPAPER_PRESETS = [
  {
    id: 'brown-waves',
    url: '/wallpapers/brown-waves.jpg',
    label: { ru: 'Коричневые волны', en: 'Brown waves' },
  },
  {
    id: 'indigo-waves',
    url: '/wallpapers/indigo-waves.jpg',
    label: { ru: 'Индиго', en: 'Indigo' },
  },
  {
    id: 'taupe-curves',
    url: '/wallpapers/taupe-curves.jpg',
    label: { ru: 'Тауп', en: 'Taupe' },
  },
  {
    id: 'purple-leaves',
    url: '/wallpapers/purple-leaves.jpg',
    label: { ru: 'Монстера', en: 'Monstera' },
  },
  {
    id: 'antelope-canyon',
    url: '/wallpapers/antelope-canyon.jpg',
    label: { ru: 'Каньон', en: 'Canyon' },
  },
  {
    id: 'lilac-fleece',
    url: '/wallpapers/lilac-fleece.jpg',
    label: { ru: 'Сирень', en: 'Lilac' },
  },
  {
    id: 'ug-panorama',
    url: '/wallpapers/ug-panorama.jpg',
    label: { ru: 'Панорама', en: 'Panorama' },
  },
  {
    id: 'jessica-fadel',
    url: '/wallpapers/jessica-fadel.jpg',
    label: { ru: 'Холмы', en: 'Hills' },
  },
  {
    id: 'nuage',
    url: '/wallpapers/nuage.jpg',
    label: { ru: 'Облака', en: 'Clouds' },
  },
  {
    id: 'zeeela',
    url: '/wallpapers/zeeela.jpg',
    label: { ru: 'Дюны', en: 'Dunes' },
  },
] as const;
