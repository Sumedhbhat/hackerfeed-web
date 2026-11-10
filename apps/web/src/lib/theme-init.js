(() => {
	try {
		const root = document.documentElement;
		const cached = JSON.parse(
			window.localStorage.getItem("hackerfeed:appearance") || "null",
		);
		const mode = cached ? cached.mode : window.localStorage.getItem("theme");
		if (mode === "light" || mode === "dark") {
			root.setAttribute("data-theme", mode);
		}
		const hex = /^#[0-9a-f]{6}$/i;
		for (const [role, pair] of Object.entries(cached?.colors || {})) {
			if (/^[a-z-]+$/.test(role) && hex.test(pair[0]) && hex.test(pair[1])) {
				root.style.setProperty(
					`--${role}`,
					`light-dark(${pair[0]}, ${pair[1]})`,
				);
			}
		}
	} catch {}
})();
