import { inspect } from 'node:util';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { parseProtoSet, parseDataFile, TYPE, JSONReplacer, JSONReviver } from './parser.mjs';
import { resources } from './assetfiles.mjs';






export const ItemProtoSet = parseProtoSet(resources.getProtoSet('ItemProtoSet'));
export const RecipeProtoSet = parseProtoSet(resources.getProtoSet('RecipeProtoSet'));
export const StringProtoSet = parseProtoSet(resources.getProtoSet('StringProtoSet'));
export const TechProtoSet = parseProtoSet(resources.getProtoSet('TechProtoSet'));





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






// let setNames = new Set();
let collisions = [];
for(let set of StringProtoSet.data)
{
	let matching = StringProtoSet.data.filter(s => s.name === set.name);
	if(matching.length > 1) collisions.push(set);
	// if(setNames.has(set.name)) console.error('Name collisions in StringProtoSet, collision on', JSON.stringify(set, null, ''));
	// setNames.add(set.name);
}

if(collisions.length)
{
	console.group('Name collisions in StringProtoSet, collisions:');
	for(let collision of collisions) console.log(inspect(collision, { colors: true, compact: true, breakLength: Infinity }));
	console.groupEnd();
}







/// Cleanup datasets and swap their localisation strings to en_us
let strings = new Map(
	StringProtoSet.data.map(({ name, id, sid, ...locales }) => [
		name, { ...locales }
	])
);

const internalLocales = Object.keys(strings.entries().next().value[1]);
export const supportedLocales = internalLocales.map(locale => locale.replace('_', '-'));
export const supportedCanonicalLocales = Intl.getCanonicalLocales(supportedLocales);



// let localeCount = internalLocales.reduce((previous, current) => {
// 	previous[current] = previous.total;
// 	return previous;
// }, { total: StringProtoSet.data.length });
// for(let set of StringProtoSet.data)
// {
// 	let { name, id, sid, ...localised } = set;
// 	for(let locale in localised)
// 	{
// 		let string = localised[locale];
// 		if(string === '')
// 		{
// 			localeCount[locale]--;
// 		}
// 	}
// }

// console.log(localeCount);

// for(let locale in localeCount)
// {
// 	if(locale === 'total') continue;
// 	console.log(`${locale} ${((localeCount[locale] / localeCount.total) * 100).toFixed(2)}% translated strings`);
// }




let usedStrings = new Set();
export const iconPaths = new Map();
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
	'published', 'unlockValues', 'unlockFunctions'
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
		
		// Extract iconPaths out
		if(key === 'iconPath')
		{
			iconPaths.set(element, value);
			continue;
		}
		
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



// TODO: Maybe a meta.json, constants.json or w/e with additional info?
// Plus want to throw in more translatable content that way 

/*
// Add translations for type categories
const TypeCategories = new Set([
	'UNKNOWN',
	'RESOURCE',
	'MATERIAL',
	'COMPONENT',
	'PRODUCT',
	'LOGISTICS',
	'PRODUCTION',
	'MATRIX',
	'SMELT',
	'ASSEMBLE',
	'RESEARCH',
	'REFINE',
	'CHEMICAL',
	'PARTICLE',
	'FRACTIONATE'
]);

const TranslateTypes = new Set([
	'未知分类', // Unknown Category
	
	'自然资源', // Natural Resource
	'材料', // Material
	'组件', // Component
	'成品', // End Product
	
	'物流运输', // Logistics
	'电力运输', // ^ Power Transmission
	'电力储存', // ^ Power Storage
	'电力交换', // ^ Power Exchanger
	'能量交换器', // ^ Energy Exchanger
	'电力设备', // ^ Power Facility
	
	'生产设备', // Production Facility
	'采矿设备', // ^ Mining Facility
	'抽水设备', // ^ Fluid Pumping Facility
	'抽油设备', // ^ Oil Extraction Facility
	
	'冶炼设备', // Smelting Facility
	'制造台', // Assembler
	'科研设备', // Research Facility
	'精炼设备', // Refining Facility
	'化工设备', // Chemical Facility
	'粒子对撞机', // Particle Collider
	'分馏设备', // Fractionation Facility
]);

const TranslateTypeCategoriesKeys = new Map([
	['UNKNOWN', '未知分类'],
	['RESOURCE', '自然资源'],
	['MATERIAL', '材料'],
	['COMPONENT', '组件'],
	['PRODUCT', '成品'],
	['LOGISTICS', '物流运输'],
	['PRODUCTION', '生产设备'],
	['MATRIX', '?'],
	['SMELT', '冶炼设备'],
	['ASSEMBLE', '制造台'],
	['RESEARCH', '科研设备'],
	['REFINE', '精炼设备'],
	['CHEMICAL', '化工设备'],
	['PARTICLE', '粒子对撞机'],
	['FRACTIONATE', '分馏设备'],
])

for(const category of TranslateTypes)
	usedStrings.add(category);
*/


// const Tags = new Map([
// 	['', '未知分类'],  // Unknown Category
// 	['', '自然资源'],  // Natural Resource
// 	['', '材料'],  // Material
// 	['', '组件'],  // Component
// 	['', '成品'],  // End Product
// 	['', '电力储存'],  // Power Storage
// 	['', '电力运输'],  // Power Transmission
// 	['', '电力交换'],  // Power Exchanger
// 	['', '物流运输'],  // Logistics
// 	['', '电力设备'],  // Power Facility
// 	['', '冶炼设备'],  // Smelting Facility
// 	['', '化工设备'],  // Chemical Facility
// 	['', '精炼设备'],  // Refining Facility
// 	['', '制造台'],  // Assembler
// 	['', '粒子对撞机'],  // Particle Collider
// 	['', '能量交换器'],  // Energy Exchanger
// 	['', '科研设备'],  // Research Facility
// 	['', '采矿设备'],  // Mining Facility
// 	['', '抽水设备'],  // Fluid Pumping Facility
// 	['', '抽油设备'],  // Oil Extraction Facility
// 	['', '生产设备'],  // Production Facility
// 	['', '分馏设备'],  // Fractionation Facility
// 	['', '装饰物'],  // Decoration
// 	['', '武器'],  // Weapon
// 	['', '科学矩阵'],  // Science Matrix
// 	['', '其他分类'],  // Other Categories
// ]);



// Extra strings to pull from localisation than can be used in UI, e.g. item descriptions
const ExtraStringsToInclude = [
	"未知分类", // Unknown Category
	"自然资源", // Natural Resource
	"材料", // Material
	"组件", // Component
	"成品", // End Product
	"电力储存", // Power Storage
	"电力运输", // Power Transmission
	"电力交换", // Power Exchanger
	"物流运输", // Logistics
	"电力设备", // Power Facility
	"冶炼设备", // Smelting Facility
	"化工设备", // Chemical Facility
	"精炼设备", // Refining Facility
	"制造台", // Assembler
	"粒子对撞机", // Particle Collider
	"能量交换器", // Energy Exchanger
	"科研设备", // Research Facility
	"采矿设备", // Mining Facility
	"抽水设备", // Fluid Pumping Facility
	"抽油设备", // Oil Extraction Facility
	"生产设备", // Production Facility
	"分馏设备", // Fractionation Facility
	"装饰物", // Decoration
	"武器", // Weapon
	"科学矩阵", // Science Matrix
	"其他分类", // Other Categories
	
	"化学", // Chemical
	"核能", // Nuclear Energy
	"质能", // Mass Energy
	"储存", // Storage
	"采集自", // Gathered From
	"制造于", // Made in
	"燃料类型", // Fuel Type
	"能量", // Energy
	"发电类型", // Energy Type
	"发电功率", // Power
	"热效率", // Energy Efficiency
	"流体消耗", // Fluid Consumption
	"输入功率", // Input Power
	"输出功率", // Output Power
	"蓄电量", // Accumulated
	"工作功率", // Work Consumption
	"待机功率", // Idle Consumption
	"最大充能功率", // Max Charging Power
	"基础发电功率", // Basic Generation
	"增产剂效果", // Proliferator Effect
	"喷涂增产效果", // Extra Products
	"喷涂加速效果", // Production Speedup
	"额外电力消耗", // Energy Consumption
	"连接长度", // Connection Length
	"覆盖范围", // Supply Area
	"运载速度", // Transport Speed
	"接口数量", // Number of Ports
	"仓储空间", // Storage Size
	"开采对象", // Gathering Target
	"开采速度", // Gathering Speed
	"运送速度", // Sorting Speed
	"货物堆叠", // Cargo Stacking
	"使用寿命", // Life
	"制造速度", // Production Speed
	"研究速度", // Research Speed
	"弹射速度", // Eject Speed
	"发射速度", // Launch Speed
	"血量", // HP
	"仓储物品", // Storage
	"船运载量", // Carrying Capacity
	"飞行速度", // Flight Speed
	"制造加速", // Produce Acceleration
	"喷涂次数", // Numbers of Sprays
	"采集速度", // Gathering Speed
	"配送范围", // Distribution Range
	"风能", // Wind
	"光伏", // Photovoltaic
	"火力", // Thermal
	"离子流", // Ion Current
	"地热", // Geothermal
	"地热强度", // Geothermal 
	"仓储空间的后缀", //  slots
	"水源", // Liquid Source
	"矿脉", // Vein
	"油田", // Oil Field
	
	"配方选取", // Select a recipe
	"建筑公式", // Buildings
	"组件公式", // Items
	"公式图标", // Recipes
	"科技图标", // Technologies
	"升级图标", // Upgrades
];

for(let extra of ExtraStringsToInclude)
	usedStrings.add(extra);



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
function handleCustomTags(text) {
	return text.replaceAll(/<([a-z]+)="?(.+?)"?>(.+?)<\/\1>/g, (match, p1, p2, p3) => {
		if(p1 === 'color') return `<span style="color: ${p2}">${p3}</span>`;
		if(p1 === 'size') return `<span style="font-size: ${p2}px">${p3}</span>`; // throw new Error(`Unimplemented tag <size>`);
		if(p1) throw new Error(`Unknown tag <${p1}/>?`);
		return match;
	});
}

for(const [key, localisations] of strings)
{
	for(const locale in localisations)
	{
		localisations[locale] = handleCustomTags(localisations[locale]);
		localisations[locale] = handleCustomTags(localisations[locale]); // Second round to handle any nested tags
	}
}





let localeCount = internalLocales.reduce((previous, current) => {
	previous[current] = previous.total;
	return previous;
}, { total: strings.size });
for(let [name, locales] of strings)
{
	for(let locale in locales)
	{
		let string = locales[locale];
		if(string === '') localeCount[locale]--;
	}
}

for(let locale in localeCount)
{
	if(locale === 'total') continue;
	console.log(`${locale} ${((localeCount[locale] / localeCount.total) * 100).toFixed(2)}% translated strings`);
}






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



// await writeFile('dist/data/translate.js', `
// function translate(string) {
// 	if(!string) return '';
// 	let translation = strings.get(string);
// 	if(!translation) throw new Error(\`Cant find translation for: \${string} [\${string.length}]\`);
// 	return translation.en_us;
// }

// const translateableKeys = ['name', 'description', 'conclusion', 'miningFrom', 'produceFrom'];
// `);


