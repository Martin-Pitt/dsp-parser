import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { parseTexture, wrapWithContainer } from './parser.mjs';
import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { GameDirectory } from './config.mjs';
import { join } from 'node:path';



/*


/// Get all the textures
let textures = assetsTable.table.filter(asset => asset.curFileTypeName === 'Texture2D');

textures = textures.map(textureAsset => {
	const textureStream = assetsTable.getAssetStream(textureAsset);
	const textureData = parseTexture(textureStream);
	return textureData;
});



function findIconTexture(name) {
	function formatWeight(format) {
		if(/RGBA32|RGB24|Alpha8/.test(format)) return 1;
		else if(/DXT\d|BC7/.test(format)) return 2;
		return 3;
	}
	let search = textures.filter(texture => texture.name === name);
	search.sort((a, b) => {
		let x = formatWeight(a.textureFormat);
		let y = formatWeight(b.textureFormat);
		return x - y;
	});
	search.sort((a, b) => a.width - b.width);
	return search[0];
}




const Items = JSON.parse(await readFile('data/Items.json'), JSONReviver);
const Recipes = JSON.parse(await readFile('data/Recipes.json'), JSONReviver);
const Tech = JSON.parse(await readFile('data/Tech.json'), JSONReviver);


/// Find out what texture is actually used
let missing = [];
let exportable = new Map();
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


if(missing.length) console.log(`Missing icons in ${missing.length} items`);
for(let miss of missing)
{
	console.log(miss.name);
}


/// Set textures to export
textures = Array.from(exportable.keys());

// */



export async function loadTextureImageData(textures) {
	/// Load streaming data
	let streamed = textures // textures
	.filter(texture => texture.streamData && texture.streamData.size && texture.streamData.path)
	.reduce((map, texture) => {
		if(!map[texture.streamData.path]) map[texture.streamData.path] = [];
		map[texture.streamData.path].push(texture);
		return map;
	}, {});
	
	for(let path in streamed)
	{
		let fileHandle = await open(join(GameDirectory, 'DSPGAME_Data', path), 'r');
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


export async function renderTextures(textures, saveCallback) {
	await loadTextureImageData(textures);
	
	
	/// Sort by names
	// let collator = new Intl.Collator('en', {
	// 	numeric: true,
	// 	caseFirst: 'lower',
	// });
	// textures.sort((a, b) => collator.compare(a.name, b.name));
	
	
	/// Resolve naming conflicts
	const named = new Map();
	async function saveFile(texture, buffer) {
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
		
		const path = `textures/${name}${count? `.${count}` : ''}.avif`;
		await sharp(buffer, { raw: { width, height, channels: 4 } }).avif().toFile(path);
		// await writeFile(path, await buffer.png().toBuffer());
	}
	
	
	/// Decode and save textures
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
		<script type="module">${await readFile('./scripts/lib/renderer.js', { encoding: 'utf8' })}</script>
	`);
	// await page.waitForNetworkIdle();
	await page.waitForSelector('body.renderer-ready');
	
	console.log('Rendering textures');
	for(let texture of decodingQueue)
	{
		let container = wrapWithContainer(texture);
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