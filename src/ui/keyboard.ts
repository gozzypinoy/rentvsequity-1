import { midiToName } from "../synth/notes";
import type { OctaveController } from "./octave";

export interface KeyboardCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}

interface KeyEl {
  midi: number;
  el: HTMLDivElement;
}

export class Keyboard {
  private root: HTMLElement;
  private callbacks: KeyboardCallbacks;
  private octave: OctaveController;
  private keys: KeyEl[] = [];
  private pointerNote = new Map<number, number>(); // pointerId -> midi

  constructor(root: HTMLElement, octave: OctaveController, callbacks: KeyboardCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
    this.octave = octave;

    this.root.addEventListener("pointerdown", this.handlePointerDown);
    this.root.addEventListener("pointermove", this.handlePointerMove);
    this.root.addEventListener("pointerup", this.handlePointerUp);
    this.root.addEventListener("pointercancel", this.handlePointerUp);
    this.root.addEventListener("lostpointercapture", this.handlePointerUp);

    this.octave.subscribe(() => this.render());
  }

  highlight(midi: number, on: boolean): void {
    const key = this.keys.find((k) => k.midi === midi);
    if (!key) return;
    if (on) {
      key.el.dataset.active = "true";
    } else {
      delete key.el.dataset.active;
    }
  }

  private render(): void {
    const { baseMidi, octaves } = this.octave.get();
    this.root.innerHTML = "";
    this.keys = [];

    const whiteCount = octaves * 7;
    const whiteRow = document.createElement("div");
    whiteRow.className = "key-row white-row";
    whiteRow.style.gridTemplateColumns = `repeat(${whiteCount}, 1fr)`;
    this.root.appendChild(whiteRow);

    const blackLayer = document.createElement("div");
    blackLayer.className = "key-row black-row";
    this.root.appendChild(blackLayer);

    const semitoneOrder = [0, 2, 4, 5, 7, 9, 11];

    for (let o = 0; o < octaves; o++) {
      for (let s = 0; s < 7; s++) {
        const midi = baseMidi + o * 12 + semitoneOrder[s];
        const k = document.createElement("div");
        k.className = "key key-white";
        k.dataset.midi = String(midi);
        k.dataset.name = midiToName(midi);
        whiteRow.appendChild(k);
        this.keys.push({ midi, el: k });
      }
    }

    // Black keys positioned as percentage offsets over the white row.
    const blackOffsets = [1, 2, 4, 5, 6]; // 0-indexed white slots a black sits between
    for (let o = 0; o < octaves; o++) {
      for (const slot of blackOffsets) {
        const semitone = slot === 1 ? 1 : slot === 2 ? 3 : slot === 4 ? 6 : slot === 5 ? 8 : 10;
        const midi = baseMidi + o * 12 + semitone;
        const k = document.createElement("div");
        k.className = "key key-black";
        k.dataset.midi = String(midi);
        k.dataset.name = midiToName(midi);
        const center = ((o * 7 + slot) / whiteCount) * 100;
        const widthPct = (1 / whiteCount) * 100 * 0.62;
        k.style.left = `calc(${center}% - ${widthPct / 2}%)`;
        k.style.width = `${widthPct}%`;
        blackLayer.appendChild(k);
        this.keys.push({ midi, el: k });
      }
    }
  }

  private noteAtPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    if (!el) return null;
    const keyEl = el.closest<HTMLElement>(".key");
    if (!keyEl || !this.root.contains(keyEl)) return null;
    const midi = Number(keyEl.dataset.midi);
    return Number.isFinite(midi) ? midi : null;
  }

  private handlePointerDown = (ev: PointerEvent) => {
    const midi = this.noteAtPoint(ev.clientX, ev.clientY);
    if (midi === null) return;
    ev.preventDefault();
    this.root.setPointerCapture?.(ev.pointerId);
    this.pointerNote.set(ev.pointerId, midi);
    this.callbacks.onNoteOn(midi);
    this.highlight(midi, true);
  };

  private handlePointerMove = (ev: PointerEvent) => {
    if (!this.pointerNote.has(ev.pointerId)) return;
    const next = this.noteAtPoint(ev.clientX, ev.clientY);
    const current = this.pointerNote.get(ev.pointerId);
    if (next === null || next === current) return;
    if (current !== undefined) {
      this.callbacks.onNoteOff(current);
      this.highlight(current, false);
    }
    this.pointerNote.set(ev.pointerId, next);
    this.callbacks.onNoteOn(next);
    this.highlight(next, true);
  };

  private handlePointerUp = (ev: PointerEvent) => {
    const midi = this.pointerNote.get(ev.pointerId);
    if (midi === undefined) return;
    this.pointerNote.delete(ev.pointerId);
    this.callbacks.onNoteOff(midi);
    this.highlight(midi, false);
  };
}
