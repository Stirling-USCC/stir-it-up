import { Stats } from './Stats.svelte.js';
import { EventBus } from './EventBus.js';
import { Turn } from './Turn.svelte.js';
import { Player } from './Player.svelte.js';
import { DiceRoll } from './DiceRoll.js';
import { randomPlayerName } from '../game/playerNames.js';

const playerColours = ['#3467b1', '#ad3434', '#276b4d', '#854490', '#92521e', '#17677a', '#934163', '#555a98'];

export class Game extends Stats {
  players = $state([]);
  decks = $state([]);
  rules = $state([]);
  actions = $state([]);
  dice = $state([]);
  status = $state('waiting');
  log = $state([]);
  lastRoll = $state(null);

  constructor({ board, players = [], decks = [], dice = [], rules = [], actions = [], stats = {}, phases } = {}) {
    super(stats);
    if (players.length > 8) throw new Error('A game supports at most 8 players');
    const usedNumbers = new Set();
    const usedIds = new Set();
    for (const player of players) {
      player.number ??= Array.from({ length: 8 }, (_, index) => index + 1).find((number) => !usedNumbers.has(number));
      if (!Number.isInteger(player.number) || player.number < 1 || player.number > 8 || usedNumbers.has(player.number)) {
        throw new Error('Player number must be unique and between 1 and 8');
      }
      if (!player.id || usedIds.has(player.id)) throw new Error('Player ID must be present and unique');
      player.colour ??= playerColours[player.number - 1];
      usedNumbers.add(player.number);
      usedIds.add(player.id);
    }
    this.board = board;
    this.board.game = this;
    this.dice = [...dice];
    this.game = this;
    this.events = new EventBus();
    this.turn = new Turn(phases);
    this.players = [...players];
    this.decks = [...decks];
    this.rules = [...rules];
    this.actions = [...actions];
    for (const square of this.board.squares) this.attach(square);
    for (const die of this.dice) this.attach(die);
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

  getNextActivePlayer(afterIndex) {
    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const index = (afterIndex + offset) % this.players.length;
      const player = this.players[index];
      if (player.active) return player;
    }
    return null;
  }

  getAvailableActions() {
    const player = this.getCurrentPlayer();
    return this.actions.filter((action) => action.available(this, player));
  }

  async addDie(die) {
    if (this.dice.some((existing) => existing.id === die.id)) throw new Error(`Die ID already exists: ${die.id}`);
    this.attach(die);
    this.dice.push(die);
    await this.events.emit('die:added', { die });
    return die;
  }

  async removeDie(dieOrId) {
    const id = typeof dieOrId === 'string' ? dieOrId : dieOrId.id;
    const index = this.dice.findIndex((die) => die.id === id);
    if (index < 0) return null;
    const [die] = this.dice.splice(index, 1);
    die.game = null;
    await this.events.emit('die:removed', { die });
    return die;
  }

  async logEvent(message, category = 'system', metadata = {}) {
    const sequence = this.log.length + 1;
    const entry = { id: `log-${sequence}`, sequence, timestamp: new Date().toISOString(), message, category, metadata };
    this.log.push(entry);
    await this.events.emit('log:added', { entry });
    return entry;
  }

  async addPlayer(player) {
    if (this.status !== 'waiting') throw new Error('The roster is locked after the game starts');
    if (this.players.length >= 8) throw new Error('A game supports at most 8 players');
    const number = Array.from({ length: 8 }, (_, index) => index + 1).find((candidate) => !this.players.some((existing) => existing.number === candidate));
    player ??= new Player({ id: crypto.randomUUID(), number, name: randomPlayerName(), colour: playerColours[number - 1] });
    if (player.number == null) player.number = number;
    if (!Number.isInteger(player.number) || player.number < 1 || player.number > 8 || this.players.some((existing) => existing.number === player.number)) {
      throw new Error('Player number must be unique and between 1 and 8');
    }
    player.colour ??= playerColours[player.number - 1];
    if (this.getPlayerById(player.id)) throw new Error(`Player ID already exists: ${player.id}`);
    player.position = this.board.squares.length ? this.board.resolvePosition(player.position) : 0;
    this.attach(player);
    this.players.push(player);
    await this.events.emit('player:added', { player });
    await this.logEvent(`${player.name} joined the game.`, 'player');
    return player;
  }

  async removePlayer(playerOrId) {
    if (this.status !== 'waiting') throw new Error('The roster is locked after the game starts');
    const id = typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    const index = this.players.findIndex((player) => player.id === id);
    if (index < 0) return null;
    const [player] = this.players.splice(index, 1);
    player.game = null;
    for (const item of player.inventory) item.game = null;
    for (const effect of player.effects) effect.game = null;
    await this.events.emit('player:removed', { player });
    await this.logEvent(`${player.name} left the game.`, 'player');
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
    const id = playerOrId === null ? null : typeof playerOrId === 'string' ? playerOrId : playerOrId.id;
    const player = id === null ? null : this.getPlayerById(id);
    if (id !== null && (!player || !player.active)) throw new Error('Current player must be active and in the game');
    const previousPlayerId = this.turn.currentPlayerId;
    if (previousPlayerId === id) return player;
    this.turn.currentPlayerId = id;
    await this.events.emit('turn:player-changed', { player, previousPlayerId });
    if (player) await this.logEvent(`Current player: ${player.name}.`, 'turn');
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
    const player = this.getCurrentPlayer();
    if (!player || !player.active) throw new Error('A turn needs an active current player');
    this.turn.number += 1;
    await this.changePhase(this.turn.phases[0]);
    await this.events.emit('turn:started', { number: this.turn.number, player });
    await this.logEvent(`Turn ${this.turn.number}: ${player.name}.`, 'turn');
    if (this.turn.phases[1]) await this.changePhase(this.turn.phases[1]);
  }

  async endTurn() {
    if (this.status !== 'playing') throw new Error('Game is not playing');
    const player = this.getCurrentPlayer();
    if (!player) throw new Error('A turn needs a current player');
    await this.changePhase(this.turn.phases.at(-1));
    await this.events.emit('turn:ended', { number: this.turn.number, player });
    await this.logEvent(`${player.name} ended their turn.`, 'turn');
    const next = this.getNextActivePlayer(this.players.indexOf(player));
    if (next) {
      await this.changeCurrentPlayer(next.id);
      await this.beginTurn();
      return;
    }
    await this.changeCurrentPlayer(null);
    await this.finishGame();
  }

  async rollDice(dice = this.dice) {
    if (!Array.isArray(dice)) dice = [dice];
    if (dice.length === 0) throw new Error('No dice are configured');
    const player = this.getCurrentPlayer();
    const results = [];
    for (const die of dice) results.push({ die, value: await die.roll({ game: this, player }) });
    const roll = new DiceRoll(results, player?.id ?? null);
    this.lastRoll = roll;
    await this.events.emit('dice:rolled', { dice, player, roll, result: roll });
    await this.logEvent(`${player?.name ?? 'Someone'} rolled ${results.map(({ die, value }) => `${die.name}: ${value}`).join(', ')}.`, 'dice', { values: results.map(({ die, value }) => ({ dieId: die.id, value })) });
    return roll;
  }

  async drawCard(deckOrId, player = this.getCurrentPlayer()) {
    const deck = typeof deckOrId === 'string' ? this.decks.find((candidate) => candidate.id === deckOrId) : deckOrId;
    if (!deck || !this.decks.includes(deck)) throw new Error('Deck is not in this game');
    return deck.draw(player);
  }
}
