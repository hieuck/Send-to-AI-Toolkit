const fs = require('fs-extra');
const path = require('path');

// Clean the dist directory
fs.emptyDirSync('dist');

// --- Manifest Processing ---
// Read the original manifest file
const manifestPath = 'manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');

// Modify paths in the manifest by removing "src/"
manifestContent = manifestContent.replace(/src\//g, '');

// Write the modified manifest to the dist directory
const distManifestPath = path.join('dist', 'manifest.json');
fs.writeFileSync(distManifestPath, manifestContent);

// --- Copy Assets ---
// Copy the contents of the 'src' directory directly into 'dist'
// This will create dist/background, dist/assets, etc.
fs.copySync('src', 'dist');

console.log('Build successful: All files copied and paths corrected.');