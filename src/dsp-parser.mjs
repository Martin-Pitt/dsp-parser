import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { JSONReplacer, JSONReviver } from './lib/json.mjs';
import { AssetsParser } from './assets-parser.mjs';
import { LocaleParser } from './locale-parser.mjs';
import { TextureParser } from './texture-parser.mjs';



export class DSPParser {
	gameDirectory;
	exportDirectory = './dist';
	
	constructor({
		gameDirectory = '../Dyson Sphere Program'
	} = {}) {
		this.gameDirectory = gameDirectory;
		this.assetsParser = new AssetsParser(this);
		this.localeParser = new LocaleParser(this);
		this.textureParser = new TextureParser(this);
	}
	
	async parse() {
		// Parse Unity .assets & .dat files
		console.log('• AssetParser');
		console.log('AssetParser loading');
		await this.assetsParser.load();
		
		console.log('AssetParser parsing ProtoSets');
		this.assetsParser.parseProtoSets();
		
		// Parse Locale folder
		console.log('• LocaleParser');
		console.log('LocaleParser parsing Locale files');
		await this.localeParser.parse();
		console.log('LocaleParser loading JP translations');
		await this.localeParser.loadJP();
		// await this.localeParser.loadCrowdin();
		console.log('LocaleParser simplifying');
		this.localeParser.simplify(); // More simple data structure for web apps
		
		console.log('• TextureParser');
		console.log('TextureParser loading');
		this.textureParser.load();
	}
	
	async writeToFiles() {
		console.log('Exporting data');
		try { await mkdir(join(this.exportDirectory, 'data'), { recursive: true }); } catch {}
		await writeFile(join(this.exportDirectory, 'data', 'meta.json'), JSON.stringify(this.assetsParser.meta, JSONReplacer, '\t'));
		await writeFile(join(this.exportDirectory, 'data', 'items.json'), JSON.stringify(this.assetsParser.items, JSONReplacer, '\t'));
		await writeFile(join(this.exportDirectory, 'data', 'recipes.json'), JSON.stringify(this.assetsParser.recipes, JSONReplacer, '\t'));
		await writeFile(join(this.exportDirectory, 'data', 'tech.json'), JSON.stringify(this.assetsParser.techs, JSONReplacer, '\t'));
		await writeFile(join(this.exportDirectory, 'data', 'locale.json'), JSON.stringify(this.localeParser.data, JSONReplacer, '\t'));
		await writeFile(join(this.exportDirectory, 'data', 'reviver.js'),
			'// Revive the JSON data\n' +
			'// usage: const Items = JSON.parse(json, JSONReviver);\n' +
			'export ' + JSONReviver.toString() + '\n\n' +
			'// Replacer implementation used for stringifying JSON data originally\n' +
			'export ' + JSONReplacer.toString()
		);
		
		console.log('Exporting spritesheets');
		await this.textureParser.exportSpritesheets();
	}
}