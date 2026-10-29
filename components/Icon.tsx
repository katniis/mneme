import type { CSSProperties } from "react";
export default function Icon({
	name,
	size = 20,
	style,
}: {
	name: string;
	size?: number;
	style?: CSSProperties;
}) {
	const paths: Record<string, React.ReactNode> = {
		sprout: (
			<>
				<path d="M12 21V11M12 15C5 16 3 11 3 7c5-1 9 1 9 6M12 11c0-6 4-9 9-8 0 5-3 9-9 8" />
			</>
		),
		grid: (
			<>
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</>
		),
		letter: (
			<>
				<rect x="3" y="5" width="18" height="14" rx="2" />
				<path d="m3 6 9 7 9-7" />
			</>
		),
		pen: (
			<>
				<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z" />
			</>
		),
		environment: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
		arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
		close: <path d="m6 6 12 12M6 18 18 6" />,
		play: <path d="m9 5 11 7-11 7V5Z" />,
		pause: (
			<>
				<path d="M8 5v14M16 5v14" strokeWidth="3" />
			</>
		),
    volume: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    muted: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
		recenter: (
			<>
				<path d="M4 9V4h5m6 0h5v5m0 6v5h-5M9 20H4v-5" />
				<circle cx="12" cy="12" r="3" />
			</>
		),
		mouse: (
			<>
				<rect x="6" y="2" width="12" height="20" rx="6" />
				<path d="M12 6v4" />
			</>
		),
		lock: (
			<>
				<rect x="5" y="10" width="14" height="11" rx="2" />
				<path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
			</>
		),
		check: <path d="m5 12 4 4L19 6" />,
		info: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 11v6M12 7h.01" />
			</>
		),
		calendar: (
			<>
				<rect x="3" y="5" width="18" height="16" rx="2" />
				<path d="M7 2v6M17 2v6M3 11h18" />
			</>
		),
		tree: (
			<>
				<path d="M12 21v-5M12 3 5 11h3l-4 5h16l-4-5h3L12 3Z" />
			</>
		),
	};
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={style}
		>
			{paths[name] || paths.sprout}
		</svg>
	);
}

