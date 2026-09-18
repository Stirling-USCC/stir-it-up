import { Stats } from './Stats.svelte.js';

export class Square extends Stats {
  name = $state('');
  description = $state('');
  position = $state(0);
  coordinates = $state({ x: 0, y: 0 });
  icon = $state('');
  colour = $state('');

  constructor({ id, name, description = '', position = 0, coordinates = { x: position, y: 0 }, icon = '', colour = '', className = '', stats = {} }) {
    super(stats);
    Object.assign(this, { id, name, description, position, coordinates, icon, colour, className });
  }

  async onLand(_game, _player) {}
  async onLeave(_game, _player) {}
  async onPass(_game, _player) {}
}
