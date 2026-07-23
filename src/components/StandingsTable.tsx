import { Fragment, useState } from 'react';
import type { Player, StandingRow } from '../engine/tournament';
import { getPokemon, pokemonSpriteUrl } from '../lib/pokemon';

interface StandingsTableProps {
  rows: StandingRow[];
  playerMap: Record<string, Player>;
  /** When provided, renders a "Deck" edit button beside each player's name. */
  onEditDeck?: (playerId: string) => void;
}

export default function StandingsTable({
  rows,
  playerMap,
  onEditDeck,
}: StandingsTableProps) {
  const [showTiebreakers, setShowTiebreakers] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="tk-table-scroll">
      <div className="tk-standings-toolbar">
        <button
          type="button"
          className="tk-standings-toggle"
          onClick={() => setShowTiebreakers((v) => !v)}
        >
          {showTiebreakers
            ? 'Hide tiebreakers ▴'
            : 'Show tiebreakers (OMW% / GW% / OGW%) ▾'}
        </button>
      </div>
      <table
        className={
          showTiebreakers
            ? 'tk-standings'
            : 'tk-standings tk-standings--compact'
        }
      >
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Pts</th>
            <th>W-D-L</th>
            {showTiebreakers && (
              <>
                <th>OMW%</th>
                <th>GW%</th>
                <th>OGW%</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const player = playerMap[r.id];
            const deck1 = getPokemon(player?.deckPokemon1);
            const deck2 = getPokemon(player?.deckPokemon2);
            const isExpanded = showTiebreakers && expandedId === r.id;
            return (
              <Fragment key={r.id}>
                <tr
                  className={
                    showTiebreakers ? 'tk-standings-row--expandable' : undefined
                  }
                  onClick={
                    showTiebreakers
                      ? () =>
                          setExpandedId((cur) => (cur === r.id ? null : r.id))
                      : undefined
                  }
                >
                  <td className="tk-num">{i + 1}</td>
                  <td>
                    <span className="tk-deck-sprites">
                      {deck1 && (
                        <img
                          className="tk-deck-sprite-mini"
                          src={pokemonSpriteUrl(deck1)}
                          alt={deck1.name}
                          loading="lazy"
                        />
                      )}
                      {deck2 && (
                        <img
                          className="tk-deck-sprite-mini"
                          src={pokemonSpriteUrl(deck2)}
                          alt={deck2.name}
                          loading="lazy"
                        />
                      )}
                    </span>
                    {r.name}
                    {onEditDeck && (
                      <button
                        className="tk-btn ghost tk-btn--sm tk-standings-deck-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDeck(r.id);
                        }}
                      >
                        Deck
                      </button>
                    )}
                    {showTiebreakers && (
                      <span className="tk-standings-caret">
                        {isExpanded ? ' ▴' : ' ▾'}
                      </span>
                    )}
                  </td>
                  <td className="tk-num">{r.points}</td>
                  <td className="tk-num">
                    {r.wins}-{r.draws}-{r.losses}
                  </td>
                  {showTiebreakers && (
                    <>
                      <td className="tk-num">{(r.omw * 100).toFixed(1)}</td>
                      <td className="tk-num">{(r.gw * 100).toFixed(1)}</td>
                      <td className="tk-num">{(r.ogw * 100).toFixed(1)}</td>
                    </>
                  )}
                </tr>
                {isExpanded && (
                  <tr className="tk-standings-detail-row">
                    <td colSpan={7}>
                      {r.opponents.length === 0 ? (
                        <div className="tk-standings-detail">
                          No opponents played yet.
                        </div>
                      ) : (
                        <table className="tk-standings-detail">
                          <thead>
                            <tr>
                              <th>Opponent</th>
                              <th>Opponent MW%</th>
                              <th>Opponent GW%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.opponents.map((o, oi) => (
                              <tr key={`${o.id}-${oi}`}>
                                <td>{playerMap[o.id]?.name ?? 'Unknown'}</td>
                                <td className="tk-num">
                                  {(o.mw * 100).toFixed(1)}
                                </td>
                                <td className="tk-num">
                                  {(o.gw * 100).toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
