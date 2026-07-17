import { describe, it, expect } from 'vitest';
import { filterPokemon, getPokemon, pokemonSpriteUrl } from './pokemon';

describe('filterPokemon', () => {
  it('returns no results for an empty query', () => {
    expect(filterPokemon('')).toEqual([]);
    expect(filterPokemon('   ')).toEqual([]);
  });

  it('matches by case-insensitive substring', () => {
    const results = filterPokemon('manectric');
    expect(results.map((r) => r.name)).toContain('Manectric');
    expect(filterPokemon('MANECTRIC').map((r) => r.name)).toEqual(
      results.map((r) => r.name),
    );
  });

  it('matches a substring anywhere in the name', () => {
    const results = filterPokemon('saur');
    expect(results.map((r) => r.name)).toEqual(
      expect.arrayContaining(['Bulbasaur', 'Ivysaur', 'Venusaur']),
    );
  });

  it('caps results at the given limit', () => {
    // 'a' matches hundreds of species names.
    const results = filterPokemon('a', undefined, 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('covers the full national dex, including Gen 9', () => {
    expect(filterPokemon('pecharunt').map((r) => r.id)).toEqual(['1025']);
    expect(filterPokemon('bulbasaur').map((r) => r.id)).toEqual(['1']);
  });
});

describe('getPokemon', () => {
  it('looks up an entry by id', () => {
    expect(getPokemon('25')?.name).toBe('Pikachu');
  });

  it('returns undefined for an unknown or missing id', () => {
    expect(getPokemon('99999')).toBeUndefined();
    expect(getPokemon(undefined)).toBeUndefined();
  });
});

describe('pokemonSpriteUrl', () => {
  it('builds a same-origin static asset path', () => {
    const entry = getPokemon('25')!;
    expect(pokemonSpriteUrl(entry)).toBe('/pokemon-sprites/25.png');
  });
});
