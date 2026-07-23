import { useState } from 'react';
import type { Player, StandingRow } from '../engine/tournament';
import { getPokemon, pokemonSpriteUrl } from '../lib/pokemon';
import PlayerPerformanceModal from './PlayerPerformanceModal';

interface StandingsTableProps {
  rows: StandingRow[];
  playerMap: Record<string, Player>;
  /** When provided, the performance modal offers an "Edit deck" button. */
  onEditDeck?: (playerId: string) => void;
}

export default function StandingsTable({
  rows,
  playerMap,
  onEditDeck,
}: StandingsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRow = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="tk-table-scroll">
      <table className="tk-standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Pts</th>
            <th>W-D-L</th>
            <th className="tk-col-tb">OMW%</th>
            <th className="tk-col-tb">GW%</th>
            <th className="tk-col-tb">OGW%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const player = playerMap[r.id];
            const deck1 = getPokemon(player?.deckPokemon1);
            const deck2 = getPokemon(player?.deckPokemon2);
            return (
              <tr
                key={r.id}
                className="tk-standings-row--expandable"
                onClick={() => setSelectedId(r.id)}
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
                  <span className="tk-standings-caret"> ›</span>
                </td>
                <td className="tk-num">{r.points}</td>
                <td className="tk-num">
                  {r.wins}-{r.draws}-{r.losses}
                </td>
                <td className="tk-num tk-col-tb">{(r.omw * 100).toFixed(1)}</td>
                <td className="tk-num tk-col-tb">{(r.gw * 100).toFixed(1)}</td>
                <td className="tk-num tk-col-tb">{(r.ogw * 100).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {selectedRow && (
        <PlayerPerformanceModal
          key={selectedRow.id}
          onClose={() => setSelectedId(null)}
          row={selectedRow}
          playerMap={playerMap}
          onEditDeck={
            onEditDeck
              ? () => {
                  // Hand off to the deck editor so the two modals never stack.
                  setSelectedId(null);
                  onEditDeck(selectedRow.id);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
