// This script helps you set up PocketBase for the eBookShelf application
// Run this after downloading PocketBase

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('eBookShelf - PocketBase Setup Helper');
console.log('====================================');

// Get the pocketbase directory path
const pbDir = path.join(process.cwd(), 'pocketbase');

// Check if PocketBase is installed
const checkPocketBase = () => {
  console.log('Checking for PocketBase...');
  
  // Check common locations based on OS
  const isWindows = process.platform === 'win32';
  const executableName = isWindows ? 'pocketbase.exe' : 'pocketbase';
  const executablePath = path.join(pbDir, executableName);
  
  if (fs.existsSync(executablePath)) {
    console.log('✅ PocketBase found in pocketbase directory');
    return true;
  }
  
  console.log('❌ PocketBase not found in the pocketbase directory');
  console.log('\nPlease download PocketBase from https://pocketbase.io/docs/');
  console.log('Place the executable in the pocketbase directory and try again.');
  
  return false;
};

// Create PocketBase schema
const createSchema = () => {
  console.log('\nChecking for PocketBase schema...');
  
  const schemaPath = path.join(pbDir, 'pb_schema.json');
  
  if (!fs.existsSync(schemaPath)) {
    console.log('❌ Schema file (pb_schema.json) not found in pocketbase directory');
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
      
      // Change to the pocketbase directory and run the executable
      const pb = exec(`cd "${pbDir}" && ${executableName} serve`);
      
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
      console.log(`  cd "${pbDir}" && ./pocketbase serve    (on macOS/Linux)`);
      console.log(`  cd "${pbDir}" && pocketbase.exe serve  (on Windows)`);
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