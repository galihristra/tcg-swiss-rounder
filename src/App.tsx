import { useState } from 'react';
import { useAdminSession } from './hooks/useAdminSession';
import { useEventState } from './hooks/useEventState';
import type { Mode } from './lib/eventStore';
import AdminLogin from './components/AdminLogin';
import EventSidebar from './components/EventSidebar';
import SwissPanel from './components/SwissPanel';
import SingleElimPanel from './components/SingleElimPanel';
import DoubleElimPanel from './components/DoubleElimPanel';
import PastEventsView from './components/PastEventsView';

const MODE_TABS: [Mode, string][] = [
  ['swiss', 'Swiss'],
  ['single', 'Single Elim'],
  ['double', 'Double Elim'],
];

type View = 'event' | 'archive';

export default function App() {
  const { session, isAdmin } = useAdminSession();
  const ev = useEventState();

  const [view, setView] = useState<View>('event');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const confirmCancelEvent = async () => {
    await ev.resetEvent();
    setShowCancelConfirm(false);
  };

  if (ev.loading) {
    return (
      <div className="tk-root">
        <div className="tk-loading">Loading event…</div>
      </div>
    );
  }

  if (ev.loadError) {
    return (
      <div className="tk-root">
        <div className="tk-empty">
          Couldn't connect to the database: {ev.loadError}
          <br />
          Check the values in <b>.env.local</b> and that the <b>events</b> table
          exists (run <b>supabase/schema.sql</b>).
        </div>
      </div>
    );
  }

  return (
    <div className="tk-root">
      <div className="tk-header">
        <div className="tk-title">
          Event System
          <small>Pairing &amp; bracket engine — reference implementation</small>
        </div>
        <div className="tk-headright">
          <div className="tk-tabs">
            {MODE_TABS.map(([k, label]) => (
              <button
                key={k}
                className={`tk-tab ${view === 'event' && ev.mode === k ? 'active' : ''}`}
                onClick={() => {
                  ev.setMode(k);
                  setView('event');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className={`tk-btn ghost ${view === 'archive' ? 'active' : ''}`}
            onClick={() => setView('archive')}
          >
            Past events
          </button>
          <AdminLogin isAdmin={isAdmin} userSession={session} />
        </div>
      </div>

      {view === 'archive' ? (
        <PastEventsView onBack={() => setView('event')} isAdmin={isAdmin} />
      ) : (
        <div className="tk-layout">
          <EventSidebar
            isAdmin={isAdmin}
            eventName={ev.eventName}
            onEventNameChange={ev.setEventName}
            saveLabel={ev.saveLabel}
            players={ev.players}
            onRenamePlayer={ev.renamePlayer}
            onRemovePlayer={ev.removePlayer}
            onAddPlayer={ev.addPlayer}
            rosterLocked={ev.rosterLocked}
            mode={ev.mode}
            roundsInput={ev.roundsInput}
            onRoundsInputChange={ev.setRoundsInput}
            roundsValid={ev.roundsValid}
            recommendedRounds={ev.recommendedRounds}
            round={ev.round}
            eventFinished={ev.eventFinished}
            onCancelEventClick={() => setShowCancelConfirm(true)}
          />

          <div>
            {ev.mode === 'swiss' && (
              <SwissPanel
                isAdmin={isAdmin}
                eventFinished={ev.eventFinished}
                round={ev.round}
                roundCount={ev.roundCount}
                roundComplete={ev.roundComplete}
                matches={ev.matches}
                playerMap={ev.playerMap}
                standings={ev.standings}
                playersCount={ev.players.length}
                roundsValid={ev.roundsValid}
                onStartRound={ev.startRound}
                onFinishEvent={ev.finishEvent}
                onNewEvent={ev.resetEvent}
                onReportSwiss={ev.reportSwiss}
              />
            )}

            {ev.mode === 'single' && (
              <SingleElimPanel
                isAdmin={isAdmin}
                playersCount={ev.players.length}
                playerMap={ev.playerMap}
                bracket={ev.singleBracket}
                onGenerate={ev.genSingle}
                onReport={ev.reportSingle}
              />
            )}

            {ev.mode === 'double' && (
              <DoubleElimPanel
                isAdmin={isAdmin}
                playersCount={ev.players.length}
                playerMap={ev.playerMap}
                bracket={ev.doubleBracket}
                onGenerate={ev.genDouble}
                onReport={ev.reportDouble}
              />
            )}
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div
          className="tk-modal-backdrop"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div className="tk-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="tk-section-title">Cancel this event?</h3>
            <p className="tk-hint">
              "{ev.eventName}" will move to Past events and a new event will
              start. This can't be undone.
            </p>
            <div className="tk-modal-actions">
              <button
                className="tk-btn ghost"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep event
              </button>
              <button className="tk-btn-danger" onClick={confirmCancelEvent}>
                Cancel event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
