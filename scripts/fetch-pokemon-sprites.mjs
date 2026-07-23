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
// Beyond National Dex #1-1025, this also emits the 97 official Mega Evolution
// forms (the original 48 from Gen 6 X/Y + ORAS, plus 49 more from the 2025
// Mega Evolution relaunch) at PokeAPI's extended dex ids for those formes
// (10033+). @pkmn/dex models these as alternate "formes" of their base
// species sharing the same dex number, so they're listed by hand in
// MEGA_FORMS below rather than derived generically — Showdown's forme data
// also contains non-official Create-A-Pokémon (CAP) fan content mixed in at
// similar ids, which this hand-picked list deliberately excludes.
//
// One entry (Mega Zygarde, id 10301) has no sprite published in PokeAPI/sprites
// yet, so it gets a generated placeholder image instead — swap it for the
// real sprite once art is available by removing its id from
// MEGA_PLACEHOLDER_IDS and re-running this script.
//
// Re-run this script only if the dataset needs regenerating; its output
// (public/pokemon-sprites/, src/data/pokemon.json) is committed to the repo.

import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
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

// The 97 official Mega Evolutions, keyed by their PokeAPI extended dex id.
// Verified against smogon/pokemon-showdown's data/pokedex.ts (every species
// entry whose `forme` field contains "Mega", excluding the one CAP entry —
// Crucibelle-Mega, which has a negative dex number) and cross-matched by
// slug against PokeAPI/pokeapi's data/v2/csv/pokemon.csv for the id.
const MEGA_FORMS = [
  { id: '10033', name: 'Mega Venusaur' },
  { id: '10034', name: 'Mega Charizard X' },
  { id: '10035', name: 'Mega Charizard Y' },
  { id: '10036', name: 'Mega Blastoise' },
  { id: '10037', name: 'Mega Alakazam' },
  { id: '10038', name: 'Mega Gengar' },
  { id: '10039', name: 'Mega Kangaskhan' },
  { id: '10040', name: 'Mega Pinsir' },
  { id: '10041', name: 'Mega Gyarados' },
  { id: '10042', name: 'Mega Aerodactyl' },
  { id: '10043', name: 'Mega Mewtwo X' },
  { id: '10044', name: 'Mega Mewtwo Y' },
  { id: '10045', name: 'Mega Ampharos' },
  { id: '10046', name: 'Mega Scizor' },
  { id: '10047', name: 'Mega Heracross' },
  { id: '10048', name: 'Mega Houndoom' },
  { id: '10049', name: 'Mega Tyranitar' },
  { id: '10050', name: 'Mega Blaziken' },
  { id: '10051', name: 'Mega Gardevoir' },
  { id: '10052', name: 'Mega Mawile' },
  { id: '10053', name: 'Mega Aggron' },
  { id: '10054', name: 'Mega Medicham' },
  { id: '10055', name: 'Mega Manectric' },
  { id: '10056', name: 'Mega Banette' },
  { id: '10057', name: 'Mega Absol' },
  { id: '10058', name: 'Mega Garchomp' },
  { id: '10059', name: 'Mega Lucario' },
  { id: '10060', name: 'Mega Abomasnow' },
  { id: '10062', name: 'Mega Latias' },
  { id: '10063', name: 'Mega Latios' },
  { id: '10064', name: 'Mega Swampert' },
  { id: '10065', name: 'Mega Sceptile' },
  { id: '10066', name: 'Mega Sableye' },
  { id: '10067', name: 'Mega Altaria' },
  { id: '10068', name: 'Mega Gallade' },
  { id: '10069', name: 'Mega Audino' },
  { id: '10070', name: 'Mega Sharpedo' },
  { id: '10071', name: 'Mega Slowbro' },
  { id: '10072', name: 'Mega Steelix' },
  { id: '10073', name: 'Mega Pidgeot' },
  { id: '10074', name: 'Mega Glalie' },
  { id: '10075', name: 'Mega Diancie' },
  { id: '10076', name: 'Mega Metagross' },
  { id: '10079', name: 'Mega Rayquaza' },
  { id: '10087', name: 'Mega Camerupt' },
  { id: '10088', name: 'Mega Lopunny' },
  { id: '10089', name: 'Mega Salamence' },
  { id: '10090', name: 'Mega Beedrill' },
  { id: '10278', name: 'Mega Clefable' },
  { id: '10279', name: 'Mega Victreebel' },
  { id: '10280', name: 'Mega Starmie' },
  { id: '10281', name: 'Mega Dragonite' },
  { id: '10282', name: 'Mega Meganium' },
  { id: '10283', name: 'Mega Feraligatr' },
  { id: '10284', name: 'Mega Skarmory' },
  { id: '10285', name: 'Mega Froslass' },
  { id: '10286', name: 'Mega Emboar' },
  { id: '10287', name: 'Mega Excadrill' },
  { id: '10288', name: 'Mega Scolipede' },
  { id: '10289', name: 'Mega Scrafty' },
  { id: '10290', name: 'Mega Eelektross' },
  { id: '10291', name: 'Mega Chandelure' },
  { id: '10292', name: 'Mega Chesnaught' },
  { id: '10293', name: 'Mega Delphox' },
  { id: '10294', name: 'Mega Greninja' },
  { id: '10295', name: 'Mega Pyroar' },
  { id: '10296', name: 'Mega Floette' },
  { id: '10297', name: 'Mega Malamar' },
  { id: '10298', name: 'Mega Barbaracle' },
  { id: '10299', name: 'Mega Dragalge' },
  { id: '10300', name: 'Mega Hawlucha' },
  { id: '10301', name: 'Mega Zygarde' },
  { id: '10302', name: 'Mega Drampa' },
  { id: '10303', name: 'Mega Falinks' },
  { id: '10304', name: 'Mega Raichu X' },
  { id: '10305', name: 'Mega Raichu Y' },
  { id: '10306', name: 'Mega Chimecho' },
  { id: '10307', name: 'Mega Absol Z' },
  { id: '10308', name: 'Mega Staraptor' },
  { id: '10309', name: 'Mega Garchomp Z' },
  { id: '10310', name: 'Mega Lucario Z' },
  { id: '10311', name: 'Mega Heatran' },
  { id: '10312', name: 'Mega Darkrai' },
  { id: '10313', name: 'Mega Golurk' },
  { id: '10314', name: 'Mega Meowstic (M)' },
  { id: '10315', name: 'Mega Crabominable' },
  { id: '10316', name: 'Mega Golisopod' },
  { id: '10317', name: 'Mega Magearna' },
  { id: '10318', name: 'Mega Magearna (Original)' },
  { id: '10319', name: 'Mega Zeraora' },
  { id: '10320', name: 'Mega Scovillain' },
  { id: '10321', name: 'Mega Glimmora' },
  { id: '10322', name: 'Mega Tatsugiri (Curly)' },
  { id: '10323', name: 'Mega Tatsugiri (Droopy)' },
  { id: '10324', name: 'Mega Tatsugiri (Stretchy)' },
  { id: '10325', name: 'Mega Baxcalibur' },
  { id: '10326', name: 'Mega Meowstic (F)' },
];

// Ids with no sprite published in PokeAPI/sprites yet — these get a
// generated placeholder image instead of a clone-copied one.
const MEGA_PLACEHOLDER_IDS = new Set(['10301']);

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

// Minimal pure-Node PNG encoder for the placeholder image — draws a flat
// gray square with a darker "?" glyph so it reads clearly as "no art yet"
// rather than a broken image icon.
function buildPlaceholderPng(size = 96) {
  const bg = [200, 200, 200, 255];
  const fg = [140, 140, 140, 255];
  const glyph = [
    '0011110',
    '0110110',
    '1100011',
    '0000110',
    '0001100',
    '0001000',
    '0000000',
    '0001000',
  ];
  const gh = glyph.length;
  const gw = glyph[0].length;
  const scale = Math.floor(size / 12);
  const ox = Math.floor((size - gw * scale) / 2);
  const oy = Math.floor((size - gh * scale) / 2);

  const raw = Buffer.alloc(size * (1 + size * 4));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - ox) / scale);
      const gy = Math.floor((y - oy) / scale);
      const isGlyph =
        gy >= 0 && gy < gh && gx >= 0 && gx < gw && glyph[gy][gx] === '1';
      const [r, g, b, a] = isGlyph ? fg : bg;
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
      raw[o++] = a;
    }
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++)
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (tag, data) => {
    const tagBuf = Buffer.from(tag, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([tagBuf, data])), 0);
    return Buffer.concat([lenBuf, tagBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
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

  for (const { id, name } of MEGA_FORMS) {
    const dest = join(spritesOutDir, `${id}.png`);
    if (MEGA_PLACEHOLDER_IDS.has(id)) {
      writeFileSync(dest, buildPlaceholderPng());
      copied++;
      continue;
    }
    const src = join(srcDir, `${id}.png`);
    if (!existsSync(src)) {
      throw new Error(`Missing sprite for ${name} (id ${id}) at ${src}`);
    }
    copyFileSync(src, dest);
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

  for (const { id, name } of MEGA_FORMS) {
    list.push({ id, name, sprite: `${id}.png` });
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
