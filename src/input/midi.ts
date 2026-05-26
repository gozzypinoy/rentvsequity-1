export interface MidiCallbacks {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff: (midi: number) => void;
}

export async function bindMidi(callbacks: MidiCallbacks): Promise<boolean> {
  if (typeof navigator === "undefined" || !("requestMIDIAccess" in navigator)) {
    return false;
  }

  let access: MIDIAccess;
  try {
    access = await navigator.requestMIDIAccess();
  } catch {
    return false;
  }

  const attach = () => {
    for (const input of access.inputs.values()) {
      input.onmidimessage = (ev) => {
        const data = ev.data;
        if (!data || data.length < 3) return;
        const status = data[0];
        const note = data[1];
        const velocity = data[2];
        const command = status & 0xf0;
        if (command === 0x90 && velocity > 0) callbacks.onNoteOn(note, velocity / 127);
        else if (command === 0x80 || (command === 0x90 && velocity === 0)) callbacks.onNoteOff(note);
      };
    }
  };

  attach();
  access.onstatechange = attach;
  return true;
}
