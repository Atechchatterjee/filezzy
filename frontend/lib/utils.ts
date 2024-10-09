import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function removeTrailingSlash(path: string): string {
	if (path[path.length - 1] === "/") {
		path = path.substring(0, path.length - 1);
	}
	return path;
}
