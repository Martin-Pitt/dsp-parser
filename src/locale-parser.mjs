import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { format, join } from 'node:path';
import { TextDecoder } from 'node:util';
import { getLocaleIdentifier, getLocaleTag } from './lib/lcid.mjs';

const VersionMinimum = 110;

export const Glyphs = new Map([
	[0, 'LATIN'],
	[1, 'CJK'],
]);

export class LocaleParser {
	dsp;
	
	// Data structures for locale translations
	languages;
	locales;
	resources;
	names;
	
	
	constructor(dsp) {
		this.dsp = dsp;
	}
	
	async readLocaleFile(file) {
		let buf = await readFile(join(this.dsp.gameDirectory, 'Locale', file));
		
		// Decode charset via the Byte Order Marker
		let BOM;
		if(buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) BOM = 'utf-8';
		else if(buf[0] === 0xFF && buf[1] === 0xFE && buf[2] === 0x00 && buf[3] === 0x00) BOM = 'utf-32le';
		else if(buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0xFE && buf[3] === 0xFF) BOM = 'utf-32be';
		else if(buf[0] === 0xFF && buf[1] === 0xFE) BOM = 'utf-16le';
		else if(buf[0] === 0xFE && buf[1] === 0xFF) BOM = 'utf-16be';
		
		return new TextDecoder(BOM).decode(buf);
	}
	
	static UnescapeString(input) {
		// TODO: Unescape basic string escape sequences: \\, \r, \n, \t, \v, \f
		// maybe JSON.parse a string? JSON.parse(`"${str}"`) — only prob is if the str has ", ', or ` already somewhere which would need to be escaped first
		return input.replace(/\\([rntvf\\])/g, ($, c) => ({ r: '\r', n: "\n", t: '\t', v: '\v', f: '\f', '\\': '\\' }[c]));
	}
	
	async parse() {
		this.languages = [];
		this.locales = {};
		this.resources = [];
		this.names = [];
		
		
		// Load settings from the header text file
		let header = await this.readLocaleFile('Header.txt');
		header = header.split(/\r?\n/);
		
		// Parse header tag
		if(header.shift() !== '[Localization Project]') throw new Error('Invalid project header file for locale');
		
		// Check version which appears immediately after
		let version = Math.round(parseFloat(header.shift().split('=')[1]) * 100);
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
			if(this.languages.some(language => language.lcid === lcid))
			{
				console.error(`Duplicate language found for ${lcid} — skipping`);
				continue;
			}
			
			// Tags seem to be corrupted IETF BCP 47 language tags, need to fix these somehow by adding the seperator back so that they can be used in tools and libraries
			// Added a temp fix for now for the most cases of a primary language subtag and region subtag
			// But likely to fail when there are more of different sub tags combinations which is why I consider this corrupted
			// const kebabize = (str) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $);
			// tags = kebabize(tags);
			
			// Rather than using the tags from the header, let's use the one inferred from the LCID
			let locale = getLocaleTag(lcid);
			
			fallback = parseInt(fallback, 10);
			glyph = Glyphs.get(parseInt(glyph, 10) || 0);
			
			let language = {
				lcid, // Culture ID, it's a .NET thing for System.Globalization which is very similar to ICU
				name, // Display name shown to user in their native language
				// tags, // BCP 47 like language tag, language + capitalised country code
				// tag, // Just the primary language tag
				locale, // IETF BCP 47 Language tags
				fallback, // Fallback language (not implemented yet I think?)
				glyph, // Which glyph set, e.g. LATIN or CJK
			};
			this.languages.push(language);
		}
		
		
		// Parse resource definitions
		while(true)
		{
			let line = header.shift();
			if(!line) break;
			
			line = line.split('=');
			if(line.length < 2) continue;
			
			let page = line[0];
			let priority = parseInt(line[1], 10);
			
			this.resources.push([page, priority]);
		}
		
		this.resources.sort((a, b) => a[1] - b[1]).map(d => d[0]);
		this.resources = this.resources.map(([page, priority]) => page);
		
		
		// Load of up the Names file
		for(let resource of this.resources)
		{
			let lines = (await this.readLocaleFile(`Names/${resource}.txt`)).split(/\r?\n/);
			
			for(let line of lines)
			{
				if(!line) continue;
				
				let key = line.split('\t').shift();
				key = LocaleParser.UnescapeString(key);
				if(!this.names.includes(key)) this.names.push(key);
			}
		}
		
		
		// Read the locale files of each language
		console.log('Reading locale files of each language');
		for(let iter = 0; iter < this.languages.length; ++iter)
		{
			let language = this.languages[iter];
			let strings = {};
			
			for(let resource of this.resources)
			{
				let lines = (await this.readLocaleFile(`${language.lcid}/${resource}.txt`)).split(/\r?\n/);
				
				for(let line of lines)
				{
					if(!line) continue;
					
					let [key, flags, category, value] = line.split('\t');
					
					key = LocaleParser.UnescapeString(key);
					let index = this.names.indexOf(key);
					if(index === -1 ) continue; // Unknown key! Not found in name index?
					// if(lstrings[index] != null) continue; // Key was already set, skip dupe
					if(key in strings) continue;
					
					value = LocaleParser.UnescapeString(value);
					strings[key] = value;
					
					if(flags.includes('#'))
					{
						strings[key] = parseFloat(strings[key]);
						if(isNaN(strings[key])) strings[key] = 0;
					}
				}
			}
			
			let untranslated = 0;
			for(let index = 0; index < this.names.length; ++index)
			{
				let key = this.names[index];
				
				if(!key in strings)
				{
					strings[key] = key;
					++untranslated;
				}
			}
			
			if(untranslated) console.error(`Missing translation in ${language.tags} — Coverage ${100 - Math.round((untranslated / this.names.length) * 10000) / 100}% (${untranslated} / ${this.names.length})`);
			
			this.locales[language.lcid] = strings;
		}
	}
	
	// Gets the translation from the JP community, see: https://docs.google.com/spreadsheets/d/1U9Y3iV7pfYGvlsl_tjvxX5mN0L_YrLlxdnCNnpMAyso/
	async loadJP() {
		let jp = {
			lcid: getLocaleIdentifier('ja-JP'),
			name: '日本語',
			locale: 'ja-JP',
			fallback: 1033,
			glyph: Glyphs.get(1),
		};
		
		this.languages.push(jp);
		
		let request = await fetch('https://script.google.com/macros/s/AKfycbyx-b28QMIPtIXQlazwhaWZUBtBBqSyy5M5h_h3z6oAB_3DuoZUwCjkVdjDOZTk2LIA/exec');
		let result = await request.json();
		
		this.locales[jp.lcid] = result.reduce((mapping, [key, value]) => {
			mapping[key] = value;
			return mapping;
		}, {});
	}
	
	// Download community translations from Crowdin
	async loadCrowdin() {
		// TODO: See API at https://developer.crowdin.com/api/v2/
	}
	
	// Combines languages & translations strings together
	simplify() {
		this.data = this.languages.map(language => ({ ...language, strings: this.locales[language.lcid] }));
	}
}