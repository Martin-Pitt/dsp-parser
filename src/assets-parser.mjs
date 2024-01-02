import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { BufferStreamAssets } from './lib/buffer.mjs';
import { AssetsFile } from './lib/assets-file.mjs';
import { parseProtoSet } from './lib/protoset.mjs';
import { JSONDebugReplacer } from './lib/json.mjs';
import { AddonType, MinerType, RecipeType } from './lib/dat.mjs';


export function getItemTypeString(item) {
	switch(item.type)
	{
		case 'UNKNOWN': return '未知分类';
		case 'RESOURCE': return '自然资源';
		case 'MATERIAL': return '材料';
		case 'COMPONENT': return '组件';
		case 'PRODUCT': return '成品';
		case 'LOGISTICS':
			if(item._PowerDesc?.accumulator) return '电力储存';
			if(item._PowerDesc?.node) return '电力运输';
			if(item._PowerDesc?.exchanger) return '电力交换';
			return '物流运输';
		case 'PRODUCTION':
			if(item._PowerDesc?.generator) return '电力设备';
			if(item._LabDesc) return '科研设备';
			switch(item._AssemblerDesc?.recipeType)
			{
				case 'Smelt': return '冶炼设备';
				case 'Chemical': return '化工设备';
				case 'Refine': return '精炼设备';
				case 'Assemble': return '制造台';
				case 'Particle': return '粒子对撞机';
				case 'Exchange': return '能量交换器';
				case 'PhotonStore': return '射线接收站';
				case 'Fractionate': return '分馏设备';
				case 'Research': return '科研设备';
			}
			switch(item._MinerDesc?.minerType)
			{
				case 'VEIN': return '采矿设备';
				case 'WATER': return '抽水设备';
				case 'OIL': return '抽油设备';
			}
			return '生产设备';
		case 'DECORATION': return '装饰物';
		case 'TURRET': return '武器';
		case 'DEFENSE': return '防御设施';
		case 'DARKFOG': return '黑雾物品';
		case 'MATRIX': return '科学矩阵';
		default: return '其他分类';
	}
}

export function getItemFuelTypeString(item) {
	let text = [];
	if(item.fuelType & 1) text.push('化学');
	if(item.fuelType & 2) text.push('核能');
	if(item.fuelType & 4) text.push('质能');
	if(item.fuelType & 8) text.push('储存');
	if(item.fuelType & 16) text.push('X');
	text = text.join(' / ');
	if(!text) text = '-';
	return text;
}

export function getMadeFromString(recipe) {
	switch(recipe.type)
	{
		case 'NONE': return '-",';
		case 'SMELT': return '冶炼设备';
		case 'CHEMICAL': return '化工设备';
		case 'REFINE': return '精炼设备';
		case 'ASSEMBLE': return '制造台';
		case 'PARTICLE': return '粒子对撞机';
		case 'EXCHANGE': return '能量交换器';
		case 'PHOTONSTORE': return '射线接收站';
		case 'FRACTIONATE': return '分馏设备';
		case 'RESEARCH': return '科研设备';
		default: return '未知';
	}
}

export function kmg(value, blank = false) {
	if(typeof value === 'number') value = BigInt(value);
	let scale;
	if(value < BigInt(1e4)) { }
	else if(value < BigInt(1e6)) { value /= BigInt(1e3); scale = 'K' }
	else if(value < BigInt(1e9)) { value /= BigInt(1e6); scale = 'M' }
	else if(value < BigInt(1e12)) { value /= BigInt(1e9); scale = 'G' }
	else if(value < BigInt(1e15)) { value /= BigInt(1e12); scale = 'T' }
	else if(value < BigInt(1e18)) { value /= BigInt(1e15); scale = 'P' }
	else { value /= BigInt(1e18); scale = 'E' }
	value = value.toString();
	if(scale) value += (blank? ' ' : '') + scale;
	return value;
}

export const ProliferatorSpeedTable = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500];
export const ProliferatorExtraTable = [0, 125, 200, 225, 250, 275, 300, 325, 350, 375, 400];
export const ProliferatorSpeedMilliTable = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
export const ProliferatorExtraMilliTable = [0, 0.125, 0.2, 0.225, 0.25, 0.275, 0.3, 0.325, 0.35, 0.375, 0.4];
export const ProliferatorPowerTable = [0, 300, 700, 1100, 1500, 1900, 2300, 2700, 3100, 3500, 3900];

export const VSLayerMask = {
	None: 0,
	GroundLow: 1,
	GroundNormal: 2,
	GroundHigh: 3,
	AirLow: 4,
	AirNormal: 8,
	AirHigh: 12,
	OrbitLow: 16,
	OrbitNormal: 32,
	OrbitHigh: 48,
	SpaceLow: 64,
	SpaceNormal: 128,
	SpaceHigh: 192,
	GroundAir: 15,
	GroundAirOrbit: 63,
	GroundAirSpace: 207,
	GroundOrbitSpace: 243,
	OribtSpace: 240,
	AirOrbitSpace: 252,
	CannonDefault: 11,
	All: 255
};

export function getDescField(index, item, level = 0) {
	let key;
	switch(index)
	{
		case 0: key = '采集自'; break;
		case 1: key = '制造于'; break;
		case 2: key = '燃料类型'; break;
		case 3: key = '能量'; break;
		case 4: key = '发电类型'; break;
		case 5: key = '发电功率'; break;
		case 6: key = '热效率'; break;
		case 7: key = '流体消耗'; break;
		case 8: key = '输入功率'; break;
		case 9: key = '输出功率'; break;
		case 10: key = '蓄电量'; break;
		case 11: key = '工作功率'; break;
		case 12: key = '待机功率'; break;
		case 13: key = '连接长度'; break;
		case 14: key = '覆盖范围'; break;
		case 15: key = '运载速度'; break;
		case 16: key = '接口数量'; break;
		case 17: key = '仓储空间'; break;
		case 18: key = '开采对象'; break;
		case 19: key = '开采速度'; break;
		case 20: key = '运送速度'; break;
		case 21: key = '货物堆叠'; break;
		case 22: key = '制造速度'; break;
		case 23: key = '血量'; break;
		case 24: key = '仓储物品'; break;
		case 25: key = '船运载量'; break;
		case 26: key = '船运载量'; break;
		case 27: key = '飞行速度'; break;
		case 28: key = '制造加速'; break;
		case 29: key = '喷涂次数'; break;
		case 30: key = '流体容量'; break;
		case 31: key = '机甲功率提升'; break;
		case 32: key = '采集速度'; break;
		case 33: key = '研究速度'; break;
		case 34: key = '弹射速度'; break;
		case 35: key = '发射速度'; break;
		case 36: key = '使用寿命'; break;
		case 37: key = '潜在能量'; break;
		case 38: key = '最大充能功率'; break;
		case 39: key = '基础发电功率'; break;
		case 40: key = '增产剂效果'; break;
		case 41: key = '喷涂增产效果'; break;
		case 42: key = '喷涂加速效果'; break;
		case 43: key = '额外电力消耗'; break;
		case 44: key = '配送范围'; break;
		case 45: key = '船运载量'; break;
		case 46: key = '飞行速度'; break;
		case 47: key = '弹药数量'; break;
		case 48: key = '伤害'; break;
		case 49: key = '射击速度'; break;
		case 50: key = '每秒伤害'; break;
		case 51: key = '防御塔类型'; break;
		case 52: key = '弹药类型'; break;
		case 53: key = '最大耐久度'; break;
		case 54: key = '手动制造速度'; break;
		case 55: key = '伤害类型'; break;
		case 56: key = '目标类型'; break;
		case 57: key = '对地防御范围'; break;
		case 58: key = '对天防御范围'; break;
		case 59: key = '飞行速度'; break;
		case 60: key = '射击距离'; break;
		case 61: key = '爆炸半径'; break;
		case 62: key = '主炮伤害'; break;
		case 63: key = '主炮射速'; break;
		case 64: key = '主炮射程'; break;
		case 65: key = '舰炮伤害'; break;
		case 66: key = '舰炮射速'; break;
		case 67: key = '舰炮射程'; break;
		default: return undefined;
	}
	
	// These should be the current game's damage scaling for each damage type
	const KineticDamageScale = 1.0;
	const EnergyDamageScale = 1.0;
	const BlastDamageScale = 1.0;
	
	let speed = ProliferatorSpeedMilliTable[level] + 1.0;
	let extra = ProliferatorExtraMilliTable[level] + 1.0;
	
	let value;
	switch(index)
	{
		case 0:
			value = item.miningFrom;
			break;
		case 1:
			if(item.__maincraft) value = item.__maincraft._madeFromString;
			else value = item.produceFrom;
			break;
		case 2:
			value = item._fuelTypeString;
			break;
		case 3:
			value = kmg(Math.floor(Number(item.heatValue) * (item.productive? speed : 1) + 0.1), true) + 'J';
			if(item.productive && level > 0) value = `<color=#61D8FFB8>${value}</color>`;
			break;
		case 4:
			if(item._PowerDesc.generator)
			{
				if(item._PowerDesc.wind) value = '风能'; else
				if(item._PowerDesc.photovoltaic) value = '光伏'; else
				if(item._PowerDesc.gamma) value = '离子流'; else
				if(item._PowerDesc.fuelMask <= 1 && item._PowerDesc.fuelMask > 0) value = '火力';
				if(item._PowerDesc.geothermal) value = '地热';
				else value = '离子流';
			}
			else value = '-';
			break;
		case 5:
		case 39:
			value = kmg(item._PowerDesc.genEnergyPerTick * 60n, true) + 'W';
			break;
		case 6:
			if(item._PowerDesc.useFuelPerTick > 0)
				value = (item._PowerDesc.genEnergyPerTick / item._PowerDesc.useFuelPerTick) + ' %';
			else
				value = '0';
			break;
		case 7:
			value = '-';
			break;
		case 8:
			if(item._PowerDesc.exchangeEnergyPerTick > 0) value = item._PowerDesc.exchangeEnergyPerTick * 60n;
			else value = item._PowerDesc.inputEnergyPerTick * 60n;
			value = kmg(value, true) + 'W';
			break;
		case 9:
			if(item._PowerDesc.exchangeEnergyPerTick > 0) value = item._PowerDesc.exchangeEnergyPerTick * 60n;
			else value = item._PowerDesc.outputEnergyPerTick * 60n;
			value = kmg(value, true) + 'W';
			break;
		case 10:
			value = kmg((item._PowerDesc?.maxAcuEnergy || 0n) + (item._StationDesc?.maxEnergyAcc || 0n) + (item._DispenserDesc?.maxEnergyAcc || 0n), true) + 'J';
			break;
		case 11:
			value = kmg((item._PowerDesc.workEnergyPerTick || 0n) * 60n, true) + 'W';
			break;
		case 12:
			value = kmg((item._PowerDesc.idleEnergyPerTick || 0n) * 60n, true) + 'W';
			break;
		case 13:
			if(item._PowerDesc.connectDistance > 0)
				value = (item._PowerDesc.connectDistance - 0.5).toFixed(2) + ' m';
			else value = '0';
			break;
		case 14:
			if(item._PowerDesc?.coverRadius > 0 && item._BeaconDesc?.signalRadius > 0)
				value = ['电力', (item._PowerDesc.coverRadius - 0.5).toFixed(2) + ' m / ', '信号', item._BeaconDesc.signalRadius.toFixed(2) + ' m'];
			else if(item._PowerDesc.coverRadius > 0)
				value = (item._PowerDesc.coverRadius - 0.5).toFixed(2) + ' m';
			else if(item._BattleBaseDesc?.pickRange > 0 && item._ConstructionModuleDesc?.buildRange > 0)
				value = ['建造', item._ConstructionModuleDesc.buildRange.toFixed(2) + ' m / ', '拾取', item._BattleBaseDesc.pickRange.toFixed(2) + ' m'];
			else value = '0';
			break;
		case 15:
			if(item._BeltDesc) value = (item._BeltDesc.speed * 60 / 10).toFixed(2) + '/s';
			else value = '0';
			break;
		case 16:
			value = item._SlotConfig?.slotPoses.length || 0;
			break;
		case 17:
			if(item._StorageDesc) value = [(item._StorageDesc.rowCount * item._StorageDesc.colCount), '仓储空间的后缀'];
			else value = '0';
			break;
		case 18:
			if(item._MinerDesc?.type === 'WATER') value = '水源';
			else if(item._MinerDesc?.type === 'VEIN') value = '矿脉';
			else if(item._MinerDesc?.type === 'OIL') value = '油田';
			else if(item._StationDesc?.isCollector) value = '气态行星';
			else value = '-';
			break;
		case 19:
			// The number in the descField should be multiplied by the current game's mining speed scaling, e.g. Vein Utilisation
			if(item._MinerDesc.type === 'VEIN')
				value = [60 / (item._MinerDesc.period / 600000), '每分每矿脉'];
			else if(item._MinerDesc.type === 'OIL')
				value = [1, 'x'];
			else if(item._MinerDesc.type === 'WATER')
				value = [60 / (item._MinerDesc.period / 600000), '/min'];
			else value = '-';
			break;
		case 20:
			if(item._InserterDesc)
				value = [(300000 / item._InserterDesc.stt).toFixed(0), '往返每秒每格'];
			else
				value = '';
			break;
		case 21:
			if(!item._InserterDesc.canStack)
				value = item._InserterDesc.stackSize;
			else
				value = 1; // This should be the current game's stack count size per the Sorter Cargo Stacking upgrade
			break;
		case 22:
		case 34:
		case 35:
			if(item._AssemblerDesc)
				value = (item._AssemblerDesc.speed / 10000).toFixed(3) + 'x';
			else if(item._LabDesc)
				value = (item._LabDesc.assemblerSpeed / 10000).toFixed(3) + 'x';
			else if(item._EjectorDesc)
				value = (3600 / (item._EjectorDesc.chargeFrame + item._EjectorDesc.coldFrame)).toFixed(2) + '/min';
			else if(item._SiloDesc)
				value = (3600 / (item._SiloDesc.chargeFrame + item._SiloDesc.coldFrame)).toFixed(2) + '/min';
			else
				value = '-';
			break;
		case 23:
			value = item.hpMax;
			break;
		case 24:
			value = [item._StationDesc.maxItemKinds, '仓储物品种类后缀'];
			break;
		case 25: 
			value = '-'; // This should be the Logistic Drone carry amount upgrade
			break;
		case 26:
			value = '-'; // This should be the Logistic Ship carry amount upgrade
			break;
		case 27:
			value = '-'; // This should be the Logistic Drone speed .toFixed(3) + ' m/s';
			break;
		case 28:
			value = item.ability + ' %';
			break;
		case 29:
			if(level > 0)
				value = [`<color=#61D8FFB8>${item.hpMax * extra + 0.1}</color>`, '喷涂次数的后缀'];
			else
				value = [item.hpMax, '喷涂次数的后缀'];
			break;
		case 30:
			value = item._TankDesc.fluidStorageCount;
			break;
		case 31:
			let num = (item.reactorInc + 1) * (item.productive? extra : speed) - 1;
			if(level > 0)
			{
				value = item.productive
				      ? `<color=#61D8FFB8>${(num > 0? '+' : '') + num.toFixed(3)}%</color>`
				      : `<color=#FD965EB8>${(num > 0? '+' : '') + num.toFixed(3)}%</color>`;
			}
			
			else if(num <= 0)
				value = num.toFixed(0) + '%';
			else
				value = '+' + num.toFixed(0) + '%';
			break;
		case 32:
			value = [item._StationDesc.collectSpeed, 'x']; // The number in the descField should be multiplied by the current game's mining speed scaling, e.g. Vein Utilisation
			break;
		case 33:
			value = [item._LabDesc.researchSpeed * 60, ' Hash/s']; // The number in the descField should be multiplied by the current game's tech speed
			break;
		case 36:
			value = ['?', '空格秒']; // The question mark here should be the current game's solar sail life
			break;
		case 37:
			value = kmg(item.potential, true) + 'J';
			break;
		case 38:
			value = kmg(item._PowerDesc.workEnergyPerTick * 60n * 5n, true) + 'W';
			break;
		case 40:
			if(item.productive) value = '额外产出';
			else value = '加速生产';
			break;
		case 41:
			value = `+${(ProliferatorExtraTable[item.ability] * 0.1).toFixed(1)}%`;
			break;
		case 42:
			value = `+${(ProliferatorSpeedTable[item.ability] * 0.1).toFixed(1)}%`;
			break;
		case 43:
			value = `+${(ProliferatorPowerTable[item.ability] * 0.1).toFixed(1)}%`;
			break;
		case 44:
			value = '-'; // This should be the current game's Logistic Distribution Bot max delivery range upgrade
			break;
		case 45:
			value = '-'; // This should be the Logistic Bot carry amount upgrade
			break;
		case 46:
			value = '-'; // This should be the Logistic Bot speed .toFixed(2) + ' m/s';
			break;
		case 47:
			value = [
				level? `<color=#61D8FFB8>${item.hpMax * speed + 0.1}</color>` : item.hpMax,
				(item.ammoType && item.ammoType !== 'NONE')? '弹药数量单位' : '',
			];
			break;
		case 48:
			if(item.ammoType && item.ammoType !== 'NONE')
			{
				let ability = item.ability;
				let damage = 0;
				
				switch(item.ammoType)
				{
					case 'BULLET': damage = ability * KineticDamageScale - ability; break;
					case 'CANNON': damage = ability * (KineticDamageScale * 0.5 + BlastDamageScale * 0.5) - ability; break;
					case 'PLASMA': damage = ability * EnergyDamageScale - ability; break;
					case 'MISSILE': damage = ability * BlastDamageScale - ability; break;
				}
				
				ability /= 100;
				damage /= 100;
				
				if(damage)
					value = `${ability.toFixed(1)} <color=#61D8FFB8>+ ${num15.toFixed(2)}</color> hp`;
				
				else
					value = ability.toFixed(1) + ' hp';
			}
			
			else if(item._UnitDesc)
			{
				// Leaving this for now
				value = '-';
			}
			break;
		case 49:
			if(item._TurretDesc)
			{
				let { muzzleCount, ROF, roundInterval, muzzleInterval } = item._TurretDesc;
				if(muzzleCount <= 1)
					value = [(ROF * 60 / roundInterval).toFixed(2), '发每秒'];
				
				else
					value = [(ROF * 60 * muzzleCount / (roundInterval + muzzleInterval * (muzzleCount - 1))).toFixed(2), '发每秒'];
			}
			
			else if(item._UnitDesc)
			{
				// Leaving this for now
				value = '-';
			}
			break;
		case 50:
			if(item._TurretDesc)
				value = (100 * item._TurretDesc.damageScale * EnergyDamageScale * 0.6).toFixed(2) + ' hp';
			else
				value = '-';
			break;
		case 51:
			switch(item._TurretDesc?.type)
			{
				case 'GAUSS': value = '动能武器'; break;
				case 'LASER': value = '能量武器'; break;
				case 'CANNON': value = '动能加爆破武器'; break;
				case 'PLASMA': value = '能量武器'; break;
				case 'MISSILE': value = '爆破武器'; break;
				default: value = '-';
			}
			break;
		case 52:
			switch(item._TurretDesc?.ammoType || item.ammoType)
			{
				case 'BULLET': value = '子弹'; break;
				case 'CANNON': value = '炮弹'; break;
				case 'PLASMA': value = '能量胶囊'; break;
				case 'MISSILE': value = '导弹'; break;
				default: value = '-';
			}
			break;
		case 53:
			if(item._UnitDesc)
			{
				// Leaving this for now
				value = '-';
			}
			break;
		case 54:
			if(!level) value = `+${item.ability}%`; 
			else value = `<color=#FD965EB8>+${item.ability * extra}%</color>`;
			break;
		case 55:
			if(item.ammoType !== 'NONE')
			{
				switch(item.ammoType)
				{
					case 'BULLET': value = '子弹伤害类型'; break;
					case 'CANNON': value = '炮弹伤害类型'; break;
					case 'PLASMA': value = '能量胶囊伤害类型'; break;
					case 'MISSILE': value = '导弹伤害类型'; break;
					default: value = '-';
				}
			}
			
			else if(item._UnitDesc)
				value = '战斗无人机伤害类型';
			
			else
				value = '-';
			break;
		case 56:
			if(!item._TurretDesc)
				value = '-';
			
			else if((item._TurretDesc.vsCaps & VSLayerMask.GroundAirSpace) !== VSLayerMask.GroundAirSpace)
			{
				if(!(item._TurretDesc.vsCaps & VSLayerMask.SpaceHigh))
					value = '对地';
				else
					value = '对天';
			}
			
			else
				value = '对地且对天';
			break;
		case 57:
			if(!item._TurretDesc)
				value = '-';
			
			else if(item._TurretDesc.minAttackRange)
				value = `${item._TurretDesc.minAttackRange} ~ ${item._TurretDesc.maxAttackRange} m`;
			
			else
				value = item._TurretDesc.maxAttackRange + ' m';
			break;
		case 58:
			value = item._TurretDesc? item._TurretDesc.spaceAttackRange + ' m' : '-';
		case 59:
			value = item._UnitDesc? item._UnitDesc.maxMovementSpeed + ' m/s' : '-';
			break;
		case 60:
			value = item._UnitDesc? item._UnitDesc.attackRange0 + ' m' : '-';
			break;
		case 61:
			if(item.ammoType === 'CANNON')
				value = '13 m';
			
			else if(item.ammoType === 'PLASMA')
			{
				if(item.id === 1607) value = '8 m';
				else if(item.id === 1608) value = '20 m';
				else value = '-';
			}
			
			else if(item.ammoType === 'MISSILE')
			{
				value = item._AmmoDesc.blastRadius1 + ' m';
			}
			break;
		case 62:
		case 63:
		case 64:
		case 65:
		case 66:
		case 67:
			if(item._UnitDesc)
			{
				// Leaving this for now
				value = '-';
			}
			break;
	}
	
	return (key && value)? { key, value } : undefined;
}




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
	async parseProtoSets() {
		// Get and parse the ProtoSets
		const ItemProtoSet = parseProtoSet(this.resources.getProtoSet('ItemProtoSet'));
		const RecipeProtoSet = parseProtoSet(this.resources.getProtoSet('RecipeProtoSet'));
		const TechProtoSet = parseProtoSet(this.resources.getProtoSet('TechProtoSet'));
		const ModelProtoSet = parseProtoSet(this.resources.getProtoSet('ModelProtoSet'));
		
		const parseRaw = (raw) => {
			const obj = {}; //  = { id: null, name: null };
			
			for(let [key, value] of Object.entries(raw))
			{
				// Skip defaults
				if(!value) continue;
				if(Array.isArray(value) && !value.length) continue;
				if(key === 'hpMax' && value === 1) continue;
				if(key === 'ammoType' && value === 'NONE') continue;
				if(key === 'enemyDropRange' && value[0] === 0 && value[1] === 0) continue;
				
				// Others
				if(key.startsWith('__')) continue;
				// if(SkipKeys.includes(key)) continue;
				
				// Extract iconPaths out
				if(key === 'iconPath')
				{
					this.iconPaths.set(obj, value);
					// continue;
				}
				
				obj[key] = value;
			}
			
			return obj;
		};
		
		
		
		// for(let item of ItemProtoSet.data)
		// 	item.model = ModelProtoSet.data.find(model => model.id === item.modelIndex);
		
		
		// Parse all the GameObject components
		let gameObjects = this.resources.table.filter(resource => resource.fileTypeName === 'GameObject').map(resource => this.resources.resolveAsset(resource));
		/*
		for(let model of ModelProtoSet.data)
		{
			let name = model.prefabPath.split('/').pop();
			model.prefabs = gameObjects
				.filter(obj => obj.name === name)
				.filter(obj => obj.components?.some(component => component.type === 'MonoBehaviour'));
			// if(model.prefabs.length > 1) console.error(`${model.prefabs.length} prefabs found for ${name}`);
			
			// Drop all non-MonoBehaviour components like transforms, colliders, etc.
			// for(let prefab of model.prefabs)
			// {
			// 	prefab.components = prefab.components.filter(component => component.type === 'MonoBehaviour');
			// }
		}
		writeFile(join(this.dsp.exportDirectory, 'ModelProtoSet.json'), JSON.stringify(ModelProtoSet, JSONDebugReplacer, '\t'));
		//*/
		
		
		// Find components related to an item
		let itemComponents = new Map();
		for(let item of ItemProtoSet.data)
		{
			if(!item.modelIndex) continue; // || !item.modelCount) continue; -- Missiles (which have AmmoDesc) have a modelIndex but no modelCount?
			let model = ModelProtoSet.data.find(model => model.id === item.modelIndex);
			let modelName = model.prefabPath.split('/').pop();
			let prefabs = gameObjects
				.filter(object => object.name === modelName)
				.filter(object => object.components?.some(component => component.type === 'MonoBehaviour'));
			let components = prefabs
				.reduce((list, prefab) => [...list, ...prefab.components], [])
				.filter(component => component.type === 'MonoBehaviour')
				.map(component => ({
					pathID: component.script.pathID,
					stream: component.stream,
					bytesLeft: component.stream.buf.length - component.stream.pos,
				}));
			itemComponents.set(item, components);
		}
		
		// await writeFile(join(this.dsp.exportDirectory, 'ItemComponents.json'), JSON.stringify(itemComponents, JSONDebugReplacer, '\t'));
		
		
		
		let ItemExchanger = ItemProtoSet.data.find(d => d.id === 2209);
		let ItemEjector = ItemProtoSet.data.find(d => d.id === 2311);
		let ItemSilo = ItemProtoSet.data.find(d => d.id === 2312);
		let ItemSpraycoater = ItemProtoSet.data.find(d => d.id === 2313);
		let ItemStorage = ItemProtoSet.data.find(d => d.id === 2101);
		let ItemStorageTank = ItemProtoSet.data.find(d => d.id === 2106);
		let ItemMiningDrill = ItemProtoSet.data.find(d => d.id === 2301);
		let ItemAssembler = ItemProtoSet.data.find(d => d.id === 2303);
		let ItemLogisticStation = ItemProtoSet.data.find(d => d.id === 2103);
		let ItemBelt = ItemProtoSet.data.find(d => d.id === 2001);
		let ItemLab = ItemProtoSet.data.find(d => d.id === 2901);
		let ItemInserter = ItemProtoSet.data.find(d => d.id === 2011);
		let ItemShield = ItemProtoSet.data.find(d => d.id === 3008);
		let ItemBeacon = ItemProtoSet.data.find(d => d.id === 3007);
		let ItemBattleBase = ItemProtoSet.data.find(d => d.id === 3009);
		let ItemGaussTurret = ItemProtoSet.data.find(d => d.id === 3001);
		let ItemMissile = ItemProtoSet.data.find(d => d.id === 1609);
		let ItemFractionator = ItemProtoSet.data.find(d => d.id === 2314);
		// let ItemAccumulator = ItemProtoSet.data.find(d => d.id === 2206);
		// let ItemAccumulatorFull = ItemProtoSet.data.find(d => d.id === 2207);
		
		/*
		await writeFile(join(
			this.dsp.exportDirectory, 'ItemsToCheck.json'),
			JSON.stringify(
				ItemProtoSet.data
				.filter(d => [
					2209, 2311, 2312, 2313, 2101, 2106, 2301, 2303,
					2103, 2001, 2901, 2011, 3008, 3007, 3009, 1609,
					2314,
				].includes(d.id))
				.map(item => [
					item, itemComponents.get(item)
					.map(({ pathID, bytesLeft, stream }) => ({
						pathID, bytesLeft, stream: stream.buf.subarray(stream.pos, stream.pos + bytesLeft),
					}))
				]),
				JSONDebugReplacer, '\t'
		)	);
		//*/
		
		
		// Cross-check components to find correct *Desc
		let descIDs = new Map();
		
		const crossCheck = ({ item, descName, preCheck, descCheck, debug }) => {
			let foundDesc = false;
			for(let { bytesLeft, stream, pathID } of itemComponents.get(item))
			{
				if(descIDs.has(pathID)) continue;
				if(preCheck? !preCheck({ bytesLeft }) : false) continue;
				let streamPosStart = stream.pos;
				
				try
				{
					// console.log('crossCheck:preCheck', descName, bytesLeft);
					let desc = this.resources.parseMonoBehaviour(descName, stream);
					if(descCheck? descCheck({ desc }) : true)
					{
						if(debug) console.log('crossCheck:descCheck', descName, desc);
						descIDs.set(pathID, descName);
						foundDesc = true;
					}
				}
				
				catch(e)
				{
					// console.log('crossCheck:error', e);
				}
				
				stream.pos = streamPosStart;
				if(foundDesc) break;
			}
			
			return foundDesc;
		}
		
		
		// Try to find components based on the item and some expected properties and reasonable ranges of values
		let checks = [
			{
				item: ItemExchanger, descName: 'PowerDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 152 },
				descCheck({ desc }) { return desc.exchanger === true && desc.emptyId === 2206 },
			},
			{
				item: ItemEjector, descName: 'EjectorDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 20 },
				descCheck({ desc }) { return desc.bulletProtoId === 1501 },
			},
			{
				item: ItemSilo, descName: 'SiloDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 12 },
				descCheck({ desc }) { return desc.bulletProtoId === 1503 },
			},
			{
				item: ItemSpraycoater, descName: 'SpraycoaterDesc',
				preCheck({ bytesLeft }) { return bytesLeft >= 8 },
				descCheck({ desc }) { return 10 <= desc.incCapacity && desc.incCapacity <= 2000 && desc.incItemId?.includes(1141) },
			},
			{
				item: ItemStorage, descName: 'StorageDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 8 },
				descCheck({ desc }) { return (
					4 <= desc.colCount && desc.colCount <= 30 &&
					1 <= desc.rowCount && desc.rowCount <= 100
				) },
			},
			{
				item: ItemStorageTank, descName: 'TankDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 4 },
				descCheck({ desc }) { return 1000 <= desc.fluidStorageCount && desc.fluidStorageCount <= 100000 },
			},
			{
				item: ItemMiningDrill, descName: 'MinerDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 8 },
				descCheck({ desc }) { return desc.minerType === 'VEIN' && 0.1 <= desc.periodf && desc.periodf <= 10.0 },
			},
			{
				item: ItemAssembler, descName: 'AssemblerDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 8 },
				descCheck({ desc }) { return desc.recipeType === 'ASSEMBLE' && 0.1 <= desc.speedf && desc.speedf <= 10.0 },
			},
			{
				item: ItemMiningDrill, descName: 'BuildConditionConfig',
				preCheck({ bytesLeft }) { return bytesLeft >= 96 },
				descCheck({ desc }) { return desc.veinMiner === true },
			},
			{
				item: ItemLogisticStation, descName: 'StationDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 64 },
				descCheck({ desc }) { return (
					100 <= desc.maxItemCount && desc.maxItemCount <= 20000 &&
					1 <= desc.maxItemKinds && desc.maxItemKinds <= 20 &&
					0 <= desc.maxDroneCount && desc.maxDroneCount <= 200 &&
					desc.maxShipCount === 0
				) },
			},
			{
				item: ItemLogisticStation, descName: 'SlotConfig',
				preCheck({ bytesLeft }) { return bytesLeft >= 64 },
				descCheck({ desc }) { return desc.slotPoses.length === 12 },
			},
			{
				item: ItemBelt, descName: 'BeltDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 8 },
				descCheck({ desc }) { return desc.beltPrototype === 2001 },
			},
			{
				item: ItemLab, descName: 'LabDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 8 },
				descCheck({ desc }) { return (
					0.1 <= desc.assembleSpeed && desc.assembleSpeed <= 10.0 &&
					0.1 <= desc.researchSpeed && desc.researchSpeed <= 10.0
				) },
			},
			{
				item: ItemInserter, descName: 'InserterDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 16 },
				descCheck({ desc }) { return 0.01 < desc.sttf <= 10.0 && desc.stackSize === 1 },
			},
			{
				item: ItemShield, descName: 'FieldGeneratorDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 24 },
				descCheck({ desc }) { return (
					10000000n < desc.energyCapacity && desc.energyCapacity < 60000000000n &&
					10000000n < desc.energyRequire0 && desc.energyRequire0 < 10000000000n &&
					10000000n < desc.energyRequire1 && desc.energyRequire1 < 10000000000n
				) },
			},
			{
				item: ItemBeacon, descName: 'BeaconDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 20 },
				descCheck({ desc }) { return (
					0 <= desc.signalRadius && desc.signalRadius <= 1024,
					0 <= desc.pitchUpMax && desc.pitchUpMax <= 90 &&
					0 <= desc.pitchDownMax && desc.pitchDownMax <= 90
				) },
			},
			{
				item: ItemGaussTurret, descName: 'TurretDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 104 },
				descCheck({ desc }) { return desc.type === 'GAUSS' && desc.ammoType === 'BULLET' && 0 < desc.maxAttackRange && desc.maxAttackRange < 1000 },
			},
			{
				item: ItemMissile, descName: 'AmmoDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 24 },
				descCheck({ desc }) { return (
					0.1 <= desc.blastRadius0 && desc.blastRadius0 <= 1000.0 &&
					0.1 <= desc.blastRadius1 && desc.blastRadius1 <= 1000.0 &&
					0.1 <= desc.blastFallof && desc.blastFallof <= 100.0 &&
					0.1 <= desc.moveAcc && desc.moveAcc <= 100.0 &&
					0.1 <= desc.turnAcc && desc.turnAcc <= 100.0
				) },
			},
			{
				item: ItemBattleBase, descName: 'BattleBaseDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 12 },
				descCheck({ desc }) { return (
					1000000n < desc.maxEnergyAcc && desc.maxEnergyAcc < 2000000000n &&
					0 <= desc.pickRange && desc.pickRange <= 180
				) },
			},
			{
				item: ItemBattleBase, descName: 'ConstructionModuleDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 20 },
				descCheck({ desc }) { return (
					1 <= desc.droneCount && desc.droneCount <= 100 &&
					0 <= desc.buildRange && desc.buildRange <= 180
				) },
			},
			{
				item: ItemAssembler, descName: 'MinimapConfig',
				preCheck({ bytesLeft }) { return bytesLeft === 4 },
				descCheck({ desc }) { return 0 <= desc.type && desc.type <= 100 },
			},
			{
				item: ItemFractionator, descName: 'FractionatorDesc',
				preCheck({ bytesLeft }) { return bytesLeft === 16 },
				descCheck({ desc }) { return (
					0 <= desc.fluidInputMax && desc.fluidInputMax <= 1000 &&
					0 <= desc.productOutputMax && desc.productOutputMax <= 1000 &&
					0 <= desc.fluidOutputMax && desc.fluidOutputMax <= 1000
				) },
			}
		];
		
		for(let check of checks)
		{
			if(!crossCheck(check))
			{
				console.error(`Unable to cross check ${check.descName}`);
			}
		}
		
		
		// Not checked yet or not considered useful unless there's demand
		// DispenserDesc
		// CraftDesc
		// EnemyDesc
		// AnimDesc
		// AudioDesc
		// MonitorDesc
		// SpeakerDesc
		
		// There's also these but have no additional data currently
		// SplitterDesc
		// PilerDesc
		// DroneDesc
		
		// await writeFile(join(this.dsp.exportDirectory, 'CrossCheck.json'), JSON.stringify(descIDs, JSONDebugReplacer, '\t'));
		
		
		/*
		// For debugging to try find what components on an item
		let item = ItemGaussTurret; // for(let item of ItemProtoSet.data)
		let components = itemComponents.get(item).map(component => {
			if(descIDs.has(component.pathID)) return this.resources.parseMonoBehaviour(descIDs.get(component.pathID), component.stream);
			return {
				pathID: component.pathID,
				bytesLeft: component.bytesLeft,
				stream: component.stream.buf.subarray(component.stream.pos, component.stream.pos + component.bytesLeft),
			};
		});
		await writeFile(join(this.dsp.exportDirectory, 'Item.json'), JSON.stringify({ item, components }, JSONDebugReplacer, '\t'));
		//*/
		
		
		// Now that we have figured out which PathIDs are *Desc/*Config components,
		// we can get the additional data and save it into the item itself
		for(let item of ItemProtoSet.data)
		{
			let components = itemComponents.get(item);
			if(!components || !components.length) continue;
			
			for(let component of components)
			{
				if(!descIDs.has(component.pathID)) continue;
				let descName = descIDs.get(component.pathID);
				let data = this.resources.parseMonoBehaviour(descName, component.stream);
				
				// We usually just copy all the data straight into item._*Desc
				// but there is additional parsing we need to do on some
				switch(descName)
				{
					case 'SlotConfig':
						var desc = item['_' + descName] = data;
						// Until we actually parse the transforms properly, let's just null them.
						// You can still use array.length for the most useful bit of info
						desc.slotPoses = data.slotPoses.map(poses => null);
						desc.insertPoses = data.insertPoses.map(poses => null);
						desc.addonAreaCol = data.addonAreaCol.map(poses => null);
						break;
					
					case 'PowerDesc':
						var desc = item['_' + descName] = {};
						if(data.node) {
							desc.node = true;
							desc.connectDistance = data.connectDistance;
							desc.coverRadius = data.coverRadius;
							desc.powerPoint = data.powerPoint;
						}
						
						if(data.generator)
						{
							desc.generator = true;
							desc.photovoltaic = data.photovoltaic;
							desc.wind = data.wind;
							desc.gamma = data.gamma;
							desc.geothermal = data.geothermal;
							desc.genEnergyPerTick = data.genEnergyPerTick;
							desc.useFuelPerTick = data.useFuelPerTick;
							desc.fuelMask = data.fuelMask;
							desc.catalystId = data.catalystId;
							desc.productId = data.productId;
							desc.productHeat = data.productHeat;
						}
						
						if(data.accumulator)
						{
							desc.accumulator = true;
							desc.inputEnergyPerTick = data.inputEnergyPerTick;
							desc.outputEnergyPerTick = data.outputEnergyPerTick;
							desc.maxAcuEnergy = data.maxAcuEnergy;
						}
						
						if(data.exchanger)
						{
							desc.exchanger = true;
							desc.exchangeEnergyPerTick = data.exchangeEnergyPerTick;
							desc.emptyId = data.emptyId;
							desc.fullId = data.fullId;
							desc.maxExcEnergy = data.fullId && ItemProtoSet.data.find(item => item.id === data.fullId).heatValue;
						}
						
						if(data.consumer)
						{
							desc.consumer = true;
							desc.charger = data.charger;
							desc.workEnergyPerTick = data.workEnergyPerTick;
							desc.idleEnergyPerTick = data.idleEnergyPerTick;
						}
						break;
					
					case 'MinerDesc':
						item['_' + descName] = {
							minerType: data.minerType,
							period: Math.round(data.periodf * 600000),
						};
						break;
					
					case 'InserterDesc':
						item['_' + descName] = {
							stt: Math.round(data.sttf * 600000),
							delay: Math.round(data.delayf * 600000),
							canStack: data.canStack,
							stackSize: data.stackSize,
						};
						break;
					
					case 'AssemblerDesc':
						item['_' + descName] = {
							speed: Math.round(data.speedf * 10000),
							recipeType: data.recipeType,
						};
						break;
					
					case 'LabDesc':
						item['_' + descName] = {
							assembleSpeed: Math.round(data.assembleSpeed * 10000),
							researchSpeed: data.researchSpeed,
						};
						break;
					
					default:
						item['_' + descName] = data;
				}
			}
		}
		
		
		// With *Desc we can also figure out some of the strings generated from types
		for(let item of ItemProtoSet.data)
		{
			if(item.type) item._typeString = getItemTypeString(item);
			if(item.fuelType) item._fuelTypeString = getItemFuelTypeString(item);
		}
		
		for(let recipe of RecipeProtoSet.data)
		{
			if(recipe.type) recipe._madeFromString = getMadeFromString(recipe);
		}
		
		
		// Figure out descFields
		for(let item of ItemProtoSet.data)
		{
			if(!item.descFields || !item.descFields.length) continue;
			
			let resultIndex = 100;
			for(let recipe of RecipeProtoSet.data)
			{
				for(let index = 0; index < recipe.results.length; ++index)
				{
					if(recipe.results[index] !== item.id) continue;
					
					if(index < resultIndex)
					{
						resultIndex = index;
						item.__maincraft = recipe;
					}
				}
			}
			
			item._descFields = item.descFields.map(field => getDescField(field, item));
		}
		
		
		
		
		
		
		
		
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
		
		// Return
		this.items = items.map(parseRaw);
		this.recipes = recipes.map(parseRaw);
		this.techs = techs.map(parseRaw);
	}
}