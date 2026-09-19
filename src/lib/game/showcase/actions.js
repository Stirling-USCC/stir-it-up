import { Action } from '../../engine/Action.js';
import { Effect } from '../../engine/Effect.js';
import { InventoryItem } from '../../engine/InventoryItem.js';

export function createShowcaseActions({ squares, curiosityDeck, campusDeck, spoon }) {
  const { cabbagePatch, lab, tea, glitter, lastSquare } = squares;
  const playing = (game, player) => game.status === 'playing' && !!player;
  return [
    new Action({ id: 'showcase-walk-six', label: 'Walk 6', description: 'Leave Start and pass the Cabbage Patch.', available: playing, perform: (_game, player) => player.move(6) }),
    new Action({ id: 'showcase-jump-cabbage', label: 'Jump to Cabbages', description: 'Land on square 6 without passing intervening squares.', available: playing, perform: (_game, player) => player.moveTo(cabbagePatch.position) }),
    new Action({ id: 'showcase-jump-lab', label: 'Jump to Lab', description: 'Land on square 13 without passing intervening squares.', available: playing, perform: (_game, player) => player.moveTo(lab.position) }),
    new Action({ id: 'showcase-walk-tea', label: 'Walk to Tea', description: 'Walk a path to square 38, passing the Mystery Portal.', available: playing, perform: (_game, player) => player.move(tea.position - player.position) }),
    new Action({ id: 'showcase-jump-glitter', label: 'Jump to Glitter', description: 'Land on square 73 and update its intensity.', available: playing, perform: (_game, player) => player.moveTo(glitter.position) }),
    new Action({ id: 'showcase-walk-finish', label: 'Walk to Finish', description: 'Walk a path to square 100 and count the visit.', available: playing, perform: (_game, player) => player.move(lastSquare.position - player.position) }),
    new Action({ id: 'showcase-reset-deck', label: 'Reset & shuffle', description: 'Reset the Curiosity deck, then shuffle its draw pile.', available: playing, perform: async () => { await curiosityDeck.reset(); await curiosityDeck.shuffle(); } }),
    new Action({ id: 'showcase-reset-campus', label: 'Reset Campus', description: 'Return Campus cards to the draw pile so Library Shortcut can be played.', available: playing, perform: () => campusDeck.reset() }),
    new Action({ id: 'showcase-toggle-buzz', label: 'Toggle Buzzing', description: 'Add or remove an effect; it changes caffeine on rolls.', available: playing, perform: (_game, player) => player.effects.some((effect) => effect.id === 'buzzing')
      ? player.removeEffect('buzzing')
      : player.addEffect(new Effect({
        id: 'buzzing', name: 'Buzzing', description: 'A roll grants two caffeine.', duration: 2,
        handlers: {
          'dice:rolled': async (_game, { player: rollingPlayer }, owner) => {
            if (rollingPlayer === owner) await owner.incrementStat('caffeine', 2);
          }
        }
      })) }),
    new Action({ id: 'showcase-remove-sleepy', label: 'Remove Sleepy', description: 'Change the cursed die back to its normal showcase value.', available: (game, player) => playing(game, player) && player.effects.some((effect) => effect.id === 'sleepy'), perform: (_game, player) => player.removeEffect('sleepy') }),
    new Action({ id: 'showcase-toggle-spoon', label: 'Toggle Spoon', description: 'Add or remove the Silver Spoon and compare Cabbage Patch rewards.', available: playing, perform: (_game, player) => player.inventory.some((item) => item.id === 'spoon')
      ? player.removeItem('spoon')
      : player.addItem(new InventoryItem({ id: 'spoon', name: spoon.name, description: spoon.description, stats: { ...spoon.stats } })) }),
    new Action({ id: 'showcase-toggle-boots', label: 'Toggle Spring Boots', description: 'Spring Boots add two to proposed walking movement.', available: playing, perform: (_game, player) => player.inventory.some((item) => item.id === 'spring-boots')
      ? player.removeItem('spring-boots')
      : player.addItem(new InventoryItem({
        id: 'spring-boots', name: 'Spring Boots', description: 'Adds two squares to walking movement.', stats: { bonus: 2 },
        handlers: {
          'player:moving': async (game, movement, owner, item) => {
            if (movement.player !== owner) return;
            movement.amount += item.getStat('bonus');
            await game.logEvent(`Spring Boots added 2 to ${owner.name}'s movement.`, 'item');
          }
        }
      })) }),
    new Action({ id: 'showcase-toggle-rooted', label: 'Toggle Rooted', description: 'Rooted cancels walking movement before it happens.', available: playing, perform: (_game, player) => player.effects.some((effect) => effect.id === 'rooted')
      ? player.removeEffect('rooted')
      : player.addEffect(new Effect({
        id: 'rooted', name: 'Rooted', description: 'Prevents walking movement.',
        handlers: {
          'player:moving': (_game, movement, owner) => {
            if (movement.player === owner) movement.cancel('Rooted players cannot walk.');
          }
        }
      })) })
  ];
}
