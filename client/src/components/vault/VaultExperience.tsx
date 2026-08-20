import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleHelp, Compass, Eye, EyeOff, Gauge, Keyboard, Menu, Move3D, PanelLeftClose, Sparkles, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { WorldContext } from "./WorldContext";
import { roomNames, type AriaState, type RoomId, type VaultObjectId } from "./types";
import { canEnterWorldRoom, canReadReturningRegister, getChamberGuidance, getHandsetGuide, getObjectInteractionCue, getRetainedObjectStates, getWorldSignal, shouldEnterPersistentWorld } from "./worldExperience";
import { getWorldFailureCopy } from "./worldFailures";
import { useVaultSpatialAudio } from "./useVaultSpatialAudio";

const VaultScene = lazy(() => import("./VaultScene"));

function useSmallViewport() {
  const [small, setSmall] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const listener = () => setSmall(media.matches);
    listener();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);
  return small;
}

function getRoomPrompt(room: RoomId, chamberGuidance: string) {
  if (room === "central-chamber") return chamberGuidance;
  if (room === "archive") return "The stacks keep only what you have carried this far.";
  if (room === "lab") return "ARIA waits inside the listening aperture. The instruments receive a trace.";
  return "Your history has taken spatial form. Follow the lines that were not here before.";
}

function HandsetFieldStrip({ guide, onContinue, onDismiss }: { guide: { marker: string; prompt: string; actionLabel: string }; onContinue: () => void; onDismiss: () => void }) {
  return <aside className="handset-field-strip" aria-label="Handset field guide"><span className="handset-field-strip__marker">FIELD ROUTE · {guide.marker}</span><p>{guide.prompt}</p><div><button onClick={onContinue}>{guide.actionLabel}</button><button className="handset-field-strip__dismiss" onClick={onDismiss} aria-label="Dismiss handset field guide">Release</button></div></aside>;
}

export default function VaultExperience() {
  const utils = trpc.useUtils();
  const stateQuery = trpc.vault.state.useQuery();
  const [entered, setEntered] = useState(false);
  const [room, setRoom] = useState<RoomId>("central-chamber");
  const [showDeck, setShowDeck] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [webglFailure, setWebglFailure] = useState(false);
  const [ariaState, setAriaState] = useState<AriaState>("idle");
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [ariaFocused, setAriaFocused] = useState(false);
  const smallViewport = useSmallViewport();

  const advanceGuide = trpc.vault.advanceHandsetGuide.useMutation({
    onSuccess: data => {
      utils.vault.state.invalidate();
      if (data.stage === "complete") setAnnouncement("FIELD ROUTE COMPLETE — THE OBSERVATORY has entered your retained horizon.");
    },
    onError: () => setAnnouncement(getWorldFailureCopy("settings")),
  });
  const enterRoom = trpc.vault.enterRoom.useMutation({
    onSuccess: (_data, variables) => {
      utils.vault.state.invalidate();
      if (variables.roomId === "observatory") advanceGuide.mutate({ action: "advance" });
    },
    onError: error => setAnnouncement(error.message),
  });
  const observe = trpc.vault.observe.useMutation({
    onSuccess: data => {
      utils.vault.state.invalidate();
      advanceGuide.mutate({ action: "advance" });
      setAnnouncement(`SIGNAL REGISTERED — ${data.object.name} answered your attention. Return once more to retain it.`);
    },
    onError: error => setAnnouncement(error.message),
  });
  const discover = trpc.vault.discover.useMutation({
    onSuccess: data => {
      utils.vault.state.invalidate();
      advanceGuide.mutate({ action: "advance" });
      if (data.isNew) setAnnouncement(`RECORD RETAINED — ${data.object.name}${data.unlockedRoomId ? ` · ${roomNames[data.unlockedRoomId as RoomId]} is now available` : ""}`);
    },
    onError: error => setAnnouncement(error.message),
  });
  const settings = trpc.vault.settings.useMutation({
    onSuccess: () => utils.vault.state.invalidate(),
    onError: () => setAnnouncement(getWorldFailureCopy("settings")),
  });
  const note = trpc.vault.saveNote.useMutation({
    onSuccess: () => {
      utils.vault.state.invalidate();
      setAnnouncement("TRACE PRESERVED — The Archive has received a new material record.");
    },
    onError: error => setAnnouncement(error.message),
  });
  const materialize = trpc.vault.materialize.useMutation({
    onSuccess: data => {
      utils.vault.state.invalidate();
      setAnnouncement(`MATERIALIZED — ${data?.title ?? "Your trace"} now has a place in the stacks.`);
    },
    onError: error => setAnnouncement(error.message),
  });
  const understand = trpc.vault.understand.useMutation({
    onSuccess: data => {
      utils.vault.state.invalidate();
      setAnnouncement(data.unlockedObjectId ? "RELATIONSHIP REGISTERED — The Resonance Needle has entered the chamber." : "RELATIONSHIP REGISTERED — A deeper route has become visible.");
    },
    onError: error => setAnnouncement(error.message),
  });
  const messages = trpc.aria.messages.useQuery(undefined, { enabled: room === "lab" && ariaFocused });
  const aria = trpc.aria.send.useMutation({
    onMutate: () => setAriaState("thinking"),
    onSuccess: data => {
      utils.aria.messages.invalidate();
      utils.vault.state.invalidate();
      setAriaState("responding");
      applyAriaAction(data.suggestedAction);
      window.setTimeout(() => setAriaState("success"), 300);
      window.setTimeout(() => setAriaState("idle"), 1500);
    },
    onError: () => {
      setAriaState("error");
      setAnnouncement(getWorldFailureCopy("aria"));
      window.setTimeout(() => setAriaState("idle"), 1800);
    },
  });

  const state = stateQuery.data;
  const reducedMotion = state?.settings?.reducedMotion ?? false;
  const preferFallback = state?.settings?.preferFallback ?? false;
  const renderQuality = state?.settings?.renderQuality ?? "auto";
  const soundEnabled = state?.settings?.soundEnabled ?? false;
  const ambientVolume = state?.settings?.ambientVolume ?? 38;
  const interactionVolume = state?.settings?.interactionVolume ?? 62;
  const observatoryEra = state?.settings?.observatoryEra ?? "founding";
  const lowPower = preferFallback || reducedMotion || renderQuality === "low" || (renderQuality === "auto" && smallViewport);
  const isInWorld = shouldEnterPersistentWorld(entered, state?.settings?.introSeen === true);
  const spatialAudio = useVaultSpatialAudio({ enabled: soundEnabled, ambientVolume, interactionVolume, room, reducedMotion });
  const unlockedRooms = useMemo(() => state?.roomStates.filter(item => item.isUnlocked).map(item => item.roomId) ?? ["central-chamber"], [state?.roomStates]);
  const discoveredObjects = useMemo(() => state?.discoveries.map(item => item.objectId) ?? [], [state?.discoveries]);
  const objectStates = useMemo(() => new Map(state?.objectStates.map(item => [item.objectId, item.state]) ?? []), [state?.objectStates]);
  const sceneObjectStates = useMemo(() => getRetainedObjectStates(Object.fromEntries(objectStates), discoveredObjects), [objectStates, discoveredObjects]);
  const archiveArtifacts = useMemo(() => {
    const discovered = new Set(discoveredObjects);
    return (state?.artifacts ?? []).filter(item => discovered.has(item.objectId)).map(item => ({ id: item.id, objectId: item.objectId, title: item.title, category: item.category, accent: item.accent }));
  }, [state?.artifacts, discoveredObjects]);
  const worldSignal = getWorldSignal(sceneObjectStates);
  const isReturnVisit = (state?.history ?? []).filter(entry => entry.eventType === "visit" && entry.targetId === "central-chamber").length > 1;
  const prismCue = getObjectInteractionCue(sceneObjectStates["object-memory-prism"]);
  const chamberGuidance = worldSignal === "dormant" ? `${isReturnVisit ? "The chamber retained your prior line. " : ""}${prismCue.prompt}` : getChamberGuidance(worldSignal, isReturnVisit);
  const handsetGuide = smallViewport ? getHandsetGuide(state?.settings?.handsetGuideStage ?? "attention", sceneObjectStates["object-memory-prism"], unlockedRooms.includes("observatory"), isReturnVisit) : null;
  const returningEraAvailable = canReadReturningRegister(discoveredObjects.length);
  const effectiveObservatoryEra = observatoryEra === "returning" && returningEraAvailable ? "returning" : "founding";
  const visibleAriaState: AriaState = ariaState === "idle" && room === "lab" ? "listening" : ariaState;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    setWebglFailure(!Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
  }, []);
  useEffect(() => {
    const lastRoom = state?.settings?.lastRoomId;
    if (["archive", "lab", "observatory"].includes(lastRoom ?? "")) setRoom(lastRoom as RoomId);
  }, [state?.settings?.lastRoomId]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedArtifactId(null); setCatalogOpen(false); setAriaFocused(false); setShowDeck(false); }
      if (event.key.toLowerCase() === "m") setShowDeck(value => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const changeRoom = (nextRoom: RoomId) => {
    spatialAudio.setEnabledFromGesture(soundEnabled);
    if (!canEnterWorldRoom(nextRoom, unlockedRooms)) {
      spatialAudio.playCue("error");
      setAriaState("warning");
      setAnnouncement("THIS THRESHOLD IS SEALED — Its registration point is elsewhere in the chamber.");
      window.setTimeout(() => setAriaState("idle"), 1600);
      return;
    }
    spatialAudio.playCue("threshold");
    setRoom(nextRoom);
    setEntered(true);
    setShowDeck(false);
    setSelectedArtifactId(null);
    setCatalogOpen(false);
    setAriaFocused(false);
    enterRoom.mutate({ roomId: nextRoom });
  };

  const applyAriaAction = (action: "none" | "navigate_archive" | "navigate_lab" | "navigate_observatory" | "show_discoveries") => {
    if (action === "show_discoveries") { setAnnouncement("ARIA has indicated the objects already held in the Archive."); changeRoom("archive"); return; }
    if (action.startsWith("navigate_")) { const next = action.replace("navigate_", "") as RoomId; setAnnouncement(`ARIA has marked a line toward ${roomNames[next]}.`); changeRoom(next); }
  };

  const activateObject = (objectId: VaultObjectId) => {
    spatialAudio.setEnabledFromGesture(soundEnabled);
    if (objectId === "door-archive") return changeRoom("archive");
    if (objectId === "door-lab") return changeRoom("lab");
    if (objectId === "door-observatory") return changeRoom("observatory");
    if (objectId === "aria-entity") { spatialAudio.playCue("aria"); changeRoom("lab"); setAriaFocused(true); return; }
    spatialAudio.playCue("artifact");
    const currentState = sceneObjectStates[objectId] ?? "unknown";
    if (currentState === "unknown") { observe.mutate({ objectId }); return; }
    discover.mutate({ objectId });
  };

  const start = () => {
    spatialAudio.setEnabledFromGesture(soundEnabled);
    spatialAudio.playCue("arrival");
    setEntered(true);
    settings.mutate({ introSeen: true });
    enterRoom.mutate({ roomId: "central-chamber" });
  };
  const continueHandsetGuide = () => handsetGuide?.stage === "north" ? changeRoom("observatory") : activateObject("object-memory-prism");

  if (stateQuery.isLoading) return <div className="vault-loading"><div className="loading-sigil"><span /></div><p>THE VAULT IS REMEMBERING YOU</p></div>;
  if (stateQuery.error || !state) return <div className="vault-loading vault-error"><AlertTriangle /><h1>The Vault could not be opened.</h1><p>{getWorldFailureCopy("state")}</p><Button onClick={() => stateQuery.refetch()}>Try again</Button></div>;

  return <main className={`vault-app ${state.settings?.highContrast ? "vault-app--contrast" : ""} ${reducedMotion ? "vault-app--reduced" : ""}`}>
    <div className="vault-scene" aria-hidden="true">{!preferFallback && !webglFailure && <Suspense fallback={<div className="scene-skeleton" />}><VaultScene room={room} discoveredObjectIds={discoveredObjects} unlockedRoomIds={unlockedRooms} reducedMotion={reducedMotion} lowPower={lowPower} renderQuality={renderQuality} ariaState={visibleAriaState} objectStates={sceneObjectStates} worldSignal={worldSignal} isReturnVisit={isReturnVisit} archiveArtifacts={archiveArtifacts} creationCount={state.creations.length} relationshipCount={state.relationships.length} visitCount={state.history.filter(entry => entry.eventType === "visit").length} observatoryEra={effectiveObservatoryEra} onActivate={activateObject} onInspectArtifact={setSelectedArtifactId} onToggleCatalog={() => setCatalogOpen(value => !value)} onFocusAria={() => setAriaFocused(true)} onExitRoom={() => changeRoom("central-chamber")} /></Suspense>}</div>

    {(preferFallback || webglFailure) && <section className="fallback-chamber" aria-label="THE VAULT accessible spatial interface"><span className="eyebrow">{webglFailure ? "WEBGL UNAVAILABLE · ACCESSIBLE MAP ACTIVE" : "NON-3D MAP ACTIVE"}</span><h2>{room === "central-chamber" ? "THE VAULT'S CENTRAL CHAMBER" : roomNames[room]}</h2><p>{room === "central-chamber" ? "The same thresholds, signal, and discovery contracts remain available without 3D rendering. Choose a route or attend the unresolved datum." : "This chamber is open. Its held records remain available in the same order."}</p>{room === "central-chamber" && <div className="fallback-thresholds"><button onClick={() => changeRoom("archive")}><Eye /><span>WEST THRESHOLD</span>THE ARCHIVE</button><button onClick={() => changeRoom("lab")}><Sparkles /><span>EAST THRESHOLD</span>THE LAB</button><button disabled={!unlockedRooms.includes("observatory")} onClick={() => changeRoom("observatory")}><Move3D /><span>{unlockedRooms.includes("observatory") ? "NORTH THRESHOLD" : "NORTH SEALED"}</span>THE OBSERVATORY</button><button onClick={() => activateObject("object-memory-prism")}><CircleHelp /><span>{prismCue.caption}</span>MEMORY PRISM</button></div>}</section>}

    {!isInWorld && <section className="entry-sequence" aria-label="Enter THE VAULT"><div className="entry-sequence__signal" aria-hidden="true"><span /></div><p className="eyebrow">PERSONAL RECORD · READY FOR REGISTRATION</p><h1>THE<br />VAULT</h1><p className="entry-sequence__copy">The chamber does not need a guide. It needs your attention.</p><Button className="enter-button" onClick={start}>Lay a hand on the datum</Button><p className="entry-sequence__hint">Mouse, touch, keyboard, and the optional operations folio all describe the same world.</p></section>}

    {isInWorld && <><div className="world-hud"><span className="world-hud__room">{room === "central-chamber" ? "CENTRAL CHAMBER" : roomNames[room]}</span><button onClick={() => setShowDeck(value => !value)} aria-expanded={showDeck} aria-controls="access-deck">{showDeck ? <X /> : <Menu />}<span className="sr-only">Open operations folio</span></button></div><div className="scene-prompt"><span>{getRoomPrompt(room, chamberGuidance)}</span></div>{handsetGuide && <HandsetFieldStrip guide={handsetGuide} onContinue={continueHandsetGuide} onDismiss={() => advanceGuide.mutate({ action: "dismiss" })} />}{room === "central-chamber" && <div className="mobile-vectors" aria-label="Spatial touch controls"><button onClick={() => worldSignal === "resonant" ? activateObject("object-echo-sigil") : worldSignal === "mastered" ? changeRoom("observatory") : activateObject("object-memory-prism")}><Sparkles /><span>{worldSignal === "resonant" ? "Read the Echo" : worldSignal === "mastered" ? "Trace north" : "Attend the Prism"}</span></button><button onClick={() => { changeRoom("lab"); setAriaFocused(true); }}><CircleHelp /><span>Find ARIA</span></button><button onClick={() => setShowDeck(true)}><Menu /><span>Folio</span></button></div>}<WorldContext room={room} state={state} selectedArtifactId={selectedArtifactId} catalogOpen={catalogOpen} ariaFocused={ariaFocused} messages={(messages.data ?? []) as never} ariaState={visibleAriaState} sending={aria.isPending} saving={note.isPending} materializing={materialize.isPending ? materialize.variables?.noteId ?? null : null} understanding={understand.isPending} observatoryEra={effectiveObservatoryEra} returningEraAvailable={returningEraAvailable} onSelectObservatoryEra={era => settings.mutate({ observatoryEra: era })} onCloseArtifact={() => setSelectedArtifactId(null)} onCloseCatalog={() => setCatalogOpen(false)} onCloseAria={() => setAriaFocused(false)} onInspectArtifact={setSelectedArtifactId} onSend={message => aria.mutate({ roomId: "lab", message })} onSaveNote={(title, content) => note.mutate({ title, content })} onMaterialize={noteId => materialize.mutate({ noteId })} onUnderstand={objectId => understand.mutate({ objectId })} /><aside id="access-deck" className={`access-deck ${showDeck ? "access-deck--open" : ""}`} aria-label="Vault operations folio" aria-hidden={!showDeck} inert={!showDeck}><div className="access-deck__head"><div><span className="eyebrow">OPERATIONS FOLIO · PERSONAL RECORD</span><strong>Routes, conditions, and silence.</strong></div><Button variant="ghost" size="icon" onClick={() => setShowDeck(false)} aria-label="Close operations folio"><PanelLeftClose /></Button></div><nav aria-label="Vault thresholds"><button className={room === "central-chamber" ? "is-active" : ""} onClick={() => changeRoom("central-chamber")}><Compass /> Central chamber</button>{(["archive", "lab", "observatory"] as RoomId[]).map(destination => <button className={room === destination ? "is-active" : ""} disabled={!unlockedRooms.includes(destination)} key={destination} onClick={() => changeRoom(destination)}>{destination === "archive" ? <Eye /> : destination === "lab" ? <Sparkles /> : <Move3D />}{roomNames[destination]}{!unlockedRooms.includes(destination) && <span>SEALED</span>}</button>)}</nav><div className="access-deck__preferences"><span className="eyebrow">ROOM CONDITIONS</span><label><span><Volume2 /> Spatial audio</span><Switch checked={soundEnabled} onCheckedChange={checked => { spatialAudio.setEnabledFromGesture(checked); settings.mutate({ soundEnabled: checked }); }} /></label>{soundEnabled && <><label className="audio-range"><span>Ambient field <output>{ambientVolume}%</output></span><input type="range" min="0" max="100" value={ambientVolume} onChange={event => settings.mutate({ ambientVolume: Number(event.target.value) })} aria-label="Ambient volume" /></label><label className="audio-range"><span>Interaction cues <output>{interactionVolume}%</output></span><input type="range" min="0" max="100" value={interactionVolume} onChange={event => settings.mutate({ interactionVolume: Number(event.target.value) })} aria-label="Interaction volume" /></label></>}<label><span><Gauge /> Reduced motion</span><Switch checked={reducedMotion} onCheckedChange={checked => settings.mutate({ reducedMotion: checked })} /></label><label><span><EyeOff /> High contrast</span><Switch checked={state.settings?.highContrast ?? false} onCheckedChange={checked => settings.mutate({ highContrast: checked })} /></label><label><span><PanelLeftClose /> Non-3D map</span><Switch checked={preferFallback} onCheckedChange={checked => settings.mutate({ preferFallback: checked })} /></label><label className="quality-select"><span><Gauge /> Rendering density</span><select aria-label="Rendering quality" value={renderQuality} onChange={event => settings.mutate({ renderQuality: event.target.value as "auto" | "high" | "low"})}><option value="auto">Adaptive</option><option value="high">High</option><option value="low">Low</option></select></label></div><div className="access-deck__keys"><Keyboard /><span><kbd>M</kbd> Folio <kbd>Esc</kbd> Release context</span></div></aside><button className="access-deck-trigger" onClick={() => setShowDeck(true)}><CircleHelp /> <span>Accessible controls</span></button>{announcement && <div className="discovery-notice" role="status"><Sparkles /><div><span>VAULT REGISTRATION</span><p>{announcement}</p></div><button onClick={() => setAnnouncement(null)} aria-label="Dismiss notification">×</button></div>}</>}
  </main>;
}
