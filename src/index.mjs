import { JSONReplacer, JSONReviver, JSONRecurse } from './lib/json.mjs';
import { AddonType, AmmoType, ItemType, MinerType, ObjectType, RecipeType, RuinType, TextureFormat } from './lib/dat.mjs';
import { DSPParser } from '../src/dsp-parser.mjs';
import * as LCID from './lib/lcid.mjs';

/*

// Create and configure parser
const gameDirectory = '../Dyson Sphere Program';
let parser = new DSPParser(gameDirectory);

// Run
await parser.parse();
const exportDirectory = './dist';
await parser.writeToFiles(exportDirectory);


// or getting data directly as JSON:
let { meta, items, recipes, techs, data } = await parser.parse();


*/



export {
	DSPParser,
	
	ItemType,
	AmmoType,
	RecipeType,
	ObjectType,
	RuinType,
	TextureFormat,
	AddonType,
	MinerType,
	
	JSONReplacer,
	JSONReviver,
	JSONRecurse,
	
	LCID,
};
