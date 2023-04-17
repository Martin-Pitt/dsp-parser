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

export const ItemTypes = new Map([
	[ 0, 'UNKNOWN'],
	[ 1, 'RESOURCE'],
	[ 2, 'MATERIAL'],
	[ 3, 'COMPONENT'],
	[ 4, 'PRODUCT'],
	[ 5, 'LOGISTICS'],
	[ 6, 'PRODUCTION'],
	[ 7, 'DECORATION'],
	[ 8, 'WEAPON'],
	[ 9, 'MATRIX'],
	[10, 'MONSTER'],
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


export const KTXHeader = {
	IDENTIFIER: Buffer.from([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A]),
	ENDIANESS_LE: Buffer.from([ 1, 2, 3, 4]),
	
	// constants for glInternalFormat
	GL_ETC1_RGB8_OES: 0x8D64,

	GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG: 0x8C00,
	GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG: 0x8C01,
	GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG: 0x8C02,
	GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG: 0x8C03,

	GL_ATC_RGB_AMD: 0x8C92,
	GL_ATC_RGBA_INTERPOLATED_ALPHA_AMD: 0x87EE,

	GL_COMPRESSED_RGB8_ETC2: 0x9274,
	GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 0x9276,
	GL_COMPRESSED_RGBA8_ETC2_EAC: 0x9278,
	GL_COMPRESSED_R11_EAC: 0x9270,
	GL_COMPRESSED_SIGNED_R11_EAC: 0x9271,
	GL_COMPRESSED_RG11_EAC: 0x9272,
	GL_COMPRESSED_SIGNED_RG11_EAC: 0x9273,

	GL_COMPRESSED_RED_RGTC1: 0x8DBB,
	GL_COMPRESSED_RG_RGTC2: 0x8DBD,
	GL_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT: 0x8E8F,
	GL_COMPRESSED_RGBA_BPTC_UNORM: 0x8E8C,

	GL_R16F: 0x822D,
	GL_RG16F: 0x822F,
	GL_RGBA16F: 0x881A,
	GL_R32F: 0x822E,
	GL_RG32F: 0x8230,
	GL_RGBA32F: 0x8814,
	internalFormats: null,
	
	// constants for glBaseInternalFormat
	GL_RED: 0x1903,
	GL_RGB: 0x1907,
	GL_RGBA: 0x1908,
	GL_RG: 0x8227,
	baseInternalFormats: null,
}

KTXHeader.internalFormats = new Map([
	['RHalf', KTXHeader.GL_R16F],
	['RGHalf', KTXHeader.GL_RG16F],
	['RGBAHalf', KTXHeader.GL_RGBA16F],
	['RFloat', KTXHeader.GL_R32F],
	['RGFloat', KTXHeader.GL_RG32F],
	['RGBAFloat', KTXHeader.GL_RGBA32F],
	['BC4', KTXHeader.GL_COMPRESSED_RED_RGTC1],
	['BC5', KTXHeader.GL_COMPRESSED_RG_RGTC2],
	['BC6H', KTXHeader.GL_COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT],
	['BC7', KTXHeader.GL_COMPRESSED_RGBA_BPTC_UNORM],
	['PVRTC_RGB2', KTXHeader.GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG],
	['PVRTC_RGBA2', KTXHeader.GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG],
	['PVRTC_RGB4', KTXHeader.GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG],
	['PVRTC_RGBA4', KTXHeader.GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG],
	['ETC_RGB4Crunched', KTXHeader.GL_ETC1_RGB8_OES],
	['ETC_RGB4_3DS', KTXHeader.GL_ETC1_RGB8_OES],
	['ETC_RGB4', KTXHeader.GL_ETC1_RGB8_OES],
	['ATC_RGB4', KTXHeader.GL_ATC_RGB_AMD],
	['ATC_RGBA8', KTXHeader.GL_ATC_RGBA_INTERPOLATED_ALPHA_AMD],
	['EAC_R', KTXHeader.GL_COMPRESSED_R11_EAC],
	['EAC_R_SIGNED', KTXHeader.GL_COMPRESSED_SIGNED_R11_EAC],
	['EAC_RG', KTXHeader.GL_COMPRESSED_RG11_EAC],
	['EAC_RG_SIGNED', KTXHeader.GL_COMPRESSED_SIGNED_RG11_EAC],
	['ETC2_RGB', KTXHeader.GL_COMPRESSED_RGB8_ETC2],
	['ETC2_RGBA1', KTXHeader.GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2],
	['ETC2_RGBA8Crunched', KTXHeader.GL_COMPRESSED_RGBA8_ETC2_EAC],
	['ETC_RGBA8_3DS', KTXHeader.GL_COMPRESSED_RGBA8_ETC2_EAC],
	['ETC2_RGBA8', KTXHeader.GL_COMPRESSED_RGBA8_ETC2_EAC],
]);

KTXHeader.baseInternalFormats = new Map([
	['RHalf', KTXHeader.GL_RED],
	['RGHalf', KTXHeader.GL_RG],
	['RGBAHalf', KTXHeader.GL_RGBA],
	['RFloat', KTXHeader.GL_RED],
	['RGFloat', KTXHeader.GL_RG],
	['RGBAFloat', KTXHeader.GL_RGBA],
	['BC4', KTXHeader.GL_RED],
	['BC5', KTXHeader.GL_RG],
	['BC6H', KTXHeader.GL_RGB],
	['BC7', KTXHeader.GL_RGBA],
	['PVRTC_RGB2', KTXHeader.GL_RGB],
	['PVRTC_RGBA2', KTXHeader.GL_RGBA],
	['PVRTC_RGB4', KTXHeader.GL_RGB],
	['PVRTC_RGBA4', KTXHeader.GL_RGBA],
	['ETC_RGB4Crunched', KTXHeader.GL_RGB],
	['ETC_RGB4_3DS', KTXHeader.GL_RGB],
	['ETC_RGB4', KTXHeader.GL_RGB],
	['ATC_RGB4', KTXHeader.GL_RGB],
	['ATC_RGBA8', KTXHeader.GL_RGBA],
	['EAC_R', KTXHeader.GL_RED],
	['EAC_R_SIGNED', KTXHeader.GL_RED],
	['EAC_RG', KTXHeader.GL_RG],
	['EAC_RG_SIGNED', KTXHeader.GL_RG],
	['ETC2_RGB',  KTXHeader.GL_RGB],
	['ETC2_RGBA1',  KTXHeader.GL_RGBA],
	['ETC2_RGBA8Crunched', KTXHeader.GL_RGBA],
	['ETC_RGBA8_3DS', KTXHeader.GL_RGBA],
	['ETC2_RGBA8', KTXHeader.GL_RGBA],
]);