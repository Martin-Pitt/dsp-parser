import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { TextureRenderer } from './lib/texture-renderer.mjs';


const sheetStyling = ({
	iconRows,
	iconSprites,
	techRows,
	techSprites,
	spriteItemsMap,
	getCategory,
}) => (`
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
					// `--x: ${x}; ` +
					// `--y: ${y}; ` +
					// `--rows: ${iconRows}; ` +
				`}`
			);
		}))
		.join('\n\t')
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
		.join('\n\t')
	}
}`);




export class TextureParser {
	dsp;
	
	exportTexturesDirectory = 'textures';
	exportSpritesheetsDirectory = '';
	
	textures;
	
	constructor(dsp) {
		this.dsp = dsp;
		this.renderer = new TextureRenderer(dsp, this);
	}
	
	load() {
		this.textures = [
			...this.dsp.assetsParser.resources.table.filter(asset => asset.fileTypeName === 'Texture2D'),
			...this.dsp.assetsParser.shared.table.filter(asset => asset.fileTypeName === 'Texture2D'),
		]
		.filter(texture => 
			// Filter out alpha, emissive, normal, etc textures
			!/-[aens]\d{0,2}$/.test(texture.name) &&
			// Filter out most model textures
			!/^(planet|gg|oc\d|ic\d|ds\d|vl|ore|alien|voxel|moon|nebula|test|model|daedalus|echo|iris)-/.test(texture.name) &&
			// Filter out LUT textures
			!/^LDR_LLL|lut/.test(texture.name)
		)
		.map(texture => texture.body);
	}
	
	async exportAll(directory = './dist/textures', textures, withCommonBuckets = true) {
		if(!withCommonBuckets)
		{
			/// Simple way to export all textures
			try { await mkdir(directory, { recursive: true }); } catch {}
			await this.renderer.render(textures);
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
				await mkdir(directory, { recursive: true });
				for(let wxh of CommonWxH) await mkdir(join(directory, wxh), { recursive: true });
			} catch {}
			
			const named = new Map();
			await this.renderer.render(textures, async (texture, buffer) => {
				let { name, width, height } = texture;
				let wxh = `${width}x${height}`;
				
				if(CommonWxH.includes(wxh)) name = `${wxh}/${name}`;
				
				let count = named.get(name);
				if(!count) named.set(name, 1);
				else named.set(name, count += 1);
				if(count) name = `${name}.${count}`;
				
				const path = join(directory, `${name}.avif`);
				await sharp(buffer, { raw: { width, height, channels: 4 } }).avif().toFile(path);
			});
		}
	}
	
	async exportSpritesheets(directory = './dist/spritesheets') {
		/// Create spritesheets w/ css
		let itemSpriteMap = new Map();
		let spriteItemsMap = new Map();
		const findSprites = (list) => {
			let sprites = [];
			for(let item of list)
			{
				let iconPath = this.dsp.assetsParser.iconPaths.get(item);
				if(!iconPath) continue;
				let name = iconPath.split('/')[2];
				let sprite = this.findIconTexture(name);
				if(!sprites.includes(sprite)) sprites.push(sprite);
				// item.spriteIndex = sprites.indexOf(icon);
				itemSpriteMap.set(item, sprites.indexOf(sprite));
				spriteItemsMap.set(sprite, [...(spriteItemsMap.get(sprite) || []), item]);
			}
			return sprites;
		};
		
		const getCategory = (item) => {
			if(this.dsp.assetsParser.items.includes(item)) return 'item';
			if(this.dsp.assetsParser.recipes.includes(item)) return 'recipe';
			if(this.dsp.assetsParser.techs.includes(item)) return 'tech';
			return 'unknown';
		};
		
		// Group all the sprites together
		// let sprites = findSprites([...Items, ...Recipes, ...Tech]);
		
		// Separate out sprites so that they can be optimised best (tech icons are all white)
		let iconSprites = findSprites([...this.dsp.assetsParser.items, ...this.dsp.assetsParser.recipes]);
		let techSprites = findSprites([...this.dsp.assetsParser.techs]);
		
		// Generate image textures
		await this.renderer.render([...iconSprites, ...techSprites],
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
			
			return sheetStyling({
				iconRows, iconSprites,
				techRows, techSprites,
				spriteItemsMap,
				getCategory,
			});
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
		try { await mkdir(directory, { recursive: true }); } catch {}
		await writeFile(join(directory, 'icons-item-recipes.png'), await iconSpritesheet.png().toBuffer());
		await writeFile(join(directory, 'icons-item-recipes.webp'), await iconSpritesheet.webp({ quality: 90, alphaQuality: 70 }).toBuffer());
		await writeFile(join(directory, 'icons-item-recipes.avif'), await iconSpritesheet.avif({ quality: 50 }).toBuffer());
		await writeFile(join(directory, 'icons-tech.png'), await techSpritesheet.png().toBuffer());
		await writeFile(join(directory, 'icons-tech.webp'), await techSpritesheet.webp({ quality: 90, alphaQuality: 70 }).toBuffer());
		await writeFile(join(directory, 'icons-tech.avif'), await techSpritesheet.avif({ quality: 40 }).toBuffer());
		await writeFile(join(directory, 'icons.css'), stylesheet);
		await writeFile(join(directory, 'demo.html'), demo);
		// await writeFile(join(directory, 'sprites.json'), JSON.stringify(itemSpriteMap, JSONReplacer, '\t'));
	}
	
	findIconTexture(name) {
		function formatWeight(format) {
			if(/RGBA32|RGB24|Alpha8/.test(format)) return 1;
			else if(/DXT\d|BC7/.test(format)) return 2;
			return 3;
		}
		let search = this.textures.filter(texture => texture.name === name);
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
}