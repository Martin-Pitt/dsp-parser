# DSP Parser

This is a parser for Dyson Sphere Program. It has influences from many different DSP & Unity parsing tools/libraries.

It is designed to export the internal game data around items, recipes, tech and the strings related to those. Additionally spritesheets for those as well.


Generated files are saved into this repository. However if out of date you may try the quickstart instructions below.


A reviver.js file is also generated which provides functions for regenerating the JSON (as JSON does not support certain modern JS primitives).

The texture generation scripts however aren't able to decode some of the GPU compressed textures. This is because I developed this parser on a Apple-silicon MacBook which doesn't support decoding those specific GPU compressed textures.



## Quickstart

You will need Node.js and some know how on CLI. Run the commands in your terminal when cd'd into the project.

1. First you'll need to find the following game data files from Dyson Sphere Program located within it's DSPGAME_Data folder
	- `resources.assets`
	- `resources.assets.resS`
	- `sharedassets0.assets`
	- `sharedassets0.assets.resS`
2. Copy these files into the root folder of this project
3. Install the script dependencies via npm: `npm ci`
4. Run the build script `npm run build -- --version=0.9.27.15466` (Replace the version with your version of DSP)
5. The parser will now run and export updated files in the `dist` folder, this may take a while especially when generating the textures

