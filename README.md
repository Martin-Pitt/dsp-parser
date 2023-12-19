# DSP Parser

This is a parser for Dyson Sphere Program. It has influences from many different DSP & Unity parsing tools/libraries.

It is designed to export the internal game data around items, recipes, tech and the strings related to those. Additionally spritesheets for those as well.


Generated files are saved into this repository. However if out of date you may try the quickstart instructions below.


A reviver.js file is also generated which provides functions for regenerating the JSON (as JSON does not support certain modern JS primitives).

The texture generation scripts however aren't able to decode some of the GPU compressed textures. This is because I developed this parser on a Apple-silicon MacBook which doesn't support decoding those specific GPU compressed textures.



## Quickstart

You will need Node.js and some know how on CLI. Run the commands in your terminal when cd'd into the project.

Tweak `scripts/lib/config.mjs` to point at the game directory, or make a copy of all the game files that the parser uses if you don't have DSP on your device. Run `npm run build` to convert the data which will update the `dist` folder. Texture generation may take a while.
