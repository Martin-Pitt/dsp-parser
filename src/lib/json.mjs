// Helpers for replacing/reviving JSONs that may use BigInts
export function JSONReplacer(key, value) {
	if(typeof value === 'bigint')
		return { type: 'BigInt', value: value.toString() };
	if(value instanceof Map)
		return { type: 'Map', value: Array.from(value.entries()) };
	
	else return value;
}

export function JSONReviver(key, value) {
	if(typeof value === 'object' && typeof value.type === 'string' && value.value)
	{
		if(value.type === 'BigInt')
			return BigInt(value.value);
		if(value.type === 'Map')
			return new Map(value.value);
		else
			return  value;
	}
	else
		return value;
}


export function JSONDebugReplacer(key, value) {
	if(typeof value === 'bigint')
		return `${value}n`;
	if(value instanceof Map)
		return { type: 'Map', value: Array.from(value.entries()) };
	
	else return value;
}