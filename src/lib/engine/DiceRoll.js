export class DiceRoll {
  constructor(results, playerId = null) {
    this.results = results;
    this.playerId = playerId;
  }

  get total() { return this.results.reduce((sum, result) => sum + result.value, 0); }
  get min() { return Math.min(...this.results.map((result) => result.value)); }
  get max() { return Math.max(...this.results.map((result) => result.value)); }
}
