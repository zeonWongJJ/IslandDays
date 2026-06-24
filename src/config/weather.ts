import { WEATHER, type Season, type WeatherPattern } from './constants.ts';

const SEASON_KEYS: [Season, number][] = [
  ['spring', WEATHER.seasonStart.spring],
  ['summer', WEATHER.seasonStart.summer],
  ['fall', WEATHER.seasonStart.fall],
  ['winter', WEATHER.seasonStart.winter],
];

export function seasonOf(day: number): Season {
  for (let i = SEASON_KEYS.length - 1; i >= 0; i--) {
    if (day >= SEASON_KEYS[i][1]) return SEASON_KEYS[i][0];
  }
  return 'winter';
}

export function pickWeather(season: Season, rng: () => number): WeatherPattern {
  const weights = WEATHER.seasonWeights[season];
  const patterns: WeatherPattern[] = ['clear', 'cloudy', 'rainy', 'stormy', 'snowy'];
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < patterns.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return patterns[i];
  }
  return 'clear';
}

export function weatherLightMultiplier(weather: WeatherPattern): number {
  if (weather === 'rainy') return 0.75;
  if (weather === 'stormy') return 0.55;
  if (weather === 'snowy') return 0.85;
  if (weather === 'cloudy') return 0.88;
  return 1;
}
