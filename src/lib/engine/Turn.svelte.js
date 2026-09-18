export class Turn {
  number = $state(0);
  currentPlayerId = $state(null);
  phase = $state('start');

  constructor(phases = ['start', 'roll', 'move', 'action', 'end']) {
    this.phases = [...phases];
  }
}
