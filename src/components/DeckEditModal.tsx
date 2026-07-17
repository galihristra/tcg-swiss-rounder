import { useState } from 'react';
import type { Player } from '../engine/tournament';
import { getPokemon, pokemonSpriteUrl } from '../lib/pokemon';
import Modal from './Modal';
import PokemonCombobox from './PokemonCombobox';

interface DeckEditModalProps {
  open: boolean;
  onClose: () => void;
  eventName: string;
  player: Player;
  onSave: (deckPokemon1: string | null, deckPokemon2: string | null) => void;
}

export default function DeckEditModal({
  open,
  onClose,
  eventName,
  player,
  onSave,
}: DeckEditModalProps) {
  const [slot1, setSlot1] = useState<string | null>(
    player.deckPokemon1 ?? null,
  );
  const [slot2, setSlot2] = useState<string | null>(
    player.deckPokemon2 ?? null,
  );

  const renderSlot = (
    id: string | null,
    onPick: (id: string) => void,
    onClear: () => void,
    excludeId: string | null,
  ) => {
    const entry = getPokemon(id ?? undefined);
    if (entry) {
      return (
        <div className="tk-deck-chip">
          <img
            className="tk-deck-sprite"
            src={pokemonSpriteUrl(entry)}
            alt=""
            width={32}
            height={32}
          />
          <span>{entry.name.toLowerCase()}</span>
          <button
            className="tk-x"
            onClick={onClear}
            aria-label={`Remove ${entry.name}`}
          >
            ×
          </button>
        </div>
      );
    }
    return (
      <PokemonCombobox onChange={onPick} excludeId={excludeId ?? undefined} />
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit your deck for ${eventName}`}
      className="tk-modal--wide"
    >
      <div className="tk-deck-slots">
        {renderSlot(slot1, setSlot1, () => setSlot1(null), slot2)}
        {renderSlot(slot2, setSlot2, () => setSlot2(null), slot1)}
      </div>
      <button
        className="tk-btn tk-deck-save"
        onClick={() => onSave(slot1, slot2)}
      >
        Save
      </button>
    </Modal>
  );
}
