import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * @description
 * This function returns directory path removing '/' at the end
 */
export function removeTrailingSlash(path: string): string {
	if (path[path.length - 1] === "/") {
		path = path.substring(0, path.length - 1);
	}
	return path;
}

/**
 * @description
 * This function returns errors as values and console.errors when it throws
 */
export async function safeAwait<T, E = Error>(
	promise: Promise<T>,
): Promise<[E, null] | [null, T]> {
	try {
		const res = await promise;
		return [null, res];
	} catch (err) {
		console.error(err);
		return [err as E, null];
	}
}

export function truncateFilePath(filepath: string): string {
	// Remove trailing slash if present
	filepath = filepath.replace(/\/$/, '');

	// Split the path into components
	const parts = filepath.split('/');

	// Handle special cases
	if (parts.length <= 4) {  // Including empty string before first '/'
		return filepath;
	}

	// Get the last three components
	const lastThree = parts.slice(-3);

	// Handle root directory cases
	if (filepath.startsWith('/')) {
		return '/.../' + lastThree.join('/');
	}

	return '.../' + lastThree.join('/');
}
