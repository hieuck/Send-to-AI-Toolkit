const fs = require('fs-extra');
const path = require('path');

// Clean the dist directory
fs.emptyDirSync('dist');

// --- Manifest Processing ---

// Read the original manifest file
const manifestPath = 'manifest.json';
let manifest = fs.readFileSync(manifestPath, 'utf8');

// Remove 'src/' from all paths in the manifest
manifest = manifest.replace(/"src\//g, '"');

// Write the modified manifest to the dist directory
const distManifestPath = path.join('dist', 'manifest.json');
fs.writeFileSync(distManifestPath, manifest);

// --- Copy Other Assets ---

// Copy the entire 'src' directory to 'dist/src'
fs.copySync('src', 'dist/src');

// Copy the '_locales' directory to 'dist/_locales'
fs.copySync('src/_locales', 'dist/_locales');
