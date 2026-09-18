export class Turn {
  number = $state(0);
  currentPlayerId = $state(null);
  phase = $state('start');

  constructor(phases = ['start', 'roll', 'move', 'action', 'end']) {
    if (!Array.isArray(phases) || phases.length === 0) {
      throw new Error('A turn needs at least one phase');
    }
    this.phases = [...phases];
    this.phase = this.phases[0];
  }
}
