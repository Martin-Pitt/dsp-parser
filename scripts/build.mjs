import { DSPParser } from "../src/dsp-parser.mjs";


const parser = new DSPParser;

await parser.parse();
await parser.writeToFiles();

console.log('Done');

