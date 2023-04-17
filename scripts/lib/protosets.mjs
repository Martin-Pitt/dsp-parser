import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { parseProtoSet, JSONReplacer } from './parser.mjs';
import { resources } from './assetfiles.mjs';


const ItemProtoSet = parseProtoSet(resources.getProtoSet('ItemProtoSet'));
const RecipeProtoSet = parseProtoSet(resources.getProtoSet('RecipeProtoSet'));
const StringProtoSet = parseProtoSet(resources.getProtoSet('StringProtoSet'));
const TechProtoSet = parseProtoSet(resources.getProtoSet('TechProtoSet'));

// try { await mkdir('data/ProtoSet'); } catch {}
// await writeFile('data/ProtoSet/Item.json', JSON.stringify(ItemProtoSet, JSONReplacer, '\t'));
// await writeFile('data/ProtoSet/Recipe.json', JSON.stringify(RecipeProtoSet, JSONReplacer, '\t'));
// await writeFile('data/ProtoSet/String.json', JSON.stringify(StringProtoSet, JSONReplacer, '\t'));
// await writeFile('data/ProtoSet/Tech.json', JSON.stringify(TechProtoSet, JSONReplacer, '\t'));


const Strings = new Map(
	StringProtoSet.data.map(StringProto => [
		StringProto.name,
		{
			zh_cn: StringProto.zh_cn,
			en_us: StringProto.en_us,
			fr_fr: StringProto.fr_fr,
		}
	])
);

function translate(string) {
	if(!string) return '';
	let translation = Strings.get(string);
	if(!translation) throw new Error(`Cant find translation for: ${string} [${string.length}]`);
	return translation.en_us;
}

const TranslateKeys = [
	'name', 'description', 'conclusion', 'miningFrom', 'produceFrom'
];
const SkipKeys = [
	'modelIndex', 'modelCount', 'hpMax', 'dropRate', 'descFields',
	'subId', 'buildIndex', 'buildMode', 'unlockKey', 'productive',
];


function parseRaw(ElementProto) {
	const element = { id: null, name: null, description: null };
	
	for(let [key, value] of Object.entries(ElementProto))
	{
		// Skip defaults
		if(typeof value === 'bigint' && !value) continue;
		if(typeof value === 'number' && !value) continue;
		if(typeof value === 'boolean' && !value) continue;
		if(typeof value === 'string' && !value) continue;
		if(Array.isArray(value) && !value.length) continue;
		
		// Skip over unknown & unneeded
		if(key.startsWith('_')) continue;
		if(SkipKeys.includes(key)) continue;
		
		// Translate any specific text strings
		if(TranslateKeys.includes(key)) value = translate(value);
		
		element[key] = value;
	}
	
	return element;
}



// Filter down the technologies, recipes and items to what is available through normal gameplay
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



// Export & save
export const Items = items.map(parseRaw);
export const Recipes = recipes.map(parseRaw);
export const Tech = techs.map(parseRaw);

try { await mkdir('dist/data', { recursive: true }); } catch {}
await writeFile('dist/data/items.json', JSON.stringify(Items, JSONReplacer, '\t'));
await writeFile('dist/data/recipes.json', JSON.stringify(Recipes, JSONReplacer, '\t'));
await writeFile('dist/data/tech.json', JSON.stringify(Tech, JSONReplacer, '\t'));
