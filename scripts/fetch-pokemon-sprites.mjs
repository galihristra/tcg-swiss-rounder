#!/usr/bin/env node
// One-off asset generator — NOT run at app runtime or in CI.
//
// Populates public/pokemon-sprites/<dexNumber>.png and src/data/pokemon.json
// for the deck-namesake picker. Sprites come from the official PokeAPI/sprites
// GitHub repo (CC0-licensed), pulled via a sparse/shallow git clone so only
// the flat default-sprite set is downloaded, not the full multi-gigabyte repo.
// Names come from @pkmn/dex (MIT-licensed, Pokémon Showdown's data layer),
// which is why it's a devDependency rather than a runtime one.
//
// Re-run this script only if the dataset needs regenerating; its output
// (public/pokemon-sprites/, src/data/pokemon.json) is committed to the repo.

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const spritesOutDir = join(repoRoot, 'public', 'pokemon-sprites');
const dataOutFile = join(repoRoot, 'src', 'data', 'pokemon.json');

const DEX_MIN = 1;
const DEX_MAX = 1025;

function cloneSprites() {
  const cloneDir = mkdtempSync(join(tmpdir(), 'pokeapi-sprites-'));
  execFileSync(
    'git',
    [
      'clone',
      '--no-checkout',
      '--depth',
      '1',
      '--filter=blob:none',
      'https://github.com/PokeAPI/sprites.git',
      cloneDir,
    ],
    { stdio: 'inherit' },
  );
  execFileSync('git', ['sparse-checkout', 'init', '--no-cone'], {
    cwd: cloneDir,
    stdio: 'inherit',
  });
  writeFileSync(
    join(cloneDir, '.git', 'info', 'sparse-checkout'),
    '/sprites/pokemon/*.png\n',
  );
  execFileSync('git', ['checkout', '-f', 'master'], {
    cwd: cloneDir,
    stdio: 'inherit',
  });
  return cloneDir;
}

function copySprites(cloneDir) {
  mkdirSync(spritesOutDir, { recursive: true });
  const srcDir = join(cloneDir, 'sprites', 'pokemon');
  let copied = 0;
  for (let num = DEX_MIN; num <= DEX_MAX; num++) {
    const src = join(srcDir, `${num}.png`);
    if (!existsSync(src)) {
      throw new Error(`Missing sprite for dex #${num} at ${src}`);
    }
    copyFileSync(src, join(spritesOutDir, `${num}.png`));
    copied++;
  }
  return copied;
}

async function buildPokemonList() {
  const { Dex } = await import('@pkmn/dex');
  const baseSpecies = Dex.species
    .all()
    .filter((s) => s.forme === '' && s.num >= DEX_MIN && s.num <= DEX_MAX);

  const byNum = new Map();
  for (const s of baseSpecies) byNum.set(s.num, s.name);

  const missing = [];
  const list = [];
  for (let num = DEX_MIN; num <= DEX_MAX; num++) {
    const name = byNum.get(num);
    if (!name) {
      missing.push(num);
      continue;
    }
    list.push({ id: String(num), name, sprite: `${num}.png` });
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing @pkmn/dex names for dex numbers: ${missing.join(', ')}`,
    );
  }
  return list;
}

async function main() {
  console.log(
    'Cloning PokeAPI/sprites (sparse, sprites/pokemon/*.png only)...',
  );
  const cloneDir = cloneSprites();
  try {
    console.log('Copying sprites into public/pokemon-sprites/...');
    const copied = copySprites(cloneDir);
    console.log(`Copied ${copied} sprites.`);
  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
  }

  console.log('Building src/data/pokemon.json from @pkmn/dex...');
  const list = await buildPokemonList();
  mkdirSync(dirname(dataOutFile), { recursive: true });
  writeFileSync(dataOutFile, JSON.stringify(list, null, 2) + '\n');
  console.log(`Wrote ${list.length} entries to ${dataOutFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
