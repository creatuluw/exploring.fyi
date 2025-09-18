// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Environment variables (currently using hardcoded values in supabase.ts)
// declare module '$env/static/public' {
// 	export const PUBLIC_SUPABASE_URL: string;
// 	export const PUBLIC_SUPABASE_ANON_KEY: string;
// }

// Server-side environment variables (only use in +page.server.ts files)
// declare module '$env/dynamic/private' {
// 	export const env: {
// 		GEMINI_API_KEY?: string;
// 		[key: string]: string | undefined;
// 	};
// }

export {};
