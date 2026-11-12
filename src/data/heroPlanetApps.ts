import { SWIFT_APPS } from './apps';

// Display locations on the globe, not app availability or user locations.
const LOCATIONS = [
  { name: 'Subghost', latitude: 30, longitude: 87 },
  { name: 'BusTimeApp', latitude: 18, longitude: 125 },
  { name: 'Tsumugi', latitude: -30, longitude: 100 },
  { name: 'TeleDeck', latitude: 4, longitude: 48 },
];

export const HERO_PLANET_APPS = LOCATIONS.flatMap(location => {
  const app = SWIFT_APPS.find(item => item.name === location.name);
  return app?.imageSrc ? [{ ...location, imageSrc: app.imageSrc, href: app.detailHref ?? '#projects' }] : [];
});
