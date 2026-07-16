import { useState, useMemo, useCallback } from "react";
import {
  computeStandings,
  generateSwissPairings,
  createSingleEliminationBracket,
  reportSingleEliminationResult,
  createDoubleEliminationBracket,
  reportDoubleEliminationResult,
} from "./engine/tournament";
import type {
  Player,
  SwissMatch,
  SingleEliminationBracket,
  DoubleEliminationBracket,
} from "./engine/tournament";
import PairingTicket from "./components/PairingTicket";
import StandingsTable from "./components/StandingsTable";
import BracketView, { nameOf } from "./components/BracketView";

type Mode = "swiss" | "single" | "double";

const MODE_TABS: [Mode, string][] = [["swiss", "Swiss"], ["single", "Single Elim"], ["double", "Double Elim"]];
const SLOTS = ["p1Id", "p2Id"] as const;

function singleRoundLabels(n: number): string[] {
  const labels: string[] = [];
  for (let r = n; r >= 1; r--) labels.push(r === 1 ? "Final" : r === 2 ? "Semifinal" : `Round of ${Math.pow(2, r)}`);
  return labels;
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<Mode>("swiss");

  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [round, setRound] = useState(0);
  const [roundCount, setRoundCount] = useState(3);
  const [eventFinished, setEventFinished] = useState(false);

  const [singleBracket, setSingleBracket] = useState<SingleEliminationBracket | null>(null);
  const [doubleBracket, setDoubleBracket] = useState<DoubleEliminationBracket | null>(null);

  const playerMap = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const recommendedRounds = Math.max(3, Math.ceil(Math.log2(Math.max(players.length, 2))));

  const addPlayer = () => {
    const name = newName.trim();
    if (!name) return;
    setPlayers((ps) => [...ps, { id: `p-${Math.random().toString(36).slice(2, 9)}`, name, seed: ps.length + 1 }]);
    setNewName("");
  };
  const removePlayer = (id: string) => setPlayers((ps) => ps.filter((p) => p.id !== id));

  const roundMatches = matches.filter((m) => m.round === round);
  const roundComplete = round > 0 && roundMatches.every((m) => m.isBye || m.result);

  const startRound = () => {
    const nextRound = round + 1;
    const { pairings, byePlayerId } = generateSwissPairings(players, matches, nextRound);
    const newMatches: SwissMatch[] = pairings.map((p) => ({ ...p, round: nextRound, result: null, p1Games: 0, p2Games: 0 }));
    if (byePlayerId) newMatches.push({ isBye: true, p1Id: byePlayerId, round: nextRound });
    setMatches((m) => [...m, ...newMatches]);
    setRound(nextRound);
  };

  const finishEvent = () => setEventFinished(true);
  const resetEvent = () => {
    setMatches([]);
    setRound(0);
    setEventFinished(false);
  };

  const reportSwiss = (targetMatch: SwissMatch, patch: Partial<SwissMatch>) => {
    setMatches((all) => all.map((m) => (m === targetMatch ? { ...m, ...patch } : m)));
  };

  const standings = useMemo(() => computeStandings(players, matches), [players, matches]);

  const genSingle = () => setSingleBracket(createSingleEliminationBracket(players));
  const genDouble = () => setDoubleBracket(createDoubleEliminationBracket(players));

  const reportSingle = useCallback((matchId: string, winnerId: string) => {
    setSingleBracket((b) => (b ? reportSingleEliminationResult(b, matchId, winnerId) : b));
  }, []);
  const reportDouble = useCallback((matchId: string, winnerId: string) => {
    setDoubleBracket((b) => (b ? reportDoubleEliminationResult(b, matchId, winnerId) : b));
  }, []);

  return (
    <div className="tk-root">
      <div className="tk-header">
        <div className="tk-title">
          Event System
          <small>Pairing &amp; bracket engine — reference implementation</small>
        </div>
        <div className="tk-tabs">
          {MODE_TABS.map(([k, label]) => (
            <button key={k} className={`tk-tab ${mode === k ? "active" : ""}`} onClick={() => setMode(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tk-layout">
        <div className="tk-panel">
          <h3>Roster · {players.length}</h3>
          {players.map((p, i) => (
            <div className="tk-roster-row" key={p.id}>
              <span className="tk-seed">{i + 1}</span>
              <input
                value={p.name}
                onChange={(e) => setPlayers((ps) => ps.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))}
              />
              <button className="tk-x" onClick={() => removePlayer(p.id)}>
                ×
              </button>
            </div>
          ))}
          <div className="tk-add">
            <input
              placeholder="Add player…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            />
            <button className="tk-btn" onClick={addPlayer}>
              Add
            </button>
          </div>
          {mode === "swiss" && (
            <div className="tk-rounds-setting">
              <label htmlFor="tk-round-count">Rounds</label>
              <input
                id="tk-round-count"
                type="number"
                min={1}
                value={roundCount}
                disabled={round > 0 || eventFinished}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 1) setRoundCount(v);
                }}
              />
              <span className="tk-hint">suggested {recommendedRounds}</span>
            </div>
          )}
        </div>

        <div>
          {mode === "swiss" && (
            <div className="tk-panel">
              {eventFinished ? (
                <>
                  <div className="tk-roundbar">
                    <div className="tk-roundlabel">Event complete</div>
                    <button className="tk-btn ghost" onClick={resetEvent}>
                      New event
                    </button>
                  </div>
                  <div className="tk-champion">
                    🏆 <b className="tk-gold">{standings[0]?.name ?? "—"}</b> wins the event
                  </div>
                  <h3 className="tk-section-title">Final Standings</h3>
                  <StandingsTable rows={standings} />
                </>
              ) : (
                <>
                  <div className="tk-roundbar">
                    <div className="tk-roundlabel">
                      {round === 0 ? (
                        "Not started"
                      ) : (
                        <>
                          Round <span className="tk-gold">{round}</span> of {roundCount}
                        </>
                      )}
                    </div>
                    {(() => {
                      if (round === 0)
                        return (
                          <button className="tk-btn" disabled={players.length < 2} onClick={startRound}>
                            Start Round 1
                          </button>
                        );
                      if (!roundComplete) return <span className="tk-hint">Report all results to continue</span>;
                      if (round < roundCount)
                        return (
                          <button className="tk-btn" onClick={startRound}>
                            Start Round {round + 1}
                          </button>
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
                      Add players, then start round 1. Pairings are randomized for round 1, and score-based (no repeat
                      matchups where possible) after that.
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
                      />
                    ))}
                  {roundMatches
                    .filter((m) => m.isBye)
                    .map((m, i) => (
                      <div className="tk-bye" key={`bye-${i}`}>
                        {playerMap[m.p1Id]?.name} receives the bye this round (counted as a win).
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

          {mode === "single" && (
            <div className="tk-panel">
              {!singleBracket ? (
                <>
                  <button className="tk-btn" disabled={players.length < 2} onClick={genSingle}>
                    Generate Bracket
                  </button>
                  <div className="tk-empty tk-empty--spaced">
                    Seeded by roster order above (player 1 = top seed). Byes go to the top seeds if the field isn't a power
                    of two.
                  </div>
                </>
              ) : (
                <>
                  <button className="tk-btn ghost tk-reseed" onClick={genSingle}>
                    Re-seed &amp; restart
                  </button>
                  <BracketView
                    rounds={singleBracket.rounds}
                    roundLabels={singleRoundLabels(singleBracket.totalRounds)}
                    playerMap={playerMap}
                    onReport={reportSingle}
                  />
                </>
              )}
            </div>
          )}

          {mode === "double" && (
            <div className="tk-panel">
              {!doubleBracket ? (
                <>
                  <button className="tk-btn" disabled={players.length < 2} onClick={genDouble}>
                    Generate Bracket
                  </button>
                  <div className="tk-empty tk-empty--spaced">
                    Lose in the winners' bracket and you drop to the losers' bracket. Lose twice and you're out.
                  </div>
                </>
              ) : (
                <>
                  <button className="tk-btn ghost tk-reseed" onClick={genDouble}>
                    Re-seed &amp; restart
                  </button>
                  <h3 className="tk-section-title">Winners' Bracket</h3>
                  <BracketView
                    rounds={doubleBracket.wbRounds}
                    roundLabels={singleRoundLabels(doubleBracket.wbRounds.length)}
                    playerMap={playerMap}
                    onReport={reportDouble}
                  />

                  <h3 className="tk-section-title">Losers' Bracket</h3>
                  <div className="tk-lbwrap">
                    {doubleBracket.lbRounds.map((lbRound, ri) => (
                      <div className="tk-lbcol" key={ri}>
                        <div className="tk-bcol-label">LB {ri + 1}</div>
                        {lbRound.matches.map((m) => (
                          <div className="tk-bmatch tk-bmatch--static" key={m.id}>
                            {SLOTS.map((slot) => {
                              const pid = m[slot];
                              const isWinner = !!m.winnerId && m.winnerId === pid;
                              const canClick = pid && m.p1Id && m.p2Id && !m.winnerId;
                              return (
                                <div
                                  key={slot}
                                  className={`tk-bslot ${isWinner ? "winner" : ""} ${!pid ? "empty" : ""}`}
                                  onClick={() => canClick && pid && reportDouble(m.id, pid)}
                                >
                                  <span>{nameOf(playerMap, pid)}</span>
                                  {isWinner && <span className="tk-bwin">W</span>}
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
                        const isWinner = doubleBracket.grandFinal.winnerId === pid;
                        const canClick = pid && doubleBracket.grandFinal.p1Id && doubleBracket.grandFinal.p2Id && !doubleBracket.grandFinal.winnerId;
                        return (
                          <div
                            key={slot}
                            className={`tk-bslot ${isWinner ? "winner" : ""} ${!pid ? "empty" : ""}`}
                            onClick={() => canClick && pid && reportDouble("GF", pid)}
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
                          const isWinner = doubleBracket.grandFinalReset.winnerId === pid;
                          const canClick =
                            pid && doubleBracket.grandFinalReset.p1Id && doubleBracket.grandFinalReset.p2Id && !doubleBracket.grandFinalReset.winnerId;
                          return (
                            <div
                              key={slot}
                              className={`tk-bslot ${isWinner ? "winner" : ""} ${!pid ? "empty" : ""}`}
                              onClick={() => canClick && pid && reportDouble("GF2", pid)}
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
    </div>
  );
}
