const reset = '\x1b[0m';
const bright = '\x1b[1m';
const dim = '\x1b[2m';
const underscore = '\x1b[4m';
const blink = '\x1b[5m';
const reverse = '\x1b[7m';
const hidden = '\x1b[8m';

/** @readonly */
const fgBlack = '\x1b[30m';
const fgRed = '\x1b[31m';
const fgGreen = '\x1b[32m';
const fgYellow = '\x1b[33m';
const fgBlue = '\x1b[34m';
const fgMagenta = '\x1b[35m';
const fgCyan = '\x1b[36m';
const fgWhite = '\x1b[37m';
const fgGray = '\x1b[90m';

const bgBlack = '\x1b[40m';
const bgRed = '\x1b[41m';
const bgGreen = '\x1b[42m';
const bgYellow = '\x1b[43m';
const bgBlue = '\x1b[44m';
const bgMagenta = '\x1b[45m';
const bgCyan = '\x1b[46m';
const bgWhite = '\x1b[47m';
const bgGray = '\x1b[100m';

export default {
	reset,
	bright,
	dim,
	underscore,
	blink,
	reverse,
	hidden,
	fgBlack,
	fgRed,
	fgGreen,
	fgYellow,
	fgBlue,
	fgMagenta,
	fgCyan,
	fgWhite,
	fgGray,
	bgBlack,
	bgRed,
	bgGreen,
	bgYellow,
	bgBlue,
	bgMagenta,
	bgCyan,
	bgWhite,
	bgGray,
};
