import type { Player, StandingRow, SwissMatch } from '../engine/tournament';
import PairingTicket from './PairingTicket';
import StandingsTable from './StandingsTable';

interface SwissPanelProps {
  isAdmin: boolean;
  eventFinished: boolean;
  round: number;
  roundCount: number;
  roundComplete: boolean;
  matches: SwissMatch[];
  playerMap: Record<string, Player>;
  standings: StandingRow[];
  playersCount: number;
  roundsValid: boolean;
  onStartRound: () => void;
  onFinishEvent: () => void;
  onNewEvent: () => void;
  onReportSwiss: (match: SwissMatch, patch: Partial<SwissMatch>) => void;
}

export default function SwissPanel({
  isAdmin,
  eventFinished,
  round,
  roundCount,
  roundComplete,
  matches,
  playerMap,
  standings,
  playersCount,
  roundsValid,
  onStartRound,
  onFinishEvent,
  onNewEvent,
  onReportSwiss,
}: SwissPanelProps) {
  if (eventFinished) {
    return (
      <div className="tk-panel">
        <div className="tk-roundbar">
          <div className="tk-roundlabel">Event complete</div>
          {isAdmin && (
            <button className="tk-btn ghost" onClick={onNewEvent}>
              New event
            </button>
          )}
        </div>
        <div className="tk-champion">
          🏆 <b className="tk-gold">{standings[0]?.name ?? '—'}</b> wins the
          event
        </div>
        <h3 className="tk-section-title">Final Standings</h3>
        <StandingsTable rows={standings} />
      </div>
    );
  }

  const roundMatches = matches.filter((m) => m.round === round);

  return (
    <div className="tk-panel">
      <div className="tk-roundbar">
        <div className="tk-roundlabel">
          {round === 0 ? (
            'Not started'
          ) : (
            <>
              Round <span className="tk-gold">{round}</span> of {roundCount}
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
                disabled={playersCount < 2 || !roundsValid}
                onClick={onStartRound}
              >
                Start Round 1
              </button>
            );
          }
          if (!roundComplete)
            return (
              <span className="tk-hint">Report all results to continue</span>
            );
          if (round < roundCount) {
            if (!isAdmin)
              return (
                <span className="tk-hint">
                  Waiting for organizer to start round {round + 1}
                </span>
              );
            return (
              <button className="tk-btn" onClick={onStartRound}>
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
            <button className="tk-btn" onClick={onFinishEvent}>
              Finish event
            </button>
          );
        })()}
      </div>

      {round === 0 && (
        <div className="tk-empty">
          Add players, then start round 1. Pairings are randomized for round 1,
          and score-based (no repeat matchups where possible) after that.
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
            onReport={(patch) => onReportSwiss(m, patch)}
            readOnly={!isAdmin}
          />
        ))}
      {roundMatches
        .filter((m) => m.isBye)
        .map((m, i) => (
          <div className="tk-bye" key={`bye-${i}`}>
            {playerMap[m.p1Id]?.name} receives the bye this round (counted as a
            win).
          </div>
        ))}

      {matches.length > 0 && (
        <div className="tk-standings-block">
          <h3 className="tk-section-title">Standings</h3>
          <StandingsTable rows={standings} />
        </div>
      )}
    </div>
  );
}
