import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { loadEventById } from '../lib/eventStore';
import type { ArchivedEventSummary, EventDetail } from '../lib/eventStore';
import ArchivedEventDetail from '../components/ArchivedEventDetail';

interface ArchivedEventPageProps {
  isAdmin: boolean;
}

// Clipboard while idle, check mark for the moment after a successful copy.
function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12.5 9 18 20 6"
      />
    </svg>
  );
}

/** One past event at its own shareable URL: `/event/<uuid>`. */
export default function ArchivedEventPage({ isAdmin }: ArchivedEventPageProps) {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    loadEventById(eventId)
      .then((rec) => {
        if (cancelled) return;
        setEvent(rec);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load event', e);
        setEvent(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // An optimistic deck edit hands back the updated event; a failed write hands
  // back null, meaning "re-read the server's truth".
  const handleEventChange = useCallback(
    (updated: ArchivedEventSummary | null) => {
      if (updated) {
        setEvent((cur) => (cur ? { ...cur, ...updated } : cur));
        return;
      }
      if (!eventId) return;
      loadEventById(eventId)
        .then(setEvent)
        .catch((e) => console.error('Failed to reload event', e));
    },
    [eventId],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  }

  if (loading) {
    return (
      <div className="tk-panel">
        <div className="tk-loading">Loading event…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="tk-panel">
        <div className="tk-empty tk-empty--spaced">
          Event not found. It may have been removed, or the link is incomplete.
        </div>
        <Link className="tk-btn ghost tk-reseed" to="/past-events">
          ← All events
        </Link>
      </div>
    );
  }

  // The live event belongs on the main screen — the archive layout would label
  // an unfinished event as cancelled.
  if (event.status === 'active') return <Navigate to="/" replace />;

  return (
    <div className="tk-panel">
      <div className="tk-roundbar">
        <div className="tk-roundlabel">Past event</div>
        <div className="tk-roundbar-actions">
          <button
            className={`tk-btn ghost tk-icon-btn ${copied ? 'is-copied' : ''}`}
            onClick={copyLink}
            title={copied ? 'Link copied' : 'Copy link'}
            aria-label={copied ? 'Link copied' : 'Copy link'}
          >
            {copied ? <CheckIcon /> : <ClipboardIcon />}
          </button>
          <Link className="tk-btn ghost" to="/past-events">
            ← All events
          </Link>
        </div>
      </div>
      <ArchivedEventDetail
        event={event}
        isAdmin={isAdmin}
        onEventChange={handleEventChange}
      />
    </div>
  );
}
