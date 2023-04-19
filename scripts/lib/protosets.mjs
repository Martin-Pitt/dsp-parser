import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { parseProtoSet, JSONReplacer, JSONReviver } from './parser.mjs';
import { resources } from './assetfiles.mjs';


const ItemProtoSet = parseProtoSet(resources.getProtoSet('ItemProtoSet'));
const RecipeProtoSet = parseProtoSet(resources.getProtoSet('RecipeProtoSet'));
const StringProtoSet = parseProtoSet(resources.getProtoSet('StringProtoSet'));
const TechProtoSet = parseProtoSet(resources.getProtoSet('TechProtoSet'));

// try { await mkdir('dist/protoSet', { recursive: true }); } catch {}
// await writeFile('dist/protoSet/Item.json', JSON.stringify(ItemProtoSet, JSONReplacer, '\t'));
// await writeFile('dist/protoSet/Recipe.json', JSON.stringify(RecipeProtoSet, JSONReplacer, '\t'));
// await writeFile('dist/protoSet/String.json', JSON.stringify(StringProtoSet, JSONReplacer, '\t'));
// await writeFile('dist/protoSet/Tech.json', JSON.stringify(TechProtoSet, JSONReplacer, '\t'));




/// Filter down the technologies, recipes and items to what is available through normal gameplay
let techs = TechProtoSet.data.filter(tech => tech.published);


const startingRecipes = [1, 2, 3, 4, 5, 6, 50];
let unlockableRecipes = new Set(startingRecipes);
for(let tech of techs)
	for(let unlock of tech.unlockRecipes)
		unlockableRecipes.add(+unlock);

let recipes = RecipeProtoSet.data.filter(recipe => unlockableRecipes.has(+recipe.id));


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





/// Cleanup datasets and swap their localisation strings to en_us
let strings = new Map(
	StringProtoSet.data.map(StringProto => [
		StringProto.name,
		{
			zh_cn: StringProto.zh_cn,
			en_us: StringProto.en_us,
			fr_fr: StringProto.fr_fr,
		}
	])
);


let usedStrings = new Set();
function translate(string) {
	if(!string) return '';
	let translation = strings.get(string);
	if(!translation) throw new Error(`Cant find translation for: ${string} [${string.length}]`);
	usedStrings.add(string);
	return translation.en_us;
}

const TranslateKeys = [
	'name', 'description', 'conclusion', 'miningFrom', 'produceFrom'
];
const SkipKeys = [
	'modelIndex', 'modelCount', 'hpMax', 'dropRate', 'descFields',
	'subId', 'buildIndex', 'buildMode', 'unlockKey', 'productive',
	'published', 'unlockValues', 'unlockFunctions', 'iconPath'
];


function parseRaw(ElementProto) {
	const element = { id: null, name: null };
	
	for(let [key, value] of Object.entries(ElementProto))
	{
		// Skip defaults
		// if(typeof value === 'bigint' && !value) continue;
		// if(typeof value === 'number' && !value) continue;
		// if(typeof value === 'boolean' && !value) continue;
		// if(typeof value === 'string' && !value) continue;
		if(!value) continue;
		if(Array.isArray(value) && !value.length) continue;
		
		// Skip over unknown & unneeded
		if(key.startsWith('_')) continue;
		if(SkipKeys.includes(key)) continue;
		
		// Translate any specific text strings
		if(TranslateKeys.includes(key))
		{
			// If you want to pre-parse the translations then you can do it here, but there can be collisions if you still want to use the strings.json to re-translate live!
			// value = translate(value);
			
			usedStrings.add(value);
		}
		
		element[key] = value;
	}
	
	return element;
}


items = items.map(parseRaw);
recipes = recipes.map(parseRaw);
techs = techs.map(parseRaw);



/// Filter localisation strings to what was used
let unusedStrings = Array.from(strings.keys()).filter(string => !usedStrings.has(string));
for(let unused of unusedStrings)
	strings.delete(unused);



// If you want to pre-parse the translations then you can do it here, but there can be collisions if you still want to use the strings.json to re-translate live!
// 	/// Swap around localisation strings
// let temp = new Map();
// for(const [key, value] of strings)
// {
// 	if(temp.has(value.en_us)) throw new Error(`Bad idea to swap '${value.en_us}'; Would result in duplicate key`);
// 	temp.set(value.en_us, value);
// }
// strings = temp;


/// Convert tags such as <color="…">…</color> to HTML
// TODO: Handle <size> if it ever gets used
for(const [key, localisations] of strings)
	for(const locale in localisations)
		localisations[locale] = localisations[locale].replaceAll(/<([a-z]+)="(.+?)">(.+?)<\/\1>/g, (match, p1, p2, p3) => {
			if(p1 === 'color') return `<span style="color: ${p2}">${p3}</span>`;
			if(p1 === 'size') throw new Error(`Unimplemented tag <size>`);
			if(p1) throw new Error(`Unknown tag <${p1}/>?`);
			return match;
		});



/*
// For JSON readability we'll replace the numbered IDs with their name
function formatIdentifier(obj) {
	let { id, name } = obj;
	
	// Some of the techs have duplicate naming
	return `${id}; ${name}`; // { id, name }; // name;
}

for(const tech of techs)
{
	if(tech.preTechs) {
		let preTechs = tech.preTechs.map(tid => formatIdentifier(techs.find(t => t.id === tid)));
		console.assert(preTechs.length === tech.preTechs.length);
		tech.preTechs = preTechs;
	}
	
	if(tech.preTechsImplicit) {
		let preTechs = tech.preTechsImplicit.map(tid => formatIdentifier(techs.find(t => t.id === tid)));
		console.assert(preTechs.length === tech.preTechsImplicit.length);
		tech.preTechsImplicit = preTechs;
	}
	
	if(tech.items) {
		let techItems = tech.items.map(tid => formatIdentifier(items.find(i => i.id === tid)));
		console.assert(techItems.length === tech.items.length);
		tech.items = techItems;
	}
	
	if(tech.addItems) {
		let addItems = tech.addItems.map(iid => formatIdentifier(items.find(i => i.id === iid)));
		console.assert(addItems.length === tech.addItems.length);
		tech.addItems = addItems;
	}
	
	if(tech.propertyOverrideItems) {
		let propertyOverrideItems = tech.propertyOverrideItems.map(iid => formatIdentifier(items.find(i => i.id === iid)));
		console.assert(propertyOverrideItems.length === tech.propertyOverrideItems.length);
		tech.propertyOverrideItems = propertyOverrideItems;
	}
	
	if(tech.unlockRecipes) {
		let unlockRecipes = tech.unlockRecipes.map(rid => formatIdentifier(recipes.find(r => r.id === rid)));
		console.assert(unlockRecipes.length === tech.unlockRecipes.length);
		tech.unlockRecipes = unlockRecipes;
	}
}

for(const recipe of recipes)
{
	if(recipe.items) {
		let recipeItems = recipe.items.map(iid => formatIdentifier(items.find(i => i.id === iid)));
		console.assert(recipe.items.length === recipeItems.length);
		recipe.items = recipeItems;
	}
	
	if(recipe.results) {
		let recipeResults = recipe.results.map(iid => formatIdentifier(items.find(i => i.id === iid)));
		console.assert(recipe.results.length === recipeResults.length);
		recipe.results = recipeResults;
	}
}

for(const item of items)
{
	if(item.preTechOverride) {
		item.preTechOverride = formatIdentifier(items.find(i => i.id === item.id));
	}
	
	if(item.upgrades) {
		let upgrades = item.upgrades.map(iid => formatIdentifier(items.find(i => i.id === iid)));
		console.assert(item.upgrades.length === upgrades.length);
		item.upgrades = upgrades;
	}
}
*/





// Export & save
export const Items = items;
export const Recipes = recipes;
export const Tech = techs;
export const Strings = strings;


try { await mkdir('dist/data', { recursive: true }); } catch {}
await writeFile('dist/data/items.json', JSON.stringify(Items, JSONReplacer, '\t'));
await writeFile('dist/data/recipes.json', JSON.stringify(Recipes, JSONReplacer, '\t'));
await writeFile('dist/data/tech.json', JSON.stringify(Tech, JSONReplacer, '\t'));
await writeFile('dist/data/strings.json', JSON.stringify(Strings, JSONReplacer, '\t'));
await writeFile('dist/data/reviver.js',
	'// Revive the JSON data\n' +
	'// usage: const Items = JSON.parse(json, JSONReviver);\n' +
	'export ' + JSONReviver.toString()
);