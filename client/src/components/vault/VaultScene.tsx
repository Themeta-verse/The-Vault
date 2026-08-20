import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, Sparkles } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AriaState, InteractiveObjectDefinition, RoomId, VaultObjectId } from "./types";
import { centralChamberObjects } from "./sceneInteractions";
import { getWayfindingVector } from "./wayfinding";
import { getObjectInteractionCue } from "./worldExperience";

type ArchiveArtifact = { id: string; objectId: string; title: string; category: string; accent: string };
type VaultSceneProps = { room: RoomId; discoveredObjectIds: string[]; unlockedRoomIds: string[]; reducedMotion: boolean; lowPower: boolean; renderQuality: "auto" | "high" | "low"; ariaState: AriaState; objectStates: Record<string, string>; worldSignal: "dormant" | "awakened" | "resonant" | "mastered"; isReturnVisit: boolean; archiveArtifacts: ArchiveArtifact[]; creationCount: number; relationshipCount: number; visitCount: number; observatoryEra: "founding" | "returning"; onActivate: (objectId: VaultObjectId) => void; onInspectArtifact: (artifactId: string) => void; onToggleCatalog: () => void; onFocusAria: () => void; onExitRoom: () => void };

const roomCamera: Record<RoomId, [number, number, number]> = { "central-chamber": [0, 5.3, 15.7], archive: [-1.8, 3.3, 15.2], lab: [0, 3.55, 14.7], observatory: [0, 5.7, 15.8] };
const roomTarget: Record<RoomId, [number, number, number]> = { "central-chamber": [0, 1.95, -2.1], archive: [0, 2.2, -3.45], lab: [0, 2.1, -3.0], observatory: [0, 4.15, -5.1] };
const stateRank: Record<string, number> = { unknown: 0, observed: 1, interacted: 2, discovered: 3, understood: 4, unlocked: 5, mastered: 6 };
const hasReached = (state: string | undefined, target: "discovered" | "understood" = "discovered") => (stateRank[state ?? "unknown"] ?? 0) >= stateRank[target];

function CameraRig({ room, reducedMotion }: { room: RoomId; reducedMotion: boolean }) {
  const camera = useThree(state => state.camera as THREE.PerspectiveCamera);
  const target = useRef(new THREE.Vector3(...roomTarget[room]));
  useFrame((_, delta) => {
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 1.85);
    camera.position.lerp(new THREE.Vector3(...roomCamera[room]), step);
    target.current.lerp(new THREE.Vector3(...roomTarget[room]), step);
    camera.lookAt(target.current);
  });
  return null;
}

function WorldLabel({ title, caption, muted = false, priority = false }: { title: string; caption: string; muted?: boolean; priority?: boolean }) {
  return <div className={`world-label ${muted ? "world-label--muted" : ""} ${priority ? "world-label--priority" : ""}`}><span>{caption}</span>{title}</div>;
}

function StoneFloor({ tint = "#171b16" }: { tint?: string }) {
  return <><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[46, 46]} /><meshStandardMaterial color={tint} roughness={.96} metalness={.05} /></mesh><gridHelper args={[40, 40, "#324033", "#1a211b"]} position={[0, .012, 0]} /></>;
}

function DatumMark({ position, scale = 1, color = "#b88458" }: { position: [number, number, number]; scale?: number; color?: string }) {
  return <group position={position} scale={scale}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.2, .24, 24]} /><meshBasicMaterial color={color} transparent opacity={.62} /></mesh><mesh position={[0, .015, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.06, .085, 20]} /><meshBasicMaterial color="#e4ca7c" /></mesh></group>;
}

function VaultPillar({ position, height = 7, damaged = false }: { position: [number, number, number]; height?: number; damaged?: boolean }) {
  const capY = damaged ? height - .75 : height - .18;
  return <group position={position}><mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[.78, height, .78]} /><meshStandardMaterial color="#2c3128" roughness={.9} metalness={.15} /></mesh><mesh position={[0, .22, 0]}><cylinderGeometry args={[.86, 1.02, .44, 6]} /><meshStandardMaterial color="#474638" roughness={.78} /></mesh><mesh position={[0, capY, 0]}><cylinderGeometry args={[.92, .7, .32, 6]} /><meshStandardMaterial color="#454536" roughness={.75} metalness={.12} /></mesh>{damaged && <mesh position={[.18, height - .22, .1]} rotation={[.4, .3, .15]}><boxGeometry args={[.34, .8, .34]} /><meshStandardMaterial color="#303328" roughness={.94} /></mesh>}</group>;
}

function ChamberArchitecture({ signalColor, signalStrength, remembered, worldSignal }: { signalColor: string; signalStrength: number; remembered: boolean; worldSignal: VaultSceneProps["worldSignal"] }) {
  const revealAxis = worldSignal !== "dormant";
  const deepRecall = worldSignal === "mastered";
  return <>
    <StoneFloor />
    <mesh position={[0, 6.1, -4.4]} receiveShadow><boxGeometry args={[22, .55, 16]} /><meshStandardMaterial color="#20261e" roughness={.88} metalness={.14} /></mesh>
    <mesh position={[0, 3.1, -11.8]} receiveShadow><boxGeometry args={[21.4, 6.2, .45]} /><meshStandardMaterial color="#171b16" roughness={.95} /></mesh>
    {([-9.5, -5.8, 5.8, 9.5] as number[]).map((x, index) => <VaultPillar key={x} position={[x, 0, -4.6]} height={7.15} damaged={index === 0 || index === 3} />)}
    {([-8.1, 8.1] as number[]).map(x => <VaultPillar key={x} position={[x, 0, 5.2]} height={5.7} />)}
    <group position={[0, .07, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.2, 4.95, 96]} /><meshStandardMaterial color="#4a4938" emissive={signalColor} emissiveIntensity={.13 + signalStrength * .055} roughness={.36} metalness={.74} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.1, 1.18, 64]} /><meshStandardMaterial color="#7a7051" emissive={signalColor} emissiveIntensity={.42} roughness={.25} metalness={.86} /></mesh>
      {Array.from({ length: 8 }, (_, index) => <mesh key={index} position={[Math.sin(index * Math.PI / 4) * 3.6, .03, Math.cos(index * Math.PI / 4) * 3.6]} rotation={[-Math.PI / 2, 0, index * Math.PI / 4]}><boxGeometry args={[.08, 1.05, .03]} /><meshBasicMaterial color="#7b765b" transparent opacity={.45} /></mesh>)}
    </group>
    <mesh position={[0, .17, 0]}><cylinderGeometry args={[2.12, 2.58, .36, 64]} /><meshStandardMaterial color="#303529" roughness={.58} metalness={.42} /></mesh>
    <DatumMark position={[0, .37, 0]} scale={1.5} color={signalColor} />
    {remembered && <Line points={[[-4.7, .11, 0], [-2.5, .12, 0], [0, .13, 0], [2.5, .12, 0], [4.7, .11, 0]]} color={deepRecall ? "#c59bd1" : "#a9c4a3"} lineWidth={.9} transparent opacity={.7} />}
    {revealAxis && <><Line points={[[0, .11, 0], [-6.65, .13, -3.75]]} color="#b68e58" lineWidth={.65} transparent opacity={.52} /><Line points={[[0, .11, 0], [6.65, .13, -3.75]]} color="#a284b6" lineWidth={.65} transparent opacity={.52} /></>}
    {deepRecall && <Line points={[[0, .11, 0], [0, .13, -9.5]]} color="#8ec4a3" lineWidth={.9} transparent opacity={.78} />}
    {[-8.6, -3.2, 3.2, 8.6].map(x => <DatumMark key={x} position={[x, .04, -8.7]} scale={.7} color="#887e59" />)}
    {[0, 1, 2, 3].map(step => <mesh key={step} position={[0, .16 + step * .19, -9.1 - step * .42]}><boxGeometry args={[6.5 - step * .42, .19, .82]} /><meshStandardMaterial color="#282e24" roughness={.9} /></mesh>)}
    <pointLight position={[0, 5.2, 0]} intensity={signalStrength} color={signalColor} distance={18} />
  </>;
}

function Threshold({ position, title, caption, objectId, locked, accent, kind, onActivate }: { position: [number, number, number]; title: string; caption: string; objectId: VaultObjectId; locked: boolean; accent: string; kind: "archive" | "lab" | "observatory"; onActivate: (id: VaultObjectId) => void }) {
  const [hovered, setHovered] = useState(false);
  const aperture = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (aperture.current) aperture.current.rotation.y += delta * (hovered ? .19 : .025); });
  const color = locked ? "#586052" : accent;
  return <group position={position} onClick={event => { event.stopPropagation(); onActivate(objectId); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
    <mesh position={[0, 1.25, 0]}><boxGeometry args={[4.45, 4.75, .56]} /><meshStandardMaterial color="#242a21" roughness={.86} metalness={.18} /></mesh>
    <mesh position={[0, 1.25, .3]}><boxGeometry args={[3.8, 4.05, .08]} /><meshStandardMaterial color="#151914" emissive={color} emissiveIntensity={locked ? .02 : .05} roughness={.82} /></mesh>
    <group ref={aperture} position={[0, 1.25, .44]}>
      {kind === "archive" && <><mesh><boxGeometry args={[2.4, 3.18, .08]} /><meshStandardMaterial color="#20271d" roughness={.72} metalness={.28} /></mesh>{[-.88, 0, .88].map(y => <mesh key={y} position={[0, y, .08]}><boxGeometry args={[2.55, .08, .12]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? .8 : .2} /></mesh>)}</>}
      {kind === "lab" && <><mesh><cylinderGeometry args={[1.25, 1.25, .08, 8]} /><meshStandardMaterial color="#1a1b1d" roughness={.65} metalness={.62} /></mesh><mesh><torusGeometry args={[1.32, .1, 8, 48]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.05 : .3} metalness={.86} roughness={.24} /></mesh>{[0, Math.PI / 2].map(angle => <mesh key={angle} rotation={[0, 0, angle]}><boxGeometry args={[2.9, .07, .1]} /><meshBasicMaterial color={color} transparent opacity={.42} /></mesh>)}</>}
      {kind === "observatory" && <><mesh><ringGeometry args={[.92, 1.34, 6]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 1.2 : locked ? .06 : .28} roughness={.22} metalness={.88} /></mesh><mesh position={[0, 0, -.03]}><circleGeometry args={[.82, 6]} /><meshStandardMaterial color="#111713" roughness={.9} /></mesh><mesh rotation={[0, 0, Math.PI / 6]}><ringGeometry args={[1.55, 1.61, 6]} /><meshBasicMaterial color={color} transparent opacity={.52} /></mesh></>}
    </group>
    {!locked && <pointLight position={[0, 1.45, 1.5]} color={accent} intensity={hovered ? 2.7 : .75} distance={5.5} />}
    <Html center position={[0, -.5, .55]} distanceFactor={16} style={{ pointerEvents: "none" }}><WorldLabel title={title} caption={locked ? "THRESHOLD SEALED" : caption} muted={locked} /></Html>
  </group>;
}

function MemoryPrism({ definition, state, onActivate }: { definition: InteractiveObjectDefinition; state?: string; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null); const [hovered, setHovered] = useState(false); const cue = getObjectInteractionCue(state); const retained = cue.stage === "retained";
  useFrame(({ clock }, delta) => { if (!group.current) return; group.current.rotation.y += delta * (hovered ? .62 : cue.stage === "attune" ? .34 : .12); group.current.position.y = definition.position[1] + Math.sin(clock.elapsedTime * .8) * .075; });
  return <group ref={group} position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh><octahedronGeometry args={[1.08, 1]} /><meshStandardMaterial color="#c8c3ad" emissive={retained ? "#4f6355" : definition.metadata.accent} emissiveIntensity={hovered ? 1.18 : retained ? .25 : cue.stage === "attune" ? .82 : .48} roughness={.17} metalness={.8} /></mesh><mesh scale={1.25}><octahedronGeometry args={[1.08, 0]} /><meshBasicMaterial color={definition.metadata.accent} wireframe transparent opacity={hovered ? .8 : .34} /></mesh><DatumMark position={[0, -1.12, 0]} scale={.68} color={definition.metadata.accent} /><pointLight color={definition.metadata.accent} intensity={hovered ? 2.3 : .8} distance={5} /><Html center position={[0, -1.72, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}><WorldLabel title="MEMORY PRISM" caption={cue.caption} priority={!retained} /></Html></group>;
}

function EchoSigil({ definition, state, onActivate }: { definition: InteractiveObjectDefinition; state?: string; onActivate: () => void }) {
  const ring = useRef<THREE.Mesh>(null); const [hovered, setHovered] = useState(false); const cue = getObjectInteractionCue(state);
  useFrame((_, delta) => { if (ring.current) ring.current.rotation.z += delta * (hovered ? .58 : .1); });
  return <group position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh ref={ring}><torusKnotGeometry args={[.46, .07, 80, 10]} /><meshStandardMaterial color="#b9d2bd" emissive="#6f9d7c" emissiveIntensity={hovered ? 1.35 : .65} roughness={.2} metalness={.88} /></mesh><Line points={[[-.82, 0, 0], [.82, 0, 0]]} color="#a6c9aa" lineWidth={.55} transparent opacity={.5} /><pointLight color="#9ac8a7" intensity={hovered ? 1.8 : .6} distance={3.5} /><Html center position={[0, -.82, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}><WorldLabel title="ECHO SIGIL" caption={cue.stage === "approach" ? "ANOMALOUS REPLY" : cue.caption} priority /></Html></group>;
}

function ResonanceNeedle({ definition, state, onActivate }: { definition: InteractiveObjectDefinition; state?: string; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null); const [hovered, setHovered] = useState(false); const cue = getObjectInteractionCue(state);
  useFrame(({ clock }, delta) => { if (!group.current) return; group.current.rotation.y += delta * (hovered ? .56 : .12); group.current.position.y = definition.position[1] + Math.sin(clock.elapsedTime) * .05; });
  return <group ref={group} position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh rotation={[0, 0, Math.PI / 4]}><coneGeometry args={[.15, 1.55, 8]} /><meshStandardMaterial color="#c5a8d4" emissive="#7a5595" emissiveIntensity={hovered ? 1.5 : .75} roughness={.15} metalness={.94} /></mesh><Line points={[[0, -.9, 0], [0, .9, 0]]} color="#be9ad0" lineWidth={.55} transparent opacity={.62} /><pointLight color="#ba8fd6" intensity={hovered ? 2 : .7} distance={4} /><Html center position={[0, -1.02, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}><WorldLabel title="RESONANCE NEEDLE" caption={cue.stage === "approach" ? "CIRCUIT COMPLETE" : cue.caption} priority /></Html></group>;
}

function AriaVessel({ position, ariaState, onActivate, scale = 1 }: { position: [number, number, number]; ariaState: AriaState; onActivate: () => void; scale?: number }) {
  const entity = useRef<THREE.Group>(null); const [hovered, setHovered] = useState(false); const visual: Record<AriaState, string> = { idle: "#877b9a", listening: "#a997d4", thinking: "#ccae75", responding: "#c4a1e3", success: "#85b99b", warning: "#d69d67", error: "#bd7373" };
  useFrame(({ clock }, delta) => { if (!entity.current) return; entity.current.rotation.y += delta * (hovered ? .25 : .055); entity.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.05) * .055; });
  return <group ref={entity} position={position} scale={scale} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh><cylinderGeometry args={[.5, .64, 1.15, 12]} /><meshStandardMaterial color="#24232a" roughness={.46} metalness={.72} /></mesh><mesh position={[0, .16, 0]}><octahedronGeometry args={[.44, 1]} /><meshStandardMaterial color="#ded8db" emissive={visual[ariaState]} emissiveIntensity={hovered ? 1.65 : .8} roughness={.16} metalness={.84} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.77, .045, 6, 32]} /><meshBasicMaterial color={visual[ariaState]} transparent opacity={.55} /></mesh><pointLight color={visual[ariaState]} intensity={hovered ? 2.25 : .85} distance={4.8} /><Html center position={[0, -1.18, 0]} distanceFactor={16} style={{ pointerEvents: "none" }}><WorldLabel title="ARIA" caption={ariaState === "thinking" ? "READING THE HELD RECORD" : "CONTAINED INTELLIGENCE"} /></Html></group>;
}

function WayfindingBeacon({ worldSignal, isReturnVisit }: { worldSignal: VaultSceneProps["worldSignal"]; isReturnVisit: boolean }) {
  const target = getWayfindingVector(worldSignal, isReturnVisit);
  return <group position={target.position}><DatumMark position={[0, .03, 0]} scale={1.42} color={isReturnVisit ? "#b5d2b7" : "#d1ab67"} /><Html center position={[0, .62, 0]} distanceFactor={18} style={{ pointerEvents: "none" }}><WorldLabel title={target.label} caption={target.mode === "return" ? "THE ROUTE REMAINS" : "FOLLOW THE REGISTRATION"} priority /></Html></group>;
}

function CentralChamber(props: VaultSceneProps) {
  const observatoryUnlocked = props.unlockedRoomIds.includes("observatory"); const prism = centralChamberObjects.find(item => item.id === "object-memory-prism"); const echo = centralChamberObjects.find(item => item.id === "object-echo-sigil"); const needle = centralChamberObjects.find(item => item.id === "object-resonance-needle");
  const signalColor = props.worldSignal === "mastered" ? "#c59bd1" : props.worldSignal === "resonant" ? "#8eb9a0" : props.worldSignal === "awakened" ? "#d0a664" : "#71806e";
  return <><ChamberArchitecture signalColor={signalColor} signalStrength={props.worldSignal === "dormant" ? 1.55 : 3.15} remembered={props.isReturnVisit} worldSignal={props.worldSignal} /><Threshold position={[-6.7, 0, -4]} title="THE ARCHIVE" caption="WEST STACKS" objectId="door-archive" locked={false} accent="#c1a86c" kind="archive" onActivate={props.onActivate} /><Threshold position={[6.7, 0, -4]} title="THE LAB" caption="EAST APPARATUS" objectId="door-lab" locked={false} accent="#a382b3" kind="lab" onActivate={props.onActivate} /><Threshold position={[0, 1.5, -10.2]} title="THE OBSERVATORY" caption="NORTH ASCENT" objectId="door-observatory" locked={!observatoryUnlocked} accent="#7ead92" kind="observatory" onActivate={props.onActivate} />{prism && <MemoryPrism definition={prism} state={props.objectStates[prism.id]} onActivate={() => props.onActivate(prism.id)} />}{echo && props.objectStates["object-memory-prism"] === "understood" && !props.discoveredObjectIds.includes(echo.id) && <EchoSigil definition={echo} state={props.objectStates[echo.id]} onActivate={() => props.onActivate(echo.id)} />}{needle && props.objectStates["object-resonance-needle"] === "unlocked" && !props.discoveredObjectIds.includes(needle.id) && <ResonanceNeedle definition={needle} state={props.objectStates[needle.id]} onActivate={() => props.onActivate(needle.id)} />}<AriaVessel position={[3.9, 1.5, 1.7]} ariaState={props.ariaState} onActivate={() => props.onActivate("aria-entity")} /><WayfindingBeacon worldSignal={props.worldSignal} isReturnVisit={props.isReturnVisit} /></>;
}

function ArchiveArtifact({ artifact, position, onInspectArtifact }: { artifact: ArchiveArtifact; position: [number, number, number]; onInspectArtifact: (id: string) => void }) {
  const [hovered, setHovered] = useState(false); const object = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (object.current) object.current.rotation.y += delta * (hovered ? .45 : .05); });
  return <group ref={object} position={position} onClick={event => { event.stopPropagation(); onInspectArtifact(artifact.id); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh><dodecahedronGeometry args={[.43, 1]} /><meshStandardMaterial color="#d1d0bf" emissive={artifact.accent} emissiveIntensity={hovered ? 1.25 : .3} roughness={.2} metalness={.78} /></mesh><mesh scale={1.32}><dodecahedronGeometry args={[.43, 0]} /><meshBasicMaterial color={artifact.accent} wireframe transparent opacity={.28} /></mesh><pointLight color={artifact.accent} intensity={hovered ? 1.25 : .32} distance={2.5} /><Html center position={[0, -.74, 0]} distanceFactor={18} style={{ pointerEvents: "none" }}><WorldLabel title={artifact.title} caption={artifact.category} /></Html></group>;
}

function BranchRelic({ id, title, caption, accent, position, state, onActivate }: { id: VaultObjectId; title: string; caption: string; accent: string; position: [number, number, number]; state?: string; onActivate: (id: VaultObjectId) => void }) {
  const [hovered, setHovered] = useState(false); const cue = getObjectInteractionCue(state); const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (group.current) group.current.rotation.y += delta * (hovered ? .4 : .07); });
  return <group ref={group} position={position} onClick={event => { event.stopPropagation(); onActivate(id); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh><octahedronGeometry args={[.58, 1]} /><meshStandardMaterial color="#d0d0c1" emissive={accent} emissiveIntensity={hovered ? 1.25 : cue.stage === "attune" ? .9 : .43} roughness={.18} metalness={.88} /></mesh><mesh scale={1.45}><octahedronGeometry args={[.58, 0]} /><meshBasicMaterial color={accent} wireframe transparent opacity={hovered ? .72 : .24} /></mesh><DatumMark position={[0, -.65, 0]} scale={.46} color={accent} /><pointLight color={accent} intensity={hovered ? 1.8 : .54} distance={3.2} /><Html center position={[0, -.95, 0]} distanceFactor={17} style={{ pointerEvents: "none" }}><WorldLabel title={title} caption={cue.stage === "attune" ? cue.caption : caption} priority /></Html></group>;
}

function RoomExit({ title, position, onExit, scale = .72 }: { title: string; position: [number, number, number]; onExit: () => void; scale?: number }) {
  const [hovered, setHovered] = useState(false);
  return <group position={position} scale={scale} onClick={event => { event.stopPropagation(); onExit(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}><mesh position={[0, 1.65, 0]}><boxGeometry args={[3.75, 3.45, .42]} /><meshStandardMaterial color="#1d241d" roughness={.88} /></mesh><mesh position={[0, 1.65, .26]}><ringGeometry args={[.78, 1.18, 4]} /><meshStandardMaterial color="#9bad90" emissive="#829675" emissiveIntensity={hovered ? 1.05 : .26} roughness={.25} metalness={.84} /></mesh><Html center position={[0, -.14, 0]} distanceFactor={17} style={{ pointerEvents: "none" }}><WorldLabel title={title} caption="RETURN TO THE DAIS" /></Html></group>;
}

function ArchiveBay({ x, index, artifact, onInspectArtifact }: { x: number; index: number; artifact?: ArchiveArtifact; onInspectArtifact: (id: string) => void }) {
  return <group position={[x, 0, -3.95]}><mesh position={[0, 2.2, 0]}><boxGeometry args={[3.05, 4.4, .62]} /><meshStandardMaterial color="#252c21" roughness={.82} metalness={.2} /></mesh>{[.7, 1.75, 2.82, 3.75].map((level, shelfIndex) => <group key={level}><mesh position={[0, level, .38]}><boxGeometry args={[2.7, .1, .86]} /><meshStandardMaterial color="#625b46" roughness={.7} /></mesh>{!artifact && shelfIndex < 3 && <mesh position={[(-.7 + shelfIndex * .45), level + .18, .55]}><boxGeometry args={[.42, .38, .2]} /><meshStandardMaterial color={shelfIndex === 1 ? "#745d44" : "#3d4a37"} roughness={.86} /></mesh>}</group>)}<mesh position={[-1.26, 1.95, .58]}><boxGeometry args={[.08, 3.5, .08]} /><meshStandardMaterial color={index % 2 ? "#9a8160" : "#7b8e70"} emissive={index % 2 ? "#6e4228" : "#455e47"} emissiveIntensity={.18} /></mesh>{artifact && <ArchiveArtifact artifact={artifact} position={[0, 2.38, .7]} onInspectArtifact={onInspectArtifact} />}</group>;
}

function ArchiveRoom({ artifacts, creationCount, objectStates, onActivate, onInspectArtifact, onToggleCatalog, onExit }: { artifacts: ArchiveArtifact[]; creationCount: number; objectStates: Record<string, string>; onActivate: (id: VaultObjectId) => void; onInspectArtifact: (id: string) => void; onToggleCatalog: () => void; onExit: () => void }) {
  return <><StoneFloor tint="#171b15" /><ambientLight intensity={.68} color="#d5cdb2" /><directionalLight position={[-6, 9, 5]} intensity={1.65} color="#d8c48d" castShadow /><pointLight position={[-4.5, 3.9, .8]} intensity={1.5} color="#c2a766" distance={8} /><pointLight position={[4.8, 3.2, -1.4]} intensity={1.1} color="#8baa80" distance={7} />{([-7.3, -3.65, 3.65, 7.3] as number[]).map(x => <VaultPillar key={x} position={[x, 0, -4.5]} height={6.65} damaged={x === 7.3} />)}{([-6.4, -2.12, 2.12, 6.4] as number[]).map((x, index) => <ArchiveBay key={x} x={x} index={index} artifact={artifacts[index]} onInspectArtifact={onInspectArtifact} />)}<Line points={[[-8.1, .09, -1.4], [-4.8, .09, -1.4], [-2.1, .09, -2.4], [0, .09, -2.4]]} color="#807454" lineWidth={.45} transparent opacity={.48} />{hasReached(objectStates["object-memory-prism"]) && !hasReached(objectStates["object-palimpsest-lens"]) && <BranchRelic id="object-palimpsest-lens" title="PALIMPSEST LENS" caption="A LAYER MISFILED" accent="#d9b967" position={[4.7, 2.4, -3.1]} state={objectStates["object-palimpsest-lens"]} onActivate={onActivate} />}{creationCount > 0 && <group position={[-6.4, 4.05, -3.12]}>{Array.from({ length: Math.min(creationCount, 3) }, (_, index) => <DatumMark key={index} position={[index * .48 - .48, 0, 0]} scale={.46} color="#bc94c3" />)}<Html center position={[0, -.58, .14]} distanceFactor={18} style={{ pointerEvents: "none" }}><WorldLabel title={`${creationCount} LAB TRACE${creationCount === 1 ? "" : "S"}`} caption="HELD IN THE STACKS" /></Html></group>}<group position={[0, 0, -2.38]} onClick={event => { event.stopPropagation(); onToggleCatalog(); }}><mesh position={[0, 1.16, 0]}><boxGeometry args={[2.35, 2.3, 1.35]} /><meshStandardMaterial color="#30392b" roughness={.6} metalness={.45} /></mesh><mesh position={[0, 2.35, .03]}><boxGeometry args={[1.72, .08, .8]} /><meshStandardMaterial color="#9ba98d" emissive="#78906e" emissiveIntensity={.45} /></mesh><DatumMark position={[0, 2.42, .48]} scale={.92} color="#9aac8d" /><Html center position={[0, -.28, 0]} distanceFactor={17} style={{ pointerEvents: "none" }}><WorldLabel title="INDEXING ENGINE" caption="CONSULT THE HELD RECORD" /></Html></group><RoomExit title="CENTRAL CHAMBER" onExit={onExit} position={[6.5, 0, 3.25]} /></>;
}

function LaboratoryRoom({ ariaState, objectStates, onActivate, onFocusAria, onExit }: { ariaState: AriaState; objectStates: Record<string, string>; onActivate: (id: VaultObjectId) => void; onFocusAria: () => void; onExit: () => void }) {
  return <>
    <StoneFloor tint="#19161d" />
    <ambientLight intensity={.82} color="#c7b8d4" />
    <directionalLight position={[0, 6, 5]} intensity={1.15} color="#d5c7dc" />
    <pointLight position={[0, 3.8, 5.4]} intensity={2.1} color="#c7b4d7" distance={13} />
    <pointLight position={[-5, 5, 2]} intensity={2.7} color="#956fab" distance={10} />
    <pointLight position={[3.5, 4.2, -1.3]} intensity={1.75} color="#82a9a0" distance={8} />
    <mesh position={[-6.95, 3.25, -4.1]}><boxGeometry args={[.08, 4.4, .18]} /><meshStandardMaterial color="#b1a2bd" emissive="#654d78" emissiveIntensity={.75} roughness={.32} metalness={.72} /></mesh>
    <mesh position={[6.95, 3.25, -4.1]}><boxGeometry args={[.08, 4.4, .18]} /><meshStandardMaterial color="#9eb9ae" emissive="#42675c" emissiveIntensity={.7} roughness={.32} metalness={.72} /></mesh>
    <mesh position={[0, .9, -3.5]}><boxGeometry args={[9.4, 1.8, 2.45]} /><meshStandardMaterial color="#36343d" roughness={.6} metalness={.55} /></mesh>
    <mesh position={[0, 1.86, -3.5]}><boxGeometry args={[8.4, .11, 2.05]} /><meshStandardMaterial color="#817984" roughness={.44} metalness={.4} /></mesh>
    {([-5.5, 5.5] as number[]).map(x => <VaultPillar key={x} position={[x, 0, -3.85]} height={6.2} />)}
    {([-3, 0, 3] as number[]).map((x, index) => <group key={x} position={[x, 2.04, -3.16]}><mesh><cylinderGeometry args={[.55, .68, .25, 16]} /><meshStandardMaterial color="#a5adaa" emissive={index === 1 ? "#b99ed3" : "#759b90"} emissiveIntensity={.48} roughness={.28} metalness={.8} /></mesh><DatumMark position={[0, .19, 0]} scale={.42} color={index === 1 ? "#c1a2d1" : "#8eb7a0"} /></group>)}
    <Line points={[[-4.1, .1, -1.3], [-2.2, .1, -.5], [0, .1, -.5], [2.2, .1, -.5], [4.1, .1, -1.3]]} color="#c3a2ca" lineWidth={.5} transparent opacity={.56} />
    {hasReached(objectStates["object-palimpsest-lens"], "understood") && !hasReached(objectStates["object-quiet-cistern"]) && <BranchRelic id="object-quiet-cistern" title="QUIET CISTERN" caption="THE WATER HOLDS A STAR" accent="#7bbfc5" position={[-3.15, 2.34, -3.08]} state={objectStates["object-quiet-cistern"]} onActivate={onActivate} />}
    <group position={[0, .8, -.3]}><mesh><cylinderGeometry args={[2.3, 2.62, 1.62, 12]} /><meshStandardMaterial color="#2d2a36" roughness={.62} metalness={.42} /></mesh><mesh position={[0, .86, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.12, 1.76, 48]} /><meshStandardMaterial color="#b294c1" emissive="#765785" emissiveIntensity={.56} metalness={.84} roughness={.18} /></mesh><mesh position={[0, 1.04, 0]}><cylinderGeometry args={[1.08, 1.08, .08, 32]} /><meshStandardMaterial color="#191720" emissive="#5d4868" emissiveIntensity={.28} roughness={.32} metalness={.82} /></mesh></group>
    <AriaVessel position={[0, 3.4, -.25]} ariaState={ariaState} onActivate={onFocusAria} scale={1.16} />
    <RoomExit title="CENTRAL CHAMBER" onExit={onExit} position={[-5.9, 0, 3.35]} />
  </>;
}

function ObservatoryRoom({ discoveries, relationships, creations, visits, objectStates, observatoryEra, onActivate, onExit }: { discoveries: number; relationships: number; creations: number; visits: number; objectStates: Record<string, string>; observatoryEra: "founding" | "returning"; onActivate: (id: VaultObjectId) => void; onExit: () => void }) {
  const returning = observatoryEra === "returning";
  const points = useMemo(() => Array.from({ length: Math.max(returning ? 9 : 7, discoveries + relationships + creations + (returning ? 4 : 2)) }, (_, index) => new THREE.Vector3(returning ? Math.cos(index * 1.62) * (2.7 + (index % 4) * 1.02) : Math.sin(index * 2.35) * (2.35 + (index % 3) * 1.3), returning ? 3.45 + Math.sin(index * 1.31) * 1.78 : 3.3 + Math.cos(index * 1.7) * 1.55, -4.5 - (index % 2) * 1.1 + (returning ? Math.sin(index * .7) * .6 : 0))), [discoveries, relationships, creations, returning]);
  const linkCount = Math.max(2, Math.min(points.length - 1, relationships + 1));
  return <><StoneFloor tint="#111b17" /><ambientLight intensity={.32} color="#aac9b7" /><pointLight position={[0, 8, -4]} intensity={2.05} color={returning ? "#b28ec1" : "#83b59f"} distance={18} /><mesh position={[0, 1.15, -3.2]}><cylinderGeometry args={[6.9, 7.9, 2.25, 10]} /><meshStandardMaterial color="#1d2b25" roughness={.8} metalness={.28} /></mesh><mesh position={[0, 2.33, -3.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.25, 5.85, 96]} /><meshStandardMaterial color={returning ? "#655274" : "#4e6f61"} emissive={returning ? "#806690" : "#548b70"} emissiveIntensity={.25 + Math.min(visits, 8) * .03} roughness={.34} metalness={.82} /></mesh><mesh position={[0, 2.38, -3.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.23, 64]} /><meshStandardMaterial color="#a9cdb4" emissive="#80b797" emissiveIntensity={.62} roughness={.2} metalness={.82} /></mesh>{returning && <mesh position={[0, 2.42, -3.2]} rotation={[-Math.PI / 2, .32, 0]}><ringGeometry args={[3.1, 3.15, 72]} /><meshBasicMaterial color="#c5a6d1" transparent opacity={.46} /></mesh>}{points.map((point, index) => <group key={`${point.x}-${index}`} position={point}><mesh><sphereGeometry args={[.09 + (index % 3) * .045, 16, 16]} /><meshBasicMaterial color={returning ? index % 3 === 0 ? "#e2bedc" : index % 2 ? "#d6e6dc" : "#9bc8b1" : index % 3 === 0 ? "#d8b7df" : index % 2 ? "#c6e2d0" : "#a6ccb6"} /></mesh>{index < linkCount && <pointLight color={returning ? "#c4a3cf" : "#91c8a9"} intensity={.22} distance={1.5} />}</group>)}{Array.from({ length: linkCount }, (_, index) => <Line key={index} points={[points[index], points[index + 1]]} color={returning ? index % 2 ? "#b49bc4" : "#8ebca5" : index % 2 ? "#85b79a" : "#c4a7cc"} lineWidth={.55} transparent opacity={.52} />)}<Line points={[[0, 2.45, -3.2], points[0]]} color="#d4bc78" lineWidth={.8} transparent opacity={.66} />{hasReached(objectStates["object-quiet-cistern"], "understood") && !hasReached(objectStates["object-astral-index"]) && <BranchRelic id="object-astral-index" title="ASTRAL INDEX" caption="THE ORBIT REMEMBERS" accent="#93d4b5" position={[3.5, 3.32, -3.5]} state={objectStates["object-astral-index"]} onActivate={onActivate} />}<Html center position={[0, 4.8, -5.3]} distanceFactor={18} style={{ pointerEvents: "none" }}><WorldLabel title={returning ? "RETURNING ARMATURE" : "MNEMONIC ARMATURE"} caption={returning ? "REGISTER 19 · ROUTES REMEMBER" : `${discoveries} HELD · ${relationships} LINKED · ${creations} MADE`} /></Html><RoomExit title="CENTRAL CHAMBER" onExit={onExit} position={[0, 0, 5.65]} /></>;
}

function World({ props }: { props: VaultSceneProps }) {
  const accent = props.room === "archive" ? "#c4ba82" : props.room === "lab" ? "#aa87b6" : props.room === "observatory" ? "#83b99f" : "#b59b69";
  return <><color attach="background" args={[props.room === "observatory" ? "#07120e" : "#0c100b"]} /><fog attach="fog" args={[props.room === "observatory" ? "#07120e" : "#0c100b", 10, 35]} /><CameraRig room={props.room} reducedMotion={props.reducedMotion} />{props.room === "central-chamber" && <CentralChamber {...props} />}{props.room === "archive" && <ArchiveRoom artifacts={props.archiveArtifacts} creationCount={props.creationCount} objectStates={props.objectStates} onActivate={props.onActivate} onInspectArtifact={props.onInspectArtifact} onToggleCatalog={props.onToggleCatalog} onExit={props.onExitRoom} />}{props.room === "lab" && <LaboratoryRoom ariaState={props.ariaState} objectStates={props.objectStates} onActivate={props.onActivate} onFocusAria={props.onFocusAria} onExit={props.onExitRoom} />}{props.room === "observatory" && <ObservatoryRoom discoveries={props.discoveredObjectIds.length} relationships={props.relationshipCount} creations={props.creationCount} visits={props.visitCount} objectStates={props.objectStates} observatoryEra={props.observatoryEra} onActivate={props.onActivate} onExit={props.onExitRoom} />}{!props.reducedMotion && !props.lowPower && <Sparkles count={props.renderQuality === "high" ? 28 : 16} scale={[20, 7, 18]} size={1.05} speed={.055} color={accent} noise={.24} />}</>;
}

export default function VaultScene(props: VaultSceneProps) {
  return <Canvas dpr={props.lowPower ? 1 : props.renderQuality === "high" ? [1, 2] : [1, 1.45]} shadows={!props.lowPower} gl={{ antialias: !props.lowPower, powerPreference: props.lowPower ? "low-power" : "high-performance" }} camera={{ position: roomCamera["central-chamber"], fov: 45 }}><World props={props} /></Canvas>;
}
