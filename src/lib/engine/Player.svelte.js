import { Stats } from './Stats.svelte.js';

export class Player extends Stats {
  position = $state(0);
  active = $state(true);
  inventory = $state([]);
  effects = $state([]);
  statEventType = 'player:stat-changed';

  constructor({ id, name, position = 0, active = true, icon = '●', className = '', stats = {}, inventory = [], effects = [] }) {
    super(stats);
    Object.assign(this, { id, name, position, active, icon, className });
    this.inventory = [...inventory];
    this.effects = [...effects];
    this.game = null;
  }

  async move(amount) {
    if (!this.game) throw new Error('Player is not in a game');
    const path = this.game.board.getPath(this.position, amount);
    if (path.length === 0) return this.position;
    return this.changePosition(path.at(-1).position, path);
  }

  async moveTo(position) {
    if (!this.game) throw new Error('Player is not in a game');
    const to = this.game.board.resolvePosition(position);
    if (to === this.position) return to;
    return this.changePosition(to, []);
  }

  async changePosition(to, path) {
    const from = this.position;
    const board = this.game.board;
    await board.getSquare(from).onLeave(this.game, this);
    for (const square of path.slice(0, -1)) await square.onPass(this.game, this);
    this.position = to;
    await board.getSquare(to).onLand(this.game, this);
    await this.game.events.emit('player:moved', { player: this, from, to, path });
    await this.game.logEvent(`${this.name} moved from ${from + 1} to ${to + 1}.`, 'movement', { playerId: this.id, from, to });
    return to;
  }

  async addItem(item) {
    this.inventory.push(item);
    item.game = this.game;
    await this.game?.events.emit('player:item-added', { player: this, item });
    return item;
  }

  async removeItem(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const index = this.inventory.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = this.inventory.splice(index, 1);
    await this.game?.events.emit('player:item-removed', { player: this, item });
    return item;
  }

  async addEffect(effect) {
    this.effects.push(effect);
    effect.game = this.game;
    await this.game?.events.emit('player:effect-added', { player: this, effect });
    return effect;
  }

  async removeEffect(effectOrId) {
    const id = typeof effectOrId === 'string' ? effectOrId : effectOrId.id;
    const index = this.effects.findIndex((effect) => effect.id === id);
    if (index < 0) return null;
    const [effect] = this.effects.splice(index, 1);
    await this.game?.events.emit('player:effect-removed', { player: this, effect });
    return effect;
  }
}
