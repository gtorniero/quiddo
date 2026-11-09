import { track, type MeasureEvent, type MeasureParams } from './measurement';

type State = {phase: string; qIndex: number; answered?: boolean};
type Emit = (event: MeasureEvent, params: MeasureParams) => unknown;
/** Server acknowledgments drive use events; UI clicks and reconnects are not wins. */
export function gameMeasurement(role: 'host' | 'player', emit: Emit = track) {
  let joined = false, started = false, completed = false;
  const answers = new Set<number>();
  return (s: State) => {
    if (!joined && role === 'player') { joined = true; emit('join_room', {role}); }
    if (!started && s.phase === 'question') { started = true; emit('game_start', {role}); }
    if (role === 'player' && s.answered && !answers.has(s.qIndex)) {
      answers.add(s.qIndex); emit('answer_recorded', {role});
    }
    if (started && !completed && s.phase === 'final') { completed = true; emit('game_complete', {role}); }
  };
}
