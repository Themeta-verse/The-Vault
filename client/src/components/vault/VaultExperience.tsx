import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CircleHelp, Compass, DoorOpen, Eye, EyeOff, Gauge, Keyboard, Loader2, Menu, Move3D, PanelLeftClose, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArchivePanel, LabPanel, ObservatoryPanel } from "./DestinationPanels";
import { roomNames, type AriaState, type RoomId } from "./types";

const VaultScene = lazy(() => import("./VaultScene"));

function useSmallViewport() {
  const [small, setSmall] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  useEffect(() => { const media = window.matchMedia("(max-width: 760px)"); const listener = () => setSmall(media.matches); listener(); media.addEventListener("change", listener); return () => media.removeEventListener("change", listener); }, []);
  return small;
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
  const smallViewport = useSmallViewport();
  const enterRoom = trpc.vault.enterRoom.useMutation({ onSuccess: () => utils.vault.state.invalidate(), onError: error => setAnnouncement(error.message) });
  const discover = trpc.vault.discover.useMutation({ onSuccess: data => { utils.vault.state.invalidate(); if (data.isNew) setAnnouncement(`DISCOVERY — ${data.object.name}${data.unlockedRoomId ? ` · ${roomNames[data.unlockedRoomId as RoomId]} is now available` : " · Added to your Vault History"}`); }, onError: error => setAnnouncement(error.message) });
  const settings = trpc.vault.settings.useMutation({ onSuccess: () => utils.vault.state.invalidate(), onError: error => setAnnouncement(error.message) });
  const note = trpc.vault.saveNote.useMutation({ onSuccess: () => { utils.vault.state.invalidate(); setAnnouncement("EXPERIMENT PRESERVED — Your note has been placed in the Lab."); }, onError: error => setAnnouncement(error.message) });
  const messages = trpc.aria.messages.useQuery(undefined, { enabled: room === "lab" });
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
    onError: error => { setAriaState("error"); setAnnouncement(error.message); window.setTimeout(() => setAriaState("idle"), 1800); },
  });

  const state = stateQuery.data;
  const reducedMotion = state?.settings?.reducedMotion ?? false;
  const preferFallback = state?.settings?.preferFallback ?? false;
  const renderQuality = state?.settings?.renderQuality ?? "auto";
  const lowPower = preferFallback || reducedMotion || renderQuality === "low" || (renderQuality === "auto" && smallViewport);
  const unlockedRooms = useMemo(() => state?.roomStates.filter(item => item.isUnlocked).map(item => item.roomId) ?? ["central-chamber"], [state?.roomStates]);
  const discoveredObjects = useMemo(() => state?.discoveries.map(item => item.objectId) ?? [], [state?.discoveries]);
  const visibleAriaState: AriaState = ariaState === "idle" && room === "lab" ? "listening" : ariaState;

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const supported = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    setWebglFailure(!supported);
  }, []);
  useEffect(() => {
    const lastRoom = state?.settings?.lastRoomId;
    if (["archive", "lab", "observatory"].includes(lastRoom ?? "")) setRoom(lastRoom as RoomId);
  }, [state?.settings?.lastRoomId]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setRoom("central-chamber"); setShowDeck(false); } if (event.key.toLowerCase() === "m") setShowDeck(value => !value); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);

  const changeRoom = (nextRoom: RoomId) => { if (nextRoom !== "central-chamber" && !unlockedRooms.includes(nextRoom)) { setAriaState("warning"); setAnnouncement("This threshold is sealed. The chamber is keeping a clue from you."); window.setTimeout(() => setAriaState("idle"), 1600); return; } setRoom(nextRoom); setEntered(true); enterRoom.mutate({ roomId: nextRoom }); };
  const applyAriaAction = (action: "none" | "navigate_archive" | "navigate_lab" | "navigate_observatory" | "show_discoveries") => {
    if (action === "show_discoveries") { setAnnouncement("ARIA has opened your discovered artifacts in THE ARCHIVE."); changeRoom("archive"); return; }
    if (action.startsWith("navigate_")) { const next = action.replace("navigate_", "") as RoomId; setAnnouncement(`ARIA has opened a route to ${roomNames[next]}.`); changeRoom(next); }
  };
  const activateObject = (objectId: string) => { if (objectId === "door-archive") return changeRoom("archive"); if (objectId === "door-lab" || objectId === "aria-entity") return changeRoom("lab"); if (objectId === "door-observatory") return changeRoom("observatory"); discover.mutate({ objectId }); };
  const start = () => { setEntered(true); settings.mutate({ introSeen: true }); enterRoom.mutate({ roomId: "central-chamber" }); };

  if (stateQuery.isLoading) return <div className="vault-loading"><div className="loading-sigil"><span /></div><p>THE VAULT IS REMEMBERING YOU</p></div>;
  if (stateQuery.error || !state) return <div className="vault-loading vault-error"><AlertTriangle /><h1>The Vault could not be opened.</h1><p>Your discoveries remain safe. Please refresh, then try again.</p><Button onClick={() => stateQuery.refetch()}>Try again</Button></div>;

  const renderDestination = () => { const shared = { state, onReturn: () => changeRoom("central-chamber"), onRoomChange: changeRoom }; if (room === "archive") return <ArchivePanel {...shared} />; if (room === "lab") return <LabPanel {...shared} messages={(messages.data ?? []) as never} sending={aria.isPending} saving={note.isPending} ariaState={visibleAriaState} onSend={message => aria.mutate({ roomId: "lab", message })} onSaveNote={(title, content) => note.mutate({ title, content })} />; if (room === "observatory") return <ObservatoryPanel {...shared} />; return null; };

  return <main className={`vault-app ${state.settings?.highContrast ? "vault-app--contrast" : ""} ${reducedMotion ? "vault-app--reduced" : ""}`}>
    <div className="vault-scene" aria-hidden="true">{!preferFallback && !webglFailure && <Suspense fallback={<div className="scene-skeleton" />}><VaultScene room={room} discoveredObjectIds={discoveredObjects} unlockedRoomIds={unlockedRooms} reducedMotion={reducedMotion} lowPower={lowPower} renderQuality={renderQuality} ariaState={visibleAriaState} onActivate={activateObject} /></Suspense>}</div>
    {(preferFallback || webglFailure) && <section className="fallback-chamber" aria-label="THE VAULT accessible spatial interface"><span className="eyebrow">{webglFailure ? "WEBGL UNAVAILABLE — ACCESSIBLE MODE ACTIVE" : "NON-3D MODE ACTIVE"}</span><h2>{room === "central-chamber" ? "THE VAULT'S CENTRAL CHAMBER" : roomNames[room]}</h2><p>{room === "central-chamber" ? "The same thresholds remain. Choose a route, inspect the unresolved signal, or speak with ARIA." : "This room is open. Its full workspace is available below."}</p>{room === "central-chamber" && <div className="fallback-thresholds"><button onClick={() => changeRoom("archive")}><Eye /><span>THRESHOLD</span>THE ARCHIVE</button><button onClick={() => changeRoom("lab")}><Sparkles /><span>THRESHOLD</span>THE LAB</button><button disabled={!unlockedRooms.includes("observatory")} onClick={() => changeRoom("observatory")}><Move3D /><span>{unlockedRooms.includes("observatory") ? "THRESHOLD" : "SEALED"}</span>THE OBSERVATORY</button><button onClick={() => activateObject("object-memory-prism")}><CircleHelp /><span>{discoveredObjects.includes("object-memory-prism") ? "RECORDED" : "UNRESOLVED"}</span>MEMORY PRISM</button>{discoveredObjects.includes("object-memory-prism") && !discoveredObjects.includes("object-echo-sigil") && <button onClick={() => activateObject("object-echo-sigil")}><Sparkles /><span>UNEXPECTED SIGNAL</span>ECHO SIGIL</button>}</div>}</section>}
    {!entered && <section className="entry-sequence" aria-label="Enter THE VAULT"><div className="entry-sequence__signal"><span /></div><p className="eyebrow">AN ACTIVE ARCHIVE OF YOUR ATTENTION</p><h1>THE<br />VAULT</h1><p className="entry-sequence__copy">A place that does not open all at once.</p><Button className="enter-button" onClick={start}><DoorOpen /> {state.settings?.introSeen ? "Return to the chamber" : "Enter the chamber"}</Button><p className="entry-sequence__hint">You can move through the experience with a mouse, keyboard, touch, or the accessible navigation deck.</p></section>}
    {entered && <>
      <header className="vault-status"><button className="vault-mark" onClick={() => changeRoom("central-chamber")} aria-label="Return to The Vault's central chamber"><span className="vault-mark__glyph">V</span><span>THE VAULT</span></button><div className="vault-status__center"><span className="live-dot" />{roomNames[room]}</div><div className="vault-status__right"><button onClick={() => setShowDeck(value => !value)} aria-expanded={showDeck} aria-controls="access-deck">{showDeck ? <X /> : <Menu />}<span className="sr-only">Toggle access deck</span></button></div></header>
      <div className="scene-prompt"><span>{room === "central-chamber" ? "Follow what responds." : "This room is now part of your route."}</span>{room === "central-chamber" && <small>Click a threshold, the prism, or ARIA.</small>}</div>
      {renderDestination()}
      <aside id="access-deck" className={`access-deck ${showDeck ? "access-deck--open" : ""}`} aria-label="Accessible Vault navigation"><div className="access-deck__head"><div><span className="eyebrow">ACCESS DECK</span><strong>Navigate intentionally.</strong></div><Button variant="ghost" size="icon" onClick={() => setShowDeck(false)}><PanelLeftClose /></Button></div><nav aria-label="Vault destinations"><button className={room === "central-chamber" ? "is-active" : ""} onClick={() => changeRoom("central-chamber")}><Compass /> The Vault's central chamber</button>{(["archive", "lab", "observatory"] as RoomId[]).map(destination => <button className={room === destination ? "is-active" : ""} disabled={!unlockedRooms.includes(destination)} key={destination} onClick={() => changeRoom(destination)}>{destination === "archive" ? <Eye /> : destination === "lab" ? <Sparkles /> : <Move3D />}{roomNames[destination]}{!unlockedRooms.includes(destination) && <span>SEALED</span>}</button>)}</nav><div className="access-deck__preferences"><span className="eyebrow">ENVIRONMENT</span><label><span><Gauge /> Reduced motion</span><Switch checked={reducedMotion} onCheckedChange={checked => settings.mutate({ reducedMotion: checked })} /></label><label><span><EyeOff /> High contrast</span><Switch checked={state.settings?.highContrast ?? false} onCheckedChange={checked => settings.mutate({ highContrast: checked })} /></label><label><span><PanelLeftClose /> Non-3D mode</span><Switch checked={preferFallback} onCheckedChange={checked => settings.mutate({ preferFallback: checked })} /></label><label className="quality-select"><span><Gauge /> Render quality</span><select aria-label="Rendering quality" value={renderQuality} onChange={event => settings.mutate({ renderQuality: event.target.value as "auto" | "high" | "low" })}><option value="auto">Auto</option><option value="high">High</option><option value="low">Low</option></select></label></div><div className="access-deck__keys"><Keyboard /><span><kbd>M</kbd> Navigation deck <kbd>Esc</kbd> Chamber</span></div></aside>
      <button className="access-deck-trigger" onClick={() => setShowDeck(true)}><CircleHelp /> <span>Accessible controls</span></button>
      {announcement && <div className="discovery-notice" role="status"><Sparkles /><div><span>VAULT SIGNAL</span><p>{announcement}</p></div><button onClick={() => setAnnouncement(null)} aria-label="Dismiss notification">×</button></div>}
    </>}
  </main>;
}
