import { createContext, type ReactNode, useContext } from "react";

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
