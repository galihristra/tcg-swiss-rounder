import type { Player, StandingRow } from '../engine/tournament';
import { getPokemon, pokemonSpriteUrl } from '../lib/pokemon';

interface StandingsTableProps {
  rows: StandingRow[];
  playerMap: Record<string, Player>;
}

export default function StandingsTable({
  rows,
  playerMap,
}: StandingsTableProps) {
  return (
    <div className="tk-table-scroll">
      <table className="tk-standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Pts</th>
            <th>W-D-L</th>
            <th>OMW%</th>
            <th>GW%</th>
            <th>OGW%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const player = playerMap[r.id];
            const deck1 = getPokemon(player?.deckPokemon1);
            const deck2 = getPokemon(player?.deckPokemon2);
            return (
              <tr key={r.id}>
                <td className="tk-num">{i + 1}</td>
                <td>
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
                  {r.name}
                </td>
                <td className="tk-num">{r.points}</td>
                <td className="tk-num">
                  {r.wins}-{r.draws}-{r.losses}
                </td>
                <td className="tk-num">{(r.omw * 100).toFixed(1)}</td>
                <td className="tk-num">{(r.gw * 100).toFixed(1)}</td>
                <td className="tk-num">{(r.ogw * 100).toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
