import { Stats } from './Stats.svelte.js';
import { assertUniqueIds } from './ids.js';

export class Player extends Stats {
  name = $state('');
  colour = $state(null);
  position = $state(0);
  active = $state(true);
  inventory = $state([]);
  effects = $state([]);
  hand = $state([]);
  statEventType = 'player:stat-changed';

  constructor({ id, number = null, name, colour = null, position = 0, active = true, icon = '●', className = '', stats = {}, inventory = [], effects = [], hand = [] }) {
    super(stats);
    assertUniqueIds(inventory, 'item');
    assertUniqueIds(effects, 'effect');
    assertUniqueIds(hand, 'card');
    Object.assign(this, { id, number, name, colour, position, active, icon, className });
    this.inventory = [...inventory];
    this.effects = [...effects];
    this.hand = [...hand];
    this.game = null;
  }

  async rename(name) {
    if (this.game?.status !== 'waiting') throw new Error('Player names can only be changed before the game starts');
    const change = await this.game?.events.emitCancellable('player:renaming', { player: this, name }) ?? { name };
    if (change.cancelled) return this.name;
    if (typeof change.name !== 'string') throw new TypeError('Player name must be text');
    const trimmed = change.name.trim();
    if (!trimmed) throw new Error('Player name cannot be empty');
    const previous = this.name;
    this.name = trimmed;
    await this.game?.events.emit('player:renamed', { player: this, previous, name: trimmed });
  }

  async move(amount) {
    if (!this.game) throw new Error('Player is not in a game');
    const movement = await this.game.events.emitCancellable('player:moving', { player: this, from: this.position, amount });
    if (movement.cancelled) return this.position;
    const path = this.game.board.getPath(this.position, movement.amount);
    if (path.length === 0) return this.position;
    return this.changePosition(path.at(-1).position, path, { mode: 'relative', amount: movement.amount });
  }

  async moveTo(position) {
    if (!this.game) throw new Error('Player is not in a game');
    const movement = await this.game.events.emitCancellable('player:teleporting', { player: this, from: this.position, position });
    if (movement.cancelled) return this.position;
    const to = this.game.board.resolvePosition(movement.position);
    if (to === this.position) return to;
    return this.changePosition(to, [], { mode: 'direct', requestedPosition: movement.position });
  }

  // A board edit can change an index without the player taking a movement turn.
  updatePositionAfterBoardChange(position) {
    if (this.position === position) return null;
    const from = this.position;
    this.position = position;
    return { player: this, from, to: position };
  }

  async changePosition(to, path, movement = {}) {
    const from = this.position;
    const board = this.game.board;
    await board.getSquare(from).onLeave(this.game, this);
    for (const square of path.slice(0, -1)) await square.onPass(this.game, this);
    this.position = to;
    await board.getSquare(to).onLand(this.game, this);
    await this.game.events.emit('player:moved', { player: this, from, to, path, ...movement });
    await this.game.logEvent(`${this.name} moved from ${from + 1} to ${to + 1}.`, 'movement', { playerId: this.id, from, to });
    return to;
  }

  async setActive(active) {
    const change = await this.game?.events.emitCancellable('player:active-changing', { player: this, previous: this.active, active }) ?? { active };
    if (change.cancelled) return this.active;
    if (typeof change.active !== 'boolean') throw new TypeError('Active must be a boolean');
    if (this.active === change.active) return this.active;
    const previous = this.active;
    this.active = change.active;
    await this.game?.events.emit('player:active-changed', { player: this, previous, active: this.active });
    await this.game?.logEvent(`${this.name} is now ${this.active ? 'active' : 'inactive'}.`, 'player');
    if (!this.active && this.game?.status === 'playing' && this.game.turn.currentPlayerId === this.id) {
      await this.game.endTurn();
    }
    return this.active;
  }

  async addItem(item) {
    const addition = await this.game?.events.emitCancellable('player:item-adding', { player: this, item }) ?? { item };
    if (addition.cancelled) return null;
    item = addition.item;
    if (item?.id == null) throw new Error('An item needs an ID');
    if (this.inventory.some((existing) => existing.id === item.id)) throw new Error(`Item ID already exists: ${item.id}`);
    if (item.owner && item.owner !== this) throw new Error('Item already belongs to another owner');
    if (item.active) throw new Error('Item is already active');
    this.inventory.push(item);
    item.game = this.game;
    item.owner = this;
    try {
      if (this.game?.status === 'playing') await item.setup(this.game, this);
    } catch (error) {
      this.inventory.splice(this.inventory.indexOf(item), 1);
      item.game = null;
      item.owner = null;
      throw error;
    }
    await this.game?.events.emit('player:item-added', { player: this, item });
    await this.game?.logEvent(`${this.name} received ${item.name}.`, 'item');
    return item;
  }

  async removeItem(itemOrId) {
    const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
    const index = this.inventory.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const removal = await this.game?.events.emitCancellable('player:item-removing', { player: this, item: this.inventory[index] }) ?? { item: this.inventory[index] };
    if (removal.cancelled) return null;
    const removalIndex = this.inventory.indexOf(removal.item);
    if (removalIndex < 0) throw new Error('Item to remove is not in the inventory');
    const [item] = this.inventory.splice(removalIndex, 1);
    if (item.active) await item.teardown();
    else { item.game = null; item.owner = null; }
    await this.game?.events.emit('player:item-removed', { player: this, item });
    await this.game?.logEvent(`${this.name} removed ${item.name}.`, 'item');
    return item;
  }

  async addEffect(effect) {
    const addition = await this.game?.events.emitCancellable('player:effect-adding', { player: this, effect }) ?? { effect };
    if (addition.cancelled) return null;
    effect = addition.effect;
    if (effect?.id == null) throw new Error('An effect needs an ID');
    if (this.effects.some((existing) => existing.id === effect.id)) throw new Error(`Effect ID already exists: ${effect.id}`);
    if (effect.owner && effect.owner !== this) throw new Error('Effect already belongs to another owner');
    if (effect.active) throw new Error('Effect is already active');
    this.effects.push(effect);
    effect.game = this.game;
    effect.owner = this;
    try {
      if (this.game?.status === 'playing') await effect.setup(this.game, this);
    } catch (error) {
      this.effects.splice(this.effects.indexOf(effect), 1);
      effect.game = null;
      effect.owner = null;
      throw error;
    }
    await this.game?.events.emit('player:effect-added', { player: this, effect });
    await this.game?.logEvent(`${this.name} gained ${effect.name}.`, 'effect');
    return effect;
  }

  async removeEffect(effectOrId) {
    const id = typeof effectOrId === 'string' ? effectOrId : effectOrId.id;
    const index = this.effects.findIndex((effect) => effect.id === id);
    if (index < 0) return null;
    const removal = await this.game?.events.emitCancellable('player:effect-removing', { player: this, effect: this.effects[index] }) ?? { effect: this.effects[index] };
    if (removal.cancelled) return null;
    const removalIndex = this.effects.indexOf(removal.effect);
    if (removalIndex < 0) throw new Error('Effect to remove is not on the player');
    const [effect] = this.effects.splice(removalIndex, 1);
    if (effect.active) await effect.teardown();
    else { effect.game = null; effect.owner = null; }
    await this.game?.events.emit('player:effect-removed', { player: this, effect });
    await this.game?.logEvent(`${this.name} lost ${effect.name}.`, 'effect');
    return effect;
  }

  async addCard(card) {
    const addition = await this.game?.events.emitCancellable('player:card-adding', { player: this, card }) ?? { card };
    if (addition.cancelled) return null;
    card = addition.card;
    if (!card?.id) throw new Error('A card needs an ID');
    if (this.hand.some((existing) => existing.id === card.id)) throw new Error(`Card ID already exists in hand: ${card.id}`);
    this.hand.push(card);
    card.owner = this;
    card.game = this.game;
    await this.game?.events.emit('player:card-added', { player: this, card });
    await this.game?.logEvent(`${this.name} received ${card.name}.`, 'card');
    return card;
  }

  async removeCard(cardOrId) {
    const id = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
    let card = this.hand.find((candidate) => candidate.id === id);
    if (!card) return null;
    const removal = await this.game?.events.emitCancellable('player:card-removing', { player: this, card }) ?? { card };
    if (removal.cancelled) return null;
    card = removal.card;
    if (!this.hand.includes(card)) throw new Error('Card to remove is not in this hand');
    this.hand.splice(this.hand.indexOf(card), 1);
    card.owner = null;
    await this.game?.events.emit('player:card-removed', { player: this, card });
    return card;
  }
}
