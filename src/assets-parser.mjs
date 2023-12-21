import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { BufferStreamAssets } from './lib/buffer.mjs';
import { AssetsFile } from './lib/assets-file.mjs';
import { parseProtoSet } from './lib/protoset.mjs';
import { JSONReplacer } from './lib/json.mjs';



export class AssetsParser {
	dsp;
	
	resources;
	shared;
	
	iconPaths;
	
	meta;
	techs;
	recipes;
	items;
	
	constructor(dsp) {
		this.dsp = dsp;
	}
	
	async load() {
		let version = await (async () => {
			let path = join(this.dsp.gameDirectory, 'Configs', 'versions');
			let versions = await readFile(path, { encoding: 'utf8' });
			versions = versions.split(/\r?\n/).filter(Boolean);
			return versions.pop();
		})();
		
		this.meta = { generatedAt: new Date(), version };
		
		let resources = join(this.dsp.gameDirectory, 'DSPGAME_Data', 'resources.assets');
		let shared = join(this.dsp.gameDirectory, 'DSPGAME_Data', 'sharedassets0.assets');
		this.resources = new AssetsFile(new BufferStreamAssets(await readFile(resources)));
		this.shared = new AssetsFile(new BufferStreamAssets(await readFile(shared)));
	}
	
	// Filter down the technologies, recipes and items to what is available through normal gameplay
	parseProtoSets() {
		// Get and parse the ProtoSets
		const ItemProtoSet = parseProtoSet(this.resources.getProtoSet('ItemProtoSet'));
		const RecipeProtoSet = parseProtoSet(this.resources.getProtoSet('RecipeProtoSet'));
		const TechProtoSet = parseProtoSet(this.resources.getProtoSet('TechProtoSet'));
		
		// Parse the techs
		let techs = TechProtoSet.data.filter(tech => tech.published);
		
		const startingRecipes = [1, 2, 3, 4, 5, 6, 50];
		let unlockableRecipes = new Set(startingRecipes);
		for(let tech of techs)
			for(let unlock of tech.unlockRecipes)
				unlockableRecipes.add(+unlock);
		
		
		// Recipes
		let recipes = RecipeProtoSet.data.filter(recipe => unlockableRecipes.has(+recipe.id));
		
		
		// Items
		let availableItems = new Set();
		for(let tech of techs)
			for(let item of tech.items)
				availableItems.add(+item);
		
		for(let recipe of recipes)
		{
			for(let item of recipe.items)
				availableItems.add(+item);
			for(let item of recipe.results)
				availableItems.add(+item);
		}
		
		let items = ItemProtoSet.data.filter(item => availableItems.has(+item.id));
		
		
		// Clean up the raw data set, also export icon paths
		this.iconPaths = new Map();
		const parseRaw = (ElementProto) => {
			const element = { id: null, name: null };
			
			for(let [key, value] of Object.entries(ElementProto))
			{
				// Skip defaults
				if(!value) continue;
				if(Array.isArray(value) && !value.length) continue;
				if(key === 'hpMax' && value === 1) continue;
				if(key === 'ammoType' && value === 'NONE') continue;
				if(key === 'enemyDropRange' && value[0] === 0 && value[1] === 0) continue;
				
				// Skip over unknown & unneeded
				if(key.startsWith('_')) continue;
				// if(SkipKeys.includes(key)) continue;
				
				// Extract iconPaths out
				if(key === 'iconPath')
				{
					this.iconPaths.set(element, value);
					// continue;
				}
				
				element[key] = value;
			}
			
			return element;
		};
		
		// Return
		this.items = items.map(parseRaw);
		this.recipes = recipes.map(parseRaw);
		this.techs = techs.map(parseRaw);
	}
}