<script>
  import { tooltip } from './tooltip.js';
  let { die, value } = $props();
</script>

<div class="die-object" role="img"
  aria-label={`${die.name}, d${die.sides}${value == null ? ', not rolled yet' : `, rolled ${value}`}`}
  style={`--die-colour:${die.colour}`} use:tooltip={die.name}>
  <span class="die-value" aria-hidden="true">{value ?? '–'}</span>
  <span class="die-sides" aria-hidden="true">d{die.sides}</span>
</div>
