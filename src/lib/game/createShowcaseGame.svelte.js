import { createNeutralGame } from './createNeutralGame.js';
import { createShowcaseActions } from './showcase/actions.js';
import { createShowcaseDecks } from './showcase/cards.js';
import { createShowcaseDice } from './showcase/dice.js';
import { createShowcasePlayers } from './showcase/players.js';
import { createShowcaseRules } from './showcase/rules.js';
import { configureShowcaseSquares } from './showcase/squares.js';

// An interactive fixture built from the same public objects, commands, and hooks
// that contributors use in the real game.
export function createShowcaseGame() {
  const game = createNeutralGame();
  game.stats = { worldMood: 'mildly chaotic', visits: 42 };

  const squares = configureShowcaseSquares(game);
  const { curiosityDeck, campusDeck } = createShowcaseDecks(squares);
  const dice = createShowcaseDice();
  const { players, spoon } = createShowcasePlayers();
  const { observer, rules } = createShowcaseRules();
  const actions = createShowcaseActions({ squares, curiosityDeck, campusDeck, spoon });

  async function populate() {
    await game.addDeck(curiosityDeck);
    await game.addDeck(campusDeck);
    for (const die of dice) await game.addDie(die);
    for (const rule of rules) await game.addRule(rule);
    for (const action of actions) await game.addAction(action);
    for (const player of players) await game.addPlayer(player);

    // Keep a populated discard pile without consuming the first interactive card.
    const discarded = await campusDeck.draw(null);
    await campusDeck.discard(discarded, null);
    await game.logEvent('Showcase ready. Start the game to try the example actions.', 'system');
  }

  return { game, players, curiosityDeck, campusDeck, observer, populate };
}
