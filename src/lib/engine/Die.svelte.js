import { Stats } from './Stats.svelte.js';

export class Die extends Stats {
  name = $state('');
  colour = $state('');
  sides = $state(6);
  constructor({ id, name = 'Die', sides = 6, colour = '#f8f9fa', roll, stats = {} } = {}) {
    super(stats);
    if (!id) throw new Error('A die needs an ID');
    if (!Number.isInteger(sides) || sides < 2) throw new RangeError('A die needs at least two sides');
    Object.assign(this, { id, name, sides, colour });
    this.rollValue = roll ?? (() => Math.floor(Math.random() * this.sides) + 1);
  }

  async roll(context = {}) {
    const value = await this.rollValue(context);
    if (!Number.isFinite(value)) throw new TypeError(`Die ${this.id} returned a nonnumeric value`);
    return value;
  }
}
