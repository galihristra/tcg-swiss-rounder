import React from "react";

export default function StandingsTable({ rows }) {
  return (
    <table className="tk-standings">
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Pts</th>
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
            <td className="tk-num">{(r.omw * 100).toFixed(1)}</td>
            <td className="tk-num">{(r.gw * 100).toFixed(1)}</td>
            <td className="tk-num">{(r.ogw * 100).toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
