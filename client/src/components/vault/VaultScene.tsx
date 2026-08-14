import { Detailed, Environment, Html, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { AriaState, InteractiveObjectDefinition, RoomId } from "./types";
import { centralChamberObjects } from "./sceneInteractions";

type VaultSceneProps = {
  room: RoomId;
  discoveredObjectIds: string[];
  unlockedRoomIds: string[];
  reducedMotion: boolean;
  lowPower: boolean;
  renderQuality: "auto" | "high" | "low";
  ariaState: AriaState;
  onActivate: (objectId: string) => void;
};

const roomCamera: Record<RoomId, [number, number, number]> = {
  "central-chamber": [0, 4.5, 12],
  archive: [-13, 3.5, 7],
  lab: [13, 3.5, 7],
  observatory: [0, 9, -11],
};

const roomTarget: Record<RoomId, [number, number, number]> = {
  "central-chamber": [0, 1.2, 0],
  archive: [-7, 1.2, -2],
  lab: [7, 1.2, -2],
  observatory: [0, 3, -7],
};

function CameraRig({ room, reducedMotion }: { room: RoomId; reducedMotion: boolean }) {
  const camera = useThree(state => state.camera as THREE.PerspectiveCamera);
  const target = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const position = roomCamera[room];
    const aim = roomTarget[room];
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 2.8);
    camera.position.lerp(new THREE.Vector3(...position), step);
    target.current.lerp(new THREE.Vector3(...aim), step);
    camera.lookAt(target.current);
  });
  return null;
}

function Portal({ position, title, caption, objectId, locked, color, onActivate }: { position: [number, number, number]; title: string; caption: string; objectId: string; locked: boolean; color: string; onActivate: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current) ring.current.rotation.z += delta * (hovered ? 0.28 : 0.07);
  });
  return (
    <group position={position} onClick={event => { event.stopPropagation(); onActivate(objectId); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh ref={ring}>
        <torusGeometry args={[2.05, 0.11, 12, 48]} />
        <meshStandardMaterial color={locked ? "#53504a" : color} emissive={locked ? "#161513" : color} emissiveIntensity={hovered && !locked ? 1.4 : locked ? 0.05 : 0.38} roughness={0.36} metalness={0.82} />
      </mesh>
      <mesh position={[0, 0, -0.18]}>
        <cylinderGeometry args={[1.55, 1.55, 0.14, 32]} />
        <meshStandardMaterial color={locked ? "#171715" : "#11100d"} roughness={0.92} metalness={0.45} />
      </mesh>
      <Html center position={[0, -2.7, 0]} distanceFactor={15} style={{ pointerEvents: "none" }}>
        <div className={`world-label ${locked ? "world-label--locked" : ""}`}><span>{locked ? "SEALED" : caption}</span>{title}</div>
      </Html>
    </group>
  );
}

function MemoryPrism({ definition, discovered, onActivate }: { definition: InteractiveObjectDefinition; discovered: boolean; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * (hovered ? 0.95 : 0.32);
    group.current.position.y = definition.position[1] + Math.sin(clock.elapsedTime * 1.3) * 0.15;
  });
  return (
    <group ref={group} position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <Detailed distances={[0, 8, 16]}>
        <mesh><icosahedronGeometry args={[0.95, 3]} /><meshStandardMaterial color={discovered ? "#8c8267" : definition.metadata.accent} emissive={discovered ? "#3e3a2f" : "#9e7b31"} emissiveIntensity={hovered ? 1.5 : 0.7} roughness={0.16} metalness={0.78} /></mesh>
        <mesh><icosahedronGeometry args={[0.95, 1]} /><meshStandardMaterial color="#baaa7d" emissive="#63512b" emissiveIntensity={0.45} roughness={0.22} metalness={0.7} /></mesh>
        <mesh><octahedronGeometry args={[0.95, 0]} /><meshStandardMaterial color="#80775e" roughness={0.35} metalness={0.65} /></mesh>
      </Detailed>
      <pointLight color="#dfbd6a" intensity={hovered ? 3.1 : 1.1} distance={6} />
      <Html center position={[0, -1.72, 0]} distanceFactor={15} style={{ pointerEvents: "none" }}><div className="world-label"><span>{discovered ? "RECORDED" : definition.metadata.caption}</span>{definition.metadata.title}</div></Html>
    </group>
  );
}

function EchoSigil({ definition, onActivate }: { definition: InteractiveObjectDefinition; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useFrame((_, delta) => { if (group.current) group.current.rotation.z += delta * (hovered ? 0.5 : 0.15); });
  return <group ref={group} position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
    <mesh><torusKnotGeometry args={[0.42, 0.07, 72, 10]} /><meshStandardMaterial color={definition.metadata.accent} emissive="#527d67" emissiveIntensity={hovered ? 1.7 : 0.65} metalness={0.84} roughness={0.2} /></mesh>
    <pointLight color="#91c3a6" intensity={hovered ? 2 : 0.7} distance={3} />
    <Html center position={[0, -0.72, 0]} distanceFactor={15} style={{ pointerEvents: "none" }}><div className="world-label"><span>{definition.metadata.caption}</span>{definition.metadata.title}</div></Html>
  </group>;
}

function AriaEntity({ definition, ariaState, onActivate }: { definition: InteractiveObjectDefinition; ariaState: AriaState; onActivate: () => void }) {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const stateVisual: Record<AriaState, { color: string; intensity: number; label: string }> = {
    idle: { color: "#745c7c", intensity: 0.9, label: "IDLE" },
    listening: { color: "#8c79b7", intensity: 1.15, label: "LISTENING" },
    thinking: { color: "#d3ab68", intensity: 1.7, label: "THINKING" },
    responding: { color: "#bb8fd0", intensity: 1.8, label: "RESPONDING" },
    success: { color: "#7fbda1", intensity: 1.6, label: "SIGNAL CONFIRMED" },
    warning: { color: "#d4a265", intensity: 1.35, label: "CAUTION" },
    error: { color: "#bf6e6e", intensity: 1.25, label: "SIGNAL INTERRUPTED" },
  };
  const visual = stateVisual[ariaState];
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.17;
    mesh.current.rotation.z += delta * 0.22;
    mesh.current.position.y = 2.15 + Math.cos(clock.elapsedTime * 1.8) * 0.13;
  });
  return (
    <group position={definition.position} onClick={event => { event.stopPropagation(); onActivate(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh ref={mesh}><dodecahedronGeometry args={[0.56, 1]} /><meshStandardMaterial color="#d9ccd9" emissive={visual.color} emissiveIntensity={hovered ? visual.intensity + 1.1 : visual.intensity} metalness={0.85} roughness={0.2} /></mesh>
      <pointLight color={visual.color} intensity={hovered ? visual.intensity + 1.2 : visual.intensity} distance={4} />
      <Html center position={[0, -0.8, 0]} distanceFactor={15} style={{ pointerEvents: "none" }}><div className="world-label"><span>{visual.label}</span>{definition.metadata.title}</div></Html>
    </group>
  );
}

function Chamber({ room, discoveredObjectIds, unlockedRoomIds, reducedMotion, lowPower, renderQuality, ariaState, onActivate }: VaultSceneProps) {
  const observatoryUnlocked = unlockedRoomIds.includes("observatory");
  const discoveredPrism = discoveredObjectIds.includes("object-memory-prism");
  const discoveredEchoSigil = discoveredObjectIds.includes("object-echo-sigil");
  const prismDefinition = centralChamberObjects.find(object => object.id === "object-memory-prism");
  const echoDefinition = centralChamberObjects.find(object => object.id === "object-echo-sigil");
  const ariaDefinition = centralChamberObjects.find(object => object.id === "aria-entity");
  const accent = useMemo(() => room === "lab" ? "#75567e" : room === "observatory" ? "#5d927e" : room === "archive" ? "#d0b679" : "#b28d4d", [room]);
  return (
    <>
      <color attach="background" args={["#0a0a08"]} />
      <fog attach="fog" args={["#0a0a08", 12, 34]} />
      <ambientLight intensity={0.34} color="#c5bda8" />
      <directionalLight position={[4, 10, 5]} intensity={1.25} color="#d8c59d" castShadow />
      <pointLight position={[0, 7, 0]} intensity={2.4} color={accent} distance={18} />
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[34, 34]} /><meshStandardMaterial color="#151510" roughness={0.77} metalness={0.38} /></mesh>
        <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.2, 6.1, 96]} /><meshStandardMaterial color="#332d20" emissive="#6a4d1f" emissiveIntensity={0.25} roughness={0.48} metalness={0.78} /></mesh>
        <mesh position={[0, 5.7, 0]}><cylinderGeometry args={[6.3, 6.3, 0.3, 48]} /><meshStandardMaterial color="#1a1914" roughness={0.6} metalness={0.55} /></mesh>
        {[-1, 1].map(side => <mesh key={side} position={[side * 9.5, 2.8, -3]} rotation={[0, side * 0.32, 0]}><boxGeometry args={[0.95, 6, 12]} /><meshStandardMaterial color="#1b1a15" roughness={0.78} metalness={0.42} /></mesh>)}
      </group>
      {room === "central-chamber" ? <>
        {centralChamberObjects.filter(object => object.type === "portal").map(portal => <Portal key={portal.id} position={portal.position} title={portal.metadata.title} caption={portal.metadata.caption} objectId={portal.id} locked={portal.id === "door-observatory" && !observatoryUnlocked} color={portal.metadata.accent} onActivate={onActivate} />)}
        {prismDefinition && <MemoryPrism definition={prismDefinition} discovered={discoveredPrism} onActivate={() => onActivate(prismDefinition.id)} />}
        {prismDefinition && echoDefinition && discoveredPrism && !discoveredEchoSigil && <EchoSigil definition={echoDefinition} onActivate={() => onActivate(echoDefinition.id)} />}
        {ariaDefinition && <AriaEntity definition={ariaDefinition} ariaState={ariaState} onActivate={() => onActivate(ariaDefinition.id)} />}
      </> : <>
        <mesh position={[0, 1.2, -2]}><cylinderGeometry args={[1.45, 1.45, 2.4, 32]} /><meshStandardMaterial color="#27231b" emissive={accent} emissiveIntensity={0.2} roughness={0.4} metalness={0.82} /></mesh>
        <mesh position={[0, 2.7, -2]} rotation={[0.5, 0.4, 0]}><octahedronGeometry args={[0.78, 2]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} metalness={0.84} roughness={0.15} /></mesh>
        <Html center position={[0, 0.25, 0]} distanceFactor={13} style={{ pointerEvents: "none" }}><div className="world-label"><span>ACTIVE ENVIRONMENT</span>{room === "archive" ? "THE ARCHIVE" : room === "lab" ? "THE LAB" : "THE OBSERVATORY"}</div></Html>
      </>}
      {!reducedMotion && !lowPower && <Sparkles count={renderQuality === "high" ? 65 : 38} scale={[19, 6, 16]} size={1.4} speed={0.12} color="#e1c98c" noise={0.8} />}
      <Environment preset="warehouse" />
    </>
  );
}

export default function VaultScene(props: VaultSceneProps) {
  return (
    <Canvas dpr={props.lowPower ? 1 : props.renderQuality === "high" ? [1, 2] : [1, 1.5]} gl={{ antialias: !props.lowPower, powerPreference: "high-performance" }} camera={{ position: [0, 4.5, 12], fov: 45 }} shadows={!props.lowPower}>
      <CameraRig room={props.room} reducedMotion={props.reducedMotion} />
      <Chamber {...props} />
    </Canvas>
  );
}
