import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { BufferStreamAssets } from './lib/buffer.mjs';
import { AssetsFile } from './lib/assets-file.mjs';
import { parseProtoSet } from './lib/protoset.mjs';
import { JSONDebugReplacer } from './lib/json.mjs';
import { AddonType, MinerType, RecipeType } from './lib/dat.mjs';



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
		const ModelProtoSet = parseProtoSet(this.resources.getProtoSet('ModelProtoSet'));
		
		
		/*
		for(let item of ItemProtoSet.data)
		{
			item.model = ModelProtoSet.data.find(model => model.id === item.modelIndex);
		}
		
		
		for(let model of ModelProtoSet.data)
		{
			let name = model.prefabPath.split('/').pop();
			model.prefabs = assets
				.filter(asset => asset.name === name)
				.filter(asset => asset.components?.some(component => component.type?.startsWith('MonoBehaviour')));
			if(model.prefabs.length > 1) console.error(`${model.prefabs.length} prefabs found for ${name}`);
		}
		
		writeFile(join(this.dsp.exportDirectory, 'ModelProtoSet.json'), JSON.stringify(ModelProtoSet, JSONDebugReplacer, '\t'));
		*/
		
		
		
		let gameObjects = this.resources.table.filter(resource => resource.fileTypeName === 'GameObject').map(resource => this.resources.resolveAsset(resource));
		function getComponent(arrayOrGameObject, name) {
			if(Array.isArray(arrayOrGameObject))
			{
				for(let gameObject of arrayOrGameObject)
				{
					let component = getComponent(gameObject, name);
					if(component) return component;
				}
				
				return undefined;
			}
			
			let result = arrayOrGameObject.components?.find(component => component?.type === name);
			if(result)
			{
				let { pathID, fileID, type, ...component } = result;
				return component;
			}
		}
		
		
		for(let item of ItemProtoSet.data)
		{
			if(!item.modelIndex || !item.modelCount) continue;
			let prefabDesc = item.prefabDesc = {};
			let model = ModelProtoSet.data.find(model => model.id === item.modelIndex);
			let modelName = model.prefabPath.split('/').pop();
			let prefabs = gameObjects
				.filter(object => object.name === modelName)
				.filter(object => object.components?.some(component => component.type?.startsWith('MonoBehaviour')));
			
			// let CraftDesc = getComponent(prefabs, 'MonoBehaviour:CraftDesc');
			let BuildConditionConfig = getComponent(prefabs, 'MonoBehaviour:BuildConditionConfig');
			if(BuildConditionConfig)
			{
				prefabDesc.buildCondition = BuildConditionConfig;
				prefabDesc.buildCondition.addonType = AddonType.get(BuildConditionConfig.addonType);
			}
			let SlotConfig = getComponent(prefabs, 'MonoBehaviour:SlotConfig');
			if(SlotConfig) prefabDesc.slot = SlotConfig;
			let BeltDesc = getComponent(prefabs, 'MonoBehaviour:BeltDesc');
			if(BeltDesc) prefabDesc.belt = BeltDesc;
			let SplitterDesc = getComponent(prefabs, 'MonoBehaviour:SplitterDesc');
			if(SplitterDesc) prefabDesc.splitter = SplitterDesc;
			let MonitorDesc = getComponent(prefabs, 'MonoBehaviour:MonitorDesc');
			if(MonitorDesc) prefabDesc.monitor = MonitorDesc;
			let SpeakerDesc = getComponent(prefabs, 'MonoBehaviour:SpeakerDesc');
			if(SpeakerDesc) prefabDesc.speaker = SpeakerDesc;
			let SpraycoaterDesc = getComponent(prefabs, 'MonoBehaviour:SpraycoaterDesc');
			if(SpraycoaterDesc) prefabDesc.spraycoater = SpraycoaterDesc;
			let PilerDesc = getComponent(prefabs, 'MonoBehaviour:PilerDesc');
			if(PilerDesc) prefabDesc.piler = PilerDesc;
			let StorageDesc = getComponent(prefabs, 'MonoBehaviour:StorageDesc');
			if(StorageDesc) prefabDesc.storage = StorageDesc;
			let TankDesc = getComponent(prefabs, 'MonoBehaviour:TankDesc');
			if(TankDesc) prefabDesc.tank = TankDesc;
			let MinerDesc = getComponent(prefabs, 'MonoBehaviour:MinerDesc');
			if(MinerDesc) prefabDesc.miner = {
				type: MinerType.get(MinerDesc.minerType),
				period: Math.round(MinerDesc.periodf * 600000),
			};
			let InserterDesc = getComponent(prefabs, 'MonoBehaviour:InserterDesc');
			if(InserterDesc) prefabDesc.inserter = {
				stt: Math.round(InserterDesc.sttf * 600000),
				delay: Math.round(InserterDesc.delayf * 600000),
				canStack: InserterDesc.canStack,
				stackSize: InserterDesc.stackSize,
			};
			let AssemblerDesc = getComponent(prefabs, 'MonoBehaviour:AssemblerDesc');
			if(AssemblerDesc) prefabDesc.assembler = {
				speed: Math.round(AssemblerDesc.speedf * 10000),
				recipeType: RecipeType.get(AssemblerDesc.recipeType),
			};
			// FractionatorDesc
			let LabDesc = getComponent(prefabs, 'MonoBehaviour:LabDesc');
			if(LabDesc) prefabDesc.lab = {
				assembleSpeed: Math.round(LabDesc.assembleSpeed * 10000),
				researchSpeed: LabDesc.researchSpeed,
			};
			let StationDesc = getComponent(prefabs, 'MonoBehaviour:StationDesc');
			if(StationDesc) prefabDesc.station = StationDesc;
			let DispenserDesc = getComponent(prefabs, 'MonoBehaviour:DispenserDesc');
			if(DispenserDesc) prefabDesc.dispenser = DispenserDesc;
			let EjectorDesc = getComponent(prefabs, 'MonoBehaviour:EjectorDesc');
			if(EjectorDesc) prefabDesc.ejector = EjectorDesc;
			let SiloDesc = getComponent(prefabs, 'MonoBehaviour:SiloDesc');
			if(SiloDesc) prefabDesc.silo = SiloDesc;
			// AnimDesc
			let PowerDesc = getComponent(prefabs, 'MonoBehaviour:PowerDesc');
			if(PowerDesc)
			{
				prefabDesc.power = {};
				if(prefabDesc.power.node = PowerDesc.node)
				{
					prefabDesc.power.connectDistance = PowerDesc.connectDistance;
					prefabDesc.power.coverRadius = PowerDesc.coverRadius;
					prefabDesc.power.powerPoint = PowerDesc.powerPoint;
				}
				
				if(prefabDesc.power.generator = PowerDesc.generator)
				{
					prefabDesc.power.photovoltaic = PowerDesc.photovoltaic;
					prefabDesc.power.wind = PowerDesc.wind;
					prefabDesc.power.gamma = PowerDesc.gamma;
					prefabDesc.power.geothermal = PowerDesc.geothermal;
					prefabDesc.power.genEnergyPerTick = PowerDesc.genEnergyPerTick;
					prefabDesc.power.useFuelPerTick = PowerDesc.useFuelPerTick;
					prefabDesc.power.fuelMask = PowerDesc.fuelMask;
					prefabDesc.power.catalystId = PowerDesc.catalystId;
					prefabDesc.power.productId = PowerDesc.productId;
					prefabDesc.power.productHeat = PowerDesc.productHeat;
				}
				
				if(prefabDesc.power.accumulator = PowerDesc.accumulator)
				{
					prefabDesc.power.inputEnergyPerTick = PowerDesc.inputEnergyPerTick;
					prefabDesc.power.outputEnergyPerTick = PowerDesc.outputEnergyPerTick;
					prefabDesc.power.maxAcuEnergy = PowerDesc.maxAcuEnergy;
				}
				
				if(prefabDesc.power.exchanger = PowerDesc.exchanger)
				{
					prefabDesc.power.exchangeEnergyPerTick = PowerDesc.exchangeEnergyPerTick;
					prefabDesc.power.emptyId = PowerDesc.emptyId;
					prefabDesc.power.fullId = PowerDesc.fullId;
					prefabDesc.power.maxExcEnergy = PowerDesc.fullId && ItemProtoSet.data.find(item => item.id === PowerDesc.fullId).heatValue;
				}
				
				if(prefabDesc.power.consumer = PowerDesc.consumer)
				{
					prefabDesc.power.charger = PowerDesc.charger;
					prefabDesc.power.workEnergyPerTick = PowerDesc.workEnergyPerTick;
					prefabDesc.power.idleEnergyPerTick = PowerDesc.idleEnergyPerTick;
				}
			}
			let MinimapConfig = getComponent(prefabs, 'MonoBehaviour:MinimapConfig');
			if(MinimapConfig) prefabDesc.minimap = MinimapConfig;
			let AudioDesc = getComponent(prefabs, 'MonoBehaviour:AudioDesc');
			// if(AudioDesc) prefabDesc.audio = AudioDesc;
			// let EnemyDesc = getComponent(prefabs, 'MonoBehaviour:EnemyDesc');
			// UnitDesc
			// TurretDesc
			let AmmoDesc = getComponent(prefabs, 'MonoBehaviour:AmmoDesc');
			if(AmmoDesc) prefabDesc.ammo = AmmoDesc;
			let BeaconDesc = getComponent(prefabs, 'MonoBehaviour:BeaconDesc');
			if(BeaconDesc) prefabDesc.beacon = BeaconDesc;
			let FieldGeneratorDesc = getComponent(prefabs, 'MonoBehaviour:FieldGeneratorDesc');
			if(FieldGeneratorDesc) prefabDesc.fieldGenerator = FieldGeneratorDesc;
			let BattleBaseDesc = getComponent(prefabs, 'MonoBehaviour:BattleBaseDesc');
			if(BattleBaseDesc) prefabDesc.battleBase = BattleBaseDesc;
			let ConstructionModuleDesc = getComponent(prefabs, 'MonoBehaviour:ConstructionModuleDesc');
			if(ConstructionModuleDesc) prefabDesc.construction = ConstructionModuleDesc;
			// CombatModuleDesc
			let DroneDesc = getComponent(prefabs, 'MonoBehaviour:DroneDesc');
			if(DroneDesc) prefabDesc.drone = DroneDesc;
		}
		
		
		
		
		
		
		/*
		assets = assets.filter(asset => [
			// 26485n, // wind-turbine
			// 35472n, 35474n, // tesla-tower-1
			// 14910n, 15946n, 23660n, 23661n, // mining-drill
			// 12273n, 12682n, 19553n, 22153n, // mining-drill-mk2
			30160n, // assembler-mk-1
			// 11631n, 12034n, 12220n, 12661n, 22545n, 26484n, 27293n, 29103n, 34066n, 35371n, 36794n, // assembler-mk-2
			// 11566n, 11757n, 12128n, 12616n, 17706n, 18013n, 18029n, 21573n, 23641n, 24413n, 30714n, // assembler-mk-3
			// 11697n, 11814n, 12105n, 15698n, 19630n, 24289n, 26094n, 27168n, 27938n, 30180n, 31803n, 35705n, 35723n, 36494n, // assembler-mk-4
			// 11750n, 18105n, 25422n, // logistic-station
			34387n, // spray-coater
			// 17006n, // belt-1
			// 17441n, // belt-2
			// 16986n, // belt-3
			// 24917n, // lab
			// 30434n, // lab-2
		].includes(asset.pathID))
		.map(asset => this.resources.resolveAsset(asset.pathID))
		// .filter(asset => asset.components?.some(component => component.type.startsWith('MonoBehaviour')));
		writeFile(join(this.dsp.exportDirectory, 'Test4.json'), JSON.stringify(assets, JSONDebugReplacer, '\t'));
		*/
		
		
		
		// let gameObjects = this.resources.table
		// 	.filter(resource => resource.fileTypeName === 'GameObject')
		// 	// .slice(0, 100)
		// 	.map(resource => this.resources.getAssetStream(resource))
		// 	.map(stream => {
		// 		let type = stream.readInt32();
		// 		// let unknown;
		// 		// if(type === 1) unknown = stream.read(4*4); else
		// 		// if(type === 3) unknown = stream.read(10*4);
		// 		if(type === 1) stream.pos += 4 * 4; else
		// 		if(type === 3) stream.pos += 10 * 4;
		// 		let tag = stream.readString().toString();
		// 		return { tag, stream };
		// 	}).filter(d => d.tag === 'wind-turbine');
		// writeFile(join(this.dsp.exportDirectory, 'Test2.json'), JSON.stringify(gameObjects, JSONDebugReplacer, '\t'));
		
		
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
			
			if(element.prefabDesc)
			{
				for(let name in element.prefabDesc)
				{
					const prefabDesc = {};
					for(let [key,  value] of Object.entries(element.prefabDesc[name]))
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
						
						// Skip zero vector
						if(Array.isArray(value) && (value.length === 2 || value.length === 3) && value.every(d => d === 0)) continue;
						
						prefabDesc[key] = value;
					}
					
					element.prefabDesc[name] = prefabDesc;
				}
			}
			
			return element;
		};
		
		// Return
		this.items = items.map(parseRaw);
		this.recipes = recipes.map(parseRaw);
		this.techs = techs.map(parseRaw);
	}
}