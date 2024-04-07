/** @typedef {{ promise: Promise<any>, resolve: (value?: any) => void, reject: (reason?: any) => void}} ExternalPromise */

/**
 * gets a promise and its resolve and reject functions
 * @returns {ExternalPromise}
 */
export function getExternalPromise() {
	/** @type {ExternalPromise} */
	const externalPromise = {};

	externalPromise.promise = new Promise((res, rej) => {
		externalPromise.resolve = res;
		externalPromise.reject = rej;
	});

	return externalPromise;
}
