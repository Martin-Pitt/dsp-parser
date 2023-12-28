export const ItemType = new Map([
	[ 0, 'UNKNOWN'],
	[ 1, 'RESOURCE'],
	[ 2, 'MATERIAL'],
	[ 3, 'COMPONENT'],
	[ 4, 'PRODUCT'],
	[ 5, 'LOGISTICS'],
	[ 6, 'PRODUCTION'],
	[ 7, 'DECORATION'],
	[ 8, 'TURRET'],
	[ 9, 'DEFENSE'],
	[10, 'DARKFOG'],
	[11, 'MATRIX'],
]);

export const AmmoType = new Map([
	[0, 'NONE'],
	[1, 'BULLET'],
	[2, 'LASER'],
	[3, 'CANNON'],
	[4, 'PLASMA'],
	[5, 'MISSILE'],
]);

export const RecipeType = new Map([
	[ 0, 'NONE'],
	[ 1, 'SMELT'],
	[ 2, 'CHEMICAL'],
	[ 3, 'REFINE'],
	[ 4, 'ASSEMBLE'],
	[ 5, 'PARTICLE'],
	[ 6, 'EXCHANGE'],
	[ 7, 'PHOTON_STORE'],
	[ 8, 'FRACTIONATE'],
	[15, 'RESEARCH'],
]);

export const ObjectType = new Map([
	[0, 'ENTITY'],
	[1, 'VEGETABLE'],
	[2, 'VEIN'],
	[3, 'PREBUILD'],
	[4, 'ENEMY'],
	[5, 'RUIN'],
	[6, 'CRAFT'],
]);

export const RuinType = new Map([
	[0, 'NONE'],
	[1, 'HIDDEN'],
	[2, 'NORMAL'],
])

export const TextureFormat = new Map([
	[ 1, 'Alpha8'],
	[ 2, 'ARGB4444'],
	[ 3, 'RGB24'],
	[ 4, 'RGBA32'],
	[ 5, 'ARGB32'],
	[ 6, 'ARGBFloat'],
	[ 7, 'RGB565'],
	[ 8, 'BGR24'],
	[ 9, 'R16'],
	[10, 'DXT1'],
	[11, 'DXT3'],
	[12, 'DXT5'],
	[13, 'RGBA4444'],
	[14, 'BGRA32'],
	[15, 'RHalf'],
	[16, 'RGHalf'],
	[17, 'RGBAHalf'],
	[18, 'RFloat'],
	[19, 'RGFloat'],
	[20, 'RGBAFloat'],
	[21, 'YUY2'],
	[22, 'RGB9e5Float'],
	[23, 'RGBFloat'],
	[24, 'BC6H'],
	[25, 'BC7'],
	[26, 'BC4'],
	[27, 'BC5'],
	[28, 'DXT1Crunched'],
	[29, 'DXT5Crunched'],
	[30, 'PVRTC_RGB2'],
	[31, 'PVRTC_RGBA2'],
	[32, 'PVRTC_RGB4'],
	[33, 'PVRTC_RGBA4'],
	[34, 'ETC_RGB4'],
	[35, 'ATC_RGB4'],
	[36, 'ATC_RGBA8'],
	[41, 'EAC_R'],
	[42, 'EAC_R_SIGNED'],
	[43, 'EAC_RG'],
	[44, 'EAC_RG_SIGNED'],
	[45, 'ETC2_RGB'],
	[46, 'ETC2_RGBA1'],
	[47, 'ETC2_RGBA8'],
	[48, 'ASTC_RGB_4x4'],
	[49, 'ASTC_RGB_5x5'],
	[50, 'ASTC_RGB_6x6'],
	[51, 'ASTC_RGB_8x8'],
	[52, 'ASTC_RGB_10x10'],
	[53, 'ASTC_RGB_12x12'],
	[54, 'ASTC_RGBA_4x4'],
	[55, 'ASTC_RGBA_5x5'],
	[56, 'ASTC_RGBA_6x6'],
	[57, 'ASTC_RGBA_8x8'],
	[58, 'ASTC_RGBA_10x10'],
	[59, 'ASTC_RGBA_12x12'],
	[60, 'ETC_RGB4_3DS'],
	[61, 'ETC_RGBA8_3DS'],
	[62, 'RG16'],
	[63, 'R8'],
	[64, 'ETC_RGB4Crunched'],
	[65, 'ETC2_RGBA8Crunched'],
	[66, 'ASTC_HDR_4x4'],
	[67, 'ASTC_HDR_5x5'],
	[68, 'ASTC_HDR_6x6'],
	[69, 'ASTC_HDR_8x8'],
	[70, 'ASTC_HDR_10x10'],
	[71, 'ASTC_HDR_12x12'],
	[72, 'RG32'],
	[73, 'RGB48'],
	[74, 'RGBA64']
]);

export const AddonType = new Map([
	[0, 'NONE'],
	[1, 'BELT'],
	[2, 'STORAGE'],
]);

export const MinerType = new Map([
	[0, 'NONE'],
	[1, 'WATER'],
	[2, 'VEIN'],
	[3, 'OIL'],
]);

// .dat parser
export const TYPE = Symbol();
export function parseDataFile(data, shape) {
	function parseTyping(shape, root) {
		if(typeof shape === 'function') return shape.call(root, data, root);
		
		else if(typeof shape === 'string' || shape[TYPE] !== 'object')
		{
			switch(shape[TYPE] || shape)
			{
				case 'string': return data.readString(typeof shape !== 'string'? shape.align : undefined).toString();
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
				case 'bool': return data.readBool(typeof shape !== 'string'? shape.width : undefined);
				case 'byte': return data.read(shape.size);
				case 'array': return data.readArray(() => parseTyping(shape.shape));
				case 'fixedarray':
					let iter = shape.size, array = [];
					while(iter --> 0) array.push(parseTyping(shape.shape));
					return array;
				case 'bytearray': return data.readByteArray();
                case 'vector2': return [data.readFloat(), data.readFloat()];
                case 'vector3': return [data.readFloat(), data.readFloat(), data.readFloat()];
				case 'ItemType': return ItemType.get(data.readInt32());
				case 'AmmoType': return AmmoType.get(data.readInt32());
				case 'RecipeType': return RecipeType.get(data.readInt32());
				case 'ObjectType': return ObjectType.get(data.readInt32());
				case 'RuinType': return RuinType.get(data.readInt32());
				case 'TextureFormat': return TextureFormat.get(data.readUInt32());
				case 'AddonType': return AddonType.get(data.readUInt32());
				case 'MinerType': return MinerType.get(data.readUInt32());
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