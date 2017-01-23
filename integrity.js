const Type = {};
Type.re_operator = /^(!==|===|<|<=|>|>=)/;
Type.operators = {
	'!==': (a) => (b) => b !== a,
	'===': (a) => (b) => b === a,
	'<': (a) => (b) => b < a,
	'<=': (a) => (b) => b <= a,
	'>': (a) => (b) => b > a,
	'>=': (a) => (b) => b >= a,
};
Type.operators.positive = Type.operators['>'](0);
Type.operators.negative = Type.operators['<'](0);
Type.operators['!0'] = Type.operators['!=='](0);

Type.types = {};
Type.types.number = {};
Type.types.number.is = (value) => typeof value === 'number';
Type.types.number.number = Object.assign({}, Type.operators, {
	int: Number.isInteger,
	'safe int': Number.isSafeInteger,
	defined: (value) => !Number.isNaN(value),
	finite: (value) => Number.isFinite(value),
});
Type.types.number.re_number = /^(!==|===|<|<=|>|>=) \-?\d+(\.\d+)?$/;
Type.types.number.allowedFlags = /flags/;
Type.types.number.getFlags = function(property, def, array) {
	for (flag of def.flags || []) {
		if (flag in this.number) {
			array.push(this.number[flag]);
		} else {
			Type.getFlagsNumeric.call(this, property, flag, array);
		}
	}
};

Type.types.string = {};
Type.types.string.is = (value) => typeof value === 'string';
Type.types.string.test = (re) => (value) => re.test(value);
Type.types.string.number = {
	'!==': (a) => (b) => b.length !== a,
	'===': (a) => (b) => b.length === a,
	'<': (a) => (b) => b.length < a,
	'<=': (a) => (b) => b.length <= a,
	'>': (a) => (b) => b.length > a,
	'>=': (a) => (b) => b.length >= a,
};
Type.types.string.flags = {
	'!==': Type.operators['!=='],
	'===': Type.operators['==='],
	defined: (value) => value !== '',
};
Type.types.string.re_number = Type.types.number.re_number;
Type.types.string.re_flags = /^(!==|===) .+$/;
Type.types.string.allowedFlags = /length|flags|test/;
Type.types.string.getFlags = function(property, def, array) {
	if (def.test instanceof RegExp) {
		array.push(this.test(def.test));
	}

	let flag = '';
	for (flag of def.length || []) {
		Type.getFlagsNumeric.call(this, property, flag, array);
	}
	for (flag of def.flags || []) {
		if (flag in this.flags) {
			array.push(this.flags[flag]);
		} else {
			Type.getFlagsString.call(this, property, flag, array);
		}
	}
};

Type.types.boolean = {};
Type.types.boolean.is = (value) => typeof value === 'boolean';
Type.types.boolean.allowedFlags = /^$/;

Type.interfaces = {};

Type.getTypeCheck = (def) => {
	if ('type' in def) {
		return Type.types[def.type].is;
	}

	return null;
};
Type.getFlags = (property, def, array) => {
	const $ = Type.types[def.type];
	for (let key in def) {
		if (key === 'type') {
			continue;
		}
		if (!$.allowedFlags.test(key)) {
			return console.error(`Property '${property}' contains unknown key '${key}'`);
		}
	}

	$.getFlags && $.getFlags(property, def, array);
};
Type.getFlagsNumeric = function(property, flag, array) {
	if (!this.re_number.test(flag)) {
		return console.error(`spec['${property}'] - invalid flag '${flag}'`);
	}

	const i = flag.indexOf(' ');
	array.push(this.number[flag.slice(0, i)](+flag.slice(i + 1)));
};
Type.getFlagsString = function(property, flag, array) {
	if (!this.re_flags.test(flag)) {
		return console.error(`${property}.flags - invalid flag '${flag}'`);
	}

	const i = flag.indexOf(' ');
	array.push(this.flags[flag.slice(0, i)](flag.slice(i + 1)));
};
Type.register = function(name, spec) {
	if (name in Type.interfaces) {
		return console.error(`Interface '${name}' is already registered.`);
	}

	const interface = {};
	let typecheck = null;
	for (let key in spec) {
		if (key in interface) {
			return console.error(`Duplicated definition for '${key}' property.`);
		}

		typecheck = Type.getTypeCheck(spec[key]);
		if (typecheck === null) {
			return console.error(`No 'type' definition for '${key}' property.`);
		}

		interface[key] = [typecheck];
		Type.getFlags(key, spec[key], interface[key]);
	}

	Type.interfaces[name] = Object.freeze(interface);
};
Type.test = function(name, subject) {
	if (!(name in Type.interfaces)) {
		return console.error(`No such interface '${name}'.`), false;
	}

	const interface = Type.interfaces[name];
	let key = '';
	for (key in interface) {
		if (!(key in subject)) {
			return console.error(`Test subject lacks property '${key}'`), false;
		}
	}
	for (key in subject) {
		if (!(key in interface)) {
			return console.error(`Test subject has superfluous property '${key}'`), false;
		}
	}

	let bool = true;
	for (key in interface) {
		bool = bool && interface[key].every(fn => fn(subject[key]));
		if (!bool) {
			console.log('property failed:', key);
			return false;
		}
	}

	return bool;
};


Type.register('name', {
	id: {
		type: 'number',
		flags: ['defined', '!0', '!== 1', '> 4', 'finite'],
	},
	name: {
		type: 'string',
		flags: ['defined'],
		length: ['< 2'],
		test: /ab?c?/,
	},
	isHealthy: {
		type: 'boolean',
	},
});

// console.log(Type.interfaces.name);

console.log(Type.test('name', {
	id: Infinity,
	name: 'a',
	isHealthy: false,
}));