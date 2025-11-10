const fs = require('fs-extra');

// Clean the dist directory
fs.emptyDirSync('dist');

// Copy manifest.json and src folder to dist
fs.copySync('manifest.json', 'dist/manifest.json');
fs.copySync('src', 'dist/src');
fs.copySync('src/_locales', 'dist/_locales');
