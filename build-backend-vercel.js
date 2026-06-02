const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building Vercel prebuilt bundle...');

const rootDir = __dirname;
const vercelOutputDir = path.join(rootDir, '.vercel', 'output');
const staticDir = path.join(vercelOutputDir, 'static');
const functionsDir = path.join(vercelOutputDir, 'functions');
const serverFuncDir = path.join(functionsDir, '__server.func');
const apiFuncDir = path.join(functionsDir, 'api.func');

// Helper to copy a directory recursively
const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

// 1. Clean previous build output
if (fs.existsSync(vercelOutputDir)) {
  console.log('Cleaning old .vercel/output...');
  fs.rmSync(vercelOutputDir, { recursive: true, force: true });
}

// 2. Ensure directories exist
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(serverFuncDir, { recursive: true });
fs.mkdirSync(apiFuncDir, { recursive: true });

// 3. Copy TanStack Start (replit-export-v2) dist output
const replitDist = path.join(rootDir, 'replit-export-v2', 'dist');
console.log('Assembling frontend files...');
if (fs.existsSync(replitDist)) {
  copyDir(path.join(replitDist, 'client'), staticDir);
  copyDir(path.join(replitDist, 'server'), serverFuncDir);
  fs.copyFileSync(
    path.join(replitDist, 'config.json'),
    path.join(vercelOutputDir, 'config.json')
  );
  console.log('Frontend files copied successfully.');
} else {
  console.error('Error: replit-export-v2/dist not found. Please build the frontend first.');
  process.exit(1);
}

// 4. Generate .vc-config.json for the Express API
const vcConfig = {
  handler: 'index.js',
  launcherType: 'Nodejs',
  runtime: 'nodejs24.x'
};
fs.writeFileSync(
  path.join(apiFuncDir, '.vc-config.json'),
  JSON.stringify(vcConfig, null, 2)
);

// 5. Bundle Express API with esbuild
console.log('Bundling backend code...');
execSync(
  'npx esbuild apps/backend/src/index.ts --bundle --platform=node --target=node20 --outfile=.vercel/output/functions/api.func/index.js --external:@prisma/client --external:puppeteer',
  { stdio: 'inherit' }
);

// 6. Copy Prisma client node_modules to the API function node_modules
console.log('Copying Prisma client to API node_modules...');
const rootNodeModules = path.join(rootDir, 'node_modules');
const apiNodeModules = path.join(apiFuncDir, 'node_modules');

copyDir(
  path.join(rootNodeModules, '@prisma'),
  path.join(apiNodeModules, '@prisma')
);
copyDir(
  path.join(rootNodeModules, '.prisma'),
  path.join(apiNodeModules, '.prisma')
);

// 7. Update .vercel/output/config.json to route /api/* to the api function
console.log('Updating Vercel config.json routing...');
const configPath = path.join(vercelOutputDir, 'config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (!config.routes) {
    config.routes = [];
  }
  
  // Add API route rewrite at the beginning of the routes array
  config.routes.unshift({
    src: '/api/(.*)',
    dest: '/api'
  });
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Vercel config.json updated successfully!');
} else {
  console.warn('Warning: config.json not found in .vercel/output. Creating basic configuration.');
  const config = {
    version: 3,
    routes: [
      { src: '/api/(.*)', dest: '/api' }
    ]
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

console.log('Vercel prebuilt bundle assembled successfully!');
