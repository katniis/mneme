"use client";
import {
	useMemo,
	useRef,
	useEffect,
	useLayoutEffect,
	type MutableRefObject,
} from "react";
import {
	Canvas,
	useFrame,
	useThree,
} from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { generateTree, type Voxel } from '../lib/tree';
import { generateTerrain, type Position, type TerrainVoxel } from '../lib/terrain';
import { terrainColour, type EnvironmentFrame } from '../lib/environment';
import EnvironmentSky from './environment/EnvironmentSky';
import Rain from './environment/Rain';
import Snow from './environment/Snow';
import { groundColumns } from '../lib/atmosphere';
import { leafSources } from '../lib/ambience';
import GardenAmbience from './environment/GardenAmbience';
import type { GardenState, Letter } from '../lib/garden';
import type { Removal } from '../lib/tree-removal';
import Tree from './Tree';
import usePixelTexture from './usePixelTexture';

type Props = {
  environment: import('../lib/environment').EnvironmentFrame;
	letters: Letter[];
	plots: Position[];
	clock: MutableRefObject<GardenState>;
	removal: Removal | null;
	onRemovalComplete(id: string): void;
	selected: string | null;
	onSelect: (id: string) => void;
	recenter: number;
	editing: boolean;
	onInteraction: () => void;
	onReady: () => void;
};

function Terrain({ positions, data, environment }: { positions: Position[]; data: TerrainVoxel[]; environment: EnvironmentFrame }) {
	const mesh = useRef<THREE.InstancedMesh>(null!);
	const snow = useRef<THREE.InstancedMesh>(null!);
	const material = useRef<THREE.MeshStandardMaterial>(null!);
	const grass = useMemo(() => data.filter(v => v.kind === 'grass'), [data]);
	const dummy = useMemo(() => new THREE.Object3D(), []);
	const oldKeys = useRef(new Set<string>());
	const arrivals = useRef(new Map<string, number>());
	const started = useRef(0);
	const dirty = useRef(true);
	const texture = usePixelTexture();
	useLayoutEffect(() => {
		const time = performance.now() / 1000;
		data.forEach((v, i) => {
			mesh.current.setColorAt(i, new THREE.Color(v.color));
			if (started.current && !oldKeys.current.has(v.key)) {
				const center = positions[Math.max(0, v.birth - 1)] || [0, 0];
				const distance = Math.hypot(
					v.position[0] - center[0],
					v.position[2] - center[1],
				);
				const layer =
					v.kind === "stone"
						? Number(v.key.match(/\d+$/)![0])
						: -1;
				const column = v.key.slice(0, v.key.lastIndexOf(":"));
				const parent =
					layer === 0
						? `${column}:soil`
						: `${column}:stone${layer - 1}`;
				const parentArrival =
					layer >= 0 ? arrivals.current.get(parent) : undefined;
				arrivals.current.set(
					v.key,
					Math.max(
						time + Math.min(0.6, distance * 0.065),
						parentArrival === undefined
							? time
							: parentArrival + 0.65,
					),
				);
			}
		});
		oldKeys.current = new Set(data.map((v) => v.key));
		started.current = time;
		dirty.current = true;
		if (mesh.current.instanceColor)
			mesh.current.instanceColor.needsUpdate = true;
	}, [data, positions]);
	useLayoutEffect(() => {
		data.forEach((v, i) => mesh.current.setColorAt(i, new THREE.Color(terrainColour(v.color, v.kind, environment.season))));
		if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
		dirty.current = true;
	}, [data, environment.season, environment.snow]);
	useFrame(() => {
		if (document.hidden) return;
		material.current.roughness = environment.rainIntensity > 0 ? .72 : 1;
		material.current.color.setScalar(environment.rainIntensity > 0 ? .95 : 1);
		if (!dirty.current && !arrivals.current.size) return;
		let changing = false;
		const now = performance.now() / 1000;
		data.forEach((v, i) => {
			const arrived = arrivals.current.get(v.key);
			const t =
				arrived === undefined
					? 1
					: THREE.MathUtils.clamp((now - arrived) / 0.65, 0, 1);
			const smooth = t * t * (3 - 2 * t);
			const y =
				v.kind === "stone"
					? v.position[1] + (v.size[1] * (1 - smooth)) / 2
					: v.position[1] - (1 - smooth) * 0.35;
			dummy.position.set(v.position[0], y, v.position[2]);
			dummy.scale.set(
				v.size[0] * Math.max(0.001, smooth),
				v.size[1] * Math.max(0.001, smooth),
				v.size[2] * Math.max(0.001, smooth),
			);
			dummy.updateMatrix();
			mesh.current.setMatrixAt(i, dummy.matrix);
			if (t < 1) changing = true;
			else arrivals.current.delete(v.key);
		});
		mesh.current.instanceMatrix.needsUpdate = true;
		if (snow.current) {
			grass.forEach((v, i) => {
				const arrival = arrivals.current.get(v.key);
				const t = arrival === undefined ? 1 : THREE.MathUtils.clamp((now - arrival) / .65, 0, 1);
				const smooth = t * t * (3 - 2 * t);
				dummy.position.set(v.position[0], v.position[1] + v.size[1] / 2 + .025 - (1 - smooth) * .35, v.position[2]);
				dummy.scale.set(v.size[0] * smooth, .05 * smooth, v.size[2] * smooth); dummy.updateMatrix(); snow.current.setMatrixAt(i, dummy.matrix);
			});
			snow.current.instanceMatrix.needsUpdate = true;
		}
		if (!changing && arrivals.current.size) arrivals.current.clear();
		dirty.current = changing;
	});
	return (
		<><instancedMesh
			ref={mesh}
			args={[undefined, undefined, data.length]}
			castShadow
			receiveShadow
			frustumCulled={false}
		>
			<boxGeometry />
			<meshStandardMaterial ref={material} map={texture} roughness={1} />
		</instancedMesh>
		{environment.snow && <instancedMesh ref={snow} args={[undefined, undefined, grass.length]} receiveShadow raycast={() => {}} frustumCulled={false}><boxGeometry /><meshStandardMaterial color="#e2e9e5" roughness={1} /></instancedMesh>}</>
	);
}

function CameraRig({
	radius,
	center,
	height,
	recenter,
	editing,
	onInteraction,
}: {
	radius: number;
	center: [number, number];
	height: number;
	recenter: number;
	editing: boolean;
	onInteraction: () => void;
}) {
	const controls = useRef<OrbitControlsType>(null!);
	const { camera, size } = useThree();
	const destination = useRef<{
		position: THREE.Vector3;
		target: THREE.Vector3;
	} | null>(null);
	const first = useRef(true);
	useEffect(() => {
		if (camera instanceof THREE.PerspectiveCamera) { camera.far = Math.max(200, radius * 24); camera.updateProjectionMatrix(); }
		const mobile = size.width < 700;
		const distance = Math.max(
			height ? (mobile ? 30 : Math.max(24, height * 2.8)) : 16.5,
			radius * Math.max(3.1, (size.height / size.width) * 3.8),
		);
		const target = new THREE.Vector3(
			center[0],
			height ? (height - 4.5) / 2 : mobile ? -2.5 : -1,
			center[1],
		);
		const offset = new THREE.Vector3(1.05, 0.85, 1.3)
			.normalize()
			.multiplyScalar(distance);
		if (
			first.current ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			camera.position.copy(target).add(offset);
			controls.current.target.copy(target);
			controls.current.update();
			first.current = false;
		} else
			destination.current = {
				position: target.clone().add(offset),
				target,
			};
	}, [
		radius,
		center[0],
		center[1],
		height,
		recenter,
		size.width,
		size.height,
		camera,
	]);
	useFrame((_, delta) => {
		if (destination.current && !editing) {
			camera.position.lerp(
				destination.current.position,
				1 - Math.exp(-delta * 3),
			);
			controls.current.target.lerp(
				destination.current.target,
				1 - Math.exp(-delta * 3),
			);
			controls.current.update();
			if (camera.position.distanceTo(destination.current.position) < 0.01)
				destination.current = null;
		}
		const targetY = height
			? (height - 4.5) / 2
			: size.width < 700
				? -2.5
				: -1;
		const offset = controls.current.target
			.clone()
			.sub(new THREE.Vector3(center[0], targetY, center[1]));
		if (offset.length() > radius * 0.7)
			controls.current.target.copy(
				offset
					.setLength(radius * 0.7)
					.add(new THREE.Vector3(center[0], targetY, center[1])),
			);
	});
	return (
		<OrbitControls
			ref={controls}
			makeDefault
			enabled={!editing}
			enableDamping
			dampingFactor={0.085}
			minDistance={radius * 2.1}
			maxDistance={radius * 8}
			minPolarAngle={0.2}
			maxPolarAngle={Math.PI * 0.58}
			zoomSpeed={0.8}
			panSpeed={0.65}
			rotateSpeed={0.65}
			onStart={() => {
				destination.current = null;
				onInteraction();
			}}
		/>
	);
}

function World(props: Props) {
	const ground = useMemo(() => generateTerrain(props.plots), [props.plots]);
  const columns = useMemo(() => groundColumns(ground), [ground]);
	const cache = useRef(new Map<number, Voxel[]>());
	const trees = useMemo(
		() =>
			(props.removal ? [...props.letters, props.removal.tree] : props.letters).map((letter) => {
				if (!cache.current.has(letter.seed))
					cache.current.set(letter.seed, generateTree(letter.seed));
				return { letter, data: cache.current.get(letter.seed)! };
			}),
		[props.letters, props.removal],
	);
	const height = useMemo(
		() =>
			Math.max(
				0,
				...trees.map((t) =>
					Math.max(
						...t.data.map((v) => v.position[1] + v.size[1] / 2),
					),
				),
			),
		[trees],
	);
  const sources = useMemo(() => leafSources(trees.filter(({ letter }) => letter.id !== props.removal?.tree.id).map(({ letter, data }) => ({
    tree: { id: letter.id, seed: letter.seed, position: letter.position, planted: letter.planted, reveal: letter.reveal }, voxels: data,
  }))), [trees, props.removal?.tree.id]);
	useEffect(() => {
		const seeds = new Set(trees.map(t => t.letter.seed));
		for (const seed of cache.current.keys()) if (!seeds.has(seed)) cache.current.delete(seed);
	}, [trees]);
	const positions = props.plots;
	const extent = useMemo(() => {
		const xs = [0, ...positions.map((p) => p[0])],
			zs = [0, ...positions.map((p) => p[1])];
		const center: [number, number] = [
			(Math.min(...xs) + Math.max(...xs)) / 2,
			(Math.min(...zs) + Math.max(...zs)) / 2,
		];
		const radius = Math.max(
			4.6,
			...positions.map(
				(p) => Math.hypot(p[0] - center[0], p[1] - center[1]) + 4.1,
			),
		);
		return { center, radius };
	}, [positions]);
	useEffect(() => {
		props.onReady();
	}, [props.onReady]);
	const { gl } = useThree();
	useEffect(() => {
		const lost = () => { if (props.removal) props.onRemovalComplete(props.removal.tree.id); };
		gl.domElement.addEventListener('webglcontextlost', lost);
		return () => gl.domElement.removeEventListener('webglcontextlost', lost);
	}, [gl, props.removal, props.onRemovalComplete]);
	return (
		<>
      <EnvironmentSky frame={props.environment} treeTop={height} {...extent} />
      <Terrain positions={positions} data={ground} environment={props.environment} />
      <Rain {...extent} treeTop={height} columns={columns} intensity={props.environment.rainIntensity} enabled={props.environment.enabled && props.environment.rainIntensity > 0} />
      <Snow {...extent} treeTop={height} columns={columns} enabled={props.environment.enabled && props.environment.snow} />
      <GardenAmbience frame={props.environment} columns={columns} sources={sources} clock={props.clock} />
			{trees.map(({ letter, data }) => (
				<Tree
					key={letter.id}
					tree={letter}
					data={data}
					clock={props.clock}
					selected={props.selected === letter.id}
					onSelect={props.onSelect}
					removal={props.removal?.tree.id === letter.id ? props.removal : null}
					survivors={props.letters}
					plots={props.plots}
					onRemovalComplete={props.onRemovalComplete}
				/>
			))}
			<CameraRig
				{...extent}
				height={height}
				recenter={props.recenter}
				editing={props.editing}
				onInteraction={props.onInteraction}
			/>
		</>
	);
}

export default function Scene(props: Props) {
	return (
		<Canvas
			shadows={{ type: THREE.PCFShadowMap }}
			dpr={[1, 1.6]}
			camera={{ fov: 40, near: 0.1, far: 200 }}
			gl={{
				antialias: true,
				alpha: false,
				powerPreference: "high-performance",
				preserveDrawingBuffer: true,
			}}
			onCreated={({ gl }) => {
				gl.toneMapping = THREE.ACESFilmicToneMapping;
				gl.toneMappingExposure = 1.05;
			}}
			fallback={
				<div role="status">
					Your browser cannot open the 3D garden. Your letters are
					still available in “Your letters”.
				</div>
			}
		>
			<World {...props} />
		</Canvas>
	);
}
