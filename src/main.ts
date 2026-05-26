import "./styles.css";
import { SynthEngine } from "./synth/engine";
import { Keyboard } from "./ui/keyboard";
import { mountControls } from "./ui/controls";
import { mountToolbar } from "./ui/sustain";
import { OctaveController } from "./ui/octave";
import { bindQwerty } from "./input/qwerty";
import { bindMidi } from "./input/midi";
import { setupPwa } from "./pwa/register";

const splash = document.getElementById("splash") as HTMLElement;
const stage = document.getElementById("stage") as HTMLElement;
const startBtn = document.getElementById("start-btn") as HTMLButtonElement;
const controlsEl = document.getElementById("controls") as HTMLElement;
const toolbarEl = document.getElementById("toolbar") as HTMLElement;
const keyboardEl = document.getElementById("keyboard") as HTMLElement;

// Belt-and-braces: block iOS pinch-zoom and double-tap zoom on the app surface.
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault());

const engine = new SynthEngine();

// Larger range on tablets, narrower on phones.
const isTablet = window.matchMedia("(min-width: 768px)").matches;
const octave = new OctaveController(48, isTablet ? 3 : 2);

const keyboard = new Keyboard(keyboardEl, octave, {
  onNoteOn: (midi) => engine.noteOn(midi),
  onNoteOff: (midi) => engine.noteOff(midi),
});

mountControls(controlsEl, engine);
const toolbar = mountToolbar(toolbarEl, engine, octave);

bindQwerty(
  octave,
  {
    onNoteOn: (midi) => {
      engine.noteOn(midi);
      keyboard.highlight(midi, true);
    },
    onNoteOff: (midi) => {
      engine.noteOff(midi);
      keyboard.highlight(midi, false);
    },
  },
  toolbar.isSustainOn,
  toolbar.setSustain,
);

void bindMidi({
  onNoteOn: (midi) => {
    engine.noteOn(midi);
    keyboard.highlight(midi, true);
  },
  onNoteOff: (midi) => {
    engine.noteOff(midi);
    keyboard.highlight(midi, false);
  },
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void engine.resume();
});

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startBtn.textContent = "Starting…";
  try {
    await engine.unlock();
    splash.hidden = true;
    stage.hidden = false;
  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    startBtn.textContent = "Tap to start";
  }
});

setupPwa();
