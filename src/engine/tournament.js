// ===================== Utilities =====================
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function nextPowerOfTwo(n) {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(n, 1))));
}

// ===================== Standings (Swiss) =====================
const MATCH_POINTS = { win: 3, draw: 1, loss: 0 };
const MIN_PCT = 1 / 3;

function computeStandings(players, matches) {
  const stats = {};
  players.forEach((p) => {
    stats[p.id] = { points: 0, matchesPlayed: 0, gamesWon: 0, gamesPlayed: 0, opponents: [] };
  });

  matches.forEach((m) => {
    if (m.isBye) {
      const s = stats[m.p1Id];
      if (s) { s.points += MATCH_POINTS.win; s.matchesPlayed += 1; }
      return;
    }
    const s1 = stats[m.p1Id], s2 = stats[m.p2Id];
    if (!s1 || !s2 || !m.result) return;
    s1.matchesPlayed += 1; s2.matchesPlayed += 1;
    s1.opponents.push(m.p2Id); s2.opponents.push(m.p1Id);
    s1.gamesWon += m.p1Games || 0; s2.gamesWon += m.p2Games || 0;
    const totalGames = (m.p1Games || 0) + (m.p2Games || 0);
    s1.gamesPlayed += totalGames; s2.gamesPlayed += totalGames;
    if (m.result === 'p1') s1.points += MATCH_POINTS.win;
    else if (m.result === 'p2') s2.points += MATCH_POINTS.win;
    else { s1.points += MATCH_POINTS.draw; s2.points += MATCH_POINTS.draw; }
  });

  const mw = (id) => {
    const s = stats[id];
    if (!s || s.matchesPlayed === 0) return MIN_PCT;
    return Math.max(s.points / (s.matchesPlayed * MATCH_POINTS.win), MIN_PCT);
  };
  const gw = (id) => {
    const s = stats[id];
    if (!s || s.gamesPlayed === 0) return MIN_PCT;
    return Math.max(s.gamesWon / s.gamesPlayed, MIN_PCT);
  };

  const rows = players.map((p) => {
    const s = stats[p.id];
    const opp = s.opponents;
    const omw = opp.length ? opp.reduce((sum, oid) => sum + mw(oid), 0) / opp.length : MIN_PCT;
    const ogw = opp.length ? opp.reduce((sum, oid) => sum + gw(oid), 0) / opp.length : MIN_PCT;
    return { id: p.id, name: p.name, points: s.points, matchesPlayed: s.matchesPlayed, mw: mw(p.id), gw: gw(p.id), omw, ogw };
  });

  rows.sort((a, b) => b.points - a.points || b.omw - a.omw || b.gw - a.gw || b.ogw - a.ogw);
  return rows;
}

// ===================== Swiss pairing =====================
function hasPlayed(matches, aId, bId) {
  return matches.some((m) => !m.isBye && ((m.p1Id === aId && m.p2Id === bId) || (m.p1Id === bId && m.p2Id === aId)));
}
function hadBye(matches, id) {
  return matches.some((m) => m.isBye && m.p1Id === id);
}

function generateSwissPairings(players, matches, roundNumber) {
  const active = players.filter((p) => !p.dropped);
  let order;
  if (roundNumber === 1) {
    order = shuffle(active);
  } else {
    const standings = computeStandings(active, matches);
    order = standings.map((s) => active.find((p) => p.id === s.id));
  }

  const pool = [...order];
  let byePlayer = null;
  if (pool.length % 2 === 1) {
    for (let i = pool.length - 1; i >= 0; i--) {
      if (!hadBye(matches, pool[i].id)) { byePlayer = pool.splice(i, 1)[0]; break; }
    }
    if (!byePlayer) byePlayer = pool.pop();
  }

  const unpaired = [...pool];
  const pairings = [];
  while (unpaired.length > 0) {
    const p1 = unpaired.shift();
    let idx = unpaired.findIndex((p2) => !hasPlayed(matches, p1.id, p2.id));
    if (idx === -1) idx = 0;
    const p2 = unpaired.splice(idx, 1)[0];
    pairings.push({ p1Id: p1.id, p2Id: p2.id });
  }

  return { pairings, byePlayerId: byePlayer ? byePlayer.id : null };
}

// ===================== Single elimination =====================
function generateSeedOrder(size) {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const s2 = seeds.length * 2;
    const next = [];
    seeds.forEach((s) => { next.push(s); next.push(s2 + 1 - s); });
    seeds = next;
  }
  return seeds;
}

function maybeAutoAdvance(m) {
  if (m.winnerId) return;
  const a = m.p1Id, b = m.p2Id;
  if (a && !b) m.winnerId = a;
  else if (b && !a) m.winnerId = b;
}

function createSingleEliminationBracket(players) {
  const size = nextPowerOfTwo(players.length);
  const seedOrder = generateSeedOrder(size);
  const slots = seedOrder.map((seedNum) => players[seedNum - 1] || null);
  const totalRounds = Math.log2(size);
  let matchId = 1;
  const rounds = [];

  const round1 = [];
  for (let i = 0; i < slots.length; i += 2) {
    const a = slots[i], b = slots[i + 1];
    round1.push({ id: `m${matchId++}`, round: 1, p1Id: a ? a.id : null, p2Id: b ? b.id : null, winnerId: null });
  }
  rounds.push(round1);

  for (let r = 2; r <= totalRounds; r++) {
    const count = rounds[r - 2].length / 2;
    const rm = [];
    for (let i = 0; i < count; i++) rm.push({ id: `m${matchId++}`, round: r, p1Id: null, p2Id: null, winnerId: null });
    rounds.push(rm);
  }

  const bracket = { size, totalRounds, rounds };
  propagateSingleElim(bracket);
  return bracket;
}

function propagateSingleElim(bracket) {
  for (let r = 0; r < bracket.rounds.length; r++) {
    bracket.rounds[r].forEach((m) => maybeAutoAdvance(m));
    if (r < bracket.rounds.length - 1) {
      bracket.rounds[r].forEach((m, i) => {
        if (m.winnerId) {
          const nm = bracket.rounds[r + 1][Math.floor(i / 2)];
          nm[i % 2 === 0 ? 'p1Id' : 'p2Id'] = m.winnerId;
        }
      });
    }
  }
}

function reportSingleEliminationResult(bracket, matchId, winnerId) {
  for (const round of bracket.rounds) {
    const m = round.find((x) => x.id === matchId);
    if (m) { m.winnerId = winnerId; break; }
  }
  propagateSingleElim(bracket);
  return bracket;
}

// ===================== Double elimination =====================
function createDoubleEliminationBracket(players) {
  const size = nextPowerOfTwo(players.length);
  const R = Math.log2(size);
  const seedOrder = generateSeedOrder(size);
  const slots = seedOrder.map((s) => players[s - 1] || null);

  let matchId = 1;
  const wbRounds = [];
  const round1 = [];
  for (let i = 0; i < slots.length; i += 2) {
    const a = slots[i], b = slots[i + 1];
    round1.push({ id: `WB1-${i / 2 + 1}`, round: 1, bracket: 'WB', p1Id: a ? a.id : null, p2Id: b ? b.id : null, winnerId: null });
  }
  wbRounds.push(round1);
  for (let r = 2; r <= R; r++) {
    const count = wbRounds[r - 2].length / 2;
    const rm = [];
    for (let i = 0; i < count; i++) rm.push({ id: `WB${r}-${i + 1}`, round: r, bracket: 'WB', p1Id: null, p2Id: null, winnerId: null });
    wbRounds.push(rm);
  }

  const lbRounds = [];
  let holdingSize = 0;
  for (let k = 1; k <= R; k++) {
    const LkSize = size / Math.pow(2, k);
    if (holdingSize === 0) {
      const count = LkSize / 2;
      const matches = [];
      for (let i = 0; i < count; i++) matches.push({ id: `LB${lbRounds.length + 1}-${i + 1}`, round: lbRounds.length + 1, bracket: 'LB', type: 'minor', wbLoserRound: k, p1Id: null, p2Id: null, winnerId: null });
      lbRounds.push({ type: 'minor', wbLoserRound: k, matches });
      holdingSize = count;
    } else {
      const matches = [];
      for (let i = 0; i < holdingSize; i++) matches.push({ id: `LB${lbRounds.length + 1}-${i + 1}`, round: lbRounds.length + 1, bracket: 'LB', type: 'major', wbLoserRound: k, p1Id: null, p2Id: null, winnerId: null });
      lbRounds.push({ type: 'major', wbLoserRound: k, matches });
      let winnersSize = holdingSize;
      if (k < R) {
        const count2 = winnersSize / 2;
        const matches2 = [];
        for (let i = 0; i < count2; i++) matches2.push({ id: `LB${lbRounds.length + 1}-${i + 1}`, round: lbRounds.length + 1, bracket: 'LB', type: 'minor', wbLoserRound: null, p1Id: null, p2Id: null, winnerId: null });
        lbRounds.push({ type: 'minor', wbLoserRound: null, matches: matches2 });
        holdingSize = count2;
      } else {
        holdingSize = winnersSize;
      }
    }
  }

  const grandFinal = { id: 'GF', p1Id: null, p2Id: null, winnerId: null };
  const grandFinalReset = { id: 'GF2', p1Id: null, p2Id: null, winnerId: null, active: false };

  const bracket = { size, R, wbRounds, lbRounds, grandFinal, grandFinalReset };
  propagateDoubleElim(bracket);
  return bracket;
}

function propagateDoubleElim(bracket) {
  const { wbRounds, lbRounds, grandFinal, grandFinalReset } = bracket;

  const wbLosersByRound = [];
  for (let r = 0; r < wbRounds.length; r++) {
    wbRounds[r].forEach((m) => maybeAutoAdvance(m));
    if (r < wbRounds.length - 1) {
      wbRounds[r].forEach((m, i) => {
        if (m.winnerId) {
          const nm = wbRounds[r + 1][Math.floor(i / 2)];
          nm[i % 2 === 0 ? 'p1Id' : 'p2Id'] = m.winnerId;
        }
      });
    }
    wbLosersByRound.push(wbRounds[r].map((m) => {
      if (!m.winnerId) return undefined;
      if (!m.p1Id || !m.p2Id) return null;
      return m.winnerId === m.p1Id ? m.p2Id : m.p1Id;
    }));
  }

  let holding = null;
  let lbIdx = 0;
  for (let k = 1; k <= wbRounds.length; k++) {
    const Lk = wbLosersByRound[k - 1];
    if (holding === null) {
      const round = lbRounds[lbIdx]; lbIdx++;
      round.matches.forEach((m, i) => {
        const a = Lk[2 * i], b = Lk[2 * i + 1];
        if (a !== undefined) m.p1Id = a;
        if (b !== undefined) m.p2Id = b;
        maybeAutoAdvance(m);
      });
      holding = round.matches.map((m) => m.winnerId || null);
    } else {
      const round = lbRounds[lbIdx]; lbIdx++;
      round.matches.forEach((m, i) => {
        const a = holding[i], b = Lk[i];
        if (a !== undefined && a !== null) m.p1Id = a;
        if (b !== undefined) m.p2Id = b;
        maybeAutoAdvance(m);
      });
      let winners = round.matches.map((m) => m.winnerId || null);
      if (k < wbRounds.length) {
        const round2 = lbRounds[lbIdx]; lbIdx++;
        round2.matches.forEach((m, i) => {
          const a = winners[2 * i], b = winners[2 * i + 1];
          if (a) m.p1Id = a;
          if (b) m.p2Id = b;
          maybeAutoAdvance(m);
        });
        holding = round2.matches.map((m) => m.winnerId || null);
      } else {
        holding = winners;
      }
    }
  }

  const wbChampion = wbRounds[wbRounds.length - 1][0]?.winnerId || null;
  const lbChampion = holding ? holding[0] : null;
  if (wbChampion) grandFinal.p1Id = wbChampion;
  if (lbChampion) grandFinal.p2Id = lbChampion;
  maybeAutoAdvance(grandFinal);

  if (grandFinal.winnerId && grandFinal.winnerId === grandFinal.p2Id && grandFinal.p1Id && grandFinal.p1Id !== grandFinal.p2Id) {
    grandFinalReset.active = true;
    grandFinalReset.p1Id = grandFinal.p1Id;
    grandFinalReset.p2Id = grandFinal.p2Id;
  } else {
    grandFinalReset.active = false;
    grandFinalReset.p1Id = null;
    grandFinalReset.p2Id = null;
    grandFinalReset.winnerId = null;
  }
}

function reportDoubleEliminationResult(bracket, matchId, winnerId) {
  const all = [...bracket.wbRounds.flat(), ...bracket.lbRounds.flatMap((r) => r.matches), bracket.grandFinal, bracket.grandFinalReset];
  const m = all.find((x) => x.id === matchId);
  if (m) m.winnerId = winnerId;
  propagateDoubleElim(bracket);
  return bracket;
}

export {
  computeStandings, generateSwissPairings,
  generateSeedOrder, createSingleEliminationBracket, reportSingleEliminationResult,
  createDoubleEliminationBracket, reportDoubleEliminationResult,
};
