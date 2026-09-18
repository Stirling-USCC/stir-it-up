import { Stats } from './Stats.svelte.js';

export class Dice extends Stats {
  constructor({ id = 'dice', name = 'Dice', count = 1, sides = 6, modifier = 0, stats = {} } = {}) {
    super(stats);
    if (!Number.isInteger(count) || count < 1 || !Number.isInteger(sides) || sides < 2) {
      throw new RangeError('Dice need a positive count and at least two sides');
    }
    Object.assign(this, { id, name, count, sides, modifier });
  }

  roll(random = Math.random) {
    const rolls = [];
    for (let index = 0; index < this.count; index += 1) {
      rolls.push(Math.floor(random() * this.sides) + 1);
    }
    return { rolls, modifier: this.modifier, total: rolls.reduce((sum, roll) => sum + roll, this.modifier) };
  }
}
