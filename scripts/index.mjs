/*
	Parser for Unity .assets and .dat files
	
	Referenced multiple different other resources and projects
	Most notably ported, sharing code from the following references:
	- [d0sboots/dyson-sphere-program](https://github.com/d0sboots/dyson-sphere-program/) (Apache 2.0)
		how to parse the .dat file
	- [SeriousCache/UABE](https://github.com/SeriousCache/UABE) (EPL 2.0)
		great help in parsing .assets file
	- [Perfare/AssetStudio](https://github.com/Perfare/AssetStudio/) (MIT)
		great help in parsing, esp. Texture2D which was confusing in UABE
	- [snack-x/unity-parser](https://github.com/snack-x/unity-parser) (MIT)
		used this for the initial BufferStream implementation
		unity-parser then also references:
			https://github.com/marcan/deresuteme/blob/master/decode.py (Apache 2.0)
			https://github.com/RaduMC/UnityStudio (MIT)
*/

import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { renderTextures, loadTextureImageData } from './lib/textures.mjs';
import { resources, shared } from './lib/assetfiles.mjs';
import { Items, Recipes, Tech, iconPaths } from './lib/protosets.mjs';
import sharp from 'sharp';






/// Get a list of all the textures across the asset files
export const textures = [
	...resources.table.filter(asset => asset.fileTypeName === 'Texture2D'),
	...shared.table.filter(asset => asset.fileTypeName === 'Texture2D'),
]
.filter(texture => 
	!/-[aens]\d{0,2}$/.test(texture.name) &&
	!/^(planet|gg|oc\d|ic\d|ds\d|vl|ore|alien|voxel|moon|nebula|test|model|daedalus|echo|iris)-/.test(texture.name) &&
	!/^LDR_LLL|lut/.test(texture.name)
)
.map(texture => texture.body);



export async function exportAllTextures(withCommonBuckets = true) {
	if(!withCommonBuckets)
	{
		/// Simple way to export all textures
		try { await mkdir('textures'); } catch {}
		await renderTextures(textures);
	}
	
	else
	{
		/// Export all textures, bucket common resolutions together
		let CommonWxH = Array.from(
			textures.reduce((map, texture) => {
				let wxh = `${texture.width}x${texture.height}`;
				map.set(wxh, (map.get(wxh) || 0) + 1);
				return map;
			}, new Map).entries()
		).sort((a, b) => b[1] - a[1]).map(d => d[0]).slice(0, 10);
		
		try {
			await mkdir('textures', { recursive: true });
			for(let wxh of CommonWxH) await mkdir(`textures/${wxh}`, { recursive: true });
		} catch {}
		
		const named = new Map();
		await renderTextures(textures, async (texture, buffer) => {
			let { name, width, height } = texture;
			let wxh = `${width}x${height}`;
			
			if(CommonWxH.includes(wxh)) name = `${wxh}/${name}`;
			
			let count = named.get(name);
			if(!count) named.set(name, 1);
			else named.set(name, count += 1);
			if(count) name = `${name}.${count}`;
			
			const path = `textures/${name}.avif`;
			await sharp(buffer, { raw: { width, height, channels: 4 } }).avif().toFile(path);
		});
	}
}




function findIconTexture(name) {
	function formatWeight(format) {
		if(/RGBA32|RGB24|Alpha8/.test(format)) return 1;
		else if(/DXT\d|BC7/.test(format)) return 2;
		return 3;
	}
	let search = textures.filter(texture => texture.name === name);
	search.sort((a, b) => a.width - b.width);
	search.sort((a, b) => {
		let x = a.width === 80;
		let y = b.width === 80;
		
		if(x && y) return 0;
		else if(x) return -1;
		else if(y) return 1;
		return 0;
	});
	search.sort((a, b) => {
		let x = formatWeight(a.textureFormat);
		let y = formatWeight(b.textureFormat);
		return x - y;
	});
	return search[0];
}




export async function exportSpritesheets() {
	/// Create spritesheets w/ css
	let itemSpriteMap = new Map();
	let spriteItemsMap = new Map();
	function findSprites(list) {
		let sprites = [];
		for(let item of list)
		{
			let iconPath = iconPaths.get(item);
			if(!iconPath) continue;
			let name = iconPath.split('/')[2];
			let sprite = findIconTexture(name);
			if(!sprites.includes(sprite)) sprites.push(sprite);
			// item.spriteIndex = sprites.indexOf(icon);
			itemSpriteMap.set(item, sprites.indexOf(sprite));
			spriteItemsMap.set(sprite, [...(spriteItemsMap.get(sprite) || []), item]);
		}
		return sprites;
	}
	
	function getCategory(item) {
		if(Items.includes(item)) return 'item';
		if(Recipes.includes(item)) return 'recipe';
		if(Tech.includes(item)) return 'tech';
		return 'unknown';
	}
	
	
	
	// Group all the sprites together
	// let sprites = findSprites([...Items, ...Recipes, ...Tech]);
	
	// Separate out sprites so that they can be optimised best (tech icons are all white)
	let iconSprites = findSprites([...Items, ...Recipes]);
	let techSprites = findSprites([...Tech]);
	
	
	let ui = [
		'select-recipe',
		'component-icon',
		'tech-icon'
	];
	
	// If we want to add in extra metadata, e.g. link the spriteIndex per findSprites
	// try { await mkdir('dist/data', { recursive: true }); } catch {}
	// await writeFile('dist/data/items.json', JSON.stringify(Items, JSONReplacer, '\t'));
	// await writeFile('dist/data/recipes.json', JSON.stringify(Recipes, JSONReplacer, '\t'));
	// await writeFile('dist/data/tech.json', JSON.stringify(Tech, JSONReplacer, '\t'));
	
	
	// Generate image textures
	await renderTextures([...iconSprites, ...techSprites],
		async (texture, buffer) => texture.buffer = buffer
	);
	
	
	async function createSpritesheet(list, sheetSpacing = 80) {
		let rows = Math.ceil(Math.sqrt(list.length));
		
		let composables = [];
		
		for(let [iter, sprite] of list.entries())
		{
			const { width, height } = sprite;
			const top = sheetSpacing * (sprite.y = Math.floor(iter / rows));
			const left = sheetSpacing * (sprite.x = (iter % rows));
			
			if(width !== sheetSpacing || height !== sheetSpacing)
			{
				composables.push({
					top, left,
					input: await
						sharp(sprite.buffer, { raw: { width, height, channels: 4 } })
						.resize(sheetSpacing, sheetSpacing, { fit: 'inside' })
						.png()
						.toBuffer(),
				});
			}
			
			else
			{
				composables.push({
					top, left,
					input: sprite.buffer,
					raw: { width, height, channels: 4 },
				});
			}
		}
		
		return sharp({
			create: {
				width: rows * sheetSpacing,
				height: rows * sheetSpacing,
				channels: 4,
				background: { r: 255, g: 255, b: 255, alpha: 0 },
			}
		}).composite(composables);
	}
	
	async function createStylesheet() {
		let iconRows = Math.ceil(Math.sqrt(iconSprites.length));
		let techRows = Math.ceil(Math.sqrt(techSprites.length));
		
		let stylesheet = `
		@layer icons {
			[data-icon^="item"],
			[data-icon^="recipe"],
			[data-icon^="tech"] {
				width: 80px;
				aspect-ratio: 1;
			}
			[data-icon^="item"],
			[data-icon^="recipe"] {
				background: url('./icons-item-recipes.webp') top left / ${100 * iconRows}% auto no-repeat;
				background-image: -webkit-image-set(
					url('./icons-item-recipes.webp') type('image/webp'),
					url('./icons-item-recipes.avif') type('image/avif')
				);
				background-image: image-set(
					url('./icons-item-recipes.webp') type('image/webp'),
					url('./icons-item-recipes.avif') type('image/avif')
				);
			}
			[data-icon^="tech"] {
				background: url('./icons-tech.webp') top left / ${100 * techRows}% auto no-repeat;
				background-image: -webkit-image-set(
					url('./icons-tech.webp') type('image/webp'),
					url('./icons-tech.avif') type('image/avif')
				);
				background-image: image-set(
					url('./icons-tech.webp') type('image/webp'),
					url('./icons-tech.avif') type('image/avif')
				);
			}
			${iconSprites
				.flatMap(sprite => spriteItemsMap.get(sprite).map(item => {
					const { x, y } = sprite;
					const scale = 100 / (iconRows - 1);
					return (
						`[data-icon="${getCategory(item)}.${item.id}"] { ` +
							`background-position: ${x * scale}% ${y * scale}%; ` +
							`--x: ${x}; ` +
							`--y: ${y}; ` +
							`--rows: ${iconRows}; ` +
						`}`
					);
				}))
				.join('\n')
			}
			${techSprites.flatMap(sprite => spriteItemsMap.get(sprite).map(item => {
					const { x, y } = sprite;
					const scale = 100 / (techRows - 1);
					return (
						`[data-icon="${getCategory(item)}.${item.id}"] { ` +
							`background-position: ${x * scale}% ${y * scale}%; ` +
							`--x: ${x}; ` +
							`--y: ${y}; ` +
							`--rows: ${iconRows}; ` +
						`}`
					);
				}))
				.join('\n')
			}
		}`;
		
		return stylesheet;
	}
	
	async function createDemo() {
		let demo = `
			<link rel="stylesheet" href="icons.css"/>
			<style>
				html { background: black; }
				body { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); place-items: center; grid-gap: 20px; padding: 30px; }
			</style>
			${[...iconSprites, ...techSprites]
				.flatMap(sprite => spriteItemsMap.get(sprite)
				.map(item => `<div class="icon" data-icon="${getCategory(item)}.${item.id}"></div>`))
				.join('\n')
			}
		`;
		return demo;
	}
	
	
	let iconSpritesheet = await createSpritesheet(iconSprites);
	let techSpritesheet = await createSpritesheet(techSprites);
	let stylesheet = await createStylesheet();
	let demo = await createDemo();
	
	
	// Save out
	try { await mkdir('dist/spritesheets', { recursive: true }); } catch {}
	await writeFile(`dist/spritesheets/icons-item-recipes.png`, await iconSpritesheet.png().toBuffer());
	await writeFile(`dist/spritesheets/icons-item-recipes.webp`, await iconSpritesheet.webp({ quality: 90, alphaQuality: 70 }).toBuffer());
	await writeFile(`dist/spritesheets/icons-item-recipes.avif`, await iconSpritesheet.avif({ quality: 50 }).toBuffer());
	await writeFile(`dist/spritesheets/icons-tech.png`, await techSpritesheet.png().toBuffer());
	await writeFile(`dist/spritesheets/icons-tech.webp`, await techSpritesheet.webp({ quality: 90, alphaQuality: 70 }).toBuffer());
	await writeFile(`dist/spritesheets/icons-tech.avif`, await techSpritesheet.avif({ quality: 40 }).toBuffer());
	await writeFile(`dist/spritesheets/icons.css`, stylesheet);
	await writeFile(`dist/spritesheets/demo.html`, demo);
	// await writeFile('dist/spritesheets/sprites.json', JSON.stringify(itemSpriteMap, JSONReplacer, '\t'));
}




export async function exportUsedTextures() {
	/// Find out and export used textures
	const missing = [];
	const exportable = new Map();
	function checkIconForExport(item) {
		if(!item.iconPath) return;
		let name = item.iconPath.split('/')[2];
		let icon = findIconTexture(name);
		if(icon)
		{
			item.icon = `icons/${name}.png`;
			
			if(exportable.has(icon))
				exportable.set(icon, [...exportable.get(icon), item]);
			else
				exportable.set(icon, [item]);
		}
		
		else missing.push(item);
	}
	
	for(let item of Items) checkIconForExport(item);
	for(let recipe of Recipes) checkIconForExport(recipe);
	for(let tech of Tech) checkIconForExport(tech);
	
	
	const exportableTextures = Array.from(exportable.keys());
	
	
	// Confirm no duplicate names
	const named = new Set();
	for(let texture of exportableTextures)
	{
		if(named.has(texture.name)) throw new Error(`Found duplicate: ${texture.name}`);
		named.add(texture.name);
	}
	
	
	try { await mkdir('dist/icons', { recursive: true }); } catch {}
	await renderTextures(exportableTextures, async (texture, buffer) => {
		let path = `dist/icons/${texture.name}.png`;
		await writeFile(path, buffer);
	});
}




/// Simple way to export all textures
// try { await mkdir('textures'); } catch {}
// await renderTextures(textures);

/*
/// More specific exports
try { await mkdir('textures/window'); } catch {}
await renderTextures(
	textures.filter(texture => texture.name.startsWith('window')),
	async (texture, buffer) => {
		let { name, width, height } = texture;
		const path = `textures/window/${name}.png`;
		await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toFile(path);
	}
);
*/

// try { await mkdir('textures'); } catch {}
// await renderTextures([icon]);


// await exportAllTextures();
await exportSpritesheets();
// await exportUsedTextures();

console.log('Finished exporting spritesheets');



/*
import { WASI } from 'wasi';
import { argv, env } from 'node:process';


let icon = textures.find(texture => texture.name === 'factory-icon');
await loadTextureImageData([icon]);

// console.log(icon);

const nBlocks = ((icon.width + 3) >> 2) * ((icon.height + 3) >> 2);
const texMemoryPages = (nBlocks * 16 + 65535) >> 16;
const memory = new WebAssembly.Memory({ initial: texMemoryPages + 1 });

let textureView = new Uint8Array(memory.buffer, 65536, nBlocks * 16);
textureView.set(icon.imageData.slice(0, nBlocks * 16));


const wasi = new WASI({
	version: 'preview1',
	args: argv,
	env: { memory } // env,
});

const wasm = await WebAssembly.compile(
//   await readFile(new URL('./lib/basis_transcoder.wasm', import.meta.url)),
	await readFile('scripts/wasm/uastc_rgba8_srgb.wasm')
);
const instance = await WebAssembly.instantiate(wasm, wasi.getImportObject());

wasi.start(instance);


console.log(instance);
*/






/*
const BASIS_FORMAT = {
    // Compressed formats
	
    // ETC1-2
    cTFETC1_RGB: 0,							// Opaque only, returns RGB or alpha data if cDecodeFlagsTranscodeAlphaDataToOpaqueFormats flag is specified
    cTFETC2_RGBA: 1,							// Opaque+alpha, ETC2_EAC_A8 block followed by a ETC1 block, alpha channel will be opaque for opaque .basis files
	
    // BC1-5, BC7 (desktop, some mobile devices)
    cTFBC1_RGB: 2,							// Opaque only, no punchthrough alpha support yet, transcodes alpha slice if cDecodeFlagsTranscodeAlphaDataToOpaqueFormats flag is specified
    cTFBC3_RGBA: 3, 							// Opaque+alpha, BC4 followed by a BC1 block, alpha channel will be opaque for opaque .basis files
    cTFBC4_R: 4,								// Red only, alpha slice is transcoded to output if cDecodeFlagsTranscodeAlphaDataToOpaqueFormats flag is specified
    cTFBC5_RG: 5,								// XY: Two BC4 blocks, X=R and Y=Alpha, .basis file should have alpha data (if not Y will be all 255's)
    cTFBC7_RGBA: 6,							// RGB or RGBA, mode 5 for ETC1S, modes (1,2,3,5,6,7) for UASTC
	
    // PVRTC1 4bpp (mobile, PowerVR devices)
    cTFPVRTC1_4_RGB: 8,						// Opaque only, RGB or alpha if cDecodeFlagsTranscodeAlphaDataToOpaqueFormats flag is specified, nearly lowest quality of any texture format.
    cTFPVRTC1_4_RGBA: 9,					// Opaque+alpha, most useful for simple opacity maps. If .basis file doesn't have alpha cTFPVRTC1_4_RGB will be used instead. Lowest quality of any supported texture format.
	
    // ASTC (mobile, Intel devices, hopefully all desktop GPU's one day)
    cTFASTC_4x4_RGBA: 10,					// Opaque+alpha, ASTC 4x4, alpha channel will be opaque for opaque .basis files. Transcoder uses RGB/RGBA/L/LA modes, void extent, and up to two ([0,47] and [0,255]) endpoint precisions.
	
    // Uncompressed (raw pixel) formats
    cTFRGBA32: 13,							// 32bpp RGBA image stored in raster (not block) order in memory, R is first byte, A is last byte.
    cTFRGB565: 14,							// 16bpp RGB image stored in raster (not block) order in memory, R at bit position 11
    cTFBGR565: 15,							// 16bpp RGB image stored in raster (not block) order in memory, R at bit position 0
    cTFRGBA4444: 16,						// 16bpp RGBA image stored in raster (not block) order in memory, R at bit position 12, A at bit position 0
	
    cTFTotalTextureFormats: 22,
  };
  
  const BASIS_DECODE_FLAGS = {
	// PVRTC1: decode non-pow2 ETC1S texture level to the next larger power of 2 (not implemented yet, but we're going to support it). Ignored if the slice's dimensions are already a power of 2.
	cDecodeFlagsPVRTCDecodeToNextPow2: 2,
	
	// When decoding to an opaque texture format, if the basis file has alpha, decode the alpha slice instead of the color slice to the output texture format.
	// This is primarily to allow decoding of textures with alpha to multiple ETC1 textures (one for color, another for alpha).
	cDecodeFlagsTranscodeAlphaDataToOpaqueFormats: 4,
	
	// Forbid usage of BC1 3 color blocks (we don't support BC1 punchthrough alpha yet).
	// This flag is used internally when decoding to BC3.
	cDecodeFlagsBC1ForbidThreeColorBlocks: 8,
	
	// The output buffer contains alpha endpoint/selector indices. 
	// Used internally when decoding formats like ASTC that require both color and alpha data to be available when transcoding to the output format.
	cDecodeFlagsOutputHasAlphaIndices: 16,
	
	cDecodeFlagsHighQuality: 32
};




import BASIS from './wasm/basis_transcoder.js';

let wasmBinary = await readFile('scripts/wasm/basis_transcoder.wasm');


let BasisModule;
await new Promise(onRuntimeInitialized => {
	BasisModule = { wasmBinary, onRuntimeInitialized };
	BASIS(BasisModule);
});

BasisModule.initializeBasis();

let icon = textures.find(texture => texture.name === 'factory-icon');
await loadTextureImageData([icon]);








// console.log(icon);

const xBlocks = ((icon.width + 3) >> 2);
const yBlocks = ((icon.height + 3) >> 2);
const nBlocks = xBlocks * yBlocks;
const bytesPerBlockOrPixel = BasisModule.getBytesPerBlockOrPixel(BASIS_FORMAT.cTFRGBA32);

const dstSize = icon.width * icon.height * bytesPerBlockOrPixel;
const dst = Buffer.alloc(dstSize);
const compressedData = Buffer.from(icon.imageData);

const mipCount = icon.mipCount;
console.log({ xBlocks, yBlocks, nBlocks, bytesPerBlockOrPixel, mipCount });
console.log(compressedData.length);

let slice_offset = 0;
let slice_length = compressedData.length;



let status = BasisModule.transcodeUASTCImage(
 	BASIS_FORMAT.cTFRGBA32, // target_format_int
	dst, // output_blocks,
	dstSize / bytesPerBlockOrPixel, // output_blocks_buf_size_in_blocks_or_pixels
	compressedData, // compressed_data
	xBlocks, // num_blocks_x
	yBlocks, // num_blocks_y
	icon.width, // orig_width
	icon.height, // orig_height
	0, // level_index
	slice_offset, // slice_offset
	slice_length, // compressedData.length, // slice_length
	// BASIS_DECODE_FLAGS.cDecodeFlagsTranscodeAlphaDataToOpaqueFormats|
	// BASIS_DECODE_FLAGS.cDecodeFlagsOutputHasAlphaIndices|
	BASIS_DECODE_FLAGS.cDecodeFlagsHighQuality, // decode_flags
	true, // has_alpha
	false, // is_video
	icon.width, // output_row_pitch_in_blocks_or_pixels
	icon.height, // output_rows_in_pixels
	-1, // channel0
	-1, // channel1
);

if(!status) throw new Error('Unable to decode the UASTC image');


// console.log(icon);
console.log(dst.slice(0, 4));
console.log(dst.slice(4, 8));
console.log(dst.slice(8, 12));
console.log(dst.slice(12, 16));

const path = `textures/${icon.name}.avif`;
await sharp(dst, { raw: { width: icon.width, height: icon.height, channels: 4 } }).avif().toFile(path);
console.log('Saved as', path);
*/



















// const basisFile = new BasisModule.BasisFile(new Uint8Array(icon.loadTextureImageData));

// let width = basisFile.getImageWidth(0, 0);
// let height = basisFile.getImageHeight(0, 0);
// let images = basisFile.getNumImages();
// let levels = basisFile.getNumLevels(0);
// let has_alpha = basisFile.getHasAlpha();

// console.log({
// 	width,
// 	height,
// 	images,
// 	levels,
// 	has_alpha,
// });

// var basisFileDesc = basisFile.getFileDesc();

// console.log('------');  
// console.log('getFileDesc():');
// console.log('version: ' + basisFileDesc.version);
// console.log('us per frame: ' + basisFileDesc.usPerFrame);
// console.log('total images: ' + basisFileDesc.totalImages);
// console.log('userdata0: ' + basisFileDesc.userdata0 + ' userdata1: ' + basisFileDesc.userdata1);
// console.log('texFormat: ' + basisFileDesc.texFormat);
// console.log('yFlipped: ' + basisFileDesc.yFlipped + ' hasAlphaSlices: ' + basisFileDesc.hasAlphaSlices);

// if (basisFileDesc.texFormat == BasisModule.basis_tex_format.cETC1S.value)
// {
// 	console.log('numEndpoints: ' + basisFileDesc.numEndpoints);
// 	console.log('endpointPaletteOfs: ' + basisFileDesc.endpointPaletteOfs);
// 	console.log('endpointPaletteLen: ' + basisFileDesc.endpointPaletteLen);
// 	console.log('numSelectors: ' + basisFileDesc.numSelectors);
// 	console.log('selectorPaletteOfs: ' + basisFileDesc.selectorPaletteOfs);
// 	console.log('selectorPaletteLen: ' + basisFileDesc.selectorPaletteLen);
// 	console.log('tablesOfs: ' + basisFileDesc.tablesOfs);
// 	console.log('tablesLen: ' + basisFileDesc.tablesLen);
// }
// console.log('------');
// console.log('getImageDesc() for all images:');
// var image_index;
// for (image_index = 0; image_index < basisFileDesc.totalImages; image_index++)
// {
// 	console.log('image: ' + image_index);
	
// 	var basisImageDesc = basisFile.getImageDesc(image_index);
	
// 	console.log('origWidth: ' + basisImageDesc.origWidth + ' origWidth: ' + basisImageDesc.origHeight);
// 	console.log('numBlocksX: ' + basisImageDesc.numBlocksX + ' origWidth: ' + basisImageDesc.numBlocksY);
// 	console.log('numLevels: ' + basisImageDesc.numLevels);
// 	console.log('alphaFlag: ' + basisImageDesc.alphaFlag + ' iframeFlag: ' + basisImageDesc.iframeFlag);

// 	console.log('getImageLevelDesc() for all mipmap levels:');
// 	var level_index;
// 	for (level_index = 0; level_index < basisImageDesc.numLevels; level_index++)
// 	{
// 	var basisImageLevelDesc = basisFile.getImageLevelDesc(image_index, level_index);
	
// 	console.log('level: ' + level_index + 
// 		' rgb_file_offset: ' + basisImageLevelDesc.rgbFileOfs + ' rgb_file_len: ' + basisImageLevelDesc.rgbFileLen);

// 	if (basisFileDesc.hasAlphaSlices)           
// 		console.log('alpha_file_offset: ' + basisImageLevelDesc.alphaFileOfs + ' alpha_file_len: ' + basisImageLevelDesc.alphaFileLen);
// 	}
// }

// console.log('------');

// if (!width || !height || !images || !levels) {
// 	console.warn('Invalid .basis file');
// 	basisFile.close();
// 	basisFile.delete();
// }

// const nBlocks = ((icon.width + 3) >> 2) * ((icon.height + 3) >> 2);
// const texMemoryPages = (nBlocks * 16 + 65535) >> 16;
// const memory = new WebAssembly.Memory({ initial: texMemoryPages + 1 });






// console.log(BasisModule);


// const ktx2File = new BasisModule.KTX2File(icon.imageData);
// console.log(ktx2File.transcodeImage);

// console.log('isValid:', ktx2File.isValid());

// const basisFormat = ktx2File.isUASTC() ? BasisFormat.UASTC_4x4 : BasisFormat.ETC1S;
// const width = ktx2File.getWidth();
// const height = ktx2File.getHeight();
// const layers = ktx2File.getLayers() || 1;
// const levels = ktx2File.getLevels();
// const hasAlpha = ktx2File.getHasAlpha();
// const dfdTransferFn = ktx2File.getDFDTransferFunc();
// const dfdFlags = ktx2File.getDFDFlags();



// console.log({
// 	basisFormat,
// 	width,
// 	height,
// 	layers,
// 	levels,
// 	hasAlpha,
// 	dfdTransferFn,
// 	dfdFlags,
// });