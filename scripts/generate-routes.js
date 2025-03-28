// scripts/generate-routes.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Generating route tree before build...');

try {
  // Ensure scripts directory exists
  const routeTreePath = path.resolve(process.cwd(), 'src', 'routeTree.gen.ts');
  
  // Create an empty file if it doesn't exist
  if (!fs.existsSync(routeTreePath)) {
    fs.writeFileSync(
      routeTreePath, 
      '// Placeholder for generated routes\nexport const routeTree = {};\n'
    );
    console.log('Created placeholder routeTree.gen.ts file');
  }
  
  // Install the TanStack Router CLI (if not already installed)
  execSync('npx @tanstack/router-cli@latest install', { stdio: 'inherit' });
  
  // Generate the routes
  execSync('npx @tanstack/router-cli@latest generate', { stdio: 'inherit' });
  
  console.log('Route tree generation complete!');
} catch (error) {
  console.error('Error generating route tree:', error);
  process.exit(1);
} 