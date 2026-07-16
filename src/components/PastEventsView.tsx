import { useEffect, useState } from 'react';
import { computeStandings } from '../engine/tournament';
import { listArchivedEvents } from '../lib/eventStore';
import type { ArchivedEventSummary } from '../lib/eventStore';
import StandingsTable from './StandingsTable';
import EventPhotos from './EventPhotos';

interface PastEventsViewProps {
  onBack: () => void;
  isAdmin: boolean;
}

export default function PastEventsView({
  onBack,
  isAdmin,
}: PastEventsViewProps) {
  const [archived, setArchived] = useState<ArchivedEventSummary[]>([]);
  const [viewingArchive, setViewingArchive] =
    useState<ArchivedEventSummary | null>(null);

  useEffect(() => {
    listArchivedEvents()
      .then(setArchived)
      .catch((e) => console.error('Failed to list events', e));
  }, []);

  return (
    <div className="tk-panel">
      <div className="tk-roundbar">
        <div className="tk-roundlabel">Past events</div>
        <button className="tk-btn ghost" onClick={onBack}>
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
          {viewingArchive.state.eventFinished ? (
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
          ) : (
            <div className="tk-champion">
              <span className="tk-error">Cancelled</span> —{' '}
              {viewingArchive.name}
            </div>
          )}
          <h3 className="tk-section-title">
            {viewingArchive.state.eventFinished
              ? 'Final Standings'
              : 'Standings at cancellation'}
          </h3>
          <StandingsTable
            rows={computeStandings(
              viewingArchive.state.players,
              viewingArchive.state.matches,
            )}
          />
          <h3 className="tk-section-title">Photos</h3>
          <EventPhotos eventId={viewingArchive.id} isAdmin={isAdmin} />
        </>
      ) : archived.length === 0 ? (
        <div className="tk-empty tk-empty--spaced">
          No archived events yet. Finish an event and start a new one, and it'll
          show up here.
        </div>
      ) : (
        <div className="tk-archive-list">
          {archived.map((ev) => {
            const st = computeStandings(ev.state.players, ev.state.matches);
            const champion = !ev.state.eventFinished
              ? 'cancelled'
              : st[0]
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
  );
}
