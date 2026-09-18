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

  // A board edit can change an index without the player taking a movement turn.
  updatePositionAfterBoardChange(position) {
    if (this.position === position) return null;
    const from = this.position;
    this.position = position;
    return { player: this, from, to: position };
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

  async setActive(active) {
    if (typeof active !== 'boolean') throw new TypeError('Active must be a boolean');
    if (this.active === active) return;
    const previous = this.active;
    this.active = active;
    await this.game?.events.emit('player:active-changed', { player: this, previous, active });
    await this.game?.logEvent(`${this.name} is now ${active ? 'active' : 'inactive'}.`, 'player');
    if (!active && this.game?.status === 'playing' && this.game.turn.currentPlayerId === this.id) {
      await this.game.endTurn();
    }
  }

  async addItem(item) {
    if (item?.id == null) throw new Error('An item needs an ID');
    if (this.inventory.some((existing) => existing.id === item.id)) throw new Error(`Item ID already exists: ${item.id}`);
    this.inventory.push(item);
    item.game = this.game;
    await this.game?.events.emit('player:item-added', { player: this, item });
    await this.game?.logEvent(`${this.name} received ${item.name}.`, 'item');
    return item;
  }

  async removeItem(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const index = this.inventory.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const [item] = this.inventory.splice(index, 1);
    item.game = null;
    await this.game?.events.emit('player:item-removed', { player: this, item });
    await this.game?.logEvent(`${this.name} removed ${item.name}.`, 'item');
    return item;
  }

  async addEffect(effect) {
    if (effect?.id == null) throw new Error('An effect needs an ID');
    if (this.effects.some((existing) => existing.id === effect.id)) throw new Error(`Effect ID already exists: ${effect.id}`);
    this.effects.push(effect);
    effect.game = this.game;
    await this.game?.events.emit('player:effect-added', { player: this, effect });
    await this.game?.logEvent(`${this.name} gained ${effect.name}.`, 'effect');
    return effect;
  }

  async removeEffect(effectOrId) {
    const id = typeof effectOrId === 'string' ? effectOrId : effectOrId.id;
    const index = this.effects.findIndex((effect) => effect.id === id);
    if (index < 0) return null;
    const [effect] = this.effects.splice(index, 1);
    effect.game = null;
    await this.game?.events.emit('player:effect-removed', { player: this, effect });
    await this.game?.logEvent(`${this.name} lost ${effect.name}.`, 'effect');
    return effect;
  }
}
