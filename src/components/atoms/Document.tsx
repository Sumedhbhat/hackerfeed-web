import type { ReactNode } from "react";

/** The <html> document: `head` goes in <head>, `children` in the styled <body>. */
export function Document({
	head,
	children,
}: {
	head: ReactNode;
	children: ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>{head}</head>
			<body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
				{children}
			</body>
		</html>
	);
}
