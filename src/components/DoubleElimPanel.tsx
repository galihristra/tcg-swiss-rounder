import type { Player, DoubleEliminationBracket } from '../engine/tournament';
import { singleRoundLabels } from '../lib/bracketLabels';
import BracketView from './BracketView';
import { nameOf } from '../lib/bracketHelpers';

const SLOTS = ['p1Id', 'p2Id'] as const;

interface BracketSlotProps {
  pid: string | null;
  isWinner: boolean;
  canClick: boolean;
  playerMap: Record<string, Player>;
  onClick: () => void;
}

function BracketSlot({
  pid,
  isWinner,
  canClick,
  playerMap,
  onClick,
}: BracketSlotProps) {
  return (
    <div
      className={`tk-bslot ${isWinner ? 'winner' : ''} ${!pid ? 'empty' : ''}`}
      onClick={() => canClick && onClick()}
    >
      <span>{nameOf(playerMap, pid)}</span>
      {isWinner && <span className="tk-bwin">W</span>}
    </div>
  );
}

interface DoubleElimPanelProps {
  isAdmin: boolean;
  playersCount: number;
  playerMap: Record<string, Player>;
  bracket: DoubleEliminationBracket | null;
  onGenerate: () => void;
  onReport: (matchId: string, winnerId: string) => void;
}

export default function DoubleElimPanel({
  isAdmin,
  playersCount,
  playerMap,
  bracket,
  onGenerate,
  onReport,
}: DoubleElimPanelProps) {
  if (!bracket) {
    return (
      <div className="tk-panel">
        {isAdmin ? (
          <>
            <button
              className="tk-btn"
              disabled={playersCount < 2}
              onClick={onGenerate}
            >
              Generate Bracket
            </button>
            <div className="tk-empty tk-empty--spaced">
              Lose in the winners' bracket and you drop to the losers' bracket.
              Lose twice and you're out.
            </div>
          </>
        ) : (
          <div className="tk-empty">
            Waiting for organizer to generate the bracket.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tk-panel">
      {isAdmin && (
        <button className="tk-btn ghost tk-reseed" onClick={onGenerate}>
          Re-seed &amp; restart
        </button>
      )}
      <h3 className="tk-section-title">Winners' Bracket</h3>
      <BracketView
        rounds={bracket.wbRounds}
        roundLabels={singleRoundLabels(bracket.wbRounds.length)}
        playerMap={playerMap}
        onReport={onReport}
        readOnly={!isAdmin}
      />

      <h3 className="tk-section-title">Losers' Bracket</h3>
      <div className="tk-lbwrap">
        {bracket.lbRounds.map((lbRound, ri) => (
          <div className="tk-lbcol" key={ri}>
            <div className="tk-bcol-label">LB {ri + 1}</div>
            {lbRound.matches.map((m) => (
              <div className="tk-bmatch tk-bmatch--static" key={m.id}>
                {SLOTS.map((slot) => {
                  const pid = m[slot];
                  const isWinner = !!m.winnerId && m.winnerId === pid;
                  const canClick =
                    isAdmin && !!(pid && m.p1Id && m.p2Id && !m.winnerId);
                  return (
                    <BracketSlot
                      key={slot}
                      pid={pid}
                      isWinner={isWinner}
                      canClick={canClick}
                      playerMap={playerMap}
                      onClick={() => pid && onReport(m.id, pid)}
                    />
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
            const pid = bracket.grandFinal[slot];
            const isWinner = bracket.grandFinal.winnerId === pid;
            const canClick =
              isAdmin &&
              !!(
                pid &&
                bracket.grandFinal.p1Id &&
                bracket.grandFinal.p2Id &&
                !bracket.grandFinal.winnerId
              );
            return (
              <BracketSlot
                key={slot}
                pid={pid}
                isWinner={isWinner}
                canClick={canClick}
                playerMap={playerMap}
                onClick={() => pid && onReport('GF', pid)}
              />
            );
          })}
        </div>
        {bracket.grandFinalReset.active && (
          <div className="tk-bmatch">
            <div className="tk-reset-label">BRACKET RESET</div>
            {SLOTS.map((slot) => {
              const pid = bracket.grandFinalReset[slot];
              const isWinner = bracket.grandFinalReset.winnerId === pid;
              const canClick =
                isAdmin &&
                !!(
                  pid &&
                  bracket.grandFinalReset.p1Id &&
                  bracket.grandFinalReset.p2Id &&
                  !bracket.grandFinalReset.winnerId
                );
              return (
                <BracketSlot
                  key={slot}
                  pid={pid}
                  isWinner={isWinner}
                  canClick={canClick}
                  playerMap={playerMap}
                  onClick={() => pid && onReport('GF2', pid)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
