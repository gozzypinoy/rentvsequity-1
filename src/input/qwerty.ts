import type { OctaveController } from "../ui/octave";

// Ableton-style mapping: lower row a..; covers ~1.5 octaves from baseMidi.
const KEY_TO_OFFSET: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ";": 16, "'": 17,
};

export interface QwertyCallbacks {
  onNoteOn: (midi: number) => void;
  onNoteOff: (midi: number) => void;
}

export function bindQwerty(
  octave: OctaveController,
  callbacks: QwertyCallbacks,
  isSustainOn: () => boolean,
  setSustain: (on: boolean) => void,
): void {
  const held = new Map<string, number>();

  const noteForKey = (key: string): number | null => {
    const offset = KEY_TO_OFFSET[key];
    if (offset === undefined) return null;
    return octave.get().baseMidi + offset;
  };

  window.addEventListener("keydown", (ev) => {
    if (ev.repeat) return;
    if (isTextTarget(ev.target)) return;
    const key = ev.key.toLowerCase();

    if (key === "z") {
      octave.shift(-12);
      return;
    }
    if (key === "x") {
      octave.shift(12);
      return;
    }
    if (key === " ") {
      ev.preventDefault();
      setSustain(!isSustainOn());
      return;
    }

    const midi = noteForKey(key);
    if (midi === null) return;
    if (held.has(key)) return;
    held.set(key, midi);
    callbacks.onNoteOn(midi);
  });

  window.addEventListener("keyup", (ev) => {
    if (isTextTarget(ev.target)) return;
    const key = ev.key.toLowerCase();
    const midi = held.get(key);
    if (midi === undefined) return;
    held.delete(key);
    callbacks.onNoteOff(midi);
  });

  window.addEventListener("blur", () => {
    for (const midi of held.values()) callbacks.onNoteOff(midi);
    held.clear();
  });
}

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    const t = (target as HTMLInputElement).type;
    return t !== "range" && t !== "button";
  }
  return target.isContentEditable;
}
