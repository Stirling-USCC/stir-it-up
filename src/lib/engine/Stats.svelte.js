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
    if (this.hasStat(name)) throw new Error(`Stat already exists: ${name}`);
    return this.setStat(name, value);
  }

  async setStat(name, value) {
    const previous = this.getStat(name);
    this.stats[name] = value;
    await this.emitStatChange(name, previous, value);
    return value;
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
    if (!this.hasStat(name)) return false;
    const previous = this.getStat(name);
    delete this.stats[name];
    await this.emitStatChange(name, previous, undefined);
    return true;
  }

  async emitStatChange(name, previous, value) {
    if (!this.game) return;
    const detail = { object: this, name, previous, value };
    await this.game.events.emit('object:stat-changed', detail);
    if (this.statEventType) await this.game.events.emit(this.statEventType, detail);
  }
}
