
function translate(string) {
	if(!string) return '';
	let translation = strings.get(string);
	if(!translation) throw new Error(`Cant find translation for: ${string} [${string.length}]`);
	return translation.en_us;
}

const TranslateKeys = [
	'name', 'description', 'conclusion', 'miningFrom', 'produceFrom'
];
