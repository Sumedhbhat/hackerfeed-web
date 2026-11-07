import { createContext, type ReactNode, useContext } from "react";

/**
 * "Expand all" / "Collapse all" for a comment thread. `revision` changes on
 * every press, so comments apply it even when the mode is pressed twice;
 * replies that load later start in the current mode.
 */
export type ThreadExpansion = {
	mode: "expand" | "collapse" | null;
	revision: number;
};

const ThreadExpansionContext = createContext<ThreadExpansion>({
	mode: null,
	revision: 0,
});

export function ThreadExpansionProvider({
	value,
	children,
}: {
	value: ThreadExpansion;
	children: ReactNode;
}) {
	return (
		<ThreadExpansionContext.Provider value={value}>
			{children}
		</ThreadExpansionContext.Provider>
	);
}

export function useThreadExpansion(): ThreadExpansion {
	return useContext(ThreadExpansionContext);
}
