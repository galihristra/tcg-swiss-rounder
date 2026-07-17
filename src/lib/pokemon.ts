import pokemonList from '../data/pokemon.json';

export interface PokemonEntry {
  id: string;
  name: string;
  sprite: string;
}

export const POKEMON_LIST: PokemonEntry[] = pokemonList;

const POKEMON_BY_ID = new Map<string, PokemonEntry>(
  POKEMON_LIST.map((entry) => [entry.id, entry]),
);

export function getPokemon(id: string | undefined): PokemonEntry | undefined {
  return id ? POKEMON_BY_ID.get(id) : undefined;
}

export function pokemonSpriteUrl(entry: PokemonEntry): string {
  return `/pokemon-sprites/${entry.sprite}`;
}

export function filterPokemon(
  query: string,
  list: PokemonEntry[] = POKEMON_LIST,
  limit = 25,
): PokemonEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: PokemonEntry[] = [];
  for (const entry of list) {
    if (entry.name.toLowerCase().includes(q)) {
      results.push(entry);
      if (results.length >= limit) break;
    }
  }
  return results;
}
