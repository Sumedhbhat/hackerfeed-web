const DEFAULT_LATENCY_MS = 800;

/** How long demo answers take, so previews show the loading states readers see. */
export const DEMO_LATENCY_MS = Number(
	import.meta.env.VITE_DEMO_LATENCY_MS ?? DEFAULT_LATENCY_MS,
);

export function waitForDemoLatency(signal?: AbortSignal): Promise<void> {
	if (DEMO_LATENCY_MS <= 0) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, DEMO_LATENCY_MS);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}
