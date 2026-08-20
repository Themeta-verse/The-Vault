import { FormEvent, useMemo, useState } from "react";
import { Archive, ArrowUpRight, CircleDot, FlaskConical, Loader2, Search, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AriaState, VaultState } from "./types";

type ContextProps = {
  room: "archive" | "lab" | "observatory" | "central-chamber";
  state: VaultState;
  selectedArtifactId: string | null;
  catalogOpen: boolean;
  ariaFocused: boolean;
  messages: Array<{ id: number; role: "user" | "aria"; content: string; createdAt: Date }>;
  ariaState: AriaState;
  sending: boolean;
  saving: boolean;
  materializing: number | null;
  understanding: boolean;
  observatoryEra: "founding" | "returning";
  returningEraAvailable: boolean;
  onCloseArtifact: () => void;
  onCloseCatalog: () => void;
  onCloseAria: () => void;
  onInspectArtifact: (id: string) => void;
  onSend: (message: string) => void;
  onSaveNote: (title: string, content: string) => void;
  onMaterialize: (noteId: number) => void;
  onUnderstand: (objectId: "object-echo-sigil" | "object-palimpsest-lens" | "object-quiet-cistern" | "object-astral-index") => void;
  onSelectObservatoryEra: (era: "founding" | "returning") => void;
};

function Close({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="world-context__close" aria-label={label} onClick={onClick}><X /></button>;
}

function ArchiveContext({ state, selectedArtifactId, catalogOpen, onCloseArtifact, onCloseCatalog, onInspectArtifact }: Pick<ContextProps, "state" | "selectedArtifactId" | "catalogOpen" | "onCloseArtifact" | "onCloseCatalog" | "onInspectArtifact">) {
  const [query, setQuery] = useState("");
  const heldFragmentIds = new Set(state.fragments.map(item => item.artifactId));
  const available = state.artifacts.filter(item => heldFragmentIds.has(item.id));
  const selected = available.find(item => item.id === selectedArtifactId) ?? null;
  const matches = useMemo(() => available.filter(item => `${item.title} ${item.category} ${item.description} ${item.fragmentTitle}`.toLowerCase().includes(query.toLowerCase().trim())), [available, query]);
  const relations = selected ? state.relationships.filter(link => link.sourceObjectId === selected.objectId || link.targetObjectId === selected.objectId) : [];

  if (catalogOpen) return <aside className="world-context world-context--catalog" aria-label="Archive indexing engine"><Close label="Close indexing engine" onClick={onCloseCatalog} /><span className="world-context__eyebrow"><Search /> INDEXING ENGINE · STACK 04</span><p className="catalogue-introduction">{state.fragments.length} marginal record{state.fragments.length === 1 ? "" : "s"} remain held in your collection.</p><Input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Locate a held object" aria-label="Search held archive records" />{state.creations.length > 0 && <div className="catalogue-memory" aria-label="Materialized Lab traces"><span>LAB TRACES HELD</span>{state.creations.slice(0, 3).map(creation => <p key={creation.id}>◇ {creation.title}</p>)}</div>}<div className="catalogue-results">{matches.map(item => <button key={item.id} onClick={() => onInspectArtifact(item.id)}><span style={{ "--artifact-accent": item.accent } as React.CSSProperties}>◇</span><strong>{item.title}</strong><small>{item.category} · fragment retained</small><ArrowUpRight /></button>)}{!matches.length && <p>No held fragment answers that query.</p>}</div></aside>;
  if (!selected) return null;
  return <aside className="world-context world-context--artifact" aria-label={`Inspect ${selected.title}`} style={{ "--artifact-accent": selected.accent } as React.CSSProperties}><Close label="Return to Archive" onClick={onCloseArtifact} /><span className="world-context__eyebrow"><Archive /> CONTAINMENT RECORD · HELD</span><div className="artifact-context__glyph">◇</div><h2>{selected.title}</h2><p className="artifact-context__subtitle">{selected.subtitle}</p><p>{selected.description}</p><div className="artifact-context__fragment"><span>{selected.fragmentEra}</span><h3>{selected.fragmentTitle}</h3><blockquote>{selected.fragmentBody}</blockquote></div><div className="artifact-context__rule" />{relations.length > 0 && <div className="artifact-context__relations"><span>REGISTERED CONNECTIONS</span>{relations.map(relation => <p key={relation.id}><CircleDot /> {relation.label}</p>)}</div>}<button className="world-context__dismiss" onClick={onCloseArtifact}>Return specimen to the stacks</button></aside>;
}

function LabContext({ state, messages, ariaState, sending, saving, materializing, understanding, onCloseAria, onSend, onSaveNote, onMaterialize, onUnderstand }: Pick<ContextProps, "state" | "messages" | "ariaState" | "sending" | "saving" | "materializing" | "understanding" | "onCloseAria" | "onSend" | "onSaveNote" | "onMaterialize" | "onUnderstand">) {
  const [mode, setMode] = useState<"voice" | "record">("voice");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const submitMessage = (event: FormEvent) => { event.preventDefault(); if (!message.trim() || sending) return; onSend(message.trim()); setMessage(""); };
  const submitNote = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !note.trim() || saving) return; onSaveNote(title.trim(), note.trim()); setTitle(""); setNote(""); };
  const interpretable = state.objectStates.filter(item => ["object-echo-sigil", "object-palimpsest-lens", "object-quiet-cistern"].includes(item.objectId) && item.state === "discovered");
  const interpretationNames: Record<string, string> = { "object-echo-sigil": "Ask ARIA to read the Echo Sigil", "object-palimpsest-lens": "Ask ARIA to read the Palimpsest Lens", "object-quiet-cistern": "Ask ARIA to settle the Quiet Cistern" };
  const latestRelationship = state.relationships.at(-1)?.label;
  const latestCreation = state.creations.at(0)?.title;
  const retainedContext = latestRelationship ?? (latestCreation ? `${latestCreation} remains held in THE ARCHIVE.` : state.fragments.length ? `${state.fragments.length} retained fragment${state.fragments.length === 1 ? "" : "s"} and ${state.discoveries.length} signal${state.discoveries.length === 1 ? "" : "s"} are available to this conversation.` : state.discoveries.length ? `${state.discoveries.length} retained signal${state.discoveries.length === 1 ? "" : "s"} are available to this conversation.` : "No object has entered your record yet. Begin with what the chamber offers.");
  return <aside className="world-context world-context--aria" aria-label="ARIA listening aperture"><Close label="Step away from ARIA" onClick={onCloseAria} /><div className="aria-context__head"><span className={`aria-context__presence aria-context__presence--${ariaState}`} /><div><span className="world-context__eyebrow">CONTAINED INTELLIGENCE · APERTURE 03</span><h2>ARIA</h2></div></div><p className="aria-context__memory"><span>WHAT ARIA CAN HOLD</span>{retainedContext}</p><div className="context-switch" role="tablist" aria-label="Lab instruments"><button role="tab" aria-selected={mode === "voice"} onClick={() => setMode("voice")}>Listen</button><button role="tab" aria-selected={mode === "record"} onClick={() => setMode("record")}>Record trace</button></div>{mode === "voice" ? <><div className="aria-transcript" aria-live="polite">{messages.slice(-3).map(item => <p key={item.id} className={`aria-transcript__${item.role}`}><span>{item.role === "aria" ? "ARIA / RESPONSE" : "YOUR TRANSMISSION"}</span>{item.content}</p>)}{!messages.length && <p className="aria-transcript__aria"><span>ARIA / PRESENT</span>{retainedContext}</p>}</div>{interpretable.map(item => <button className="context-action" key={item.objectId} onClick={() => onUnderstand(item.objectId as "object-echo-sigil" | "object-palimpsest-lens" | "object-quiet-cistern")} disabled={understanding}>{understanding ? <Loader2 className="spin" /> : <Sparkles />} {interpretationNames[item.objectId]}</button>)}<form className="context-composer" onSubmit={submitMessage}><Input value={message} onChange={event => setMessage(event.target.value)} placeholder="Transmit an observation" aria-label="Transmit a question to ARIA" /><Button type="submit" disabled={sending || !message.trim()} aria-label="Transmit message">{sending ? <Loader2 className="spin" /> : <Send />}</Button></form></> : <><form className="instrument-form" onSubmit={submitNote}><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Name the trace" aria-label="Experiment title" /><Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Record what changed" aria-label="Experiment note" /><Button type="submit" disabled={saving || !title.trim() || !note.trim()}>{saving ? <Loader2 className="spin" /> : <FlaskConical />} Preserve trace</Button></form><div className="materialization-list">{state.notes.slice(0, 3).map(noteItem => <button key={noteItem.id} onClick={() => onMaterialize(noteItem.id)} disabled={materializing !== null || state.creations.some(creation => creation.sourceNoteId === noteItem.id)}><span>{state.creations.some(creation => creation.sourceNoteId === noteItem.id) ? "HELD" : "MATERIALIZE"}</span>{noteItem.title}</button>)}</div></>}</aside>;
}

function ObservatoryContext({ state, observatoryEra, returningEraAvailable, onSelectObservatoryEra }: Pick<ContextProps, "state" | "observatoryEra" | "returningEraAvailable" | "onSelectObservatoryEra">) {
  const latest = state.relationships.slice(-4);
  const visits = state.history.filter(entry => entry.eventType === "visit").length;
  const returning = observatoryEra === "returning";
  return <><aside className="world-context world-context--observatory" aria-label="Observatory memory field"><span className="world-context__eyebrow"><CircleDot /> MNEMONIC FIELD</span><p className="observatory-context__count">{state.discoveries.length}<small>signals now held</small></p><p className="observatory-context__memory">{state.fragments.length} artifact fragment{state.fragments.length === 1 ? "" : "s"} now alter the record</p>{state.creations.length > 0 && <p className="observatory-context__memory">{state.creations.length} trace{state.creations.length === 1 ? "" : "s"} transferred from THE LAB</p>}<p className="observatory-context__memory">{visits} room passage{visits === 1 ? "" : "s"} remain in the record</p>{latest.map(relation => <p className="observatory-context__link" key={relation.id}><CircleDot /> {relation.label}</p>)}</aside><section className="observatory-chronicle" aria-label="Observatory historical register"><span className="world-context__eyebrow"><CircleDot /> CHRONICLE DIAL</span><div className="observatory-chronicle__dial" role="group" aria-label="Select mnemonic register"><button aria-pressed={!returning} onClick={() => onSelectObservatoryEra("founding")}>04<br /><span>FIRST</span></button><button aria-pressed={returning} disabled={!returningEraAvailable} onClick={() => onSelectObservatoryEra("returning")}>19<br /><span>RETURNING</span></button></div><p><strong>{returning ? "THE RETURNING REGISTER" : "THE FIRST REGISTER"}</strong>{returning ? <>Routes begin recording their visitors; {state.fragments.length} retained fragment{state.fragments.length === 1 ? "" : "s"} form the offset orbit.</> : "A provisional coordinate establishes the first route through the chamber."}</p>{!returningEraAvailable && <small>Retain two signals to read the later register.</small>}</section></>;
}

export function WorldContext(props: ContextProps) {
  if (props.room === "archive") return <ArchiveContext {...props} />;
  if (props.room === "lab" && props.ariaFocused) return <LabContext {...props} />;
  if (props.room === "observatory") return <ObservatoryContext {...props} />;
  return null;
}
