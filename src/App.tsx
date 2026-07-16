import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  computeStandings,
  generateSwissPairings,
  createSingleEliminationBracket,
  reportSingleEliminationResult,
  createDoubleEliminationBracket,
  reportDoubleEliminationResult,
} from './engine/tournament';
import type {
  Player,
  SwissMatch,
  SingleEliminationBracket,
  DoubleEliminationBracket,
} from './engine/tournament';
import {
  loadOrCreateActiveEvent,
  saveEvent,
  archiveAndCreate,
  listArchivedEvents,
} from './lib/eventStore';
import type {
  Mode,
  EventState,
  EventRecord,
  ArchivedEventSummary,
} from './lib/eventStore';
import { getSession, onAuthStateChange } from './lib/auth';
import PairingTicket from './components/PairingTicket';
import StandingsTable from './components/StandingsTable';
import BracketView, { nameOf } from './components/BracketView';
import AdminLogin from './components/AdminLogin';

const MODE_TABS: [Mode, string][] = [
  ['swiss', 'Swiss'],
  ['single', 'Single Elim'],
  ['double', 'Double Elim'],
];
const SLOTS = ['p1Id', 'p2Id'] as const;

function singleRoundLabels(n: number): string[] {
  const labels: string[] = [];
  for (let r = n; r >= 1; r--)
    labels.push(
      r === 1 ? 'Final' : r === 2 ? 'Semifinal' : `Round of ${Math.pow(2, r)}`,
    );
  return labels;
}

type SaveStatus = 'saved' | 'saving' | 'error';
type View = 'event' | 'archive';

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState('');
  const [mode, setMode] = useState<Mode>('swiss');

  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [round, setRound] = useState(0);
  const [roundsInput, setRoundsInput] = useState('3');
  const [eventFinished, setEventFinished] = useState(false);

  const [singleBracket, setSingleBracket] =
    useState<SingleEliminationBracket | null>(null);
  const [doubleBracket, setDoubleBracket] =
    useState<DoubleEliminationBracket | null>(null);

  // Persistence
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const skipSaveRef = useRef(true);

  // Past-events view
  const [view, setView] = useState<View>('event');
  const [archived, setArchived] = useState<ArchivedEventSummary[]>([]);
  const [viewingArchive, setViewingArchive] =
    useState<ArchivedEventSummary | null>(null);

  // Auth: only the organizer ever has a session (public sign-ups are disabled).
  const [session, setSession] = useState<Session | null>(null);
  const isAdmin = !!session;

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch((e) => console.error('Failed to get session', e));
    return onAuthStateChange(setSession);
  }, []);

  const applyRecord = useCallback((rec: EventRecord) => {
    setEventId(rec.id);
    setEventName(rec.name);
    const s = rec.state;
    setMode(s.mode);
    setPlayers(s.players);
    setMatches(s.matches);
    setRound(s.round);
    setRoundsInput(s.roundsInput);
    setEventFinished(s.eventFinished);
    setSingleBracket(s.singleBracket);
    setDoubleBracket(s.doubleBracket);
  }, []);

  // Load (or create) the active event on startup.
  useEffect(() => {
    let cancelled = false;
    loadOrCreateActiveEvent()
      .then((rec) => {
        if (cancelled) return;
        skipSaveRef.current = true;
        applyRecord(rec);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load event', e);
        setLoadError(e?.message ?? String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyRecord]);

  // Debounced auto-save whenever any persisted field changes.
  useEffect(() => {
    if (loading || !eventId) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    setSaveStatus('saving');
    const state: EventState = {
      mode,
      players,
      matches,
      round,
      roundsInput,
      eventFinished,
      singleBracket,
      doubleBracket,
    };
    const t = setTimeout(() => {
      saveEvent(eventId, eventName, state)
        .then(() => setSaveStatus('saved'))
        .catch((e) => {
          console.error('Save failed', e);
          setSaveStatus('error');
        });
    }, 600);
    return () => clearTimeout(t);
  }, [
    mode,
    players,
    matches,
    round,
    roundsInput,
    eventFinished,
    singleBracket,
    doubleBracket,
    eventName,
    eventId,
    loading,
  ]);

  const playerMap = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  );
  const recommendedRounds = Math.max(
    3,
    Math.ceil(Math.log2(Math.max(players.length, 2))),
  );
  const roundCount = parseInt(roundsInput, 10);
  const roundsValid = roundCount >= 3;
  const rosterLocked = round > 0;

  const addPlayer = () => {
    const name = newName.trim();
    if (!name) return;
    setPlayers((ps) => [
      ...ps,
      {
        id: `p-${Math.random().toString(36).slice(2, 9)}`,
        name,
        seed: ps.length + 1,
      },
    ]);
    setNewName('');
  };
  const removePlayer = (id: string) =>
    setPlayers((ps) => ps.filter((p) => p.id !== id));

  const roundMatches = matches.filter((m) => m.round === round);
  const roundComplete =
    round > 0 && roundMatches.every((m) => m.isBye || m.result);

  const startRound = () => {
    const nextRound = round + 1;
    const { pairings, byePlayerId } = generateSwissPairings(
      players,
      matches,
      nextRound,
    );
    const newMatches: SwissMatch[] = pairings.map((p) => ({
      ...p,
      round: nextRound,
      result: null,
      p1Games: 0,
      p2Games: 0,
    }));
    if (byePlayerId)
      newMatches.push({ isBye: true, p1Id: byePlayerId, round: nextRound });
    setMatches((m) => [...m, ...newMatches]);
    setRound(nextRound);
  };

  const finishEvent = () => setEventFinished(true);
  const resetEvent = async () => {
    if (!eventId) return;
    try {
      const rec = await archiveAndCreate(eventId);
      skipSaveRef.current = true;
      applyRecord(rec);
    } catch (e) {
      console.error('Failed to start new event', e);
    }
  };

  const reportSwiss = (targetMatch: SwissMatch, patch: Partial<SwissMatch>) => {
    setMatches((all) =>
      all.map((m) => (m === targetMatch ? { ...m, ...patch } : m)),
    );
  };

  const standings = useMemo(
    () => computeStandings(players, matches),
    [players, matches],
  );

  const genSingle = () =>
    setSingleBracket(createSingleEliminationBracket(players));
  const genDouble = () =>
    setDoubleBracket(createDoubleEliminationBracket(players));

  const reportSingle = useCallback((matchId: string, winnerId: string) => {
    setSingleBracket((b) =>
      b ? reportSingleEliminationResult(b, matchId, winnerId) : b,
    );
  }, []);
  const reportDouble = useCallback((matchId: string, winnerId: string) => {
    setDoubleBracket((b) =>
      b ? reportDoubleEliminationResult(b, matchId, winnerId) : b,
    );
  }, []);

  const openArchive = () => {
    setViewingArchive(null);
    setView('archive');
    listArchivedEvents()
      .then(setArchived)
      .catch((e) => console.error('Failed to list events', e));
  };
  const selectTab = (m: Mode) => {
    setMode(m);
    setView('event');
  };

  const saveLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Save failed'
        : 'All changes saved';

  if (loading) {
    return (
      <div className="tk-root">
        <div className="tk-loading">Loading event…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="tk-root">
        <div className="tk-empty">
          Couldn't connect to the database: {loadError}
          <br />
          Check the values in <b>.env.local</b> and that the <b>events</b> table
          exists (run <b>supabase/schema.sql</b>).
        </div>
      </div>
    );
  }

  return (
    <div className="tk-root">
      <div className="tk-header">
        <div className="tk-title">
          Event System
          <small>Pairing &amp; bracket engine — reference implementation</small>
        </div>
        <div className="tk-headright">
          <div className="tk-tabs">
            {MODE_TABS.map(([k, label]) => (
              <button
                key={k}
                className={`tk-tab ${view === 'event' && mode === k ? 'active' : ''}`}
                onClick={() => selectTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className={`tk-btn ghost ${view === 'archive' ? 'active' : ''}`}
            onClick={openArchive}
          >
            Past events
          </button>
          <AdminLogin isAdmin={isAdmin} userSession={session} />
        </div>
      </div>

      {view === 'archive' ? (
        <div className="tk-panel">
          <div className="tk-roundbar">
            <div className="tk-roundlabel">Past events</div>
            <button className="tk-btn ghost" onClick={() => setView('event')}>
              Back to current event
            </button>
          </div>
          {viewingArchive ? (
            <>
              <button
                className="tk-btn ghost tk-btn--sm tk-reseed"
                onClick={() => setViewingArchive(null)}
              >
                ← All events
              </button>
              <div className="tk-champion">
                🏆{' '}
                <b className="tk-gold">
                  {computeStandings(
                    viewingArchive.state.players,
                    viewingArchive.state.matches,
                  )[0]?.name ?? '—'}
                </b>{' '}
                — {viewingArchive.name}
              </div>
              <h3 className="tk-section-title">Final Standings</h3>
              <StandingsTable
                rows={computeStandings(
                  viewingArchive.state.players,
                  viewingArchive.state.matches,
                )}
              />
            </>
          ) : archived.length === 0 ? (
            <div className="tk-empty tk-empty--spaced">
              No archived events yet. Finish an event and start a new one, and
              it'll show up here.
            </div>
          ) : (
            <div className="tk-archive-list">
              {archived.map((ev) => {
                const st = computeStandings(ev.state.players, ev.state.matches);
                const champion =
                  ev.state.matches.length > 0 && st[0]
                    ? `🏆 ${st[0].name}`
                    : 'no results';
                return (
                  <button
                    className="tk-archive-item"
                    key={ev.id}
                    onClick={() => setViewingArchive(ev)}
                  >
                    <div className="tk-archive-name">{ev.name}</div>
                    <div className="tk-archive-meta">
                      {ev.state.players.length} players · {champion} ·{' '}
                      {new Date(ev.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="tk-layout">
          <div className="tk-panel">
            <input
              className="tk-eventname"
              value={eventName}
              placeholder="Event name"
              disabled={!isAdmin}
              onChange={(e) => setEventName(e.target.value)}
            />
            <div className="tk-savestatus tk-hint">{saveLabel}</div>
            <h3>Roster · {players.length}</h3>
            {players.map((p, i) => (
              <div className="tk-roster-row" key={p.id}>
                <span className="tk-seed">{i + 1}</span>
                <input
                  value={p.name}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    setPlayers((ps) =>
                      ps.map((x) =>
                        x.id === p.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                {isAdmin && (
                  <button
                    className="tk-x"
                    disabled={rosterLocked}
                    onClick={() => removePlayer(p.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <div className="tk-add">
                <input
                  placeholder="Add player…"
                  value={newName}
                  disabled={rosterLocked}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                />
                <button
                  className="tk-btn"
                  disabled={rosterLocked}
                  onClick={addPlayer}
                >
                  Add
                </button>
              </div>
            )}
            {isAdmin && rosterLocked && (
              <p className="tk-suggest">
                Roster is locked while the event is running.
              </p>
            )}
            {!isAdmin && (
              <p className="tk-suggest">
                View-only — sign in as organizer to manage the roster.
              </p>
            )}
            {mode === 'swiss' && (
              <div className="tk-rounds-setting">
                <label htmlFor="tk-round-count">Rounds</label>
                <input
                  id="tk-round-count"
                  type="number"
                  min={3}
                  value={roundsInput}
                  disabled={!isAdmin || round > 0 || eventFinished}
                  onChange={(e) => setRoundsInput(e.target.value)}
                />
                <span className="tk-hint">
                  {roundsValid
                    ? `suggested ${recommendedRounds}`
                    : 'min 3 rounds'}
                </span>
              </div>
            )}
          </div>

          <div>
            {mode === 'swiss' && (
              <div className="tk-panel">
                {eventFinished ? (
                  <>
                    <div className="tk-roundbar">
                      <div className="tk-roundlabel">Event complete</div>
                      {isAdmin && (
                        <button className="tk-btn ghost" onClick={resetEvent}>
                          New event
                        </button>
                      )}
                    </div>
                    <div className="tk-champion">
                      🏆 <b className="tk-gold">{standings[0]?.name ?? '—'}</b>{' '}
                      wins the event
                    </div>
                    <h3 className="tk-section-title">Final Standings</h3>
                    <StandingsTable rows={standings} />
                  </>
                ) : (
                  <>
                    <div className="tk-roundbar">
                      <div className="tk-roundlabel">
                        {round === 0 ? (
                          'Not started'
                        ) : (
                          <>
                            Round <span className="tk-gold">{round}</span> of{' '}
                            {roundCount}
                          </>
                        )}
                      </div>
                      {(() => {
                        if (round === 0) {
                          if (!isAdmin)
                            return (
                              <span className="tk-hint">
                                Waiting for organizer to start the event
                              </span>
                            );
                          return (
                            <button
                              className="tk-btn"
                              disabled={players.length < 2 || !roundsValid}
                              onClick={startRound}
                            >
                              Start Round 1
                            </button>
                          );
                        }
                        if (!roundComplete)
                          return (
                            <span className="tk-hint">
                              Report all results to continue
                            </span>
                          );
                        if (round < roundCount) {
                          if (!isAdmin)
                            return (
                              <span className="tk-hint">
                                Waiting for organizer to start round {round + 1}
                              </span>
                            );
                          return (
                            <button className="tk-btn" onClick={startRound}>
                              Start Round {round + 1}
                            </button>
                          );
                        }
                        if (!isAdmin)
                          return (
                            <span className="tk-hint">
                              Waiting for organizer to finish the event
                            </span>
                          );
                        return (
                          <button className="tk-btn" onClick={finishEvent}>
                            Finish event
                          </button>
                        );
                      })()}
                    </div>

                    {round === 0 && (
                      <div className="tk-empty">
                        Add players, then start round 1. Pairings are randomized
                        for round 1, and score-based (no repeat matchups where
                        possible) after that.
                      </div>
                    )}

                    {roundMatches
                      .filter((m) => !m.isBye)
                      .map((m, i) => (
                        <PairingTicket
                          key={i}
                          index={i}
                          p1={playerMap[m.p1Id]}
                          p2={playerMap[m.p2Id!]}
                          match={m}
                          onReport={(patch) => reportSwiss(m, patch)}
                          readOnly={!isAdmin}
                        />
                      ))}
                    {roundMatches
                      .filter((m) => m.isBye)
                      .map((m, i) => (
                        <div className="tk-bye" key={`bye-${i}`}>
                          {playerMap[m.p1Id]?.name} receives the bye this round
                          (counted as a win).
                        </div>
                      ))}

                    {matches.length > 0 && (
                      <div className="tk-standings-block">
                        <h3 className="tk-section-title">Standings</h3>
                        <StandingsTable rows={standings} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {mode === 'single' && (
              <div className="tk-panel">
                {!singleBracket ? (
                  isAdmin ? (
                    <>
                      <button
                        className="tk-btn"
                        disabled={players.length < 2}
                        onClick={genSingle}
                      >
                        Generate Bracket
                      </button>
                      <div className="tk-empty tk-empty--spaced">
                        Seeded by roster order above (player 1 = top seed). Byes
                        go to the top seeds if the field isn't a power of two.
                      </div>
                    </>
                  ) : (
                    <div className="tk-empty">
                      Waiting for organizer to generate the bracket.
                    </div>
                  )
                ) : (
                  <>
                    {isAdmin && (
                      <button
                        className="tk-btn ghost tk-reseed"
                        onClick={genSingle}
                      >
                        Re-seed &amp; restart
                      </button>
                    )}
                    <BracketView
                      rounds={singleBracket.rounds}
                      roundLabels={singleRoundLabels(singleBracket.totalRounds)}
                      playerMap={playerMap}
                      onReport={reportSingle}
                      readOnly={!isAdmin}
                    />
                  </>
                )}
              </div>
            )}

            {mode === 'double' && (
              <div className="tk-panel">
                {!doubleBracket ? (
                  isAdmin ? (
                    <>
                      <button
                        className="tk-btn"
                        disabled={players.length < 2}
                        onClick={genDouble}
                      >
                        Generate Bracket
                      </button>
                      <div className="tk-empty tk-empty--spaced">
                        Lose in the winners' bracket and you drop to the losers'
                        bracket. Lose twice and you're out.
                      </div>
                    </>
                  ) : (
                    <div className="tk-empty">
                      Waiting for organizer to generate the bracket.
                    </div>
                  )
                ) : (
                  <>
                    {isAdmin && (
                      <button
                        className="tk-btn ghost tk-reseed"
                        onClick={genDouble}
                      >
                        Re-seed &amp; restart
                      </button>
                    )}
                    <h3 className="tk-section-title">Winners' Bracket</h3>
                    <BracketView
                      rounds={doubleBracket.wbRounds}
                      roundLabels={singleRoundLabels(
                        doubleBracket.wbRounds.length,
                      )}
                      playerMap={playerMap}
                      onReport={reportDouble}
                      readOnly={!isAdmin}
                    />

                    <h3 className="tk-section-title">Losers' Bracket</h3>
                    <div className="tk-lbwrap">
                      {doubleBracket.lbRounds.map((lbRound, ri) => (
                        <div className="tk-lbcol" key={ri}>
                          <div className="tk-bcol-label">LB {ri + 1}</div>
                          {lbRound.matches.map((m) => (
                            <div
                              className="tk-bmatch tk-bmatch--static"
                              key={m.id}
                            >
                              {SLOTS.map((slot) => {
                                const pid = m[slot];
                                const isWinner =
                                  !!m.winnerId && m.winnerId === pid;
                                const canClick =
                                  isAdmin &&
                                  pid &&
                                  m.p1Id &&
                                  m.p2Id &&
                                  !m.winnerId;
                                return (
                                  <div
                                    key={slot}
                                    className={`tk-bslot ${isWinner ? 'winner' : ''} ${!pid ? 'empty' : ''}`}
                                    onClick={() =>
                                      canClick && pid && reportDouble(m.id, pid)
                                    }
                                  >
                                    <span>{nameOf(playerMap, pid)}</span>
                                    {isWinner && (
                                      <span className="tk-bwin">W</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    <h3 className="tk-section-title">Grand Final</h3>
                    <div className="tk-gf">
                      <div className="tk-bmatch">
                        {SLOTS.map((slot) => {
                          const pid = doubleBracket.grandFinal[slot];
                          const isWinner =
                            doubleBracket.grandFinal.winnerId === pid;
                          const canClick =
                            isAdmin &&
                            pid &&
                            doubleBracket.grandFinal.p1Id &&
                            doubleBracket.grandFinal.p2Id &&
                            !doubleBracket.grandFinal.winnerId;
                          return (
                            <div
                              key={slot}
                              className={`tk-bslot ${isWinner ? 'winner' : ''} ${!pid ? 'empty' : ''}`}
                              onClick={() =>
                                canClick && pid && reportDouble('GF', pid)
                              }
                            >
                              <span>{nameOf(playerMap, pid)}</span>
                              {isWinner && <span className="tk-bwin">W</span>}
                            </div>
                          );
                        })}
                      </div>
                      {doubleBracket.grandFinalReset.active && (
                        <div className="tk-bmatch">
                          <div className="tk-reset-label">BRACKET RESET</div>
                          {SLOTS.map((slot) => {
                            const pid = doubleBracket.grandFinalReset[slot];
                            const isWinner =
                              doubleBracket.grandFinalReset.winnerId === pid;
                            const canClick =
                              isAdmin &&
                              pid &&
                              doubleBracket.grandFinalReset.p1Id &&
                              doubleBracket.grandFinalReset.p2Id &&
                              !doubleBracket.grandFinalReset.winnerId;
                            return (
                              <div
                                key={slot}
                                className={`tk-bslot ${isWinner ? 'winner' : ''} ${!pid ? 'empty' : ''}`}
                                onClick={() =>
                                  canClick && pid && reportDouble('GF2', pid)
                                }
                              >
                                <span>{nameOf(playerMap, pid)}</span>
                                {isWinner && <span className="tk-bwin">W</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
