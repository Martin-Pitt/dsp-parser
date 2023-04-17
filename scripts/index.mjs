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
import { saveTextures } from './lib/textures.mjs';
import { resources, shared } from './lib/assetfiles.mjs';
import { Items, Recipes, Tech } from './lib/protosets.mjs';
import { JSONReplacer } from './lib/parser.mjs';
import Jimp from 'jimp';






let textures = [
	...resources.table.filter(asset => asset.fileTypeName === 'Texture2D'),
	...shared.table.filter(asset => asset.fileTypeName === 'Texture2D'),
].map(texture => texture.body);

// try { await mkdir('textures'); } catch {}
// await saveTextures(textures);





// for(let item of Items) checkIconForExport(item);
// for(let recipe of Recipes) checkIconForExport(recipe);
// for(let tech of Tech) checkIconForExport(tech);



// if(!item.iconPath) return;
// let name = item.iconPath.split('/')[2];
// let icon = findIconTexture(name);















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




function findSprites(list) {
	let sprites = [];
	for(let item of list)
	{
		if(!item.iconPath) continue;
		let name = item.iconPath.split('/')[2];
		let icon = findIconTexture(name);
		if(!sprites.includes(icon)) sprites.push(icon);
		item.spriteIndex = sprites.indexOf(icon);
	}
	return sprites;
}


let sprites = findSprites([...Items, ...Recipes, ...Tech]);


try { await mkdir('dist/data', { recursive: true }); } catch {}
await writeFile('dist/data/items.json', JSON.stringify(Items, JSONReplacer, '\t'));
await writeFile('dist/data/recipes.json', JSON.stringify(Recipes, JSONReplacer, '\t'));
await writeFile('dist/data/tech.json', JSON.stringify(Tech, JSONReplacer, '\t'));



await saveTextures(sprites,
	async (texture, buffer) => texture.buffer = buffer
);


async function createSpritesheet(list) {
	let rows = Math.ceil(Math.sqrt(list.length));
	let spritesheet = await new Promise(resolve => {
		new Jimp(rows * 80, rows * 80, (err, image) => resolve(image));
	});
	
	for(let sprite of list)
	{
		let { width, height, buffer: data } = sprite;
		const image = await Jimp.read(sprite.buffer);
		sprite.image = image;
	}
	
	for(let iter = 0; iter < list.length; ++iter)
	{
		let sprite = list[iter];
		let x = iter % rows;
		let y = Math.floor(iter / rows);
		sprite.x = x * 80;
		sprite.y = y * 80;
		
		spritesheet.composite(sprite.image, sprite.x, sprite.y);
	}
	
	spritesheet = await spritesheet.getBufferAsync('image/png');
	
	
	let stylesheet =
		`.icon { width: 80px; height: 80px; background: url('./icons.png') top left / ${100*rows}% auto no-repeat; }\n`
		+ list.map(sprite => `[data-icon="${sprite.name}"] { background-position: ${-sprite.x}px ${-sprite.y}px; }`).join('\n')
	;
	
	let demo = 
		`<link rel="stylesheet" href="icons.css"/>\n`
		+ `<style>
			html { background: black; }
			body { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); place-items: center; grid-gap: 20px; padding: 30px; }
		</style>\n`
		+ list.map(sprite => `<div class="icon" data-icon="${sprite.name}"></div>`).join('\n')
	;
	
	return [spritesheet, stylesheet, demo];
}

let [spritesheet, stylesheet, demo] = await createSpritesheet(sprites);






try { await mkdir('dist/spritesheets', { recursive: true }); } catch {}
await writeFile(`dist/spritesheets/icons.png`, spritesheet);
await writeFile(`dist/spritesheets/icons.css`, stylesheet);
await writeFile(`dist/spritesheets/icons.html`, demo);






/*
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



textures = Array.from(exportable.keys());





// Confirm no duplicate names
const named = new Set();
for(let texture of textures)
{
	if(named.has(texture.name)) throw new Error(`Found duplicate: ${texture.name}`);
	named.add(texture.name);
}



try { await mkdir('dist/icons', { recursive: true }); } catch {}
await saveTextures(textures, async (texture, buffer) => {
	let path = `dist/icons/${texture.name}.png`;
	await writeFile(path, buffer);
});




// */