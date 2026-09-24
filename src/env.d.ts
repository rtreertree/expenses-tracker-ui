/// <reference types="astro/client" />

declare module "*.mjs" {
	export function toCsv(rows: readonly (readonly unknown[])[]): string;
	export function resolveRoutePage(page?: string | null): string;
}