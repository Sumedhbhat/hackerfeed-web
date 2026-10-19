/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Set from `DEPLOY_TARGET` at build time; see vite.config.ts. */
	readonly DEPLOY_TARGET: import("./platform/types").DeployTarget;
}
