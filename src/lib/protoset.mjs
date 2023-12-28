import { parseDataFile, TYPE } from './dat.mjs';



export function parseProtoSet(protoSetData) {
	const lastPos = protoSetData.pos;
	const filename = protoSetData.readString().toString();
	protoSetData.pos = lastPos;
	
	if(filename === 'ItemProtoSet')
	{
		return parseDataFile(protoSetData, {
			[TYPE]: 'object',
			fileName: 'string',
			tableName: 'string',
			signature: 'string',
			data: {
				[TYPE]: 'array',
				shape: {
					[TYPE]: 'object',
					name: 'string',
					id: 'int32',
					sid: 'string',
					type: 'ItemType',
					subId: 'int32',
					miningFrom: 'string',
					produceFrom: 'string',
					stackSize: 'int32',
					grade: 'int32',
					upgrades: { [TYPE]: 'array', shape: 'int32' },
					isFluid: 'bool',
					isEntity: 'bool',
					canBuild: 'bool',
					buildInGas: 'bool',
					iconPath: 'string',
					modelIndex: 'int32',
					modelCount: 'int32',
					hpMax: 'int32',
					ability: 'int32',
					heatValue: 'int64',
					potential: 'int64',
					reactorInc: 'float',
					fuelType: 'int32',
					ammoType: 'AmmoType',
					bombType: 'int32',
					craftType: 'int32',
					buildIndex: 'int32',
					buildMode: 'int32',
					gridIndex: 'int32', // grid coords as ZYXX, where Z represents items (1) or buildings (2)
					unlockKey: 'int32',
					preTechOverride: 'int32',
					productive: 'bool',
					mechaMaterialId: 'int32',
					dropRate: 'float',
					enemyDropLevel: 'int32',
					enemyDropRange: 'vector2',
					enemyDropCount: 'float',
					enemyDropMask: 'int32',
					descFields: { [TYPE]: 'array', shape: 'int32' },
					description: 'string',
				}
			}
		});
	}
	
	else if(filename === 'RecipeProtoSet')
	{
		return parseDataFile(protoSetData, {
			[TYPE]: 'object',
			fileName: 'string',
			tableName: 'string',
			signature: 'string',
			data: {
				[TYPE]: 'array',
				shape: {
					[TYPE]: 'object',
					name: 'string',
					id: 'int32',
					sid: 'string',
					type: 'RecipeType',
					handcraft: 'bool',
					explicit: 'bool',
					timeSpend: 'int32',
					items: { [TYPE]: 'array', shape: 'int32' },
					itemCounts: { [TYPE]: 'array', shape: 'int32' },
					results: { [TYPE]: 'array', shape: 'int32' },
					resultCounts: { [TYPE]: 'array', shape: 'int32' },
					gridIndex: 'int32',
					iconPath: 'string',
					description: 'string',
					nonProductive: 'bool',
				}
			}
		});
	}
	
	else if(filename === 'TechProtoSet')
	{
		return parseDataFile(protoSetData, {
			[TYPE]: 'object',
			fileName: 'string',
			tableName: 'string',
			signature: 'string',
			data: {
				[TYPE]: 'array',
				shape: {
					[TYPE]: 'object',
					name: 'string',
					id: 'int32',
					sid: 'string',
					description: 'string',
					conclusion: 'string',
					published: 'bool',
					isHiddenTech: 'bool',
					preItem: { [TYPE]: 'array', shape: 'int32' },
					level: 'int32',
					maxLevel: 'int32',
					levelCoef1: 'int32',
					levelCoef2: 'int32',
					iconPath: 'string',
					isLabTech: 'bool',
					preTechs: { [TYPE]: 'array', shape: 'int32' },
					preTechsImplicit: { [TYPE]: 'array', shape: 'int32' },
					preTechsMax: 'bool',
					items: { [TYPE]: 'array', shape: 'int32' },
					itemPoints: { [TYPE]: 'array', shape: 'int32' },
					propertyOverrideItems: { [TYPE]: 'array', shape: 'int32' },
					propertyItemCounts: { [TYPE]: 'array', shape: 'int32' },
					hashNeeded: 'int64',
					unlockRecipes: { [TYPE]: 'array', shape: 'int32' },
					unlockFunctions: { [TYPE]: 'array', shape: 'int32' },
					unlockValues: { [TYPE]: 'array', shape: { [TYPE]: 'byte', size: 8} },
					addItems: { [TYPE]: 'array', shape: 'int32' },
					addItemCounts: { [TYPE]: 'array', shape: 'int32' },
					position: 'vector2',
				}
			}
		});	
	}
	
	else if(filename === 'ModelProtoSet')
	{
		return parseDataFile(protoSetData, {
			[TYPE]: 'object',
			fileName: 'string',
			tableName: 'string',
			signature: 'string',
			data: {
				[TYPE]: 'array',
				shape: {
					[TYPE]: 'object',
					name: 'string',
					id: 'int32',
					sid: 'string',
					type: 'ObjectType',
					ruin: 'RuinType',
					rendererType: 'int32',
					hpMax: 'int32',
					hpUpgrade: 'int32',
					hpMax: 'int32',
					hpRecover: 'int32',
					ruinId: 'int32',
					ruinCount: 'int32',
					ruinLifeTime: 'int32',
					prefabPath: 'string',
				}
			}
		})
	}
	
	else
	{
		throw new Error(`ProtoSet parsing for '${filename}' not implemented yet`);
	}
}
