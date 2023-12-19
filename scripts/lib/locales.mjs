import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { format, join } from 'node:path';
import { GameDirectory } from './config.mjs';
import { Glyphs } from './constants.mjs';
import { TextDecoder } from 'node:util';

const VersionMinimum = 110;


export const Languages = [
	// {
	// 	lcid,		— Culture ID, it's a .NET thing for System.Globalization, very similar to ICU
	// 	name,		— Display name shown to user in their native language
	// 	tags,		— Language tags
	// 	tag,		— Just the primary language tag
	// 	fallback,	— Fallback language (not implemented yet I think?)
	// 	glyph,		— Which glyph set, e.g. LATIN or CJK
	// }
];
export const Strings = new Map();



async function readLocaleFile(file) {
	let buf = await readFile(join(GameDirectory, 'Locale', file));
	
	// Decode charset via the Byte Order Marker
	let BOM;
	if(buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) BOM = 'utf-8';
	else if(buf[0] === 0xFF && buf[1] === 0xFE && buf[2] === 0x00 && buf[3] === 0x00) BOM = 'utf-32le';
	else if(buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFE && buf[3] === 0xFF) BOM = 'utf-32be';
	else if(buf[0] === 0xFF && buf[1] === 0xFE) BOM = 'utf-16le';
	else if(buf[0] === 0xFE && buf[1] === 0xFF) BOM = 'utf-16be';

	return new TextDecoder(BOM).decode(buf);
}

function UnescapeString(input) {
	
	// TODO: Unescape basic string escape sequences: \\, \r, \n, \t, \v, \f
	// maybe JSON.parse a string? JSON.parse(`"${str}"`) — only prob is if the str has ", ', or ` already somewhere which would need to be escaped first
	
	return input;
}




// new string format
// Strings[language-tag][key] = translation copy
// {
// 	'language-tag': new Map(
// 		key => translation
// 	),
// 	'language-tag': new Map(
// 		key => translation
// 	)
// }





// Load settings from the header text file
let header = await readLocaleFile('Header.txt');
header = header.split(/\r?\n/);

// Parse header tag
if(header.shift() !== '[Localization Project]') throw new Error('Invalid project header file for locale');

// Check version which appears immediately after
let version = Math.round(parseFloat(header.shift().split('=')) * 100);
if(version < VersionMinimum) throw new Error('Locale files are too old');

// Parse each language definition
while(true)
{
	let line = header.shift();
	if(!line) break;
	
	line = line.split(',');
	if(line.length < 2) continue;
	
	let [lcid, name, tags, tag, fallback = 0, glyph = 0] = line;
	lcid = parseInt(lcid, 10);
	if(Languages.some(language => language.lcid === lcid))
	{
		console.error(`Duplicate language found for ${lcid} — skipping`);
		continue;
	}
	
	// Tags seem to be corrupted IETF BCP 47 language tags, need to fix these somehow by adding the seperator back so that they can be used in tools and libraries
	// Added a temp fix for now for the most cases of a primary language subtag and region subtag
	// But likely to fail when there are more of different sub tags combinations which is why I consider this corrupted
	const kebabize = (str) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $);
	tags = kebabize(tags);
	
	fallback = parseInt(fallback, 10);
	glyph = Glyphs.get(parseInt(glyph, 10) || 0);
	
	let language = {
		lcid, // Culture ID, it's a .NET thing for System.Globalization, very similar to ICU
		name, // Display name shown to user in their native language
		tags, // BCP 47 like language tag, language + capitalised country code
		tag, // Just the primary language tag
		fallback, // Fallback language (not implemented yet I think?)
		glyph, // Which glyph set, e.g. LATIN or CJK
	};
	Languages.push(language);
}

// Parse resource definitions
let Resources = [];
while(true)
{
	let line = header.shift();
	if(!line) break;
	
	line = line.split('=');
	if(line.length < 2) continue;
	
	let page = line[0];
	let priority = parseInt(line[1], 10);
	
	Resources.push([page, priority]);
}

Resources = Resources.sort((a, b) => a[1] - b[1]).map(d => d[0]);


const NamesIndex = [];
for(let resource of Resources)
{
	let lines = (await readLocaleFile(`Names/${resource}.txt`)).split(/\r?\n/);
	
	for(let line of lines)
	{
		if(!line) continue;
		
		let key = line.split('\t').shift();
		key = UnescapeString(key);
		if(!NamesIndex.includes(key)) NamesIndex.push(key);
	}
}


// Load languages
let strings = new Array(Languages.length);
let floats = new Array(Languages.length);

for(let iter = 0; iter < Languages.length; ++iter)
{
	let language = Languages[iter];
	let lstrings = strings[iter] = new Array(NamesIndex.length);
	let lfloats = floats[iter] = new Array(NamesIndex.length);
	
	for(let resource of Resources)
	{
		let lines = (await readLocaleFile(`${language.lcid}/${resource}.txt`)).split(/\r?\n/);
		
		for(let line of lines)
		{
			if(!line) continue;
			
			let [key, flags, category, value] = line.split('\t');
			
			key = UnescapeString(key);
			let index = NamesIndex.indexOf(key);
			if(index === -1 ) continue; // Unknown key! Not found in name index?
			if(lstrings[index] != null) continue; // Key was already set, skip dupe
			
			value = UnescapeString(value);
			let string = lstrings[index] = value;
			
			if(flags.includes('#'))
			{
				let float = parseFloat(string);
				lfloats[index] = isNaN(float)? 0 : float;
			}
		}
	}
	
	let untranslated = 0;
	for(let index = 0; index < NamesIndex.length; ++index)
	{
		let key = NamesIndex[index];
		
		if(!lstrings[index])
		{
			lstrings[index] = key;
			++untranslated;
		}
	}
	
	if(untranslated) console.error(`Missing translation in ${language.tags} — Coverage ${100 - Math.round((untranslated / NamesIndex.length) * 10000) / 100}% (${untranslated} / ${NamesIndex.length})`);
	
	
	Strings.set(language.lcid, {
		strings: lstrings,
		floats: lfloats,
	});
}




// let currentLanguage = null;
// export function setCurrentLanguage(lcid) { currentLanguage = Languages.find(lang => lang.lcid === lcid) }
// export function getCurrentLanguage() { return currentLanguage }
// export function getLanguages() { return Languages }
// export function Translate(key) { return Strings.get(currentLanguage.lcid).strings[key] || key }
// export function TranslateParam(key, fallback) { return Strings.get(currentLanguage.lcid).floats[key] || fallback }








