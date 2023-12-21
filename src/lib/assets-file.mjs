import { BufferStreamAssets, BufferStreamData, isValidProtoSetHeader } from './buffer.mjs';
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


