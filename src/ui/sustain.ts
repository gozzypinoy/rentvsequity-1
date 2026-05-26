import type { SynthEngine } from "../synth/engine";
import type { OctaveController } from "./octave";

export interface ToolbarHandles {
  setSustain: (on: boolean) => void;
  isSustainOn: () => boolean;
}

export function mountToolbar(
  root: HTMLElement,
  engine: SynthEngine,
  octave: OctaveController,
): ToolbarHandles {
  root.innerHTML = "";

  const left = document.createElement("div");
  left.className = "toolbar-group";

  const octDown = document.createElement("button");
  octDown.type = "button";
  octDown.className = "tool-btn";
  octDown.textContent = "Oct −";
  octDown.addEventListener("click", () => octave.shift(-12));

  const octLabel = document.createElement("span");
  octLabel.className = "octave-label";
  octave.subscribe((s) => {
    const octNum = Math.floor(s.baseMidi / 12) - 1;
    octLabel.textContent = `C${octNum}`;
  });

  const octUp = document.createElement("button");
  octUp.type = "button";
  octUp.className = "tool-btn";
  octUp.textContent = "Oct +";
  octUp.addEventListener("click", () => octave.shift(12));

  left.append(octDown, octLabel, octUp);

  const right = document.createElement("div");
  right.className = "toolbar-group";

  const sustainBtn = document.createElement("button");
  sustainBtn.type = "button";
  sustainBtn.className = "tool-btn sustain-btn";
  sustainBtn.textContent = "Sustain";
  let sustainOn = false;
  const setSustain = (on: boolean) => {
    sustainOn = on;
    engine.setSustain(on);
    if (on) sustainBtn.dataset.active = "true";
    else delete sustainBtn.dataset.active;
  };
  sustainBtn.addEventListener("click", () => setSustain(!sustainOn));

  const panic = document.createElement("button");
  panic.type = "button";
  panic.className = "tool-btn";
  panic.textContent = "Panic";
  panic.addEventListener("click", () => engine.allNotesOff());

  right.append(sustainBtn, panic);

  root.append(left, right);

  return { setSustain, isSustainOn: () => sustainOn };
}
