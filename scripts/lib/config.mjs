import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';


export const GameDirectory = '../Dyson Sphere Program'; // Tweak as needed


export async function readGameFile(file) {
	return readFile(path.join(GameDirectory, file));
}
