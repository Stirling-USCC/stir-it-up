import { Effect } from '../../engine/Effect.js';
import { InventoryItem } from '../../engine/InventoryItem.js';
import { Player } from '../../engine/Player.svelte.js';

export function createShowcasePlayers() {
  const spoon = new InventoryItem({ id: 'spoon', name: 'Silver Spoon', description: 'Doubles the reward for passing the Cabbage Patch.', stats: { polish: 8, lucky: true } });
  const players = [
    new Player({ id: 'showcase-1', name: 'Recursive Potato', position: 0,
      stats: { cabbages: 17, caffeine: 8, dignity: 'questionable', ready: true },
      inventory: [spoon, new InventoryItem({
        id: 'hat', name: 'Paper Hat', description: 'A roll grants one hatLuck while carried.',
        handlers: {
          'dice:rolled': async (_game, { player }, owner) => {
            if (player === owner) await owner.incrementStat('hatLuck');
          }
        }
      })],
      effects: [
        new Effect({
          id: 'sparkly', name: 'Sparkly', description: 'A roll grants one sparkle.', duration: 3, stats: { intensity: 'maximum' },
          handlers: {
            'dice:rolled': async (_game, { player }, owner) => {
              if (player === owner) await owner.incrementStat('sparkles');
            }
          }
        }),
        new Effect({
          id: 'sleepy', name: 'Sleepy', description: 'A roll costs one caffeine and makes the cursed die roll 1.',
          handlers: {
            'dice:rolled': async (_game, { player }, owner) => {
              if (player === owner) await owner.decrementStat('caffeine');
            }
          }
        })
      ]
    }),
    new Player({ id: 'showcase-2', name: 'Caffeinated Goblin', position: 0, stats: { caffeine: 9, votes: 2 } }),
    new Player({ id: 'showcase-3', name: 'Suspicious Compiler', position: 12, stats: { warnings: 0 } }),
    new Player({ id: 'showcase-4', name: 'Chaotic Badger', position: 37, stats: { chaos: 11 } }),
    new Player({ id: 'showcase-5', name: 'Sleepy Penguin', position: 99, stats: { naps: 4 } })
  ];

  return { players, spoon };
}
