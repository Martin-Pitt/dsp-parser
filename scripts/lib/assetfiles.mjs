import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { BufferStreamAssets } from './buffer.mjs';
import { AssetsFile } from './parser.mjs';

const ResourcesStream = new BufferStreamAssets(await readFile('resources.assets'));
export const resources = new AssetsFile(ResourcesStream);

const SharedStream = new BufferStreamAssets(await readFile('sharedassets0.assets'));
export const shared = new AssetsFile(SharedStream);


// try { await mkdir('data'); } catch {}
// await writeFile('data/Resources.json', JSON.stringify(resources, JSONReplacer, '\t'));
// await writeFile('data/Shared.json', JSON.stringify(shared, JSONReplacer, '\t'));
