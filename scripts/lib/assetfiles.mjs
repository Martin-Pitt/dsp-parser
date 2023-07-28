import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { BufferStreamAssets } from './buffer.mjs';
import { AssetsFile, JSONReplacer } from './parser.mjs';

const ResourcesStream = new BufferStreamAssets(await readFile('resources.assets'));
export const resources = new AssetsFile(ResourcesStream);

const SharedStream = new BufferStreamAssets(await readFile('sharedassets0.assets'));
export const shared = new AssetsFile(SharedStream);

// const GlobalStream = new BufferStreamAssets(await readFile('globalgamemanagers.assets'));
// export const glob = new AssetsFile(GlobalStream);

// try { await mkdir('data'); } catch {}
// await writeFile('data/Resources.json', JSON.stringify(resources, JSONReplacer, '\t'));
// await writeFile('data/Shared.json', JSON.stringify(shared, JSONReplacer, '\t'));
// await writeFile('data/Global.json', JSON.stringify(glob, JSONReplacer, '\t'));
