import type { StandingRow } from "../engine/tournament";

interface StandingsTableProps {
  rows: StandingRow[];
}

export default function StandingsTable({ rows }: StandingsTableProps) {
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
        {rows.map((r, i) => (
          <tr key={r.id}>
            <td className="tk-num">{i + 1}</td>
            <td>{r.name}</td>
            <td className="tk-num">{r.points}</td>
            <td className="tk-num">{r.wins}-{r.draws}-{r.losses}</td>
            <td className="tk-num">{(r.omw * 100).toFixed(1)}</td>
            <td className="tk-num">{(r.gw * 100).toFixed(1)}</td>
            <td className="tk-num">{(r.ogw * 100).toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
