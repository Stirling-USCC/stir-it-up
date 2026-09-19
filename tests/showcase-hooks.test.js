import { describe, expect, it } from 'vitest';
import { createShowcaseGame } from '../src/lib/game/createShowcaseGame.svelte.js';

async function startedShowcase() {
  const showcase = createShowcaseGame();
  await showcase.populate();
  await showcase.game.startGame();
  return showcase;
}

async function perform(game, id) {
  const action = game.actions.find((candidate) => candidate.id === id);
  expect(action.available(game, game.getCurrentPlayer())).toBe(true);
  await action.perform(game, game.getCurrentPlayer());
}

describe('interactive showcase hooks', () => {
  it('resolves square leave, pass and land hooks through walking and jumping', async () => {
    const { game, players } = await startedShowcase();
    const player = players[0];

    await perform(game, 'showcase-walk-six');
    expect(player.position).toBe(6);
    expect(player.getStat('cabbages')).toBe(19); // Silver Spoon makes the pass worth two.
    expect(game.board.squares[0].getStat('departures')).toBe(1);
    expect(game.log.some((entry) => entry.message.includes('passed the Cabbage Patch'))).toBe(true);

    await perform(game, 'showcase-jump-cabbage');
    expect(player.position).toBe(5);
    expect(player.getStat('cabbages')).toBe(22);
    expect(game.getStat('portalsPassed')).toBeUndefined(); // A jump does not call onPass.

    await perform(game, 'showcase-jump-lab');
    expect(player.position).toBe(12);
    expect(player.getStat('caffeine')).toBe(10);
    await perform(game, 'showcase-walk-tea');
    expect(player.position).toBe(37);
    expect(player.getStat('caffeine')).toBe(9); // Compiler Lab onLeave.
    expect(game.getStat('portalsPassed')).toBe(1);
    expect(game.log.some((entry) => entry.message.includes('took a Tea Break'))).toBe(true);

    await perform(game, 'showcase-jump-glitter');
    expect(player.getStat('sparkles')).toBe(2);
    expect(game.board.squares[72].getStat('intensity')).toBe(9);
    await perform(game, 'showcase-walk-finish');
    expect(player.position).toBe(99);
    expect(game.getStat('visits')).toBe(43);
  });

  it('runs card draw, play and discard hooks while rules observe play and deck events', async () => {
    const { game, players, curiosityDeck, campusDeck, observer } = await startedShowcase();
    const player = players[0];

    await perform(game, 'showcase-draw-curiosity');
    expect(player.getStat('cabbages')).toBe(18);
    expect(game.getAvailableActions().some((action) => action.id === 'showcase-play-card')).toBe(true);
    await perform(game, 'showcase-play-card');
    expect(player.getStat('cabbages')).toBe(21);
    expect(observer.getStat('cardsObserved')).toBe(1);
    await perform(game, 'showcase-discard-card');
    expect(curiosityDeck.discardPile[0].getStat('discardCount')).toBe(1);
    expect(game.getAvailableActions().some((action) => action.id === 'showcase-play-card')).toBe(false);

    await perform(game, 'showcase-draw-curiosity');
    await perform(game, 'showcase-play-card');
    expect(player.position).toBe(28); // Mirror Maze jumps onto the portal.
    expect(game.board.squares[28].getStat('landings')).toBe(1);
    await perform(game, 'showcase-discard-card');

    await perform(game, 'showcase-reset-campus');
    await perform(game, 'showcase-draw-campus');
    await perform(game, 'showcase-play-card');
    expect(player.position).toBe(32); // Library Shortcut walks four squares.
    await perform(game, 'showcase-discard-card');
    expect(campusDeck.discardPile.some((card) => card.id === 'library-card')).toBe(true);

    await perform(game, 'showcase-reset-deck');
    expect(observer.getStat('deckResets')).toBe(2); // Campus and Curiosity resets.
    expect(observer.getStat('shuffles')).toBe(1);
    expect(curiosityDeck.drawPile).toHaveLength(3);
  });

  it('uses a custom die and reacts to effects and inventory through rules', async () => {
    const { game, players, observer } = await startedShowcase();
    const player = players[0];
    const cursedDie = game.dice.find((die) => die.id === 'cursed-d8');

    expect((await game.rollDice([cursedDie])).results[0]).toEqual({ die: cursedDie, value: 1 });
    expect(player.getStat('caffeine')).toBe(7);
    expect(player.getStat('sparkles')).toBe(1);
    expect(player.getStat('hatLuck')).toBe(1);
    expect(observer.getStat('rollsObserved')).toBe(1);

    await perform(game, 'showcase-remove-sleepy');
    expect(player.getStat('effectChanges')).toBe(1);
    expect((await game.rollDice([cursedDie])).results[0].value).toBe(7);
    expect(player.getStat('caffeine')).toBe(7);

    await perform(game, 'showcase-toggle-buzz');
    await game.rollDice([cursedDie]);
    expect(player.getStat('caffeine')).toBe(9);
    await perform(game, 'showcase-toggle-buzz');
    expect(player.getStat('effectChanges')).toBe(3);

    await perform(game, 'showcase-toggle-spoon');
    await perform(game, 'showcase-walk-six');
    expect(player.getStat('cabbages')).toBe(18); // Without Spoon, the pass is worth one.
    expect(game.log.some((entry) => entry.message.includes('Silver Spoon no longer helps'))).toBe(true);
  });

  it('demonstrates rules modifying and cancelling proposed movement', async () => {
    const { game, players } = await startedShowcase();
    const player = players[0];

    await perform(game, 'showcase-toggle-boots');
    await perform(game, 'showcase-walk-six');
    expect(player.position).toBe(8);
    expect(game.log.some((entry) => entry.message.includes('Spring Boots added 2'))).toBe(true);

    await perform(game, 'showcase-toggle-rooted');
    await perform(game, 'showcase-walk-six');
    expect(player.position).toBe(8);
    expect(game.log.some((entry) => entry.message.includes('movement was cancelled by Rooted'))).toBe(true);
  });
});
