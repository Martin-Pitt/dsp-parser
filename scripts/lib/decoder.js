import * as THREE from 'three';
import { DDSLoader } from 'three/addons/loaders/DDSLoader.js';
import { KTXLoader } from 'three/addons/loaders/KTXLoader.js';

// console.log('Initialising renderer…');

const loader = {
	DDS: new DDSLoader(),
	KTX: new KTXLoader(),
};

const renderer = new THREE.WebGLRenderer({
	alpha: true,
	preserveDrawingBuffer: true,
});
renderer.setSize(4, 4);
renderer.setPixelRatio(1);
// renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight('rgb(255,255,255)', 1));
const camera = new THREE.OrthographicCamera();


async function renderTextureToBlob(texture) {
	scene.background = texture;
	renderer.setSize(texture.image.width, texture.image.height, false);
	renderer.render(scene, camera);
	
	let blob = await new Promise(resolve => {
		renderer.domElement.toBlob(resolve, 'image/png');
	});
	
	return blob;
}

async function renderTexture(asset) {
	let image = loader[asset.type].parse(asset.data.buffer, true);
	
	let texture = new THREE.CompressedTexture();
	texture.image.width = image.width;
	texture.image.height = image.height;
	texture.mipmaps = image.mipmaps;
	if(image.mipmapCount === 1) texture.minFilter = THREE.LinearFilter;
	texture.format = image.format;
	texture.needsUpdate = true;
	
	let blob = await renderTextureToBlob(texture);
	texture.dispose();
	return blob;
}

window.renderTexture = renderTexture;

function ready(type) {
	if(document.body.classList.contains('renderer-ready')) return;
	// console.log(`Renderer ready [${type}]`);
	document.body.classList.add('renderer-ready');
}

// console.log('Waiting for ready');
document.addEventListener('DOMContentLoaded', () => ready('DOMContentLoaded'));
requestAnimationFrame(() => ready('requestAnimationFrame'));
setTimeout(() => ready('setTimeout'), 500);