export interface OctaveState {
  baseMidi: number; // MIDI of the lowest C in the visible range
  octaves: number; // number of full octaves shown
}

export type OctaveListener = (state: OctaveState) => void;

export class OctaveController {
  private state: OctaveState;
  private listeners = new Set<OctaveListener>();

  constructor(baseMidi: number, octaves: number) {
    this.state = { baseMidi, octaves };
  }

  get(): OctaveState {
    return this.state;
  }

  shift(semitones: number): void {
    const next = this.state.baseMidi + semitones;
    const clamped = Math.max(12, Math.min(108 - this.state.octaves * 12, next));
    if (clamped === this.state.baseMidi) return;
    this.state = { ...this.state, baseMidi: clamped };
    this.emit();
  }

  setOctaves(octaves: number): void {
    if (octaves === this.state.octaves) return;
    this.state = { ...this.state, octaves };
    this.emit();
  }

  subscribe(fn: OctaveListener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}
