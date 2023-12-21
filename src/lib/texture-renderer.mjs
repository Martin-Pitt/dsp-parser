import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import puppeteer from 'puppeteer';



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



export class TextureRenderer {
	dsp;
	parser;
	
	constructor(dsp, parser) {
		this.dsp = dsp;
		this.parser = parser;
	}
	
	
	async loadTextureImageData(textures) {
		// Load streaming data
		let streamed = textures // textures
		.filter(texture => texture.streamData && texture.streamData.size && texture.streamData.path)
		.reduce((map, texture) => {
			if(!map[texture.streamData.path]) map[texture.streamData.path] = [];
			map[texture.streamData.path].push(texture);
			return map;
		}, {});
		
		for(let path in streamed)
		{
			let fileHandle = await open(join(this.dsp.gameDirectory, 'DSPGAME_Data', path), 'r');
			let queue = streamed[path];
			for(let texture of queue)
			{
				let buffer = Buffer.alloc(texture.streamData.size);
				await fileHandle.read(buffer, 0, texture.streamData.size, texture.streamData.offset);
				texture.imageDataSize = texture.streamData.size;
				texture.imageData = buffer;
				delete texture.streamData;
			}
			await fileHandle.close();
		}
	}
	
	async render(textures, saveCallback) {
		await this.loadTextureImageData(textures);
		
		const named = new Map(); // Resolve naming conflicts
		const saveFile = async (texture, buffer) => {
			if(saveCallback) return saveCallback(texture, buffer);
			
			// let path;
			// if(texture.width === 80 && texture.height === 80)
			// 	path = `icons/${nameIcon(texture.name)}.png`;
			// else
			// 	path = `textures/${nameTexture(texture.name)}.png`;
			// console.log(`${path} [${texture.textureFormat}]`);
			
			const { name, width, height } = texture;
			
			let count = named.get(name);
			if(!count) named.set(name, 1);
			else named.set(name, count += 1);
			
			const path = join(this.exportDirectory, `${name}${count? `.${count}` : ''}.avif`);
			await sharp(buffer, { raw: { width, height, channels: 4 } }).avif().toFile(path);
			// await writeFile(path, await buffer.png().toBuffer());
		};
		
		
		// Decode and save textures
		let decodingQueue = [];
		let unhandled = {};
		for(let texture of textures)
		{
			if(/DXT\d|BC7/.test(texture.textureFormat))
			{
				decodingQueue.push(texture);
			}
			
			else if(/RGBA32|RGB24|Alpha8/.test(texture.textureFormat))
			{
				let { name, width, height, imageData } = texture;
				let data = Buffer.alloc(width * height * 4);
				
				if(!width || !height) continue;
				
				// Read and flip image vertically
				if(texture.textureFormat === 'RGBA32')
				{
					let stride = width * 4;
					let a = 0;
					let b = stride * (height - 1);
					let iter = height;
					while(iter --> 0)
					{
						imageData.copy(data, a, b, b + stride);
						a += stride;
						b -= stride;
					}
				}
				
				else if(texture.textureFormat === 'RGB24')
				{
					let aStride = width * 3;
					let bStride = width * 4;
					let aIter = 0;
					let bIter = bStride * (height - 1);
					let y = height;
					while(y --> 0)
					{
						let x = width;
						while(x --> 0)
						{
							data[bIter + x*4 + 0] = imageData[aIter + x*3 + 0];
							data[bIter + x*4 + 1] = imageData[aIter + x*3 + 1];
							data[bIter + x*4 + 2] = imageData[aIter + x*3 + 2];
							data[bIter + x*4 + 3] = 0xFF;
						}
						
						aIter += aStride;
						bIter -= bStride;
					}
				}
				
				else if(texture.textureFormat === 'Alpha8')
				{
					let aStride = width;
					let bStride = width * 4;
					let aIter = 0;
					let bIter = bStride * (height - 1);
					let y = height;
					while(y --> 0)
					{
						let x = width;
						while(x --> 0)
						{
							data[bIter + x*4 + 0] = 0xFF;
							data[bIter + x*4 + 1] = 0xFF;
							data[bIter + x*4 + 2] = 0xFF;
							data[bIter + x*4 + 3] = imageData[aIter + x*3 + 0];
						}
						
						aIter += aStride;
						bIter -= bStride;
					}
				}
				
				
				await saveFile(texture, data);
				
				// const image = await new Promise(resolve => {
				// 	new Jimp({ width, height, data }, (err, image) => {
				// 		if(err) throw err;
				// 		resolve(image);
				// 	});
				// });
				
				// const buffer = await image.getBufferAsync('image/png');
				// await saveFile(texture, buffer);
				
				// image.writeAsync(path).then(resolve);
			}
			
			else
			{
				if(!unhandled[texture.textureFormat]) unhandled[texture.textureFormat] = 0;
				++unhandled[texture.textureFormat];
			}
		}
		
		for(let format in unhandled) console.log('Unhandled', format);
		
		
		if(!decodingQueue.length) return;
		
		/// Puppeteer WebGL rendering for decompressing GPU textures
		console.log('Launching into Puppeteer…');
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		
		page.on('console', async (msg) => {
			const msgArgs = msg.args();
			for (let i = 0; i < msgArgs.length; ++i) {
				console.log(await msgArgs[i].jsonValue());
			}
		});
		
		await page.setContent(`<!doctype html>
			<html>
			<head>
				<script type="importmap">{
					"imports": {
						"three": "https://unpkg.com/three@0.151.3/build/three.module.js",
						"three/addons/": "https://unpkg.com/three@0.151.3/examples/jsm/"
				}}</script>
			<body>
				<script type="module">${await readFile('./renderer.js', { encoding: 'utf8' })}</script>
		`);
		// await page.waitForNetworkIdle();
		await page.waitForSelector('body.renderer-ready');
		
		console.log('Rendering textures');
		for(let texture of decodingQueue)
		{
			let container = this.wrapWithContainer(texture);
			let blob = await page.evaluate(async (container) => {
				container.data = new Uint8Array(container.data.data);
				
				// console.log('Rendering texture…');
				// let blob = await renderTexture(container);
				// let buffer = await blob.arrayBuffer();
				let data = await renderTexture(container);
				return Array.from(data);
			}, container.toJSON());
			
			await saveFile(texture, new Uint8Array(blob));
		}
		
		await page.close();
		await browser.close();
	}
	
	wrapWithContainer(texture) {
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
				return this.wrapWithDDS(texture);
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
			// 	return this.wrapWithPVR(texture);
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
				return this.wrapWithKTX(texture);
			default:
				throw new Error(`Unhandled texture format for container wrapping: '${texture.textureFormat}'`);
		}
	}
	
	
	wrapWithDDS(texture) {
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
	
	wrapWithPVR(texture) {
		
	}
	
	wrapWithKTX(texture) {
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
}
