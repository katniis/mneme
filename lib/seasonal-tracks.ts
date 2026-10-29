import type { Season } from './environment.ts';

const track = (season: string, title: string, slug: string) => ({
  src: `/audio/seasons/${season}.mp3`, title, artist: 'Scott Buckley',
  sourceUrl: `https://www.scottbuckley.com.au/library/${slug}/`,
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
});
const spring = track('spring', 'Childhood', 'childhood');
const summer = track('summer', 'A Kind Of Hope', 'a-kind-of-hope');

export const SEASON_TRACKS: Record<Season, ReturnType<typeof track>> = {
  spring, summer, autumn: track('autumn', 'Hiraeth', 'hiraeth'),
  winter: track('winter', 'Snowfall', 'snowfall'), tropical: summer, neutral: spring,
};
