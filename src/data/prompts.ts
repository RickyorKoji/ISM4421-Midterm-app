import type { PromptCategory } from '../types';

const hasGenre = (genres: string[], target: string) => genres.some((g) => g.toLowerCase() === target.toLowerCase());
const hasAnyGenre = (genres: string[], targets: string[]) => targets.some((t) => hasGenre(genres, t));

export const promptCategories: PromptCategory[] = [
  {
    id: 'fighting-stage',
    prompt: 'Name a fighting game stage.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Fighting'),
  },
  {
    id: 'hack-slash-setting',
    prompt: 'Name a setting from a hack-and-slash / character action game.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Hack and Slash'),
  },
  {
    id: 'jrpg-location',
    prompt: 'Name a JRPG location.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'JRPG'),
  },
  {
    id: 'open-world-rpg-location',
    prompt: 'Name an open-world RPG location.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'RPG') && hasGenre(e.genres, 'Open World'),
  },
  {
    id: 'souls-location',
    prompt: 'Name a location from a Souls-like game.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Souls-like'),
  },
  {
    id: 'horror-location',
    prompt: 'Name a survival horror location.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Survival Horror'),
  },
  {
    id: 'shooter-map',
    prompt: 'Name a shooter map or battleground.',
    kind: 'setting',
    filter: (e) => hasAnyGenre(e.genres, ['FPS', 'Hero Shooter', 'Battle Royale', 'Shooter']),
  },
  {
    id: 'platformer-zone',
    prompt: 'Name a platformer level, world, or zone.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Platformer'),
  },
  {
    id: 'racing-track',
    prompt: 'Name a racing track or circuit.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Racing'),
  },
  {
    id: 'sandbox-location',
    prompt: 'Name a sandbox or crafting-game location.',
    kind: 'setting',
    filter: (e) => hasAnyGenre(e.genres, ['Sandbox', 'Crafting']),
  },
  {
    id: 'cozy-sim-location',
    prompt: 'Name a location from a life sim or farming sim.',
    kind: 'setting',
    filter: (e) => hasAnyGenre(e.genres, ['Life Sim', 'Farming Sim', 'Social Sim']),
  },
  {
    id: 'moba-map',
    prompt: 'Name a MOBA map or region.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'MOBA'),
  },
  {
    id: 'sports-venue',
    prompt: 'Name a sports game stadium or arena.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Sports'),
  },
  {
    id: 'cartoon-setting',
    prompt: 'Name a cartoon setting.',
    kind: 'setting',
    filter: (e) => e.type === 'cartoon',
  },
  {
    id: 'anime-location',
    prompt: 'Name an anime location.',
    kind: 'setting',
    filter: (e) => hasGenre(e.genres, 'Anime'),
  },
  {
    id: 'game-protagonist',
    prompt: 'Name a video game protagonist.',
    kind: 'character',
    filter: (e) => e.type === 'game',
  },
  {
    id: 'fighting-character',
    prompt: 'Name a fighting game character.',
    kind: 'character',
    filter: (e) => hasGenre(e.genres, 'Fighting'),
  },
  {
    id: 'jrpg-hero',
    prompt: 'Name a JRPG hero.',
    kind: 'character',
    filter: (e) => hasGenre(e.genres, 'JRPG'),
  },
  {
    id: 'horror-character',
    prompt: 'Name a survival horror character.',
    kind: 'character',
    filter: (e) => hasGenre(e.genres, 'Survival Horror'),
  },
  {
    id: 'cartoon-character',
    prompt: 'Name a cartoon character.',
    kind: 'character',
    filter: (e) => e.type === 'cartoon',
  },
  {
    id: 'anime-character',
    prompt: 'Name an anime character.',
    kind: 'character',
    filter: (e) => hasGenre(e.genres, 'Anime'),
  },
  {
    id: 'game-title',
    prompt: 'Name a video game.',
    kind: 'title',
    filter: (e) => e.type === 'game',
  },
  {
    id: 'cartoon-title',
    prompt: 'Name a cartoon or animated series.',
    kind: 'title',
    filter: (e) => e.type === 'cartoon',
  },
  {
    id: 'dlc-worthy-location',
    prompt: 'Name a location that feels like it could be DLC content (expansion-worthy area).',
    kind: 'setting',
    filter: (e) => hasAnyGenre(e.genres, ['RPG', 'Action', 'Adventure', 'Metroidvania']),
  },
];
