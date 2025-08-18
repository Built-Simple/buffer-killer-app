console.log("Node.js is working!");
console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("Current directory:", __dirname);

// Test if we can require built-in modules
const fs = require('fs');
const path = require('path');

console.log("\nFiles in current directory:");
fs.readdirSync(__dirname).forEach(file => {
  console.log(" -", file);
});