import { useEffect, useState } from 'react';
import { computeStandings } from '../engine/tournament';
import { listArchivedEvents, saveEvent } from '../lib/eventStore';
import type { ArchivedEventSummary } from '../lib/eventStore';
import StandingsTable from './StandingsTable';
import EventPhotos from './EventPhotos';
import DeckEditModal from './DeckEditModal';

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
  const [editingDeckPlayerId, setEditingDeckPlayerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    listArchivedEvents()
      .then(setArchived)
      .catch((e) => console.error('Failed to list events', e));
  }, []);

  const editingDeckPlayer =
    viewingArchive?.state.players.find((p) => p.id === editingDeckPlayerId) ??
    null;

  async function handleSaveDeck(
    deckPokemon1: string | null,
    deckPokemon2: string | null,
  ) {
    if (!viewingArchive || !editingDeckPlayerId) return;
    const players = viewingArchive.state.players.map((p) =>
      p.id === editingDeckPlayerId
        ? {
            ...p,
            deckPokemon1: deckPokemon1 ?? undefined,
            deckPokemon2: deckPokemon2 ?? undefined,
          }
        : p,
    );
    const updated: ArchivedEventSummary = {
      ...viewingArchive,
      state: { ...viewingArchive.state, players },
    };
    // Optimistically reflect the change, then persist.
    setViewingArchive(updated);
    setArchived((prev) =>
      prev.map((ev) => (ev.id === updated.id ? updated : ev)),
    );
    setEditingDeckPlayerId(null);
    try {
      await saveEvent(updated.id, updated.name, updated.state);
    } catch (e) {
      console.error('Failed to save deck', e);
      // Revert to the server's truth if the write failed.
      listArchivedEvents()
        .then((rows) => {
          setArchived(rows);
          setViewingArchive(
            (cur) => rows.find((r) => r.id === cur?.id) ?? null,
          );
        })
        .catch((err) => console.error('Failed to reload events', err));
    }
  }

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
            playerMap={Object.fromEntries(
              viewingArchive.state.players.map((p) => [p.id, p]),
            )}
            onEditDeck={isAdmin ? setEditingDeckPlayerId : undefined}
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
                  {new Date(ev.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
      {editingDeckPlayer && viewingArchive && (
        <DeckEditModal
          key={editingDeckPlayer.id}
          open
          onClose={() => setEditingDeckPlayerId(null)}
          eventName={viewingArchive.name}
          player={editingDeckPlayer}
          onSave={handleSaveDeck}
        />
      )}
    </div>
  );
}
