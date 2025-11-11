const fs = require('fs-extra');
const path = require('path');

console.log('Starting build process...');

// 1. Clean the dist directory
fs.emptyDirSync('dist');
console.log('-> Cleaned dist directory.');

// 2. Process and write the manifest file
const manifestPath = 'manifest.json';
let manifestContent = fs.readFileSync(manifestPath, 'utf8');
manifestContent = manifestContent.replace(/src\//g, '');
const distManifestPath = path.join('dist', 'manifest.json');
fs.writeFileSync(distManifestPath, manifestContent);
console.log('-> Processed and wrote manifest.json to dist.');

// 3. Copy all necessary project directories from src to dist
console.log('-> Copying project files from src to dist...');
const directoriesToCopy = [
  '_locales',
  'assets',
  'background',
  'content',
  'options',
  'popup',
  'shared',
  'styles'
];

directoriesToCopy.forEach(dir => {
  const srcDirPath = path.join('src', dir);
  const distDirPath = path.join('dist', dir);
  if (fs.existsSync(srcDirPath)) {
    fs.copySync(srcDirPath, distDirPath);
    console.log(`  - Copied ${srcDirPath} to ${distDirPath}`);
  }
});

// 4. Clean up unnecessary files from the dist directory
console.log('-> Cleaning up unnecessary files from dist...');
const filesToRemove = [
    path.join('dist', 'background', 'background.js'),
    path.join('dist', 'content', 'content.js'),
    path.join('dist', 'assets', 'icons', 'icon16.png')
];

filesToRemove.forEach(file => {
    if (fs.existsSync(file)) {
        fs.removeSync(file);
        console.log(`  - Removed ${file}`);
    }
});

console.log('\nBuild process completed successfully!');
