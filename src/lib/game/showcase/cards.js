import { Card } from '../../engine/Card.svelte.js';
import { Deck } from '../../engine/Deck.svelte.js';

export function createShowcaseDecks({ portal }) {
  const cabbageCard = new Card({ id: 'cabbage-card', name: 'Cabbage Rain', description: 'Drawing and playing grant cabbages; discarding updates this card.', icon: '🥬', stats: { rarity: 'common', cabbages: 3 } });
  cabbageCard.onDraw = async (game, player) => {
    await player?.incrementStat('cabbages');
    await game.logEvent(`${player?.name ?? 'Someone'} drew Cabbage Rain (+1 cabbage).`, 'card-hook');
  };
  cabbageCard.onPlay = async (game, player) => {
    await player?.incrementStat('cabbages', 3);
    await game.logEvent(`${player?.name ?? 'Someone'} played Cabbage Rain (+3 cabbages).`, 'card-hook');
  };
  cabbageCard.onDiscard = async (game) => {
    await cabbageCard.incrementStat('discardCount');
    await game.logEvent('Cabbage Rain recorded its discard.', 'card-hook');
  };

  const mirrorCard = new Card({ id: 'mirror-card', name: 'Mirror Maze', description: 'Playing jumps to the Mystery Portal.', stats: { turns: 2, reusable: false } });
  mirrorCard.onPlay = (_game, player) => player?.moveTo(portal.position);
  const plainCard = new Card({ id: 'blank-card', name: 'Plain Card' });
  const curiosityDeck = new Deck({ id: 'curiosity', name: 'Curiosity Cards', stats: { theme: 'unpredictable', rarity: 2 }, cards: [cabbageCard, mirrorCard, plainCard] });

  const libraryCard = new Card({ id: 'library-card', name: 'Library Shortcut', description: 'Playing walks four squares.', icon: '📚', stats: { distance: 4 } });
  libraryCard.onPlay = (_game, player) => player?.move(4);
  const penguinCard = new Card({ id: 'penguin-card', name: 'Penguin Parade', description: 'Playing adds a penguin counter to the player.', stats: { penguins: 8 } });
  penguinCard.onPlay = (_game, player) => player?.incrementStat('penguins', 8);
  const campusDeck = new Deck({ id: 'campus', name: 'Campus Encounters', stats: { edition: 'open day' }, cards: [libraryCard, penguinCard] });

  return { curiosityDeck, campusDeck };
}
