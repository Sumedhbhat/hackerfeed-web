// Used only at build time to render the demo SPA shell. Never deployed.
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
export default { fetch: createStartHandler(defaultStreamHandler) };
