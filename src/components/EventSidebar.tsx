import { useState } from 'react';
import type { Player } from '../engine/tournament';
import type { Mode } from '../lib/eventStore';
import { getPokemon, pokemonSpriteUrl } from '../lib/pokemon';

interface EventSidebarProps {
  isAdmin: boolean;
  eventName: string;
  onEventNameChange: (name: string) => void;
  saveLabel: string;
  players: Player[];
  onRenamePlayer: (id: string, name: string) => void;
  onRemovePlayer: (id: string) => void;
  onAddPlayer: (name: string) => void;
  onEditDeck: (id: string) => void;
  rosterLocked: boolean;
  mode: Mode;
  roundsInput: string;
  onRoundsInputChange: (value: string) => void;
  roundsValid: boolean;
  recommendedRounds: number;
  round: number;
  eventFinished: boolean;
  onCancelEventClick: () => void;
}

export default function EventSidebar({
  isAdmin,
  eventName,
  onEventNameChange,
  saveLabel,
  players,
  onRenamePlayer,
  onRemovePlayer,
  onAddPlayer,
  onEditDeck,
  rosterLocked,
  mode,
  roundsInput,
  onRoundsInputChange,
  roundsValid,
  recommendedRounds,
  round,
  eventFinished,
  onCancelEventClick,
}: EventSidebarProps) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddPlayer(newName);
    setNewName('');
  };

  return (
    <div className="tk-panel">
      <input
        className="tk-eventname"
        value={eventName}
        placeholder="Event name"
        disabled={!isAdmin}
        onChange={(e) => onEventNameChange(e.target.value)}
      />
      <div className="tk-savestatus tk-hint">{saveLabel}</div>
      <h3>Participants · {players.length}</h3>
      {players.map((p, i) => {
        const deck1 = getPokemon(p.deckPokemon1);
        const deck2 = getPokemon(p.deckPokemon2);
        return (
          <div className="tk-roster-row" key={p.id}>
            <span className="tk-seed">{i + 1}</span>
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
            <input
              value={p.name}
              disabled={!isAdmin}
              onChange={(e) => onRenamePlayer(p.id, e.target.value)}
            />
            {isAdmin && (
              <button
                className="tk-btn ghost tk-btn--sm"
                onClick={() => onEditDeck(p.id)}
              >
                Deck
              </button>
            )}
            {isAdmin && !rosterLocked && (
              <button className="tk-x" onClick={() => onRemovePlayer(p.id)}>
                ×
              </button>
            )}
          </div>
        );
      })}
      {isAdmin && (
        <div className="tk-add">
          <input
            placeholder="Add player…"
            value={newName}
            disabled={rosterLocked}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            className="tk-btn"
            disabled={rosterLocked}
            onClick={handleAdd}
          >
            Add
          </button>
        </div>
      )}
      {isAdmin && rosterLocked && (
        <p className="tk-suggest">
          Roster is locked while the event is running.
        </p>
      )}
      {!isAdmin && (
        <p className="tk-suggest">
          View-only — sign in as organizer to manage the participants.
        </p>
      )}
      {mode === 'swiss' && (
        <div className="tk-rounds-setting">
          <label htmlFor="tk-round-count">Rounds</label>
          <input
            id="tk-round-count"
            type="number"
            min={3}
            value={roundsInput}
            disabled={!isAdmin || round > 0 || eventFinished}
            onChange={(e) => onRoundsInputChange(e.target.value)}
          />
          <span className="tk-hint">
            {roundsValid ? `suggested ${recommendedRounds}` : 'min 3 rounds'}
          </span>
        </div>
      )}
      {isAdmin && round > 0 && !eventFinished && (
        <button
          className="tk-btn ghost tk-cancel-btn"
          onClick={onCancelEventClick}
        >
          Cancel event
        </button>
      )}
    </div>
  );
}
