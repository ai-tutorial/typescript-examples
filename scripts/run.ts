import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const CONFIG_FILE = 'env/run.conf';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
};

// Read config file and extract file path
const readConfigFile = (): string => {
  try {
    if (!existsSync(CONFIG_FILE)) {
      console.error(colors.red + `\n✗ Config file not found: ${CONFIG_FILE}` + colors.reset);
      console.error(colors.red + '\nThe environment initialization appears to be corrupted.' + colors.reset);
      console.error(colors.red + 'Please reload the page to reinitialize the environment.\n' + colors.reset);
      throw new Error(`Config file not found: ${CONFIG_FILE}`);
    }
    
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    
    if (content.trim().length === 0) {
      console.error(colors.red + `\n✗ Config file is empty: ${CONFIG_FILE}` + colors.reset);
      console.error(colors.red + '\nThe environment initialization appears to be corrupted.' + colors.reset);
      console.error(colors.red + 'Please reload the page to reinitialize the environment.\n' + colors.reset);
      throw new Error(`Config file is empty: ${CONFIG_FILE}`);
    }
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('file=')) {
        const filePath = trimmed.substring(5).trim();
        if (filePath.length === 0) {
          throw new Error(`File path is empty in config file: ${CONFIG_FILE}`);
        }
        return filePath;
      }
    }
    
    throw new Error(`No file parameter found in config file: ${CONFIG_FILE}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read config file: ${errorMessage}`);
  }
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

// Main function
const main = (): void => {
  try {
    // Check if file path is provided as command line argument
    let filePath: string | null = null;
    if (process.argv.length > 2) {
      filePath = process.argv[2];
    }
    
    // If no argument provided, read from config file
    if (!filePath) {
      filePath = readConfigFile();
    }
    
    // Execute the file directly
    executeFile(filePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(colors.red + `\n✗ Error: ${errorMessage}` + colors.reset);
    process.exit(1);
  }
};

main();



