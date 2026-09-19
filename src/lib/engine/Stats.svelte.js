// One small base class gives every game object the same named-value API.
export class Stats {
  stats = $state({});

  constructor(initialStats = {}) {
    this.stats = { ...initialStats };
  }

  getStat(name) {
    return this.stats[name];
  }

  hasStat(name) {
    return Object.hasOwn(this.stats, name);
  }

  async addStat(name, value) {
    return this.applyStatChange(name, value, 'add');
  }

  async setStat(name, value) {
    return this.applyStatChange(name, value, 'set');
  }

  async applyStatChange(name, value, operation) {
    const previous = this.getStat(name);
    const change = await this.prepareStatChange({ name, previous, value, operation });
    if (change.cancelled) return previous;
    if (typeof change.name !== 'string' || !change.name) throw new TypeError('Stat name must be non-empty text');
    const actualPrevious = this.getStat(change.name);
    if (operation === 'add' && this.hasStat(change.name)) throw new Error(`Stat already exists: ${change.name}`);
    this.stats[change.name] = change.value;
    await this.emitStatChange(change.name, actualPrevious, change.value);
    return change.value;
  }

  async incrementStat(name, amount = 1) {
    if (!Number.isFinite(amount)) throw new TypeError('Amount must be a finite number');
    const current = this.hasStat(name) ? this.getStat(name) : 0;
    if (typeof current !== 'number' || !Number.isFinite(current)) {
      throw new TypeError(`Stat ${name} is not a finite number`);
    }
    return this.setStat(name, current + amount);
  }

  async decrementStat(name, amount = 1) {
    return this.incrementStat(name, -amount);
  }

  async removeStat(name) {
    const previous = this.getStat(name);
    const change = await this.prepareStatChange({ name, previous, value: undefined, operation: 'remove' });
    if (change.cancelled) return false;
    if (typeof change.name !== 'string' || !change.name) throw new TypeError('Stat name must be non-empty text');
    if (!this.hasStat(change.name)) return false;
    const actualPrevious = this.getStat(change.name);
    delete this.stats[change.name];
    await this.emitStatChange(change.name, actualPrevious, undefined);
    return true;
  }

  async prepareStatChange(detail) {
    if (!this.game) return { ...detail, cancelled: false };
    const types = ['object:stat-changing'];
    if (this.statEventType) types.push(this.statEventType.replace(/changed$/, 'changing'));
    return this.game.events.emitCancellable(types, { object: this, ...detail });
  }

  async emitStatChange(name, previous, value) {
    if (!this.game) return;
    const detail = { object: this, name, previous, value };
    await this.game.events.emit('object:stat-changed', detail);
    if (this.statEventType) await this.game.events.emit(this.statEventType, detail);
  }
}
