import { BufferStreamAssets, BufferStreamData, isValidProtoSetHeader } from './buffer.mjs';
import { RuntimePlatform, ItemType, AmmoType, RecipeType, TextureFormat, KTXHeader } from './constants.mjs';



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
		let assetStream = this.getAssetStream(name);
		if(!isValidProtoSetHeader(assetStream)) throw 'ProtoSet header bits not as expected!';
		return assetStream;
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
			case 0x01: return 'GameObject';
			case 0x04: return 'Transform';
			case 0x14: return 'Camera';
			case 0x15: return 'Material';
			case 0x17: return 'MeshRenderer';
			case 0x1C: return 'Texture2D';
			case 0x21: return 'MeshFilter';
			case 0x30: return 'Shader';
			case 0x31: return 'Text';
			case 0x41: return 'BoxCollider';
			case 0x53: return 'Audio';
			case 0x68: return 'RenderSettings';
			case 0x6C: return 'Light';
			case 0x7C: return 'Behaviour';
			case 0x7F: return 'LevelGameManager';
			case 0x87: return 'SphereCollider';
			case 0x93: return 'ResourceManager file table';
			case 0x96: return 'PreloadData';
			case 0x9D: return 'LightmapSettings';
			case 0xD4: return 'SpriteRenderer';
			case 0xD5: return 'Sprite';
			case 0x122: return 'AssetBundleManifest';
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
			let assetRaw = Buffer.from(stream.buf.subarray(this.offsetFile, this.offsetFile + this.fileSize));
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




// .dat parser helper
export const TYPE = Symbol();
export function parseDataFile(data, shape) {
	function parseTyping(shape, root) {
		if(typeof shape === 'function') return shape.call(root, data, root);
		
		else if(typeof shape === 'string' || shape[TYPE] !== 'object')
		{
			switch(shape[TYPE] || shape)
			{
				case 'string': return data.readString().toString();
				case 'int8': return data.readInt8();
				case 'int16': return data.readInt16();
				case 'int32': return data.readInt32();
				case 'int64': return data.readInt64();
				case 'uint8': return data.readUInt8();
				case 'uint16': return data.readUInt16();
				case 'uint32': return data.readUInt32();
				case 'uint64': return data.readUInt64();
				case 'float': return data.readFloat();
				case 'double': return data.readDouble();
				case 'bool': return data.readBool();
				case 'byte': return data.read(shape.size);
				case 'array': return data.readArray(() => parseTyping(shape.shape));
				case 'fixedarray':
					let iter = shape.size, array = [];
					while(iter --> 0) array.push(parseTyping(shape.shape));
					return array;
				case 'bytearray': return data.readByteArray();
                case 'vector2': return [data.readFloat(), data.readFloat()];
				case 'ItemType': return ItemType.get(data.readInt32());
				case 'AmmoType': return AmmoType.get(data.readInt32());
				case 'RecipeType': return RecipeType.get(data.readInt32());
				case 'TextureFormat': return TextureFormat.get(data.readUInt32());
				default: throw new Error(`Unknown shape ${JSON.stringify(shape)}`);
			}
		}
		
		else if(shape[TYPE] === 'object')
		{
			let obj = {};
			for(let key in shape)
			{
				if(key.startsWith('_align')) data.align();
				else obj[key] = parseTyping(shape[key], root || obj);
			}
			return obj;
		}
		
		else throw new Error(`Unknown shape: '${JSON.stringify(shape)}'`);
	}
	
	return parseTyping(shape);
}


// ProtoSet helper
export function parseProtoSet(protoSetData) {
	const lastPos = protoSetData.pos;
	const filename = protoSetData.readString().toString();
	protoSetData.pos = lastPos;
	
	// console.log(filename);
	
	if(filename === 'ItemProtoSet')
	{
		let parsed = parseDataFile(protoSetData, {
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
					produce: 'bool',
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
		
		// console.log(parsed.data);
		
		return parsed;
	}
	
	else if(filename === 'RecipeProtoSet')
	{
		let parsed = parseDataFile(protoSetData, {
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
		
		// console.log(parsed.data);
		
		return parsed;
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
	
	else
	{
		throw new Error(`ProtoSet parsing for '${filename}' not implemented yet`);
	}
}


// Texture2D helper
export function parseTexture(data) {
	/*
	const file = parseDataFile(data, {
		[TYPE]: 'object',
		name: 'string',
		unknown1: 'uint32',
		unknown2: 'uint32',
		width: 'uint32',
		height: 'uint32',
		completeImageSize: 'int32',
		textureFormat: 'TextureFormat',
		
		isReadable: 'bool',
		imageCount: 'int32',
		
		unknown3: 'int32',
		unknown4: 'int32',
		
		textureDimension: 'int32',
		textureSettings: {
			[TYPE]: 'object',
			filterMode: 'int32', // Point, Bilinear, Trilinear
			aniso: 'int32',
			mipBias: 'float',
			wrapMode: 'int32', // Repeat, Clamp
		},
		lightmapFormat: 'int32', // NonDirectional, CombinedDirectional, SeparateDirectional
		colorSpace: 'int32', // Gamma, Linear
		unknown3: 'uint32',
		unknown4: 'uint32',
		unknown5: 'uint32',
		unknown6: 'uint32',
		imageData: 'bytearray',
		streamData: {
			[TYPE]: 'object',
			offset: 'uint32',
			size: 'uint32',
			path: 'string',
		},
		
		/*
		mipCount: 'int32',
		mipMap: 'bool',
		readAllowed: 'bool',
		name: 'string',
		width: 'uint32',
		height: 'uint32',
		completeImageSize: 'int32', // after 2020.1 should be read as uint32
		textureFormat: 'TextureFormat',
		isReadable: 'bool',
		imageCount: 'int32',
		textureDimension: 'int32',
		textureSettings: {
			[TYPE]: 'object',
			filterMode: 'int32', // Point, Bilinear, Trilinear
			aniso: 'int32',
			mipBias: 'float',
			wrapMode: 'int32', // Repeat, Clamp
		},
		lightmapFormat: 'int32', // NonDirectional, CombinedDirectional, SeparateDirectional
		colorSpace: 'int32', // Gamma, Linear
		
		unknown1: 'uint32',
		unknown2: 'uint32',
		unknown3: 'uint32',
		unknown4: 'uint32',
		// [01 00 00 00] [00 00 00 00] [06 00 00 00] [01 00 00 00]
		
		unknown5: 'uint32',
		// [48 85 00 00 ]
		imageData: (data, root) => {
			switch(root.textureFormat)
			{
				case 'RGBA32': return data.read(root.width * root.height * 4);
				case 'DXT5':
					let decompressed = dxt.decompress(data.buf.buffer, root.width, root.height, dxt.flags.DXT5);
					return Buffer.from(decompressed);
				default: throw new Error(`Not implemented texture parsing for ${root.textureFormat}`);
			}
		},
		// imageData: 'bytearray',
		// imageData: (data, root) => data.read(root.unknown5),
		// imageData: (data, root) => data.read(root.completeImageSize),
		
		// streamData: {
		// 	[TYPE]: 'object',
		// 	offset: 'uint64',
		// 	size: 'uint32',
		// 	path: 'string',
		// },
		// textureWrap: {
		// 	[TYPE]: 'object',
		// 	u: 'int32',
		// 	v: 'int32',
		// 	w: 'int32',
		// },
		// forcedFallbackFormat: 'int32',
		// downscaleFallback: 'bool',
		// streamingMipmaps: 'bool',
		// streamingMipmapsPriority: 'int32',
		// ignoreMasterTextureLimit: 'bool',
		// isPreProcessed: 'bool',
		// mipsStripped: 'int32',
		// isAlphaChannelOptional: 'bool',
		// platformBlob: 'bytearray',
		* /
	});*/
	
	/*if(!file.imageData.length && file.streamData.size && file.streamData.path)
	{
		let fd = openSync(file.streamData.path, 'r');
		let buffer = Buffer.alloc(file.streamData.size);
		readSync(fd, buffer, 0, file.streamData.size, file.streamData.offset);
		file.imageData = buffer;
	}*/
	
	// console.log('parseTexture');
	
	let file = parseDataFile(data, {
		[TYPE]: 'object',
		name: 'string',
		forcedFallbackFormat: 'int32',
		downscaleFallback: 'bool',
		// isAlphaChannelOptional: 'bool', // ≥2020.2
		_align1: null, // <align>
		width: 'int32',
		height: 'int32',
		completeImageSize: 'int32',
		// mipsStripped: 'int32', // ≥2020.1
		textureFormat: 'TextureFormat',
		// mipMap: 'bool', // <5.2
		mipCount: 'int32', // ≥5.2
		isReadable: 'bool', // ≥2.6.0
		// isPreProcessed: 'bool', // ≥2020.1
		// ignoreMasterTextureLimit: 'bool', // ≥2019.3
		// readAllowed: 'bool', // ≥3.0.0, ≤5.4
		// streamingMipmaps: 'bool', // ≥2018.2
		streamingMipmaps: (data, root) => {
			let hasStreamingMipmaps = data.readBool();
			if(hasStreamingMipmaps) throw new Error(`Found texture '${root.name}' with streaming mipmaps enabled`);
			return hasStreamingMipmaps;
		},
		_align2: null,// <align>
		// streamingMipmapsPriority: 'int32', // ≥2018.2 // Is this dependant on the bool above or is the version wrong?
		imageCount: 'int32',
		textureDimension: 'int32',
		textureSettings: {
			[TYPE]: 'object',
			filterMode: 'int32', // Point, Bilinear, Trilinear
			anisotropy: 'int32',
			mipBias: 'float',
			// wrapMode: 'int32', // <2017.x
			textureWrap: { // ≥2017.x
				[TYPE]: 'object',
				u: 'int32',
				v: 'int32',
				w: 'int32',
			},
		},
		lightmapFormat: 'int32', // ≥3.0  // NonDirectional, CombinedDirectional, SeparateDirectional
		colorSpace: 'int32', // ≥3.5.0  // Gamma, Linear
		// platformBlob: 'bytearray', // ≥2020.2
		// _align3: null,
		imageDataSize: 'int32',
	});
	
	if(!file.imageDataSize) // ≥5.3.0
	{
		file.streamData = parseDataFile(data, {
			[TYPE]: 'object',
			offset: 'uint32', // <2020.1
			// offset: 'int64', // ≥2020.1
			size: 'uint32',
			path: 'string',
		});
	}
	
	else
	{
		file.imageData = data.read(file.imageDataSize);
	}
	
	return file;
}







export function wrapWithContainer(texture) {
	switch(texture.textureFormat)
	{
		case 'Alpha8':
		case 'ARGB4444':
		case 'RGB24':
		case 'RGBA32':
		case 'ARGB32':
		case 'RGB565':
		case 'R16':
		case 'DXT1':
		case 'DXT5':
		case 'RGBA4444':
		case 'BGRA32':
		case 'RG16':
		case 'R8':
			return wrapWithDDS(texture);
		// case 'YUY2':
		// case 'PVRTC_RGB2':
		// case 'PVRTC_RGBA2':
		// case 'PVRTC_RGB4':
		// case 'PVRTC_RGBA4':
		// case 'ETC_RGB4':
		// case 'ETC2_RGB':
		// case 'ETC2_RGBA1':
		// case 'ETC2_RGBA8':
		// case 'ASTC_RGB_4x4':
		// case 'ASTC_RGB_5x5':
		// case 'ASTC_RGB_6x6':
		// case 'ASTC_RGB_8x8':
		// case 'ASTC_RGB_10x10':
		// case 'ASTC_RGB_12x12':
		// case 'ASTC_RGBA_4x4':
		// case 'ASTC_RGBA_5x5':
		// case 'ASTC_RGBA_6x6':
		// case 'ASTC_RGBA_8x8':
		// case 'ASTC_RGBA_10x10':
		// case 'ASTC_RGBA_12x12':
		// case 'ETC_RGB4_3DS':
		// case 'ETC_RGBA8_3DS':
		// 	return wrapWithPVR(texture);
		case 'RHalf':
		case 'RGHalf':
		case 'RGBAHalf':
		case 'RFloat':
		case 'RGFloat':
		case 'RGBAFloat':
		case 'BC4':
		case 'BC5':
		case 'BC6H':
		case 'BC7':
		case 'ATC_RGB4':
		case 'ATC_RGBA8':
		case 'EAC_R':
		case 'EAC_R_SIGNED':
		case 'EAC_RG':
		case 'EAC_RG_SIGNED':
			return wrapWithKTX(texture);
		default:
			throw new Error(`Unhandled texture format for container wrapping: '${texture.textureFormat}'`);
	}
}





export function wrapWithDDS(texture) {
	// Prep
	let buffer = Buffer.alloc(texture.imageDataSize + 128);
	let magic = Buffer.from([0x44, 0x44, 0x53, 0x20, 0x7c]);
	let flags = 0x1 + 0x2 + 0x4 + 0x1000;
	let pitchOrLinearSize = 0;
	let mipMapCount = 0x1;
	let size = 0x20;
	let flags2 = 0;
	let fourCC = 0;
	let RGBBitCount;
	let RBitMask;
	let GBitMask;
	let BBitMask;
	let ABitMask;
	let caps = 0x1000;
	let caps2 = 0x0;
	
	// Conditional logic
	
	/*if(version <5.2)
	{
		if(texture.mipMap)
		{
			flags += 0x20000;
			mipMapCount = Math.log(Math.max(texture.width, texture.height)) / Math.log(2);
			caps += 0x400008;
		}
	}
	else*/
	{
		flags += 0x20000;
		mipMapCount = texture.mipCount;
		caps += 0x400008;
	}
	
	
	if(texture.textureFormat === 'DXT1')
	{
		if(texture.mipCount) pitchOrLinearSize = texture.height * texture.width / 2;
		flags2 = 0x4;
		fourCC = 0x31545844;
		RGBBitCount = 0x0;
		RBitMask = 0x0;
		GBitMask = 0x0;
		BBitMask = 0x0;
		ABitMask = 0x0;
	}
	
	else if(texture.textureFormat === 'DXT5')
	{
		if(texture.mipCount) pitchOrLinearSize = texture.height * texture.width / 2;
		flags2 = 0x4;
		fourCC = 0x35545844;
		RGBBitCount = 0x0;
		RBitMask = 0x0;
		GBitMask = 0x0;
		BBitMask = 0x0;
		ABitMask = 0x0;
	}
	
	else
	{
		throw new Error(`Unhandled texture format: ${texture.textureFormat}`);
	}
	
	
	// Write to buffer
	magic.copy(buffer);
	buffer.writeInt32LE(flags, 8);
	buffer.writeInt32LE(texture.height, 12);
	buffer.writeInt32LE(texture.width, 16);
	buffer.writeInt32LE(pitchOrLinearSize, 20);
	buffer.writeInt32LE(mipMapCount, 28);
	buffer.writeInt32LE(size, 76);
	buffer.writeInt32LE(flags2, 80);
	buffer.writeInt32LE(fourCC, 84);
	buffer.writeInt32LE(RGBBitCount, 88);
	buffer.writeInt32LE(RBitMask, 92);
	buffer.writeInt32LE(BBitMask, 96);
	buffer.writeInt32LE(GBitMask, 100);
	buffer.writeInt32LE(ABitMask, 104);
	buffer.writeInt32LE(caps, 108);
	buffer.writeInt32LE(caps2, 112);
	texture.imageData.copy(buffer, 128);
	
	return {
		type: 'DDS',
		data: buffer,
		toJSON() {
			return {
				type: this.type,
				data: this.data.toJSON(),
			};
		}
	};
}

export function wrapWithPVR(texture) {
	
}

export function wrapWithKTX(texture) {
	let buffer = Buffer.alloc(
		texture.imageDataSize +
		KTXHeader.IDENTIFIER.length +
		KTXHeader.ENDIANESS_LE.length +
		13 * 4
	);
	
	let glType = 0;
	let glTypeSize = 1;
	let glFormat = 0;
	let glInternalFormat = KTXHeader.internalFormats.get(texture.textureFormat);
	let glBaseInternalFormat = KTXHeader.baseInternalFormats.get(texture.textureFormat);
	let pixelDepth = 0;
	let numberOfArrayElements = 0;
	let numberOfFaces = 1;
	let numberOfMipmapLevels = 1;
	let bytesOfKeyValueData = 0;
	
	let pos = 0;
	KTXHeader.IDENTIFIER.copy(buffer); pos += KTXHeader.IDENTIFIER.length;
	KTXHeader.ENDIANESS_LE.copy(buffer, pos); pos += KTXHeader.ENDIANESS_LE.length;
	buffer.writeInt32LE(glType, pos); pos += 4;
	buffer.writeInt32LE(glTypeSize, pos); pos += 4;
	buffer.writeInt32LE(glFormat, pos); pos += 4;
	buffer.writeInt32LE(glInternalFormat, pos); pos += 4;
	buffer.writeInt32LE(glBaseInternalFormat, pos); pos += 4;
	buffer.writeInt32LE(texture.width, pos); pos += 4;
	buffer.writeInt32LE(texture.height, pos); pos += 4;
	buffer.writeInt32LE(pixelDepth, pos); pos += 4;
	buffer.writeInt32LE(numberOfArrayElements, pos); pos += 4;
	buffer.writeInt32LE(numberOfFaces, pos); pos += 4;
	buffer.writeInt32LE(numberOfMipmapLevels, pos); pos += 4;
	buffer.writeInt32LE(bytesOfKeyValueData, pos); pos += 4;
	buffer.writeInt32LE(texture.imageDataSize, pos); pos += 4;
	texture.imageData.copy(buffer, pos);
	
	return {
		type: 'KTX',
		data: buffer,
		toJSON() {
			return {
				type: this.type,
				data: this.data.toJSON(),
			};
		}
	};
}



// Helpers for replacing/reviving JSONs that may use BigInts
export function JSONReplacer(key, value) {
	if(typeof value === 'bigint')
		return { type: 'BigInt', value: value.toString() };
	if(value instanceof Map)
		return { type: 'Map', value: Array.from(value.entries()) };
	
	else return value;
}

export function JSONReviver(key, value) {
	if(typeof value === 'object' && typeof value.type === 'string' && value.value)
	{
		if(value.type === 'BigInt')
			return BigInt(value.value);
		if(value.type === 'Map')
			return new Map(value.value);
		else
			return  value;
	}
	else
		return value;
}