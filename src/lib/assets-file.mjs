import { BufferStreamAssets, BufferStreamData, isValidProtoSetHeader } from './buffer.mjs';
import { TYPE, parseDataFile } from './dat.mjs';
import { parseTexture } from './texture2d.mjs';



export const RuntimePlatform = new Map([
	[0, 'OSXEditor'],
	[1, 'OSXPlayer'],
	[2, 'WindowsPlayer'],
	[3, 'OSXWebPlayer'],
	[4, 'OSXDashboardPlayer'],
	[5, 'WindowsWebPlayer'],
	[7, 'WindowsEditor'],
	[8, 'IPhonePlayer'],
	[9, 'PS3'],
	[10, 'XBOX360'],
	[11, 'Android'],
	[12, 'NaCl'],
	[13, 'LinuxPlayer'],
	[15, 'FlashPlayer'],
	[17, 'WebGLPlayer'],
	[18, 'MetroPlayerX86'],
	[18, 'WSAPlayerX86'],
	[19, 'MetroPlayerX64'],
	[19, 'WSAPlayerX64'],
	[20, 'MetroPlayerARM'],
	[20, 'WSAPlayerARM'],
	[21, 'WP8Player'],
	[22, 'BB10Player'],
	[22, 'BlackBerryPlayer'],
	[23, 'TizenPlayer'],
	[24, 'PSP2'],
	[25, 'PS4'],
	[26, 'PSM'],
	[26, 'PSMPlayer'],
	[27, 'XboxOne'],
	[28, 'SamsungTVPlayer'],
]);


export class Type_0D {
	classID;
	isStrippedType;
	scriptTypeIndex;
	scriptID;
	oldTypeHash;
	
	constructor(file, isRefType) {
		let { format, stream, hasTypeTrees } = file;
		this.classID = stream.readInt32();
		
		if(format >= 16) this.isStrippedType = !!stream.readUInt8();
		this.scriptTypeIndex = format >= 17? stream.readInt16() : 0xFFFF;
		
		if(format >= 13)
		{
			if(isRefType && this.scriptTypeIndex >= 0)
			{
				this.scriptID = stream.read(16);
			}
			else if((format < 16 && this.classID < 0) || (format >= 16 && this.classID == 114))
			{
				this.scriptID = stream.read(16);
			}
			this.oldTypeHash = stream.read(16);
		}
		
		// if(this.classID < 0 || this.classID == 0x72 || this.classID == 0x7C90B5B3 || /*this.scriptIndex > 0*/ this.scriptIndex <= 0x7FFF) // MonoBehaviour
		// 	this.scriptHash = stream.read(16);
		// this.typeHash = stream.read(16);
		
		if(hasTypeTrees)
		{
			throw new Error('Type Tree parsing not implemented!');
			// Refer to https://github.com/SeriousCache/UABE/blob/edc33b430f58acfd5501535731a22edfc7440ec9/AssetsTools/AssetsFileFormat.cpp#L510 or https://github.com/Perfare/AssetStudio/blob/d158e864b556b5970709c2a52e47944d53aa98a2/AssetStudio/SerializedFile.cs#L261
		}
	}
	
	toJSON() {
		return {
			classID: this.classID,
			scriptTypeIndex: this.scriptTypeIndex,
		}
	}
}




export class AssetsFile {
	stream;
	format = 0;
	metadataSize = 0;
	fileSize = 0;
	offsetFirstFile = 0;
	endianness = false;
	unityVersion = "";
	targetPlatform = null;
	hasTypeTrees = false;
	
	types = [];
	assetCount = 0;
	assetTablePos = 0;
	table = [];
	preloads = [];
	dependencies = [];
	secondaryTypeList = [];
	
	constructor(stream) {
		this.stream = stream;
		
		/// Read header
		stream.isBigEndian = true;
		stream.pos += 8;
		let format = stream.readUInt32();
		stream.pos += 4;
		
		if(format >= 22)
		{
			this.format = format;
			this.metadataSize = Number(stream.readUInt64());
			this.fileSize = Number(stream.readUInt64());
			this.offsetFirstFile = Number(stream.readUInt64());
			this.endianness = stream.readUInt32();
			stream.read(4); // Padding
		}
		
		else
		{
			stream.pos -= 16;
			this.metadataSize = stream.readUInt32();
			this.fileSize = stream.readUInt32();
			this.format = stream.readUInt32();
			this.offsetFirstFile = stream.readUInt32();
			this.endianness = !!stream.readUInt32();
		}
		
		stream.isBigEndian = this.endianness;
		
		this.unityVersion = stream.readString().toString();
		if(this.format >= 17) this.targetPlatform = RuntimePlatform.get(stream.readUInt32());
		else this.targetPlatform = RuntimePlatform.get(stream.readUInt8());
		this.hasTypeTrees = !!stream.readUInt8();
		
		
		/// Read body
		this.parseTypeTree();
		// this.skipAssetTable();
		this.parseAssetTable();
		this.parsePreloadTable();
		this.parseDependencies();
		this.parseSecondaryTypeList();
	}
	
	toJSON() {
		return {
			format: this.format,
			metadataSize: this.metadataSize,
			fileSize: this.fileSize,
			offsetFirstFile: this.offsetFirstFile,
			endianness: this.endianness,
			unityVersion: this.unityVersion,
			targetPlatform: this.targetPlatform,
			hasTypeTrees: this.hasTypeTrees,
			
			types: this.types,
			assetCount: this.assetCount,
			table: this.table,
			preloads: this.preloads,
			dependencies: this.dependencies,
			secondaryTypeList: this.secondaryTypeList,
		}
	}
	
	parseTypeTree() {
		const count = this.stream.readUInt32();
		for(let iter = 0; iter < count; ++iter)
		{
			const type = new Type_0D(this, false);
			this.types.push(type);
		}
	}
	
	skipAssetTable() {
		this.assetTablePos = stream.pos;
		this.assetCount = stream.readUInt32();
		if(this.format >= 14 && this.assetCount > 0) this.stream.align(); // Align to byte packing
		this.stream.pos += this.getAssetTableSize();
	}
	
	parseAssetTable() {
		const { stream } = this;
		const count = stream.readUInt32();
		this.assetCount = count;
		if(!count) return;
		
		stream.align();
		
		for(let iter = 0; iter < count; ++iter)
		{
			const assetInfo = new AssetFileInfo(this);
			this.table.push(assetInfo);
		}
	}
	
	parsePreloadTable() {
		const { format, stream } = this;
		if(format < 11) return;
		
		const count = stream.readUInt32();
		if(count > 2000) throw new Error(`Ridiculous amount of preloads (${count})`);
		
		for(let index = 0; index < count; ++index)
		{
			const preload = { fileID: stream.readUInt32(), pathID: null, };
			
			if(format >= 14)
			{
				stream.align();
				preload.pathID = stream.readUInt64();
			}
			else
			{
				preload.pathID = stream.readUInt32();
			}
			
			this.preloads.push(preload);
		}
	}
	
	parseDependencies() {
		const { stream } = this;
		const count = stream.readUInt32();
		if(count <= 0) return;
		
		for(let index = 0; index < count; ++index)
		{
			let dependency = {};
			dependency.bufferedPath = stream.readString().toString();
			dependency.guid = {
				mostSignificant: stream.read(8),
				leastSignificant: stream.read(8),
			};
			dependency.type = stream.readUInt32();
			dependency.assetPath = stream.readString().toString();
			this.dependencies.push(dependency);
		}
	}
	
	parseSecondaryTypeList() {
		const { format, stream } = this;
		if(format < 20) return;
		
		const count = stream.readUInt32();
		if(!count) return;
		
		for(let iter = 0; iter < count; ++iter)
		{
			const type = new Type_0D(this, true);
			this.secondaryTypeList.push(type);
		}
	}
	
	
	static getAssetTableSize() {
		if(this.format < 15 || this.format > 16)
			return this.assetCount * AssetFileInfo.getSize(this);
		else if(this.assetCount === 0)
			return 0;
		else
		{
			let sizePerObject = AssetFileInfo.getSize(this);
			return ( (sizePerObject+3)&(~3) ) * (this.assetCount - 1) + sizePerObject;
		}
	}
	
	getAsset(name) {
		let assetInfo = this.table.find(asset => asset.name === name);
		return assetInfo;
	}
	
	getAssetStream(nameOrAsset) {
		if(typeof nameOrAsset === 'string') nameOrAsset = this.getAsset(nameOrAsset);
		this.stream.pos = nameOrAsset.offsetFile;
		let assetRaw = this.stream.read(nameOrAsset.fileSize);
		let assetStream = new BufferStreamData(assetRaw, false);
		return assetStream;
	}
	
	getProtoSet(name) {
		// console.log(name);
		let assetStream = this.getAssetStream(name);
		if(!isValidProtoSetHeader(assetStream)) throw 'ProtoSet header bits not as expected!';
		return assetStream;
	}
	
	resolveAssetShallow(pathIDorResource) {
		return this.resolveAsset(pathIDorResource, undefined, new Map(), true);
	}
	
	resolveAsset(pathIDorResource, fileID = undefined, found = new Map(), isShallow = false) {
		let pathID, resource;
		if(typeof pathIDorResource === 'bigint' || typeof pathIDorResource === 'number') pathID = pathIDorResource;
		else if(typeof pathIDorResource === 'object') pathID = pathIDorResource.pathID;
		if(found.has(pathID)) return found.get(pathID);
		if(!resource) resource = this.table.find(resource => resource.pathID === pathID);
		if(!resource) return `Asset (PathID ${pathID}; FileID ${fileID}) Not Found`;
		let stream = this.getAssetStream(resource);
		
		let asset = { pathID, fileID, type: resource.fileTypeName };
		// if(!asset.type) asset._classID = resource.classID;
		
		// console.log(asset.type);
		found.set(pathID, asset);
		switch(asset.type)
		{
			case 'GameObject':
				let data = parseDataFile(stream, {
					[TYPE]: 'object',
					components: {
						[TYPE]: 'array',
						shape: {
							[TYPE]: 'object',
							fileID: 'int32',
							pathID: 'int64',
						}
					},
					layer: 'uint32',
					name: { [TYPE]: 'string', align: false },
					tag: 'uint16',
					isActive: { [TYPE]: 'bool', width: 1 },
				});
				Object.assign(asset, data);
				if(isShallow) asset.components = `Components[${asset.components.length}]`;
				else asset.components = asset.components.map(component => this.resolveAsset(component.pathID, component.fileID, found));
			break;
			
			case 'MonoBehaviour':
				let { script } = parseDataFile(stream, {
					[TYPE]: 'object',
					gameObject: {
						[TYPE]: 'object',
						fileID: 'int32',
						pathID: 'int64',
					},
					enabled: 'bool',
					script: {
						[TYPE]: 'object',
						fileID: 'int32',
						pathID: 'int64',
					},
					name: { [TYPE]: 'string', align: false },
				});
				asset.script = script;
				asset.stream = stream;
				
				// let bytesLeft = stream.buf.length - stream.pos;
				// bytesLeft = stream.buf.length - stream.pos;
				// if(bytesLeft)
				// {
				// 	asset._unknownBytesLeft = bytesLeft;
				// 	asset._stream = stream.buf.subarray(stream.pos, stream.pos + bytesLeft);
				// }
			break;
		}
		
		return asset;
	}
	
	monoBehaviourParsers = {
		PowerDesc: {
			[TYPE]: 'object',
			node: 'bool',
			connectDistance: 'float',
			coverRadius: 'float',
			powerPoint: 'vector3',
			
			generator: 'bool',
			photovoltaic: 'bool',
			wind: 'bool',
			gamma: 'bool',
			geothermal: 'bool',
			genEnergyPerTick: 'int64',
			useFuelPerTick: 'int64',
			fuelMask: 'int32',
			catalystId: 'int32',
			productId: 'int32',
			productHeat: 'int64',
			
			accumulator: 'bool',
			inputEnergyPerTick: 'int64',
			outputEnergyPerTick: 'int64',
			maxAcuEnergy: 'int64',
			
			exchanger: 'bool',
			exchangeEnergyPerTick: 'int64',
			emptyId: 'int32',
			fullId: 'int32',
			
			consumer: 'bool',
			charger: 'bool',
			workEnergyPerTick: 'int64',
			idleEnergyPerTick: 'int64',
		},
		BuildConditionConfig: {
			[TYPE]: 'object',
			landPoints: { [TYPE]: 'array', shape: 'vector3' },
			landOffset: 'float',
			allowBuildInWater: 'bool',
			needBuildInWaterTech: 'bool',
			waterPoints: { [TYPE]: 'array', shape: 'vector3' },
			waterTypes: { [TYPE]: 'array', shape: 'int32' },
			multiLevel: 'bool',
			multiLevelAllowInserter: 'bool',
			multiLevelAllowRotate: 'bool',
			multiLevelAlternativeIds: { [TYPE]: 'array', shape: 'int32' },
			multiLevelAlternativeYawTransposes: { [TYPE]: 'array', shape: 'bool' },
			addonType: 'AddonType',
			lapJoint: 'vector3',
			veinMiner: 'bool',
			oilMiner: 'bool',
			dragBuild: 'bool',
			dragBuildDistOverride: 'vector2',
			blueprintBoxSizeOverride: 'vector2',
		},
		StationDesc: {
			[TYPE]: 'object',
			isStellar: 'bool',
			maxItemCount: 'int32',
			maxItemKinds: 'int32',
			maxDroneCount: 'int32',
			maxShipCount: 'int32',
			maxEnergyAcc: 'int64',
			dronePoint: 'vector3',
			shipPoint: 'vector3',
			
			// Collector
			isCollector: 'bool',
			collectSpeed: 'int32',
			isVeinCollector: 'bool',
		},
		BeltDesc: {
			[TYPE]: 'object',
			beltPrototype: 'int32',
			speed: 'int32',
		},
		MinerDesc: {
			[TYPE]: 'object',
			minerType: 'MinerType',
			periodf: 'float',
		},
		AssemblerDesc: {
			[TYPE]: 'object',
			recipeType: 'RecipeType',
			speedf: 'float',
		},
		LabDesc: {
			[TYPE]: 'object',
			assembleSpeed: 'float',
			researchSpeed: 'float',
		},
		SpraycoaterDesc: {
			[TYPE]: 'object',
			incCapacity: 'int32',
			incItemId: { [TYPE]: 'array', shape: 'int32' },
		},
		StorageDesc: {
			[TYPE]: 'object',
			colCount: 'int32',
			rowCount: 'int32',
		},
		TankDesc: {
			[TYPE]: 'object',
			fluidStorageCount: 'int32',
		},
		InserterDesc: {
			[TYPE]: 'object',
			grade: 'int32',
			sttf: 'float',
			delayf: 'float',
			canStack: 'bool',
			stackSize: 'int32',
		},
		FieldGeneratorDesc: {
			[TYPE]: 'object',
			energyCapacity: 'int64',
			energyRequire0: 'int64',
			energyRequire1: 'int64',
		},
		BeaconDesc: {
			[TYPE]: 'object',
			signalRadius: 'float',
			ROF: 'int32',
			spaceSignalRange: 'float',
			pitchUpMax: 'float',
			pitchDownMax: 'float',
		},
		AmmoDesc: {
			[TYPE]: 'object',
			blastRadius0: 'float',
			blastRadius1: 'float',
			blastFallof: 'float',
			moveAcc: 'float',
			turnAcc: 'float',
			hitIndex: 'int32',
			parameter0: 'int32',
		},
		DispenserDesc: {
			[TYPE]: 'object',
			maxCourierCount: 'int32',
			maxEnergyAcc: 'int64',
		},
		EjectorDesc: {
			[TYPE]: 'object',
			pivotY: 'float',
			muzzleY: 'float',
			chargeFrame: 'int32',
			coldFrame: 'int32',
			bulletProtoId: 'int32',
		},
		SiloDesc: {
			[TYPE]: 'object',
			chargeFrame: 'int32',
			coldFrame: 'int32',
			bulletProtoId: 'int32',
		},
		AnimDesc: {
			[TYPE]: 'object',
			prepare_length: 'float',
			working_length: 'float',
		},
		MinimapConfig: {
			[TYPE]: 'object',
			type: 'int32',
		},
		AudioDesc: {
			[TYPE]: 'object',
			audio0: 'string',
			audio1: 'string',
			audio2: 'string',
			logic: 'int32',
			radius0: 'float',
			radius1: 'float',
			falloff: 'float',
			volume: 'float',
			pitch: 'float',
			doppler: 'float',
		},
		MonitorDesc: {
			[TYPE]: 'object',
			offset: 'int32',
			targetCargoBytes: 'int32',
			periodTickCount: 'int32',
			passOperator: 'int32',
			passColorId: 'int32',
			failColorId: 'int32',
			systemWarningMode: 'int32',
			monitorMode: 'int32',
			cargoFilter: 'int32',
			signalId: 'int32',
			spawnOperator: 'int32',
		},
		SpeakerDesc: {
			[TYPE]: 'object',
			tone: 'int32',
			volume: 'int32',
			pitch: 'int32',
			length: 'float',
			repeat: 'bool',
		},
		SplitterDesc: {
			[TYPE]: 'object',
		},
		PilerDesc: {
			[TYPE]: 'object',
		},
		BattleBaseDesc: {
			[TYPE]: 'object',
			maxEnergyAcc: 'int64',
			pickRange: 'float',
		},
		ConstructionModuleDesc: {
			[TYPE]: 'object',
			droneCount: 'int32',
			buildRange: 'float',
			droneEjectPos: 'vector3',
		},
		DroneDesc: {
			[TYPE]: 'object',
		},
		SlotConfig: {
			[TYPE]: 'object',
			selectCenter: 'vector3',
			selectSize: 'vector3',
			selectDistance: 'float',
			selectAlpha: 'float',
			signHeight: 'float',
			signSize: 'float',
			overrideBarWidth: 'float',
			overrideBarHeight: 'float',
			// TODO: These arrays seem to refer to Transform components by fileID/pathID, unable to track these right now, may have to deserialize deeply into nested components like Transform components which can have child transforms etc.
			slotPoses: { [TYPE]: 'array', shape: 'transform' },
			insertPoses: { [TYPE]: 'array', shape: 'transform' },
			addonAreaCol: { [TYPE]: 'array', shape: 'transform' },
			addonAreaCenter: { [TYPE]: 'array', shape: 'vector3' },
		},
		CraftDesc: {
			[TYPE]: 'object',
			roughRadius: 'float',
			colliderComplexityOverride: 'int32',
		},
		EnemyDesc: {
			[TYPE]: 'object',
			selectCircleRadius: 'float',
			roughRadius: 'float',
			colliderComplexityOverride: 'int32',
			sandCount: 'int32',
			overrideBarWidth: 'float',
			overrideBarHeight: 'float',
		},
		FractionatorDesc: {
			[TYPE]: 'object',
			recipeType: 'RecipeType',
			fluidInputMax: 'int32',
			productOutputMax: 'int32',
			fluidOutputMax: 'int32',
		},
		TurretDesc: {
			[TYPE]: 'object',
			type: 'TurretType',
			ammoType: 'AmmoType',
			vsCaps: 'uint32',
			defaultDir: 'vector3',
			ROF: 'int32',
			roundInterval: 'int32',
			muzzleInterval: 'int32',
			muzzleCount: 'uint32',
			minAttackRange: 'float',
			maxAttackRange: 'float',
			spaceAttackRange: 'float',
			pitchUpMax: 'float',
			pitchDownMax: 'float',
			damageScale: 'float',
			muzzleY: 'float',
			aimSpeed: 'float',
			uniformAngleSpeed: 'float',
			angleAcc: 'float',
			addEnemyExpBase: 'int32',
			addEnemyThreatBase: 'int32',
			addEnemyHatredBase: 'int32',
			addEnemyExpCoef: 'float',
			addEnemyThreatCoef: 'float',
			addEnemyHatredCoef: 'float',
		},
	};
	
	cachedMonoBehaviourArgType = [];
	cachedMonoBehaviourArgStream = [];
	cachedMonoBehaviourData = new Map();
	parseMonoBehaviour(type, stream) {
		if(!type in this.monoBehaviourParsers) throw new Error('Unknown MonoBehaviour type: ' + type);
		
		let a = this.cachedMonoBehaviourArgType.indexOf(type);
		let b = this.cachedMonoBehaviourArgStream.indexOf(stream);
		if(a !== -1 && b !== -1)
		{
			let cacheHit = this.cachedMonoBehaviourData.get(`${a}-${b}`);
			if(cacheHit) return cacheHit;
		}
		
		let data = parseDataFile(stream, this.monoBehaviourParsers[type]);
		
		if(a === -1) { a = this.cachedMonoBehaviourArgType.length; this.cachedMonoBehaviourArgType.push(type); }
		if(b === -1) { b = this.cachedMonoBehaviourArgStream.length; this.cachedMonoBehaviourArgStream.push(stream); }
		this.cachedMonoBehaviourData.set(`${a}-${b}`, data);
		
		return data;
	}
}


export class AssetFileInfo {
	static getSize(file) {
		const { format } = file;
		if(format >= 22) return 24;
		else if(format >= 17) return 20;
		else if(format >= 16) return 23;
		else if(format >= 15) return 25;
		else if(format == 14) return 24;
		else if(format >= 11) return 20;
		else return 20;
	}
	
	static getTypeName(classID) {
		switch (classID)
		{
			case 0: return 'Object';
			case 1: return 'GameObject';
			case 2: return 'Component'; // Old
			case 3: return 'LevelGameManager'; // Old
			case 4: return 'Transform';
			case 5: return 'TimeManager';
			case 6: return 'GlobalGameManager';
			case 8: return 'Behaviour';
			case 9: return 'GameManager';
			case 11: return 'AudioManager';
			case 13: return 'InputManager';
			case 18: return 'EditorExtension';
			case 19: return 'Physics2DSettings';
			case 20: return 'Camera';
			case 21: return 'Material';
			case 23: return 'MeshRenderer';
			case 25: return 'Renderer';
			case 27: return 'Texture';
			case 28: return 'Texture2D';
			case 29: return 'OcclusionCullingSettings';
			case 30: return 'GraphicsSettings';
			case 33: return 'MeshFilter';
			case 41: return 'OcclusionPortal';
			case 43: return 'Mesh';
			case 45: return 'Skybox';
			case 47: return 'QualitySettings';
			case 48: return 'Shader';
			case 49: return 'TextAsset';
			case 50: return 'Rigidbody2D';
			case 53: return 'Collider2D';
			case 54: return 'Rigidbody';
			case 55: return 'PhysicsManager';
			case 56: return 'Collider';
			case 57: return 'Joint';
			case 58: return 'CircleCollider2D';
			case 59: return 'HingeJoint';
			case 60: return 'PolygonCollider2D';
			case 61: return 'BoxCollider2D';
			case 62: return 'PhysicsMaterial2D';
			case 64: return 'MeshCollider';
			case 65: return 'BoxCollider';
			case 66: return 'CompositeCollider2D';
			case 68: return 'EdgeCollider2D';
			case 70: return 'CapsuleCollider2D';
			case 72: return 'ComputeShader';
			case 74: return 'AnimationClip';
			case 75: return 'ConstantForce';
			case 78: return 'TagManager';
			case 81: return 'AudioListener';
			case 82: return 'AudioSource';
			case 83: return 'AudioClip';
			case 84: return 'RenderTexture';
			case 86: return 'CustomRenderTexture';
			case 89: return 'Cubemap';
			case 90: return 'Avatar';
			case 91: return 'AnimatorController';
			case 93: return 'RuntimeAnimatorController';
			case 94: return 'ScriptMapper';
			case 95: return 'Animator';
			case 96: return 'TrailRenderer';
			case 98: return 'DelayedCallManager';
			case 102: return 'TextMesh';
			case 104: return 'RenderSettings';
			case 108: return 'Light';
			case 109: return 'CGProgram';
			case 110: return 'BaseAnimationTrack';
			case 111: return 'Animation';
			case 114: return 'MonoBehaviour';
			case 115: return 'MonoScript';
			case 116: return 'MonoManager';
			case 117: return 'Texture3D';
			case 118: return 'NewAnimationTrack';
			case 119: return 'Projector';
			case 120: return 'LineRenderer';
			case 121: return 'Flare';
			case 122: return 'Halo';
			case 123: return 'LensFlare';
			case 124: return 'FlareLayer';
			case 125: return 'HaloLayer';
			case 126: return 'NavMeshProjectSettings';
			case 127: return 'LevelGameManager';
			case 128: return 'Font';
			case 129: return 'PlayerSettings';
			case 130: return 'NamedObject';
			case 134: return 'PhysicMaterial';
			case 135: return 'SphereCollider';
			case 136: return 'CapsuleCollider';
			case 137: return 'SkinnedMeshRenderer';
			case 138: return 'FixedJoint';
			case 141: return 'BuildSettings';
			case 142: return 'AssetBundle';
			case 143: return 'CharacterController';
			case 144: return 'CharacterJoint';
			case 145: return 'SpringJoint';
			case 146: return 'WheelCollider';
			case 147: return 'ResourceManager';
			case 150: return 'PreloadData';
			case 153: return 'ConfigurableJoint';
			case 154: return 'TerrainCollider';
			case 156: return 'TerrainData';
			case 157: return 'LightmapSettings';
			case 158: return 'WebCamTexture';
			case 159: return 'EditorSettings';
			case 162: return 'EditorUserSettings';
			case 164: return 'AudioReverbFilter';
			case 165: return 'AudioHighPassFilter';
			case 166: return 'AudioChorusFilter';
			case 167: return 'AudioReverbZone';
			case 168: return 'AudioEchoFilter';
			case 169: return 'AudioLowPassFilter';
			case 170: return 'AudioDistortionFilter';
			case 171: return 'SparseTexture';
			case 180: return 'AudioBehaviour';
			case 181: return 'AudioFilter';
			case 182: return 'WindZone';
			case 183: return 'Cloth';
			case 184: return 'SubstanceArchive';
			case 185: return 'ProceduralMaterial';
			case 186: return 'ProceduralTexture';
			case 187: return 'Texture2DArray';
			case 188: return 'CubemapArray';
			case 191: return 'OffMeshLink';
			case 192: return 'OcclusionArea';
			case 193: return 'Tree';
			case 195: return 'NavMeshAgent';
			case 196: return 'NavMeshSettings';
			case 198: return 'ParticleSystem';
			case 199: return 'ParticleSystemRenderer';
			case 200: return 'ShaderVariantCollection';
			case 205: return 'LODGroup';
			case 206: return 'BlendTree';
			case 207: return 'Motion';
			case 208: return 'NavMeshObstacle';
			case 210: return 'SortingGroup';
			case 212: return 'SpriteRenderer';
			case 213: return 'Sprite';
			case 214: return 'CachedSpriteAtlas';
			case 215: return 'ReflectionProbe';
			case 218: return 'Terrain';
			case 220: return 'LightProbeGroup';
			case 221: return 'AnimatorOverrideController';
			case 222: return 'CanvasRenderer';
			case 223: return 'Canvas';
			case 224: return 'RectTransform';
			case 225: return 'CanvasGroup';
			case 226: return 'BillboardAsset';
			case 227: return 'BillboardRenderer';
			case 228: return 'SpeedTreeWindAsset';
			case 229: return 'AnchoredJoint2D';
			case 230: return 'Joint2D';
			case 231: return 'SpringJoint2D';
			case 232: return 'DistanceJoint2D';
			case 233: return 'HingeJoint2D';
			case 234: return 'SliderJoint2D';
			case 235: return 'WheelJoint2D';
			case 236: return 'ClusterInputManager';
			case 237: return 'BaseVideoTexture';
			case 238: return 'NavMeshData';
			case 240: return 'AudioMixer';
			case 241: return 'AudioMixerController';
			case 243: return 'AudioMixerGroupController';
			case 244: return 'AudioMixerEffectController';
			case 245: return 'AudioMixerSnapshotController';
			case 246: return 'PhysicsUpdateBehaviour2D';
			case 247: return 'ConstantForce2D';
			case 248: return 'Effector2D';
			case 249: return 'AreaEffector2D';
			case 250: return 'PointEffector2D';
			case 251: return 'PlatformEffector2D';
			case 252: return 'SurfaceEffector2D';
			case 253: return 'BuoyancyEffector2D';
			case 254: return 'RelativeJoint2D';
			case 255: return 'FixedJoint2D';
			case 256: return 'FrictionJoint2D';
			case 257: return 'TargetJoint2D';
			case 258: return 'LightProbes';
			case 259: return 'LightProbeProxyVolume';
			case 271: return 'SampleClip';
			case 272: return 'AudioMixerSnapshot';
			case 273: return 'AudioMixerGroup';
			case 290: return 'AssetBundleManifest';
			case 300: return 'RuntimeInitializeOnLoadManager';
			case 310: return 'UnityConnectSettings';
			case 319: return 'AvatarMask';
			case 320: return 'PlayableDirector';
			case 328: return 'VideoPlayer';
			case 329: return 'VideoClip';
			case 330: return 'ParticleSystemForceField';
			case 331: return 'SpriteMask';
			case 362: return 'WorldAnchor';
			case 363: return 'OcclusionCullingData';
			case 1001: return 'PrefabInstance';
			case 1002: return 'EditorExtensionImpl';
			case 1003: return 'AssetImporter';
			case 1004: return 'AssetDatabaseV1';
			case 1005: return 'Mesh3DSImporter';
			case 1006: return 'TextureImporter';
			case 1007: return 'ShaderImporter';
			case 1008: return 'ComputeShaderImporter';
			case 1020: return 'AudioImporter';
			case 1026: return 'HierarchyState';
			case 1028: return 'AssetMetaData';
			case 1029: return 'DefaultAsset';
			case 1030: return 'DefaultImporter';
			case 1031: return 'TextScriptImporter';
			case 1032: return 'SceneAsset';
			case 1034: return 'NativeFormatImporter';
			case 1035: return 'MonoImporter';
			case 1038: return 'LibraryAssetImporter';
			case 1040: return 'ModelImporter';
			case 1041: return 'FBXImporter';
			case 1042: return 'TrueTypeFontImporter';
			case 1045: return 'EditorBuildSettings';
			case 1048: return 'InspectorExpandedState';
			case 1049: return 'AnnotationManager';
			case 1050: return 'PluginImporter';
			case 1051: return 'EditorUserBuildSettings';
			case 1055: return 'IHVImageFormatImporter';
			case 1101: return 'AnimatorStateTransition';
			case 1102: return 'AnimatorState';
			case 1105: return 'HumanTemplate';
			case 1107: return 'AnimatorStateMachine';
			case 1108: return 'PreviewAnimationClip';
			case 1109: return 'AnimatorTransition';
			case 1110: return 'SpeedTreeImporter';
			case 1111: return 'AnimatorTransitionBase';
			case 1112: return 'SubstanceImporter';
			case 1113: return 'LightmapParameters';
			case 1120: return 'LightingDataAsset';
			case 1124: return 'SketchUpImporter';
			case 1125: return 'BuildReport';
			case 1126: return 'PackedAssets';
			case 1127: return 'VideoClipImporter';
			case 100000: return 'int';
			case 100001: return 'bool';
			case 100002: return 'float';
			case 100003: return 'MonoObject';
			case 100004: return 'Collision';
			case 100005: return 'Vector3f';
			case 100006: return 'RootMotionData';
			case 100007: return 'Collision2D';
			case 100008: return 'AudioMixerLiveUpdateFloat';
			case 100009: return 'AudioMixerLiveUpdateBool';
			case 100010: return 'Polygon2D';
			case 100011: return 'void';
			case 19719996: return 'TilemapCollider2D';
			case 41386430: return 'AssetImporterLog';
			case 73398921: return 'VFXRenderer';
			case 76251197: return 'SerializableManagedRefTestClass';
			case 156049354: return 'Grid';
			case 156483287: return 'ScenesUsingAssets';
			case 171741748: return 'ArticulationBody';
			case 181963792: return 'Preset';
			case 277625683: return 'EmptyObject';
			case 285090594: return 'IConstraint';
			case 293259124: return 'TestObjectWithSpecialLayoutOne';
			case 294290339: return 'AssemblyDefinitionReferenceImporter';
			case 334799969: return 'SiblingDerived';
			case 342846651: return 'TestObjectWithSerializedMapStringNonAlignedStruct';
			case 367388927: return 'SubDerived';
			case 369655926: return 'AssetImportInProgressProxy';
			case 382020655: return 'PluginBuildInfo';
			case 426301858: return 'EditorProjectAccess';
			case 468431735: return 'PrefabImporter';
			case 478637458: return 'TestObjectWithSerializedArray';
			case 478637459: return 'TestObjectWithSerializedAnimationCurve';
			case 483693784: return 'TilemapRenderer';
			case 488575907: return 'ScriptableCamera';
			case 612988286: return 'SpriteAtlasAsset';
			case 638013454: return 'SpriteAtlasDatabase';
			case 641289076: return 'AudioBuildInfo';
			case 644342135: return 'CachedSpriteAtlasRuntimeData';
			case 646504946: return 'RendererFake';
			case 662584278: return 'AssemblyDefinitionReferenceAsset';
			case 668709126: return 'BuiltAssetBundleInfoSet';
			case 687078895: return 'SpriteAtlas';
			case 747330370: return 'RayTracingShaderImporter';
			case 825902497: return 'RayTracingShader';
			case 850595691: return 'LightingSettings';
			case 877146078: return 'PlatformModuleSetup';
			case 890905787: return 'VersionControlSettings';
			case 895512359: return 'AimConstraint';
			case 937362698: return 'VFXManager';
			case 994735392: return 'VisualEffectSubgraph';
			case 994735403: return 'VisualEffectSubgraphOperator';
			case 994735404: return 'VisualEffectSubgraphBlock';
			case 1001480554: return 'Prefab';
			case 1027052791: return 'LocalizationImporter';
			case 1091556383: return 'Derived';
			case 1111377672: return 'PropertyModificationsTargetTestObject';
			case 1114811875: return 'ReferencesArtifactGenerator';
			case 1152215463: return 'AssemblyDefinitionAsset';
			case 1154873562: return 'SceneVisibilityState';
			case 1183024399: return 'LookAtConstraint';
			case 1210832254: return 'SpriteAtlasImporter';
			case 1223240404: return 'MultiArtifactTestImporter';
			case 1268269756: return 'GameObjectRecorder';
			case 1325145578: return 'LightingDataAssetParent';
			case 1386491679: return 'PresetManager';
			case 1392443030: return 'TestObjectWithSpecialLayoutTwo';
			case 1403656975: return 'StreamingManager';
			case 1480428607: return 'LowerResBlitTexture';
			case 1542919678: return 'StreamingController';
			case 1628831178: return 'TestObjectVectorPairStringBool';
			case 1742807556: return 'GridLayout';
			case 1766753193: return 'AssemblyDefinitionImporter';
			case 1773428102: return 'ParentConstraint';
			case 1803986026: return 'FakeComponent';
			case 1818360608: return 'PositionConstraint';
			case 1818360609: return 'RotationConstraint';
			case 1818360610: return 'ScaleConstraint';
			case 1839735485: return 'Tilemap';
			case 1896753125: return 'PackageManifest';
			case 1896753126: return 'PackageManifestImporter';
			case 1953259897: return 'TerrainLayer';
			case 1971053207: return 'SpriteShapeRenderer';
			case 1977754360: return 'NativeObjectType';
			case 1981279845: return 'TestObjectWithSerializedMapStringBool';
			case 1995898324: return 'SerializableManagedHost';
			case 2058629509: return 'VisualEffectAsset';
			case 2058629510: return 'VisualEffectImporter';
			case 2058629511: return 'VisualEffectResource';
			case 2059678085: return 'VisualEffectObject';
			case 2083052967: return 'VisualEffect';
			case 2083778819: return 'LocalizationAsset';
			case 2089858483: return 'ScriptedImporter';
		}
	}
	
	pathID;
	offsetFile;
	fileSize;
	typeID;
	serializedType;
	name;
	fileTypeName;
	body;
	
	
	constructor(file) {
		const { stream, format } = file;
		stream.align();
		let size = AssetFileInfo.getSize(file);
		let header = new BufferStreamAssets(stream.read(size), stream.isBigEndian);
		
		this.pathID = format >= 14? header.readInt64() : header.readInt32();
		this.offsetFile = format >= 22? header.readInt64() : header.readUInt32();
		this.offsetFile += file.offsetFirstFile;
		this.fileSize = header.readUInt32();
		this.typeID = header.readInt32();
		
		if(format < 16)
		{
			this.classID = header.readUInt16();
			this.serializedType = file.types.find(type => type.classID == this.classID);
		}
		
		else
		{
			let type = file.types[this.typeID];
			this.serializedType = type;
			this.classID = type.classID;
		}
		
		if(format < 11)
		{
			this.isDestroyed = header.readUInt16();
		}
		
		if(format >= 11 && format < 17)
		{
			let scriptTypeIndex = header.readInt16();
			if(this.serializedType) this.serializedType.scriptTypeIndex = scriptTypeIndex;
		}
		
		if(format === 15 || format === 16)
		{
			this.stripped = header.read(1);
		}
		
		this.fileTypeName = AssetFileInfo.getTypeName(this.classID);
		
		
		if(this.fileTypeName === 'Texture2D')
		{
			let assetRaw = stream.buf.subarray(this.offsetFile, this.offsetFile + this.fileSize);
			let assetStream = new BufferStreamData(assetRaw, false);
			this.body = parseTexture(assetStream);
			this.body.info = this;
		}
		
		this.name = this.readName(stream);
	}
	
	toJSON() {
		return {
			pathID: this.pathID,
			offsetFile: this.offsetFile,
			fileSize: this.fileSize,
			typeID: this.typeID,
			serializedType: this.serializedType,
			name: this.name,
			fileTypeName: this.fileTypeName,
		};
	}
	
	
	static hasName(type) {
		switch (type)
		{
			case 21:
			case 27:
			case 28:
			case 43:
			case 48:
			case 49:
			case 62:
			case 72:
			case 74:
			case 83:
			case 84:
			case 86:
			case 89:
			case 90:
			case 91:
			case 93:
			case 109:
			case 115:
			case 117:
			case 121:
			case 128:
			case 134:
			case 142:
			case 150:
			case 152:
			case 156:
			case 158:
			case 171:
			case 184:
			case 185:
			case 186:
			case 187:
			case 188:
			case 194:
			case 200:
			case 207:
			case 213:
			case 221:
			case 226:
			case 228:
			case 237:
			case 238:
			case 240:
			case 258:
			case 271:
			case 272:
			case 273:
			case 290:
			case 319:
			case 329:
			case 363:
			case 850595691:
			case 1480428607:
			case 687078895:
			case 825902497:
			case 2083778819:
			case 1953259897:
			case 2058629509:
				return true;
			default:
				return false;
		}
	}
	
	readName(stream) {
		let name = this.readNameField(stream);
		if(name) return name;
		return this.readNameData(stream);
	}
	
	readNameField(stream) {
		if(!AssetFileInfo.hasName(this.classID)) return undefined;
		
		let lastPos = stream.pos;
		stream.pos = this.offsetFile;
		
		let nameSize = stream.readUInt32();
		if(nameSize + 4 >= this.fileSize || nameSize >= 4092)
		{
			stream.pos = lastPos;
			return undefined;
		}
		
		let name = stream.read(nameSize);
		for(const byte of name)
			if(byte < 32) {
				stream.pos = lastPos;
				return undefined;
			}
		
		stream.pos = lastPos;
		return name.toString();
	}
	
	readNameData(stream) {
        let data = new BufferStreamData();
        data.buf = stream.buf;
        data.isBigEndian = stream.isBigEndian;
        data.pos = this.offsetFile;
		if(!isValidProtoSetHeader(data))return undefined;
		let buffer = data.readString();
		if(buffer.length >= 4092) return undefined;
		return buffer.toString();
	}
}


