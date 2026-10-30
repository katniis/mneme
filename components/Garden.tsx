"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import styles from "./Garden.module.css";
import {
	advanceTime,
	dateInput,
	deleteLetter,
	DRAFT_KEY,
	formatDate,
	progress,
	nextPlanting,
	readGarden,
	STORAGE_KEY,
	validateLetter,
	type Draft,
	type GardenState,
	type Letter,
} from "../lib/garden";
import { chooseTree, seedForTree, TREE_SPECIES, treeFamily } from '../lib/tree';
import { GENERATOR_VERSION, validateComparison, type BotanicalIdentity } from '../lib/meta-identity';
import EnvironmentPanel from './environment/EnvironmentPanel';
import { useEnvironment } from './environment/useEnvironment';
import { useAmbientAudio } from './environment/useAmbientAudio';
import type { Removal } from '../lib/tree-removal';

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const emptyDraft: Draft = { title: '', body: '', date: '', tree: '' };
type Panel = "write" | "letters" | "detail" | "about" | "environment" | null;

export default function Garden() {
  const environment = useEnvironment();
	const clock = useRef<GardenState>({
		version: 2,
		plots: [],
		letters: [],
		time: Date.now(),
		rate: 0,
		playing: true,
		speed: 1,
	});
	const [garden, setGarden] = useState(clock.current);
	const [ready, setReady] = useState(false);
	const [sceneReady, setSceneReady] = useState(false);
	const [panel, setPanel] = useState<Panel>(null);
	const [draft, setDraft] = useState<Draft>(emptyDraft);
	const [errors, setErrors] = useState<{ body?: string; date?: string }>({});
	const [selected, setSelected] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
	const [resetConfirm, setResetConfirm] = useState(false);
	const keepLetterButton = useRef<HTMLButtonElement>(null);
	const [removal, setRemoval] = useState<Removal | null>(null);
	const removalRef = useRef<Removal | null>(null);
	const finishRemoval = useCallback((id: string) => {
		if (removalRef.current?.tree.id !== id) return;
		removalRef.current = null;
		setRemoval(null);
	}, []);
	useEffect(() => {
		if (!removal) return;
		const finish = () => finishRemoval(removal.tree.id);
		const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
		const changed = () => { if (motion.matches) finish(); };
		const visible = () => { if (!document.hidden && performance.now() - removal.startedAt >= 3800) finish(); };
		const timeout = window.setTimeout(finish, Math.max(0, 4500 - (performance.now() - removal.startedAt)));
		motion.addEventListener('change', changed);
		document.addEventListener('visibilitychange', visible);
		return () => {
			window.clearTimeout(timeout);
			motion.removeEventListener('change', changed);
			document.removeEventListener('visibilitychange', visible);
		};
	}, [removal, finishRemoval]);
	const [recenter, setRecenter] = useState(0);
	const [consentInterpret, setConsentInterpret] = useState(false);
	const [suggestionBody, setSuggestionBody] = useState("");
	const [treeFocus, setTreeFocus] = useState<{ id: string; n: number } | null>(null);
	const [suggestion, setSuggestion] = useState<BotanicalIdentity | null>(null);
	const [suggestionProvenance, setSuggestionProvenance] = useState<'live' | 'cached'>('live');
	const [interpretState, setInterpretState] = useState<'idle' | 'loading' | 'error'>('idle');
	const [interpretError, setInterpretError] = useState("");
	const plantingRef = useRef(false);
	const reflectionRef = useRef<HTMLTextAreaElement>(null);
	const [reflectionDraft, setReflectionDraft] = useState("");
	const [reflectionBusy, setReflectionBusy] = useState<'question' | 'compare' | null>(null);
	const [reflectionError, setReflectionError] = useState("");
	const [interacted, setInteracted] = useState(false);
	const [toast, setToast] = useState("");
	const [storageError, setStorageError] = useState("");
	const [webgl, setWebgl] = useState(true);
  const sound = useAmbientAudio(environment.frame, webgl && sceneReady);
	const storageBlocked = useRef(false);
	const writeButton = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLElement>(null);
	const returnFocus = useRef<HTMLElement | null>(null);
	const selectedLetter = garden.letters.find((l) => l.id === selected);
	const notify = useCallback((message: string) => setToast(message), []);
	useEffect(() => { setDeleteTarget(null); setResetConfirm(false); }, [panel, selected]);
	useEffect(() => {
		setReflectionDraft(selectedLetter?.reflection ?? "");
		setReflectionError("");
		setReflectionBusy(null);
	}, [selected]);
	useEffect(() => {
		const el = reflectionRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [reflectionDraft, panel, selected]);
	useEffect(() => { if (deleteTarget) keepLetterButton.current?.focus(); }, [deleteTarget]);
	const save = useCallback((state: GardenState) => {
		if (storageBlocked.current) return false;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			setStorageError("");
			return true;
		} catch {
			setStorageError(
				"Browser storage is full or unavailable. Keep this tab open; changes cannot be saved.",
			);
			return false;
		}
	}, []);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const saved = readGarden(raw);
			if (saved) {
				clock.current = saved;
				setGarden(saved);
			} else if (raw) {
				storageBlocked.current = true;
				setStorageError(
					"Saved garden data could not be read. It has been kept untouched.",
				);
			}
			const rawDraft = localStorage.getItem(DRAFT_KEY);
			if (rawDraft) {
				const d = JSON.parse(rawDraft);
				if (
					typeof d.title === "string" &&
					typeof d.body === "string" &&
					typeof d.date === "string"
				)
					setDraft({ ...d, tree: TREE_SPECIES.includes(d.tree) ? d.tree : '' });
			}
		} catch {
			setStorageError(
				"Browser storage is unavailable. This session cannot be saved.",
			);
		}
		const canvas = document.createElement("canvas");
		setWebgl(!!(canvas.getContext("webgl2") || canvas.getContext("webgl")));
		setReady(true);
	}, []);

	useEffect(() => {
		if (!ready) return;
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
		} catch {
			setStorageError(
				"Your draft cannot be saved in this browser. Keep the editor open until you plant it.",
			);
		}
	}, [draft, ready]);

	useEffect(() => {
		if (!ready) return;
		let last = performance.now(),
			lastUI = last,
			lastSave = last;
		let frame = 0;
		const tick = (now: number) => {
			const state = clock.current;
			const max = Math.max(
				state.time,
				...state.letters.map((l) => l.reveal),
			);
			const time = Math.min(
				max,
				advanceTime(
					state.time,
					(now - last) / 1000,
					state.speed,
					state.rate,
					state.playing,
					!document.hidden,
				),
			);
			last = now;
			clock.current = { ...state, time };
			if (now - lastUI > 180) {
				setGarden(clock.current);
				lastUI = now;
			}
			if (now - lastSave > 1500) {
				save(clock.current);
				lastSave = now;
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		const visibility = () => {
			last = performance.now();
			if (document.hidden) save(clock.current);
		};
		const persist = () => save(clock.current);
		document.addEventListener("visibilitychange", visibility);
		window.addEventListener("pagehide", persist);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("visibilitychange", visibility);
			window.removeEventListener("pagehide", persist);
			save(clock.current);
		};
	}, [ready, save]);

	useEffect(() => {
		if (toast) {
			const timeout = setTimeout(() => setToast(""), 4200);
			return () => clearTimeout(timeout);
		}
	}, [toast]);
	useEffect(() => {
		if (!panel) return;
		returnFocus.current = document.activeElement as HTMLElement;
		const frame = requestAnimationFrame(() =>
			panelRef.current
				?.querySelector<HTMLElement>("button, input, textarea")
				?.focus(),
		);
		const keyboard = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setPanel(null);
				returnFocus.current?.focus();
			}
			if (e.key === "Tab" && panelRef.current) {
				const elements = Array.from(
					panelRef.current.querySelectorAll<HTMLElement>(
						'button:not(:disabled), input:not(:disabled), textarea, select, a[href], [tabindex="0"]',
					),
				);
				if (e.shiftKey && document.activeElement === elements[0]) {
					e.preventDefault();
					elements.at(-1)?.focus();
				} else if (
					!e.shiftKey &&
					document.activeElement === elements.at(-1)
				) {
					e.preventDefault();
					elements[0]?.focus();
				}
			}
		};
		document.addEventListener("keydown", keyboard);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("keydown", keyboard);
		};
	}, [panel]);

	useEffect(() => {
		if (!panel) return;
		let down: { x: number; y: number } | null = null;
		const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
		const onUp = (e: PointerEvent) => {
			if (!down) return;
			const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
			down = null;
			if (moved > 5) return;
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) { setPanel(null); setSelected(null); }
		};
		document.addEventListener("pointerdown", onDown);
		document.addEventListener("pointerup", onUp);
		return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("pointerup", onUp); };
	}, [panel]);
	const closePanel = () => {
		setPanel(null);
		returnFocus.current?.focus();
	};
	const openEditor = () => {
		setErrors({});
		if (!draft.date)
			setDraft((d) => ({
				...d,
				date: dateInput(clock.current.time + 30 * 86400000),
			}));
		setPanel("write");
	};
	const select = useCallback((id: string) => {
		setSelected(id);
		setPanel("detail");
	}, []);
	const sceneLoaded = useCallback(() => setSceneReady(true), []);
	const interact = useCallback(() => setInteracted(true), []);
	const updateLetter = useCallback((id: string, patch: Partial<Letter>) => {
		const next: GardenState = { ...clock.current, letters: clock.current.letters.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
		if (!save(next)) { notify("That change could not be saved in this browser."); return false; }
		clock.current = next;
		setGarden(next);
		return true;
	}, [save, notify]);
	const requestSuggestion = async () => {
		if (!consentInterpret || !draft.body.trim() || interpretState === 'loading') return;
		setInterpretState('loading');
		setInterpretError("");
		try {
			const response = await fetch('/api/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'interpret', body: draft.body }) });
			const data = await response.json().catch(() => null);
			if (!response.ok || !data?.ok) throw new Error(data?.error || 'Meta personalisation is unavailable right now.');
			setSuggestion(data.identity as BotanicalIdentity);
			setSuggestionBody(draft.body);
			setSuggestionProvenance('live');
			setInterpretState('idle');
		} catch (error) {
			setInterpretState('error');
			setInterpretError(error instanceof Error ? error.message : 'Meta personalisation is unavailable right now. Your letter is unchanged.');
		}
	};
	const saveReflection = () => {
		if (!selectedLetter) return;
		if (updateLetter(selectedLetter.id, { reflection: reflectionDraft })) notify('Reflection saved with your letter.');
	};
	const askQuestion = async () => {
		if (!selectedLetter || reflectionBusy) return;
		setReflectionBusy('question');
		setReflectionError("");
		try {
			const response = await fetch('/api/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'question', body: selectedLetter.body }) });
			const data = await response.json().catch(() => null);
			if (!response.ok || !data?.ok) throw new Error(data?.error || 'A Meta question is unavailable right now.');
			updateLetter(selectedLetter.id, { reflectionQuestion: data.question as string });
		} catch (error) {
			setReflectionError(error instanceof Error ? error.message : 'A Meta question is unavailable right now.');
		} finally { setReflectionBusy(null); }
	};
	const compareNow = async () => {
		if (!selectedLetter || reflectionBusy) return;
		const reflection = reflectionDraft.trim() ? reflectionDraft : selectedLetter.reflection ?? '';
		if (!reflection.trim()) { setReflectionError('Write a short reflection first, then compare.'); return; }
		setReflectionBusy('compare');
		setReflectionError("");
		updateLetter(selectedLetter.id, { reflection });
		try {
			const response = await fetch('/api/meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'compare', original: selectedLetter.body, reflection }) });
			const data = await response.json().catch(() => null);
			if (!response.ok || !data?.ok) throw new Error(data?.error || 'The comparison is unavailable right now.');
			const checked = validateComparison(data.comparison, selectedLetter.body, reflection);
			if (!checked.ok) throw new Error(`The comparison could not be verified (${checked.error}). Your reflection was saved without it.`);
			updateLetter(selectedLetter.id, { reflection, comparison: checked.comparison });
		} catch (error) {
			setReflectionError(error instanceof Error ? error.message : 'The comparison is unavailable right now. Your reflection was saved without it.');
		} finally { setReflectionBusy(null); }
	};
	const changeClock = (values: Partial<GardenState>) => {
		clock.current = { ...clock.current, ...values };
		setGarden(clock.current);
		save(clock.current);
	};
	const plant = (e: React.FormEvent) => {
		e.preventDefault();
		if (plantingRef.current) return;
		if (interpretState === 'loading') { notify('Wait for the tree suggestion to finish before planting.'); return; }
		if (removalRef.current) return;
		const state = clock.current;
		const validation = validateLetter(draft.body, draft.date, state.time);
		setErrors(validation);
		if (Object.keys(validation).length) {
			requestAnimationFrame(() =>
				panelRef.current
					?.querySelector<HTMLElement>('[aria-invalid="true"]')
					?.focus(),
			);
			return;
		}
		const reveal = Date.parse(`${draft.date}T12:00:00`);
		plantingRef.current = true;
		const activeSuggestion = suggestion && suggestionBody === draft.body ? suggestion : null;
		const rawSeed = crypto.getRandomValues(new Uint32Array(1))[0];
		const { seed, species } = activeSuggestion ? { seed: seedForTree(rawSeed, activeSuggestion.species), species: activeSuggestion.species } : chooseTree(rawSeed, draft.tree);
		const planting = nextPlanting(state);
		const letter = {
			id: crypto.randomUUID(),
			title: draft.title.trim() || "A letter to my future self",
			body: draft.body,
			planted: state.time,
			reveal,
			seed,
      species,
			...(activeSuggestion ? { identity: activeSuggestion, identityProvenance: suggestionProvenance, generatorVersion: GENERATOR_VERSION } : {}),
			position: planting.position,
		};
		const reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const next: GardenState = {
			...state,
			letters: [...state.letters, letter],
			plots: planting.plots,
			rate: Math.max(1, (reveal - state.time) / 50),
			playing: !reducedMotion,
		};
		if (!save(next)) {
			plantingRef.current = false;
			notify(
				"Your letter is still in the editor. Browser storage could not save it.",
			);
			return;
		}
		clock.current = next;
		setGarden(next);
		setDraft(emptyDraft);
		plantingRef.current = false;
		setSuggestion(null);
		setSuggestionBody("");
		setConsentInterpret(false);
		setInterpretState('idle');
		setInterpretError("");
		setSelected(letter.id);
		setPanel(null);
		writeButton.current?.focus();
		notify(
			reducedMotion
				? "A thought planted. Press play when you’re ready to watch it grow."
				: "A thought planted. Give it a little time.",
		);
	};
	const resetGarden = () => {
		const next: GardenState = { version: 2, plots: [], letters: [], time: Date.now(), rate: 0, playing: true, speed: 1 };
		clock.current = next;
		setGarden(next);
		save(next);
		try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable; in-memory reset still applies */ }
		setDraft(emptyDraft);
		setSelected(null);
		setTreeFocus(null);
		setDeleteTarget(null);
		setResetConfirm(false);
		setSuggestion(null);
		setSuggestionBody("");
		setPanel(null);
		writeButton.current?.focus();
		notify('Garden cleared. A fresh island is waiting.');
	};
	const confirmDelete = (id: string) => {
		if (removalRef.current) return;
		const state = clock.current;
		const letter = state.letters.find(l => l.id === id);
		if (!letter) return;
		const next = deleteLetter(state, id);
		if (next === state) return;
		if (!save(next)) {
			notify('Deletion could not be saved. Your letter and tree are still here.');
			return;
		}
		clock.current = next;
		setGarden(next);
		if (webgl && sceneReady && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			const { seed, species, identity, generatorVersion, position, planted, reveal } = letter;
			const effect: Removal = { tree: { id, seed, species, identity, generatorVersion, position, planted, reveal }, startedAt: performance.now() };
			removalRef.current = effect;
			setRemoval(effect);
		}
		setSelected(null);
		setDeleteTarget(null);
		setPanel(null);
		writeButton.current?.focus();
		notify('Letter deleted. Its land will stay.');
	};
	const growing = garden.letters.filter(
		(l) => progress(l, garden.time) < 1,
	).length;
	const selectedProgress = selectedLetter
		? progress(selectedLetter, garden.time)
		: 0;
	const stage = (p: number) =>
		p >= 1
			? "Fully grown"
			: p < 0.08
				? "Taking root"
				: p < 0.35
					? "Reaching upward"
					: p < 0.7
						? "Branching out"
						: "Coming into leaf";
	const remainingDays = selectedLetter ? Math.max(0, (selectedLetter.reveal - garden.time) / 86400000) : 0;
	const etaSeconds = selectedLetter && garden.rate > 0 && garden.playing ? Math.max(0, (selectedLetter.reveal - garden.time) / 1000 / (garden.rate * garden.speed)) : null;

	return (
		<main className={styles.app}>
			<header className={styles.header}>
				<a className={styles.brand} href="/" aria-label="Mneme home">
					<Icon name="sprout" size={29} />
					<span>
						mneme<span className={styles.brandDot}>.</span>
					</span>
				</a>
				<nav className={styles.nav} aria-label="Garden navigation">
					<button
						className={panel !== "letters" ? styles.activeNav : ""}
						onClick={() => setPanel(null)}
					>
						Your garden
					</button>
					<button
						className={panel === "letters" ? styles.activeNav : ""}
						onClick={() => setPanel("letters")}
					>
						Your letters{" "}
						<span className={styles.count}>
							{garden.letters.length}
						</span>
					</button>
				</nav>
				<div className={styles.headerRight}>
					<span className={styles.local}>
						<i />
						Saved in this browser
					</span>
					<button
						ref={writeButton}
						className={styles.primary}
						onClick={openEditor}
					>
						<Icon name="plus" size={18} />
						Write a letter
					</button>
				</div>
			</header>

			<section
				className={`${styles.world} ${environment.frame.daylight < 0.3 ? styles.night : ''}`}
				aria-label="Interactive floating garden"
			>
				<div
					className={styles.canvas}
					aria-label="3D island. Drag to orbit, scroll to zoom, and click a tree to select it."
					onContextMenu={(e) => e.preventDefault()}
				>
					{ready && webgl ? (
						<Scene environment={environment.frame}
							letters={garden.letters}
							plots={garden.plots}
							removal={removal}
							onRemovalComplete={finishRemoval}
							clock={clock}
							selected={selected}
							treeFocus={treeFocus}
							onSelect={select}
							recenter={recenter}
							editing={panel === "write"}
							onInteraction={interact}
							onReady={sceneLoaded}
						/>
					) : ready ? (
						<div className={styles.fallback}>
							<Icon name="tree" size={36} />
							<h2>Your garden is still here.</h2>
							<p>
								This browser cannot display WebGL. You can still
								write and find your saved letters.
							</p>
							<button onClick={() => setPanel("letters")}>
								Open your letters
							</button>
						</div>
					) : null}
				</div>
				<div className={styles.sceneHeading}>
					<div className={styles.location}>
						<span className={styles.sun} /> A quiet corner of the
						world
					</div>
					<h1>
						Your thoughts,
						<br />
						given room to grow.
					</h1>
					<p>
						A letter for tomorrow.
						<br />A little life for today.
					</p>
				</div>
				<div className={styles.sceneTools}>
          <button className={styles.iconButton} onClick={() => setPanel("environment")} aria-label="Environment settings" title="Environment settings"><Icon name="environment" /></button>
					<button
						className={styles.iconButton}
						onClick={() => setRecenter((n) => n + 1)}
						aria-label="Recenter garden"
						title="Recenter garden"
					>
						<Icon name="recenter" />
					</button>
					<button
						className={styles.iconButton}
						onClick={() => setPanel("about")}
						aria-label="About this local prototype"
						title="About Mneme"
					>
						<Icon name="info" />
					</button>
				</div>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.soundtrackButton}`}
          onClick={() => sound.setMuted(!sound.muted)}
          disabled={!sound.available}
          aria-label={sound.muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
          aria-pressed={sound.muted}
          title={(ready && sound.status) || (sound.muted ? 'Unmute soundtrack' : 'Mute soundtrack')}
        >
          <Icon name={sound.muted ? 'muted' : 'volume'} />
        </button>
				{ready && !sceneReady && webgl && (
					<div className={styles.loading} role="status">
						Finding a quiet place…
					</div>
				)}

				{garden.letters.length === 0 && !panel && (
					<div className={styles.empty}>
						<span className={styles.emptyIcon}>
							<Icon name="sprout" size={25} />
						</span>
						<h2>
							Give a thought <br />
							somewhere to grow.
						</h2>
						<p>
							Write to your future self. <br />
							Plant it here, and watch it become.
						</p>
						<button
							className={styles.textButton}
							onClick={openEditor}
						>
							Plant your first letter{" "}
							<Icon name="arrow" size={18} />
						</button>
					</div>
				)}
				{garden.letters.length > 0 && !panel && (
					<div className={styles.gardenNote}>
						<Icon name="sprout" size={20} />
						<div>
							<strong>
								{garden.letters.length === 1
									? "One letter, taking root."
									: `${garden.letters.length} letters. A world of possibility.`}
							</strong>
							<span>
								{growing
									? `${growing} ${growing === 1 ? "tree is" : "trees are"} growing with you`
									: "Every thought has found its shape"}
							</span>
						</div>
					</div>
				)}

				{!panel && (
					<div
						className={`${styles.gestures} ${interacted ? styles.gesturesQuiet : ""}`}
					>
						<Icon name="mouse" size={16} />
						<span>
							Drag to explore <b>·</b> Scroll to get closer
						</span>
					</div>
				)}
				<div
					className={styles.timeControl}
					aria-label="Local simulation clock"
				>
					<button
						className={styles.playButton}
						onClick={() =>
							changeClock({ playing: !garden.playing })
						}
						disabled={!growing}
						aria-label={
							garden.playing
								? "Pause time-lapse"
								: "Play time-lapse"
						}
					>
						<Icon
							name={garden.playing && growing ? "pause" : "play"}
							size={17}
						/>
					</button>
					<div className={styles.timeDate}>
						<span>
							Demo time{" "}
							<i
								className={
									garden.playing && growing
										? styles.running
										: ""
								}
							/>
						</span>
						<strong>{formatDate(garden.time, true)}</strong>
					</div>
					<div className={styles.speed}>
						<label htmlFor="speed">Time-lapse</label>
						<select
							id="speed"
							value={garden.speed}
							onChange={(e) =>
								changeClock({ speed: Number(e.target.value) })
							}
						>
							<option value="0.5">0.5×</option>
							<option value="1">1×</option>
							<option value="2">2×</option>
							<option value="4">4×</option>
						</select>
					</div>
				</div>

				{panel && (
					<aside
						ref={panelRef}
						className={`${styles.panel} ${panel === "write" ? styles.editor : ""}`}
						role="dialog"
						aria-modal="true"
						aria-labelledby="panel-title"
					>
						<div className={styles.panelTop}>
							<span>
								<Icon
									name={
										panel === "write"
											? "pen"
											: panel === "letters"
												? "letter"
												: "sprout"
									}
									size={18}
								/>
								{panel === "write"
									? "A moment for yourself"
									: panel === "letters"
										? "Your collection"
										: panel === "environment" ? "Garden atmosphere" : panel === "about"
											? "A little about Mneme"
											: "A thought, growing"}
							</span>
							<button
								className={styles.closeButton}
								aria-label="Close panel"
								onClick={closePanel}
							>
								<Icon name="close" size={19} />
							</button>
						</div>
						{panel === "write" && (
							<form
								className={styles.form}
								onSubmit={plant}
								noValidate
							>
								<h2 id="panel-title">Dear future me,</h2>
								<p className={styles.panelIntro}>
									What would you like your future self to
									remember?
								</p>
								<label htmlFor="title">
									Give it a name <span>optional</span>
								</label>
								<input
									id="title"
									placeholder="A small beginning"
									maxLength={100}
									value={draft.title}
									onChange={(e) =>
										setDraft({
											...draft,
											title: e.target.value,
										})
									}
								/>
								<label htmlFor="body">Your letter</label>
								<textarea
									id="body"
									placeholder="I've been meaning to tell you…"
									value={draft.body}
									onChange={(e) =>
										setDraft({
											...draft,
											body: e.target.value,
										})
									}
									aria-required="true"
									aria-invalid={!!errors.body}
									aria-describedby={
										errors.body ? "body-error" : undefined
									}
								/>
								{errors.body && (
									<p className={styles.error} id="body-error">
										{errors.body}
									</p>
								)}
								<label htmlFor="date">A day to open it</label>
								<input
									id="date"
									type="date"
									min={dateInput(garden.time + 86400000)}
									value={draft.date}
									onChange={(e) =>
										setDraft({
											...draft,
											date: e.target.value,
										})
									}
									aria-required="true"
									aria-invalid={!!errors.date}
									aria-describedby={
										errors.date ? "date-error" : "date-hint"
									}
								/>
								{errors.date ? (
									<p className={styles.error} id="date-error">
										{errors.date}
									</p>
								) : (
									<p
										className={styles.fieldHint}
										id="date-hint"
									>
										After {formatDate(garden.time, true)},
										in demo time.
									</p>
								)}
								<label htmlFor="tree">Tree type</label>
								<select
									id="tree"
									value={draft.tree}
									onChange={(e) => setDraft({ ...draft, tree: e.target.value })}
								>
									<option value="">Surprise me</option>
									{TREE_SPECIES.map((species) => (
										<option key={species} value={species}>{species === 'Moonveil' ? 'Moonveil (mystical)' : species}</option>
									))}
								</select>
								<div className={styles.metaBox}>
									<label className={styles.consentRow}>
										<input type="checkbox" checked={consentInterpret} onChange={(e) => setConsentInterpret(e.target.checked)} />
										<span><strong>Personalise my tree with Meta AI (optional).</strong> Only if you tick this, your letter text is sent to Meta to propose a tree identity. Your letter still stays saved only in this browser. The explanation can hint at your letter's themes, so only use it with words you are comfortable sharing this way.</span>
									</label>
									<div className={styles.metaActions}>
										{!(suggestion && suggestionBody === draft.body) && (<button type="button" className={styles.secondary} disabled={!consentInterpret || !draft.body.trim() || interpretState === 'loading'} onClick={requestSuggestion}>{interpretState === 'loading' ? 'Asking Meta…' : 'Suggest a tree identity'}</button>)}
									</div>
									{interpretState === 'loading' && <p className={styles.fieldHint} role="status">Reading your letter… Your draft stays exactly as written.</p>}
									{interpretState === 'error' && <div><p className={styles.error} role="alert">{interpretError}</p><button type="button" className={styles.textButton} onClick={requestSuggestion}>Try again</button><span className={styles.fieldHint}> — or just plant an ordinary tree below.</span></div>}
									{suggestion && suggestionBody !== draft.body && <p className={styles.fieldHint} role="status">Your letter changed, so the earlier suggestion no longer applies. Request a new one, or plant an ordinary tree.</p>}
									{suggestion && suggestionBody === draft.body && (
										<div className={styles.metaCard}>
											<span className={styles.metaBadge}>{suggestionProvenance === 'live' ? 'Live Meta response' : 'Cached fictional example — not a live response'}</span>
											<p><strong>{suggestion.species}</strong> — {suggestion.intention}</p>
											<p className={styles.fieldHint}>Themes: {suggestion.themes.join(' · ')}</p>
											<p>{suggestion.explanation}</p>
											<p className={styles.fieldHint}>Planting will save this identity with your tree. The random seed still shapes the fine branches, so no two trees are identical.</p>
											<button type="button" className={`${styles.textButton} ${styles.discardButton}`} onClick={() => { setSuggestion(null); setSuggestionBody(""); }}>Discard — plant an ordinary tree instead</button>
										</div>
									)}
								</div>
								<div className={styles.plantNote}>
									<Icon name="sprout" size={20} />
									<span>
										Your words become a one-of-a-kind tree.
										<br />
										Watch it grow in a 50-second time-lapse.
									</span>
								</div>
								<button
									type="submit"
									className={styles.primary}
									disabled={!!removal || interpretState === 'loading'}
								>
									<Icon name="sprout" size={18} />
									Plant letter <Icon name="arrow" size={17} />
								</button>
								{removal && <p className={styles.fieldHint} role="status">Clearing a planting spot…</p>}
								<p className={styles.draftNote}>
									Draft saved here as you write. Take your
									time.
								</p>
							</form>
						)}

						{panel === "detail" && selectedLetter && (
							<div className={styles.details}>
								<span className={styles.species}>
									{treeFamily(selectedLetter.seed, selectedLetter.species)} · A living
									letter
								</span>
								<h2 id="panel-title">{selectedLetter.title}</h2>
								<p className={styles.panelIntro}>
									{stage(selectedProgress)}. Every little
									branch is part of your story.
								</p>
								<div className={styles.growthLabel}>
									<span>{stage(selectedProgress)}</span>
									<strong>
										{Math.round(selectedProgress * 100)}%
									</strong>
								</div>
								<div
									className={styles.progressTrack}
									role="progressbar"
									aria-label="Tree growth"
									aria-valuenow={Math.round(
										selectedProgress * 100,
									)}
									aria-valuemin={0}
									aria-valuemax={100}
								>
									<i
										style={{
											width: `${selectedProgress * 100}%`,
										}}
									/>
								</div>
								<dl>
									<div>
										<dt>Planted</dt>
										<dd>
											{formatDate(
												selectedLetter.planted,
												true,
											)}
										</dd>
									</div>
									<div>
										<dt>Open on</dt>
										<dd>
											{formatDate(
												selectedLetter.reveal,
												true,
											)}
										</dd>
									</div>
								</dl>
								{selectedProgress < 1 && (
									<p className={styles.fieldHint} role="status">
										About {remainingDays < 1 ? 'less than a day' : `${remainingDays.toFixed(1)} days`} left in demo time{etaSeconds !== null ? ` — roughly ${etaSeconds < 60 ? `${Math.max(1, Math.round(etaSeconds))} seconds` : `${(etaSeconds / 60).toFixed(1)} minutes`} at the current speed while time is playing` : ''}. Simulated time, not a real delivery date.
									</p>
								)}
								{selectedLetter.identity && (
									<div className={styles.metaCard}>
										<span className={styles.metaBadge}>{selectedLetter.identityProvenance === 'cached' ? 'Cached fictional example' : selectedLetter.identityProvenance === 'live' ? 'Live Meta identity' : 'Personalised identity'}</span>
										<p><strong>{selectedLetter.identity.species}</strong> — {selectedLetter.identity.intention}</p>
										<p className={styles.themesLine}>Themes: {selectedLetter.identity.themes.join(' · ')}</p>
										<p>{selectedLetter.identity.explanation}</p>
									</div>
								)}
								{selectedProgress >= 1 ? (
									<>
									<div className={styles.revealed}>
										<div>
											<Icon name="letter" size={18} /> A
											letter from your past self
										</div>
										<p>{selectedLetter.body}</p>
									</div>
										<div className={styles.reflectionBox}>
											<h3>Reflect, if you like</h3>
											<p className={styles.fieldHint}>Optional. Your letter stays exactly as written; a reflection never changes or replaces it.</p>
											{selectedLetter.reflectionQuestion && <p className={styles.reflectionQuestion}>{selectedLetter.reflectionQuestion}</p>}
											<label htmlFor="reflection">Your reflection now</label>
											<textarea id="reflection" ref={reflectionRef} rows={3} value={reflectionDraft} onChange={(e) => setReflectionDraft(e.target.value)} placeholder="What do you notice, reading this today?" />
											<div className={styles.metaActions}>
												<button type="button" className={styles.secondary} onClick={saveReflection}>Save reflection</button>
											</div>
											<h4 className={styles.metaHeading}>With Meta AI</h4>
											<div className={styles.metaActions}>
												<button type="button" className={styles.secondary} disabled={reflectionBusy !== null} onClick={askQuestion}>{reflectionBusy === 'question' ? 'Asking Meta…' : 'Ask Meta for a question'}</button>
											</div>
										<p className={styles.fieldHint}>Asking sends your original letter to Meta for one reflection question. Separate from comparing, below.</p>
											<div className={styles.metaActions}>
												<button type="button" className={styles.secondary} disabled={reflectionBusy !== null} onClick={compareNow}>{reflectionBusy === 'compare' ? 'Comparing…' : 'Compare then and now'}</button>
											</div>
										<p className={styles.fieldHint}>Comparing sends your letter and reflection to Meta, using only quotes copied exactly from your own words.</p>
											{reflectionError && <p className={styles.error} role="alert">{reflectionError}</p>}
											{selectedLetter.comparison && (
												<div className={styles.quotePair}>
													<p><span>Then</span>“{selectedLetter.comparison.originalQuote}”</p>
													<p><span>Now</span>“{selectedLetter.comparison.reflectionQuote}”</p>
													<p>{selectedLetter.comparison.observation}</p>
													<p className={styles.fieldHint}>Quotes checked word-for-word against your texts. What changed — and what it means — is yours to judge.</p>
												</div>
											)}
										</div>
									</>
								) : (
									<div className={styles.waiting}>
										<Icon name="letter" size={28} />
										<strong>
											Something to look forward to.
										</strong>
										<p>
											Your letter opens when demo time
											reaches{" "}
											{formatDate(
												selectedLetter.reveal,
												true,
											)}
											.
										</p>
									</div>
								)}
								<p className={styles.localNote}>
									A local demo, saved in this browser. The
									reveal is simulated, and browser data is not
									encrypted.
								</p>
								{deleteTarget === selectedLetter.id ? (
									<div className={styles.deleteConfirmation} role="group" aria-label="Confirm deletion">
										<p>This permanently deletes your letter and removes its tree. The land stays for your next letter.</p>
										<div>
											<button type="button" ref={keepLetterButton} onClick={() => setDeleteTarget(null)}>Keep letter</button>
											<button type="button" className={styles.danger} disabled={!!removal} onClick={() => confirmDelete(selectedLetter.id)}>Delete permanently</button>
										</div>
									</div>
								) : (
									<button type="button" className={styles.deleteButton} disabled={!!removal} onClick={() => setDeleteTarget(selectedLetter.id)}>Delete tree and letter</button>
								)}
								<button
									className={styles.secondary}
									onClick={closePanel}
								>
									Back to the garden{" "}
									<Icon name="arrow" size={17} />
								</button>
							</div>
						)}

						{panel === "letters" && (
							<div className={styles.collection}>
								<h2 id="panel-title">Words you planted.</h2>
								<p className={styles.panelIntro}>
									Little things, with a future.
								</p>
								{garden.letters.length ? (
									<ul>
										{garden.letters.map((l, i) => (
											<li key={l.id}>
												<button
													onClick={() => { select(l.id); setTreeFocus({ id: l.id, n: Date.now() }); }}
												>
													<span
														className={
															styles.listTree
														}
													>
														<Icon
															name="tree"
															size={24}
														/>
													</span>
													<span>
														<strong>
															{l.title}
														</strong>
														<small>
															{treeFamily(l.seed, l.species)}{" "}
															·{" "}
															{stage(
																progress(
																	l,
																	garden.time,
																),
															)}
														</small>
														<small>
															Opens{" "}
															{formatDate(
																l.reveal,
																true,
															)}
														</small>
													</span>
													<Icon
														name="arrow"
														size={16}
													/>
													<span
														className={
															styles.srOnly
														}
													>
														Select tree {i + 1}
													</span>
												</button>
											</li>
										))}
									</ul>
								) : (
									<div className={styles.collectionEmpty}>
										<Icon name="letter" size={35} />
										<p>
											No letters yet.
											<br />
											Your first one can start with
											anything.
										</p>
									</div>
								)}
								<button
									className={styles.primary}
									onClick={openEditor}
								>
									<Icon name="plus" size={18} />
									Write a letter
								</button>
							</div>
						)}

						{panel === "environment" && <EnvironmentPanel controller={environment} sound={sound} />}
            {panel === "about" && (
							<div className={styles.about}>
								<h2 id="panel-title">Let time do its thing.</h2>
								<p>
									Mneme is a small garden for the things you
									want to remember. Write a letter, choose a
									future day, and give it somewhere to grow.
								</p>
								<h3>A slower idea. A faster clock.</h3>
								<p>
									This prototype moves through demo time. A
									new tree grows to its reveal date in about
									50 seconds at 1×. Pause or change the speed
									anytime. New letters share the same clock.
								</p>
								<h3>It lives right here.</h3>
								<p>
									Your letters, drafts, and garden are saved
									only in this browser on this device.
									Clearing browser data removes them. Letters
									are not encrypted, and demo dates are not a
									secure lock.
								</p>
								<p>Optional environment settings use your real local clock. Choosing a weather location sends approximate coordinates or a city search to Open-Meteo; your letters stay here.</p>
                <h3>Make yourself at home.</h3>
								<p>
									Drag to orbit. Scroll or pinch to zoom.
									Right-drag, Shift-drag, or use two fingers
									to pan. Click a tree to visit its letter, or
									choose one in Your letters.
								</p>
								<h3>Start over.</h3>
								<p>
									Clearing your browser storage while this tab
									is open will not stick — the garden in this
									tab saves itself again within seconds. Use
									this instead: it empties the garden here
									first, then storage.
								</p>
								{resetConfirm ? (
									<div className={styles.deleteConfirmation} role="group" aria-label="Confirm garden reset">
										<p>This permanently deletes every letter and tree in this browser. Your atmosphere preferences stay.</p>
										<div>
											<button type="button" onClick={() => setResetConfirm(false)}>Keep my garden</button>
											<button type="button" className={styles.danger} onClick={resetGarden}>Delete everything</button>
										</div>
									</div>
								) : (
									<button type="button" className={styles.deleteButton} onClick={() => setResetConfirm(true)}>Reset garden and delete all letters</button>
								)}
								<button
									className={styles.secondary}
									onClick={closePanel}
								>
									Back to the garden{" "}
									<Icon name="arrow" size={17} />
								</button>
							</div>
						)}
					</aside>
				)}
				{toast && (
					<div className={styles.toast} role="status">
						<Icon name="check" size={18} />
						{toast}
					</div>
				)}
			</section>
			<footer className={styles.footer}>
				<span>A little space for your future self.</span>
				<span>
					{storageError || (
						<>
							<Icon name="info" size={13} /> Local prototype ·
							Your letters live in this browser
						</>
					)}
				</span>
				<span className={styles.footerEnd}>
					Grow at your own pace <Icon name="sprout" size={14} />
				</span>
			</footer>
			{storageError && (
				<div className={styles.storageAlert} role="alert">
					{storageError}
				</div>
			)}
		</main>
	);
}


