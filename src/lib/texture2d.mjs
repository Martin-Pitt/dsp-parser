import { parseDataFile, TYPE } from './dat.mjs';



export function parseTexture(data) {
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