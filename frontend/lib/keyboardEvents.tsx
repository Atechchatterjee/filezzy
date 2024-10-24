import { createEffect } from 'solid-js';

export function useKeyboardEvents(cb?: (key: string) => void) {
	createEffect(() => {
		const handleKeyPress = (event: any) => {
			if (cb) cb(event.key);
		};

		window.addEventListener('keydown', handleKeyPress);

		return () => {
			window.removeEventListener('keydown', handleKeyPress);
		};
	});
}
