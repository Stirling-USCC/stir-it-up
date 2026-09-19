import { Die } from '../../engine/Die.svelte.js';

export function createShowcaseDice() {
  return [
    new Die({ id: 'bonus-d4', name: 'Bonus die', sides: 4, colour: '#dcecd3', stats: { temperament: 'friendly' } }),
    new Die({
      id: 'cursed-d8', name: 'Cursed die', sides: 8, colour: '#e9d9f1',
      stats: { curse: 'rolls 1 while Sleepy, otherwise 7' },
      roll: ({ player }) => player?.effects.some((effect) => effect.id === 'sleepy') ? 1 : 7
    })
  ];
}
