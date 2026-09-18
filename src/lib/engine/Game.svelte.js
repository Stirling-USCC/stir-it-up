import { Stats } from './Stats.svelte.js';
import { EventBus } from './EventBus.js';
import { Turn } from './Turn.svelte.js';

export class Game extends Stats {
  players = $state([]);
  decks = $state([]);
  rules = $state([]);
  actions = $state([]);
  status = $state('waiting');
  log = $state([]);
  lastRoll = $state(null);

  constructor({ board, players = [], decks = [], dice, rules = [], actions = [], stats = {}, phases } = {}) {
    super(stats);
    this.board = board;
    this.dice = dice;
    this.game = this;
    this.events = new EventBus();
    this.turn = new Turn(phases);
    this.players = [...players];
    this.decks = [...decks];
    this.rules = [...rules];
    this.actions = [...actions];
    for (const square of this.board.squares) this.attach(square);
    if (this.dice) this.attach(this.dice);
    for (const player of this.players) this.attach(player);
    for (const deck of this.decks) this.attach(deck);
    for (const rule of this.rules) this.attach(rule);
    for (const action of this.actions) this.attach(action);
  }

  attach(object) {
    object.game = this;
    for (const item of object.inventory ?? []) item.game = this;
    for (const effect of object.effects ?? []) effect.game = this;
    for (const card of object.cards ?? []) card.game = this;
  }

  getPlayerById(id) {
    return this.players.find((player) => player.id === id) ?? null;
  }

  getCurrentPlayer() {
    return this.getPlayerById(this.turn.currentPlayerId);
  }

  getAvailableActions() {
    const player = this.getCurrentPlayer();
    return this.actions.filter((action) => action.available(this, player));
  }

  async logEvent(message, category = 'system', metadata = {}) {
    const sequence = this.log.length + 1;
    const entry = { id: `log-${sequence}`, sequence, timestamp: new Date().toISOString(), message, category, metadata };
    this.log.push(entry);
    await this.events.emit('log:added', { entry });
    return entry;
  }

  async addPlayer(player) {
    if (this.getPlayerById(player.id)) throw new Error(`Player ID already exists: ${player.id}`);
    player.position = this.board.resolvePosition(player.position);
    this.attach(player);
    this.players.push(player);
    await this.events.emit('player:added', { player });
    await this.logEvent(`${player.name} joined the game.`, 'player');
    return player;
  }

  async removePlayer(playerOrId) {
    const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    const index = this.players.findIndex((player) => player.id === id);
    if (index < 0) return null;
    const [player] = this.players.splice(index, 1);
    player.game = null;
    await this.events.emit('player:removed', { player });
    await this.logEvent(`${player.name} left the game.`, 'player');
    if (this.turn.currentPlayerId === id) {
      const next = this.players.find((candidate) => candidate.active);
      if (next) await this.changeCurrentPlayer(next.id);
      else await this.finishGame();
    }
    return player;
  }

  async startGame() {
    if (this.status !== 'waiting') throw new Error('Game has already started');
    const first = this.players.find((player) => player.active);
    if (!first) throw new Error('Add an active player before starting');
    for (const rule of this.rules) await rule.setup(this);
    this.status = 'playing';
    await this.events.emit('game:started', { game: this });
    await this.logEvent('Game started.', 'game');
    await this.changeCurrentPlayer(first.id);
    await this.beginTurn();
  }

  async finishGame() {
    if (this.status === 'finished') return;
    this.status = 'finished';
    await this.events.emit('game:finished', { game: this });
    await this.logEvent('Game finished.', 'game');
    for (const rule of this.rules) await rule.teardown();
  }

  async changeCurrentPlayer(playerOrId) {
    const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    const player = this.getPlayerById(id);
    if (!player || !player.active) throw new Error('Current player must be active and in the game');
    const previousPlayerId = this.turn.currentPlayerId;
    this.turn.currentPlayerId = id;
    await this.events.emit('turn:player-changed', { player, previousPlayerId });
    await this.logEvent(`Current player: ${player.name}.`, 'turn');
    return player;
  }

  async changePhase(phase) {
    if (!this.turn.phases.includes(phase)) throw new Error(`Unknown turn phase: ${phase}`);
    const previous = this.turn.phase;
    if (previous === phase) return;
    this.turn.phase = phase;
    await this.events.emit('turn:phase-changed', { phase, previous, player: this.getCurrentPlayer() });
  }

  async beginTurn() {
    if (this.status !== 'playing') throw new Error('Game is not playing');
    this.turn.number += 1;
    await this.changePhase('start');
    const player = this.getCurrentPlayer();
    await this.events.emit('turn:started', { number: this.turn.number, player });
    await this.logEvent(`Turn ${this.turn.number}: ${player.name}.`, 'turn');
    await this.changePhase('roll');
  }

  async endTurn() {
    if (this.status !== 'playing') throw new Error('Game is not playing');
    const player = this.getCurrentPlayer();
    await this.changePhase('end');
    await this.events.emit('turn:ended', { number: this.turn.number, player });
    await this.logEvent(`${player.name} ended their turn.`, 'turn');
    const currentIndex = this.players.indexOf(player);
    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const next = this.players[(currentIndex + offset) % this.players.length];
      if (next.active) {
        await this.changeCurrentPlayer(next.id);
        await this.beginTurn();
        return;
      }
    }
    await this.finishGame();
  }

  async rollDice(dice = this.dice) {
    const player = this.getCurrentPlayer();
    const result = dice.roll();
    this.lastRoll = { ...result, diceId: dice.id, playerId: player?.id ?? null };
    await this.events.emit('dice:rolled', { dice, player, result });
    await this.logEvent(`${player?.name ?? 'Someone'} rolled ${result.total} (${result.rolls.join(' + ')}${result.modifier ? ` ${result.modifier < 0 ? '-' : '+'} ${Math.abs(result.modifier)}` : ''}).`, 'dice', result);
    return result;
  }

  async drawCard(deckOrId, player = this.getCurrentPlayer()) {
    const deck = typeof deckOrId === 'string' ? this.decks.find((candidate) => candidate.id === deckOrId) : deckOrId;
    if (!deck || !this.decks.includes(deck)) throw new Error('Deck is not in this game');
    return deck.draw(player);
  }
}
