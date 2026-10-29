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
} from "../lib/garden";
import { seedForTree, TREE_SPECIES, treeFamily } from '../lib/tree';
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
	useEffect(() => setDeleteTarget(null), [panel, selected]);
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
	const changeClock = (values: Partial<GardenState>) => {
		clock.current = { ...clock.current, ...values };
		setGarden(clock.current);
		save(clock.current);
	};
	const plant = (e: React.FormEvent) => {
		e.preventDefault();
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
		const seed = seedForTree(crypto.getRandomValues(new Uint32Array(1))[0], draft.tree);
		const planting = nextPlanting(state);
		const letter = {
			id: crypto.randomUUID(),
			title: draft.title.trim() || "A letter to my future self",
			body: draft.body,
			planted: state.time,
			reveal,
			seed,
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
			notify(
				"Your letter is still in the editor. Browser storage could not save it.",
			);
			return;
		}
		clock.current = next;
		setGarden(next);
		setDraft(emptyDraft);
		setSelected(letter.id);
		setPanel(null);
		writeButton.current?.focus();
		notify(
			reducedMotion
				? "A thought planted. Press play when you’re ready to watch it grow."
				: "A thought planted. Give it a little time.",
		);
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
			const { seed, position, planted, reveal } = letter;
			const effect: Removal = { tree: { id, seed, position, planted, reveal }, startedAt: performance.now() };
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
										<option key={species} value={species}>{species}</option>
									))}
								</select>
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
									disabled={!!removal}
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
									{treeFamily(selectedLetter.seed)} · A living
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
								{selectedProgress >= 1 ? (
									<div className={styles.revealed}>
										<div>
											<Icon name="letter" size={18} /> A
											letter from your past self
										</div>
										<p>{selectedLetter.body}</p>
									</div>
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
													onClick={() => select(l.id)}
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
															{treeFamily(l.seed)}{" "}
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

