// This script helps you set up PocketBase for the eBookShelf application
// Run this after downloading PocketBase

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('eBookShelf - PocketBase Setup Helper');
console.log('====================================');

// Check if PocketBase is installed
const checkPocketBase = () => {
  console.log('Checking for PocketBase...');
  
  // Check common locations based on OS
  const isWindows = process.platform === 'win32';
  const executableName = isWindows ? 'pocketbase.exe' : 'pocketbase';
  
  if (fs.existsSync(executableName)) {
    console.log('✅ PocketBase found in current directory');
    return true;
  }
  
  console.log('❌ PocketBase not found in the current directory');
  console.log('\nPlease download PocketBase from https://pocketbase.io/docs/');
  console.log('Place the executable in the project root directory and try again.');
  
  return false;
};

// Create PocketBase schema
const createSchema = () => {
  console.log('\nCreating PocketBase schema...');
  
  if (!fs.existsSync('pb_schema.json')) {
    console.log('❌ Schema file (pb_schema.json) not found');
    return false;
  }
  
  console.log('✅ Schema file found. You can import this in the PocketBase Admin UI.');
  return true;
};

// Start PocketBase
const startPocketBase = () => {
  console.log('\nWould you like to start PocketBase now? (y/n)');
  
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log('\nStarting PocketBase...');
      console.log('PocketBase Admin UI will be available at: http://127.0.0.1:8090/_/');
      console.log('Press Ctrl+C to stop PocketBase');
      
      const isWindows = process.platform === 'win32';
      const executableName = isWindows ? 'pocketbase.exe' : './pocketbase';
      
      const pb = exec(`${executableName} serve`);
      
      pb.stdout.on('data', (data) => {
        console.log(data);
      });
      
      pb.stderr.on('data', (data) => {
        console.error(data);
      });
      
      pb.on('close', (code) => {
        console.log(`PocketBase process exited with code ${code}`);
        rl.close();
      });
    } else {
      console.log('\nTo start PocketBase manually, run:');
      console.log('  ./pocketbase serve    (on macOS/Linux)');
      console.log('  pocketbase.exe serve  (on Windows)');
      rl.close();
    }
  });
};

// Run the setup
const runSetup = () => {
  const hasPocketBase = checkPocketBase();
  const hasSchema = createSchema();
  
  if (hasPocketBase && hasSchema) {
    startPocketBase();
  } else {
    rl.close();
  }
};

runSetup();