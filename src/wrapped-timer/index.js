import colors from '../colors';

if (global.wrappedTimers === undefined) {
	global.wrappedTimers = new Map();
}

/** @typedef {{timer: Timer | undefined; running: boolean;}} WrappedTimer */
/** @typedef {{callback: ReturnType<typeof getCallbackHandler>; wrappedTimer: WrappedTimer}} WrappedTimerResult */

/**
 * Create a callback handler for a wrapped timer that prevents the callback from running if it is already running
 * and prevents the callback from running if it is already running.
 * @template TArgs
 * @param {string} key unique identifier for the timer
 * @param {(...args: Array<TArgs>) => (Promise<void> | void)} callback function to run
 * @param {Array<TArgs>} args arguments to pass to the callback
 * @returns {() => Promise<void>}
 */
function getCallbackHandler(key, callback, ...args) {
	return async () => {
		const thisTimer = global.wrappedTimers.get(key);
		if (thisTimer === undefined) {
			console.debug(
				`${colors.fgCyan}Wrapped timer${colors.reset} ${colors.fgMagenta}${key}${colors.reset} does not exist`,
			);
			return;
		}
		if (thisTimer.running) {
			console.debug(
				`${colors.fgCyan}Wrapped timer${colors.reset} ${colors.fgMagenta}${key}${colors.reset} is already running`,
			);
			return;
		}

		try {
			thisTimer.running = true;
			await callback(...args);
		} finally {
			thisTimer.running = false;
		}
	};
}

/**
 * Create a wrapped timer aka interval
 * @template TArgs
 * @param {string} key unique identifier for the timer
 * @param {number} interval in milliseconds
 * @param {(...args: Array<TArgs>) => (Promise<void> | void)} callback function to run
 * @param {Array<TArgs>} args arguments to pass to the callback
 * @returns {WrappedTimerResult}
 */
export function createWrappedTimer(key, callback, interval, ...args) {
	const thisTimer = global.wrappedTimers.get(key);
	const handler = getCallbackHandler(key, callback, ...args);

	if (thisTimer !== undefined) {
		console.debug(
			`${colors.fgCyan}Wrapped timer${colors.reset} ${colors.fgMagenta}${key}${colors.reset} already exists, clearing timer`,
		);
		clearInterval(thisTimer.timer);
		console.debug(
			`${colors.fgCyan}Wrapped timer${colors.reset} ${colors.fgMagenta}${key}${colors.reset} set with interval ${colors.fgYellow}${interval}${colors.reset}ms`,
		);
		thisTimer.timer = setInterval(handler, interval);

		return {
			callback: handler,
			wrappedTimer: thisTimer,
		};
	}

	console.debug(
		`${colors.fgCyan}Wrapped timer${colors.reset} ${colors.fgMagenta}${key}${colors.reset} created with interval ${colors.fgYellow}${interval}${colors.reset}ms`,
	);

	/** @type {WrappedTimer} */
	const wrappedTimer = {
		timer: setInterval(handler, interval),
		running: false,
	};

	global.wrappedTimers.set(key, wrappedTimer);

	return {
		callback: handler,
		wrappedTimer,
	};
}
