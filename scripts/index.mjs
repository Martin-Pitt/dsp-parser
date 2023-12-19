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
import { join } from 'node:path';
import sharp from 'sharp';
import { renderTextures } from './lib/textures.mjs';
import { resources, shared } from './lib/assetfiles.mjs';
import { Items, Recipes, Tech, iconPaths } from './lib/protosets.mjs';
// import { Strings, supportedLocales, supportedCanonicalLocales } from './lib/locales.mjs';
import { Languages, Locale } from './lib/locales.mjs';
import { JSONReplacer, JSONReviver } from './lib/parser.mjs';
import { GameDirectory } from './lib/config.mjs';


let version = await (async () => {
	let path = join(GameDirectory, 'Configs', 'versions');
	let versions = await readFile(path, { encoding: 'utf8' });
	versions = versions.split(/\r?\n/).filter(Boolean);
	return versions.pop();
})();





// try { await mkdir('protoSet', { recursive: true }); } catch {}
// await writeFile('protoSet/Item.json', JSON.stringify(ItemProtoSet, JSONReplacer, '\t'));
// await writeFile('protoSet/Recipe.json', JSON.stringify(RecipeProtoSet, JSONReplacer, '\t'));
// await writeFile('protoSet/Tech.json', JSON.stringify(TechProtoSet, JSONReplacer, '\t'));




try { await mkdir('dist/data', { recursive: true }); } catch {}
const Meta = { generatedAt: new Date(), version };
await writeFile('dist/data/meta.json', JSON.stringify(Meta, JSONReplacer, '\t'));
await writeFile('dist/data/items.json', JSON.stringify(Items, JSONReplacer, '\t'));
await writeFile('dist/data/recipes.json', JSON.stringify(Recipes, JSONReplacer, '\t'));
await writeFile('dist/data/tech.json', JSON.stringify(Tech, JSONReplacer, '\t'));
const Strings = Languages.map(language => ({ ...language, strings: Locale[language.lcid] }));
await writeFile('dist/data/locale.json', JSON.stringify(Strings, JSONReplacer, '\t'));
await writeFile('dist/data/reviver.js',
	'// Revive the JSON data\n' +
	'// usage: const Items = JSON.parse(json, JSONReviver);\n' +
	'export ' + JSONReviver.toString() + '\n\n' +
	'// Replacer implementation used for stringifying JSON data originally\n' +
	'export ' + JSONReplacer.toString()
);
console.log('Finished parsing data');









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
		).sort((a, b) => b[1] - a[1]).map(d => d[0]).slice(0, 16);
		
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
// await exportUsedTextures();

await exportSpritesheets();
console.log('Finished exporting spritesheets');
