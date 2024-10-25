import { createEffect } from 'solid-js';

export function useKeyboardEvents(cb?: (key: any) => void) {
	createEffect(() => {
		const handleKeyPress = (event: any) => {
			if (cb) cb(event);
		};

		window.addEventListener('keydown', handleKeyPress);

		return () => {
			window.removeEventListener('keydown', handleKeyPress);
		};
	});
}
