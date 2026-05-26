import * as Tone from "tone";
import { midiToName } from "./notes";

export type OscType = "sine" | "triangle" | "sawtooth" | "square";

export interface EnvelopeValues {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FilterValues {
  cutoff: number;
  resonance: number;
}

// iOS note: Tone.js uses the standard Web Audio context. Audio routes through
// the silent switch by default. We accept that trade-off in v1; a future
// version could route through an <audio> element with playsinline to bypass.
export class SynthEngine {
  private synth: Tone.PolySynth<Tone.Synth>;
  private filter: Tone.Filter;
  private volume: Tone.Volume;

  private sustainOn = false;
  private heldByPedal = new Set<number>();
  private active = new Map<number, number>(); // midi -> refcount

  constructor() {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.4 },
    });
    this.synth.maxPolyphony = 16;
    this.filter = new Tone.Filter({ type: "lowpass", frequency: 4000, Q: 1 });
    this.volume = new Tone.Volume(-8);

    this.synth.chain(this.filter, this.volume, Tone.Destination);
  }

  async unlock(): Promise<void> {
    await Tone.start();
    await Tone.getContext().resume();
  }

  async resume(): Promise<void> {
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }
  }

  noteOn(midi: number): void {
    const count = this.active.get(midi) ?? 0;
    if (count === 0) {
      this.synth.triggerAttack(midiToName(midi));
    }
    this.active.set(midi, count + 1);
    this.heldByPedal.delete(midi);
  }

  noteOff(midi: number): void {
    const count = this.active.get(midi) ?? 0;
    if (count <= 1) {
      this.active.delete(midi);
      if (this.sustainOn) {
        this.heldByPedal.add(midi);
      } else {
        this.synth.triggerRelease(midiToName(midi));
      }
    } else {
      this.active.set(midi, count - 1);
    }
  }

  allNotesOff(): void {
    this.synth.releaseAll();
    this.active.clear();
    this.heldByPedal.clear();
  }

  setSustain(on: boolean): void {
    this.sustainOn = on;
    if (!on && this.heldByPedal.size > 0) {
      for (const midi of this.heldByPedal) {
        this.synth.triggerRelease(midiToName(midi));
      }
      this.heldByPedal.clear();
    }
  }

  setOscType(type: OscType): void {
    this.synth.set({ oscillator: { type } });
  }

  setFilter({ cutoff, resonance }: FilterValues): void {
    this.filter.frequency.rampTo(cutoff, 0.02);
    this.filter.Q.rampTo(resonance, 0.02);
  }

  setEnvelope(env: EnvelopeValues): void {
    this.synth.set({
      envelope: {
        attack: env.attack,
        decay: env.decay,
        sustain: env.sustain,
        release: env.release,
      },
    });
  }

  setVolume(db: number): void {
    this.volume.volume.rampTo(db, 0.02);
  }
}
