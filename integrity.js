'use strict';

const Interface = (function() {
	const $interfaces = Object.create(null);
	const $re = {
		// operator: /^(!==|===|<|<=|>|>=)/,
		number: /^(!==|===|<|<=|>|>=) \-?\d+(\.\d+)?$/,
	};
	const $operators = {
		'!==': (a) => (b) => b !== a,
		'===': (a) => (b) => b === a,
		'<': (a) => (b) => b < a,
		'<=': (a) => (b) => b <= a,
		'>': (a) => (b) => b > a,
		'>=': (a) => (b) => b >= a,
	};
	const $types = Object.create(null);
	$types.number = {
		is: (value) => typeof value === 'number',
		number: Object.assign({}, $operators, {
			int: Number.isInteger,
			'safe int': Number.isSafeInteger,
			defined: (value) => !Number.isNaN(value),
			finite: (value) => Number.isFinite(value),
			positive: (b) => b > 0, // convenience...
			negative: (b) => b < 0, // convenience...
		}),
		allowedFlags: /flags/,
		getFlags(property, def, array) {
			let flag = '';
			if (Array.isArray(def.flags)) for (flag of def.flags) {
				if (flag in this.number) {
					array.push(this.number[flag]);
				} else {
					getFlagsNumeric.call(this, property, flag, array);
				}
			}
		},
	};
	$types.string = {
		is: (value) => typeof value === 'string',
		test: (re) => (value) => re.test(value),
		number: {
			'!==': (a) => (b) => b.length !== a,
			'===': (a) => (b) => b.length === a,
			'<': (a) => (b) => b.length < a,
			'<=': (a) => (b) => b.length <= a,
			'>': (a) => (b) => b.length > a,
			'>=': (a) => (b) => b.length >= a,
		},
		flags: {
			'!==': $operators['!=='],
			'===': $operators['==='],
			defined: (value) => value !== '',
		},
		re_number: $re.number,
		re_flags: /^(!==|===) .+$/,
		allowedFlags: /length|flags|test/,
		getFlags(property, def, array) {
			if (def.test instanceof RegExp) {
				array.push(this.test(def.test));
			}

			let flag = '';
			if (Array.isArray(def.length)) for (flag of def.length) {
				getFlagsNumeric.call(this, property, flag, array);
			}
			if (Array.isArray(def.flags)) for (flag of def.flags) {
				if (flag in this.flags) {
					array.push(this.flags[flag]);
				} else {
					getFlagsString.call(this, property, flag, array);
				}
			}
		},
	};
	$types.boolean = {
		is: (value) => typeof value === 'boolean',
		allowedFlags: /^$/,
	};

	function getInterfaceCheck(def) {
		return ('type' in def) ? $types[def.type].is : null;
	};
	function getFlags(property, def, array) {
		const $ = $types[def.type];
		for (let key in def) {
			if (key === 'type') {
				continue;
			}
			if (!$.allowedFlags.test(key)) {
				return console.error(`Property '${property}' contains unknown key '${key}'`);
			}
		}

		if ($.getFlags) {
			$.getFlags(property, def, array);
		}
	};
	function getFlagsNumeric(property, flag, array) {
		if (!$re.number.test(flag)) {
			return console.error(`spec['${property}'] - invalid flag '${flag}'`);
		}

		const i = flag.indexOf(' ');
		array.push(this.number[flag.slice(0, i)](+flag.slice(i + 1)));
	};
	function getFlagsString(property, flag, array) {
		if (!this.re_flags.test(flag)) {
			return console.error(`${property}.flags - invalid flag '${flag}'`);
		}

		const i = flag.indexOf(' ');
		array.push(this.flags[flag.slice(0, i)](flag.slice(i + 1)));
	};
	function register(name, spec) {
		if (name in $interfaces) {
			return console.error(`Interface '${name}' is already registered.`);
		}

		const $interface = {};
		let typecheck = null;
		for (let key in spec) {
			if (key in $interface) {
				return console.error(`Duplicated definition for '${key}' property.`);
			}

			typecheck = getInterfaceCheck(spec[key]);
			if (typecheck === null) {
				return console.error(`No 'type' definition for '${key}' property.`);
			}

			$interface[key] = [typecheck];
			getFlags(key, spec[key], $interface[key]);
		}

		$interfaces[name] = $interface;
	};
	function test(name, subject) {
		if (!(name in $interfaces)) {
			return !!console.error(`No such interface '${name}'.`);
		}

		const $interface = $interfaces[name];
		let key = '';
		for (key in subject) {
			if (!(key in $interface)) {
				return !!console.error(`Test subject has superfluous property '${key}'`);
			}
		}
		
		let array = null;
		let i = 0;
		let item;
		for (key in $interface) {
			if (!(key in subject)) {
				return !!console.error(`Test subject lacks property '${key}'`);
			}

			item = subject[key];
			i = (array = $interface[key]).length;
			while (--i + 1) {
				if (!array[i](item)) {
					return false;
				}
			}
		}

		return true;
	};

	return { register, test };
}());

module && (module.exports = Interface);


// console.time('build');
// Interface.register('name', {
// 	id: {
// 		type: 'number',
// 		flags: ['defined', '!== 0', '!== 1', '> 4', 'finite'],
// 	},
// 	name: {
// 		type: 'string',
// 		flags: ['defined'],
// 		length: ['< 2'],
// 		test: /ab?c?/,
// 	},
// 	isHealthy: {
// 		type: 'boolean',
// 	},
// });
// console.timeEnd('build');