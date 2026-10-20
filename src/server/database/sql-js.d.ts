declare module "sql.js/dist/sql-wasm-browser.js" {
	export { default } from "sql.js";
}

declare module "sql.js/dist/sql-wasm-browser.wasm" {
	const module: WebAssembly.Module;
	export default module;
}
