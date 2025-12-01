import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

const CONFIG_FILE = 'env/run.conf';
const MAX_WAIT_TIME = 60000; // 60 seconds
const CHECK_INTERVAL = 500; // Check every 500ms
const SPINNER_INTERVAL = 100; // Update spinner every 100ms

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Spinner animation
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let spinnerInterval: NodeJS.Timeout | null = null;

const startSpinner = (): void => {
  process.stdout.write('\r' + colors.cyan + spinnerFrames[spinnerIndex] + colors.reset + ' Waiting for config file...');
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    process.stdout.write('\r' + colors.cyan + spinnerFrames[spinnerIndex] + colors.reset + ' Waiting for config file...');
  }, SPINNER_INTERVAL);
};

const stopSpinner = (): void => {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear spinner line
};

// Wait for config file to be created
const waitForConfigFile = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    startSpinner();
    
    const checkFile = (): void => {
      if (existsSync(CONFIG_FILE)) {
        stopSpinner();
        resolve();
      } else if (Date.now() - startTime > MAX_WAIT_TIME) {
        stopSpinner();
        reject(new Error(`Timeout waiting for ${CONFIG_FILE} to be created`));
      } else {
        setTimeout(checkFile, CHECK_INTERVAL);
      }
    };
    
    checkFile();
  });
};

// Read config file and extract file path
const readConfigFile = (): string => {
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('file=')) {
        return trimmed.substring(5).trim();
      }
    }
    
    throw new Error('No file parameter found in config');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read config file: ${errorMessage}`);
  }
};

// Ask user to press enter or ESC
const waitForEnter = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Enable raw mode to capture ESC key
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const handleKeypress = (key: string): void => {
      // ESC key (27) or 'q' key
      if (key === '\u001b' || key === '\u0003' || key === 'q' || key === 'Q') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        console.log(colors.yellow + '\nReturning to terminal...' + colors.reset);
        reject(new Error('User cancelled'));
        return;
      }
      
      // Enter key
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        resolve();
        return;
      }
    };
    
    process.stdin.on('data', handleKeypress);
    
    process.stdout.write(colors.bright + `\nPress enter to execute ${colors.cyan}${filePath}${colors.reset}${colors.bright} (or ESC to return to terminal):${colors.reset}\n`);
  });
};

// Execute the file
const executeFile = (filePath: string): void => {
  try {
    console.log(colors.green + '\n▶ Executing...\n' + colors.reset);
    execSync(`npx tsx ${filePath}`, { stdio: 'inherit' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red + `\n✗ Error executing file: ${errorMessage}` + colors.reset);
    process.exit(1);
  }
};

// Ask if user wants to run again
const askRunAgain = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    const handleKeypress = (key: string): void => {
      // ESC key or 'q' to exit
      if (key === '\u001b' || key === '\u0003' || key === 'q' || key === 'Q') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        console.log(colors.yellow + '\nExiting...' + colors.reset);
        reject(new Error('User cancelled'));
        return;
      }
      
      // Enter key to run again
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        resolve();
        return;
      }
    };
    
    process.stdin.on('data', handleKeypress);
    
    process.stdout.write(colors.bright + `\nPress enter to run again (or ESC to exit):${colors.reset}\n`);
  });
};

// Main function
const main = async (): Promise<void> => {
  try {
    await waitForConfigFile();
    
    const filePath = readConfigFile();
    
    // Loop to allow running multiple times
    while (true) {
      try {
        await waitForEnter(filePath);
        executeFile(filePath);
        
        // Ask if user wants to run again
        try {
          await askRunAgain();
          // If user pressed enter, loop continues
        } catch (error) {
          // User pressed ESC, exit
          if (error instanceof Error && error.message === 'User cancelled') {
            process.exit(0);
          }
          throw error;
        }
      } catch (error) {
        // User pressed ESC during waitForEnter
        if (error instanceof Error && error.message === 'User cancelled') {
          process.exit(0);
        }
        throw error;
      }
    }
  } catch (error) {
    stopSpinner();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red + `\n✗ Error: ${errorMessage}` + colors.reset);
    process.exit(1);
  }
};

main();

