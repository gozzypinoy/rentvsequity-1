import type { OscType, SynthEngine } from "../synth/engine";

interface SliderSpec {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
  onInput: (v: number) => void;
}

const OSC_TYPES: OscType[] = ["sine", "triangle", "sawtooth", "square"];

export function mountControls(root: HTMLElement, engine: SynthEngine): void {
  root.innerHTML = "";

  const oscWrap = document.createElement("div");
  oscWrap.className = "control osc";
  const oscLabel = document.createElement("span");
  oscLabel.className = "control-label";
  oscLabel.textContent = "Osc";
  oscWrap.appendChild(oscLabel);

  const oscSeg = document.createElement("div");
  oscSeg.className = "segmented";
  for (const t of OSC_TYPES) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = labelForOsc(t);
    b.dataset.value = t;
    if (t === "sawtooth") b.dataset.active = "true";
    b.addEventListener("click", () => {
      for (const child of oscSeg.children) {
        delete (child as HTMLElement).dataset.active;
      }
      b.dataset.active = "true";
      engine.setOscType(t);
    });
    oscSeg.appendChild(b);
  }
  oscWrap.appendChild(oscSeg);
  root.appendChild(oscWrap);

  const filterState = { cutoff: 4000, resonance: 1 };
  const envState = { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.4 };

  const sliders: SliderSpec[] = [
    {
      id: "cutoff",
      label: "Cutoff",
      min: 0,
      max: 1,
      step: 0.001,
      value: freqToNorm(filterState.cutoff),
      format: (v) => `${Math.round(normToFreq(v))} Hz`,
      onInput: (v) => {
        filterState.cutoff = normToFreq(v);
        engine.setFilter(filterState);
      },
    },
    {
      id: "resonance",
      label: "Res",
      min: 0,
      max: 20,
      step: 0.1,
      value: filterState.resonance,
      format: (v) => v.toFixed(1),
      onInput: (v) => {
        filterState.resonance = v;
        engine.setFilter(filterState);
      },
    },
    {
      id: "attack",
      label: "A",
      min: 0.001,
      max: 2,
      step: 0.001,
      value: envState.attack,
      format: fmtSec,
      onInput: (v) => {
        envState.attack = v;
        engine.setEnvelope(envState);
      },
    },
    {
      id: "decay",
      label: "D",
      min: 0.001,
      max: 2,
      step: 0.001,
      value: envState.decay,
      format: fmtSec,
      onInput: (v) => {
        envState.decay = v;
        engine.setEnvelope(envState);
      },
    },
    {
      id: "sustain",
      label: "S",
      min: 0,
      max: 1,
      step: 0.01,
      value: envState.sustain,
      format: (v) => v.toFixed(2),
      onInput: (v) => {
        envState.sustain = v;
        engine.setEnvelope(envState);
      },
    },
    {
      id: "release",
      label: "R",
      min: 0.01,
      max: 4,
      step: 0.01,
      value: envState.release,
      format: fmtSec,
      onInput: (v) => {
        envState.release = v;
        engine.setEnvelope(envState);
      },
    },
    {
      id: "volume",
      label: "Vol",
      min: -40,
      max: 0,
      step: 0.5,
      value: -8,
      format: (v) => `${v.toFixed(0)} dB`,
      onInput: (v) => engine.setVolume(v),
    },
  ];

  for (const s of sliders) root.appendChild(buildSlider(s));
}

function buildSlider(spec: SliderSpec): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "control slider";
  wrap.htmlFor = `ctl-${spec.id}`;

  const top = document.createElement("div");
  top.className = "slider-top";
  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = spec.label;
  const readout = document.createElement("span");
  readout.className = "control-readout";
  readout.textContent = spec.format ? spec.format(spec.value) : String(spec.value);
  top.appendChild(label);
  top.appendChild(readout);

  const input = document.createElement("input");
  input.type = "range";
  input.id = `ctl-${spec.id}`;
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  input.value = String(spec.value);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    readout.textContent = spec.format ? spec.format(v) : String(v);
    spec.onInput(v);
  });

  wrap.appendChild(top);
  wrap.appendChild(input);
  return wrap;
}

function labelForOsc(t: OscType): string {
  if (t === "sine") return "Sin";
  if (t === "triangle") return "Tri";
  if (t === "sawtooth") return "Saw";
  return "Sqr";
}

function fmtSec(v: number): string {
  if (v >= 1) return `${v.toFixed(2)} s`;
  return `${Math.round(v * 1000)} ms`;
}

// Log-scale mapping between 0..1 slider and 20Hz..20kHz.
function normToFreq(n: number): number {
  const min = Math.log(20);
  const max = Math.log(20000);
  return Math.exp(min + (max - min) * n);
}
function freqToNorm(f: number): number {
  const min = Math.log(20);
  const max = Math.log(20000);
  return (Math.log(f) - min) / (max - min);
}
