import { useCallback, useEffect, useRef } from "react";
import type { RoomId } from "./types";

type AudioCue = "arrival" | "threshold" | "artifact" | "discovery" | "aria" | "error";
type AudioOptions = { enabled: boolean; ambientVolume: number; interactionVolume: number; room: RoomId; reducedMotion: boolean };

const roomTone: Record<RoomId, number> = { "central-chamber": 74, archive: 112, lab: 96, observatory: 148 };
const cueTone: Record<AudioCue, { frequency: number; duration: number; pan: number; type: OscillatorType }> = {
  arrival: { frequency: 148, duration: 0.54, pan: 0, type: "sine" }, threshold: { frequency: 196, duration: 0.18, pan: -0.28, type: "triangle" }, artifact: { frequency: 262, duration: 0.13, pan: 0.22, type: "sine" }, discovery: { frequency: 392, duration: 0.34, pan: 0.32, type: "triangle" }, aria: { frequency: 220, duration: 0.23, pan: -0.18, type: "sine" }, error: { frequency: 118, duration: 0.16, pan: 0, type: "sine" },
};
const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function useVaultSpatialAudio({ enabled, ambientVolume, interactionVolume, room, reducedMotion }: AudioOptions) {
  const contextRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const interactionGainRef = useRef<GainNode | null>(null);
  const ambientOscillatorRef = useRef<OscillatorNode | null>(null);
  const supportedRef = useRef(true);

  const ensureContext = useCallback(() => {
    if (!supportedRef.current) return null;
    if (contextRef.current) return contextRef.current;
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) { supportedRef.current = false; return null; }
    try {
      const context = new Constructor();
      const ambient = context.createGain(); const interactions = context.createGain();
      ambient.connect(context.destination); interactions.connect(context.destination);
      contextRef.current = context; ambientGainRef.current = ambient; interactionGainRef.current = interactions;
      return context;
    } catch { supportedRef.current = false; return null; }
  }, []);

  const updateGains = useCallback(() => {
    const context = contextRef.current; if (!context) return;
    ambientGainRef.current?.gain.setTargetAtTime(enabled ? clamp(ambientVolume) / 100 * 0.043 : 0, context.currentTime, 0.06);
    interactionGainRef.current?.gain.setTargetAtTime(enabled ? clamp(interactionVolume) / 100 * 0.16 : 0, context.currentTime, 0.025);
  }, [ambientVolume, enabled, interactionVolume]);

  const startAmbient = useCallback(() => {
    const context = ensureContext(); if (!context || !enabled || ambientOscillatorRef.current) return;
    const oscillator = context.createOscillator(); const filter = context.createBiquadFilter();
    oscillator.type = "sine"; oscillator.frequency.value = roomTone[room]; filter.type = "lowpass"; filter.frequency.value = 240; filter.Q.value = 0.7;
    oscillator.connect(filter); filter.connect(ambientGainRef.current!); oscillator.start(); ambientOscillatorRef.current = oscillator;
  }, [enabled, ensureContext, room]);

  const setEnabledFromGesture = useCallback((nextEnabled: boolean) => {
    if (!nextEnabled) { const context = contextRef.current; if (context) { ambientGainRef.current?.gain.setTargetAtTime(0, context.currentTime, 0.02); interactionGainRef.current?.gain.setTargetAtTime(0, context.currentTime, 0.02); } return; }
    const context = ensureContext(); if (!context) return;
    void context.resume().catch(() => undefined); startAmbient(); updateGains();
  }, [ensureContext, startAmbient, updateGains]);

  const playCue = useCallback((cue: AudioCue) => {
    if (!enabled) return;
    const context = ensureContext(); const output = interactionGainRef.current; if (!context || !output) return;
    void context.resume().catch(() => undefined);
    const spec = cueTone[cue]; const oscillator = context.createOscillator(); const envelope = context.createGain();
    oscillator.type = spec.type; oscillator.frequency.setValueAtTime(spec.frequency, context.currentTime);
    envelope.gain.setValueAtTime(0.0001, context.currentTime); envelope.gain.exponentialRampToValueAtTime(0.42, context.currentTime + 0.012); envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + spec.duration);
    oscillator.connect(envelope);
    if ("createStereoPanner" in context) { const panner = context.createStereoPanner(); panner.pan.value = spec.pan; envelope.connect(panner); panner.connect(output); } else envelope.connect(output);
    oscillator.start(); oscillator.stop(context.currentTime + spec.duration + 0.03);
  }, [enabled, ensureContext]);

  useEffect(() => { updateGains(); }, [updateGains]);
  useEffect(() => () => { const oscillator = ambientOscillatorRef.current; if (oscillator) { try { oscillator.stop(); } catch { /* already stopped */ } ambientOscillatorRef.current = null; }; }, []);
  useEffect(() => () => { const context = contextRef.current; if (context) void context.close().catch(() => undefined); }, []);
  useEffect(() => { if (reducedMotion && ambientOscillatorRef.current && contextRef.current) ambientOscillatorRef.current.frequency.setTargetAtTime(roomTone[room], contextRef.current.currentTime, 0.08); }, [reducedMotion, room]);

  return { setEnabledFromGesture, playCue, isSupported: supportedRef.current };
}
