import type { Player, SingleEliminationBracket } from '../engine/tournament';
import { singleRoundLabels } from '../lib/bracketLabels';
import BracketView from './BracketView';

interface SingleElimPanelProps {
  isAdmin: boolean;
  playersCount: number;
  playerMap: Record<string, Player>;
  bracket: SingleEliminationBracket | null;
  onGenerate: () => void;
  onReport: (matchId: string, winnerId: string) => void;
}

export default function SingleElimPanel({
  isAdmin,
  playersCount,
  playerMap,
  bracket,
  onGenerate,
  onReport,
}: SingleElimPanelProps) {
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
              Seeded by roster order above (player 1 = top seed). Byes go to the
              top seeds if the field isn't a power of two.
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
      <BracketView
        rounds={bracket.rounds}
        roundLabels={singleRoundLabels(bracket.totalRounds)}
        playerMap={playerMap}
        onReport={onReport}
        readOnly={!isAdmin}
      />
    </div>
  );
}
