const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

const MAX_WORKERS = os.cpus().length || 1;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

if (!isMainThread) {
  const { files, type } = workerData;
  
  async function processFiles() {
    const results = [];
    
    for (const file of files) {
      try {
        const inputPath = file;
        const parsedPath = path.parse(inputPath);
        const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.min${parsedPath.ext}`);
        
        let command, args;
        if (type === 'css') {
          command = 'npx';
          args = ['cleancss', '-o', outputPath, inputPath];
        } else if (type === 'js') {
          command = 'npx';
          args = ['terser', inputPath, '-o', outputPath, '--compress', '--mangle'];
        }
        
        await new Promise((resolve, reject) => {
          const childProcess = spawn(command, args, { 
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PATH: process.env.PATH }
          });
          
          let stderr = '';
          
          childProcess.stderr?.on('data', (data) => {
            stderr += data.toString();
          });
          
          childProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              const errorMsg = stderr || `Process exited with code ${code}`;
              reject(new Error(`Minification failed: ${errorMsg}`));
            }
          });
          
          childProcess.on('error', (error) => {
            reject(new Error(`Spawn error: ${error.message}`));
          });
        });
        
        results.push({ success: true, file: inputPath });
      } catch (error) {
        console.error(`❌ Error minifying ${file}:`, error.message);
        results.push({ success: false, file, error: error.message });
      }
    }
    
    return results;
  }
  
  processFiles().then(results => {
    parentPort.postMessage({ success: true, results });
  }).catch(error => {
    parentPort.postMessage({ success: false, error: error.message });
  });
  
  return;
}

async function findFiles(dir, extensions) {
  const files = [];
  
  async function scanDir(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext) && !entry.name.includes('.min.')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await scanDir(dir);
  return files;
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function minifyFiles(type, extensions) {
  console.log(`🚀 Starting ${type.toUpperCase()} minification...`);
  const startTime = Date.now();
  
  try {
    const files = await findFiles(FRONTEND_DIR, extensions);
    console.log(`📁 Found ${files.length} ${type.toUpperCase()} files to minify`);
    
    if (files.length === 0) {
      console.log(`ℹ️  No ${type.toUpperCase()} files found to minify`);
      return { successful: 0, failed: 0 };
    }
    
    const workerCount = Math.min(MAX_WORKERS, files.length);
    const filesPerWorker = Math.ceil(files.length / workerCount);
    const fileChunks = chunkArray(files, filesPerWorker);
    
    console.log(`⚡ Using ${workerCount} worker threads`);
    
    const workers = fileChunks.map(chunk => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { files: chunk, type }
        });
        
        worker.on('message', (result) => {
          if (result.success) {
            resolve(result.results);
          } else {
            reject(new Error(result.error));
          }
        });
        
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
      });
    });
    
    const results = await Promise.all(workers);
    const allResults = results.flat();
    
    const successful = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;
    
    const duration = Date.now() - startTime;
    console.log(`✨ ${type.toUpperCase()} minification completed in ${duration}ms`);
    console.log(`📊 Success: ${successful}, Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('❌ Failed files:');
      allResults.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.file}: ${r.error}`);
      });
    }
    
    return { successful, failed };
    
  } catch (error) {
    console.error(`💥 Error during ${type.toUpperCase()} minification:`, error.message);
    throw error;
  }
}

async function generateBuildReport() {
  console.log('📊 Generating build report...');
  
  const report = {
    buildTime: new Date().toISOString(),
    files: {
      js: { original: 0, minified: 0, savings: 0 },
      css: { original: 0, minified: 0, savings: 0 }
    }
  };
  
  async function calculateSavings(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await calculateSavings(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.js') && !entry.name.includes('.min.')) {
          const minFile = fullPath.replace(/\.js$/, '.min.js');
          try {
            const originalSize = (await fs.stat(fullPath)).size;
            const minifiedSize = (await fs.stat(minFile)).size;
            
            report.files.js.original += originalSize;
            report.files.js.minified += minifiedSize;
          } catch {
            // Skip if minified version doesn't exist
          }
        } else if (entry.name.endsWith('.css') && !entry.name.includes('.min.')) {
          const minFile = fullPath.replace(/\.css$/, '.min.css');
          try {
            const originalSize = (await fs.stat(fullPath)).size;
            const minifiedSize = (await fs.stat(minFile)).size;
            
            report.files.css.original += originalSize;
            report.files.css.minified += minifiedSize;
          } catch {
            // Skip if minified version doesn't exist
          }
        }
      }
    }
  }
  
  await calculateSavings(FRONTEND_DIR);
  
  report.files.js.savings = report.files.js.original - report.files.js.minified;
  report.files.css.savings = report.files.css.original - report.files.css.minified;
  
  const totalOriginal = report.files.js.original + report.files.css.original;
  const totalMinified = report.files.js.minified + report.files.css.minified;
  const totalSavings = totalOriginal - totalMinified;
  const savingsPercent = totalOriginal > 0 ? ((totalSavings / totalOriginal) * 100).toFixed(1) : '0.0';
  
  console.log('\n📈 Build Report:');
  console.log(`├── JavaScript: ${(report.files.js.savings / 1024).toFixed(1)} KB saved`);
  console.log(`├── CSS: ${(report.files.css.savings / 1024).toFixed(1)} KB saved`);
  console.log(`└── Total: ${(totalSavings / 1024).toFixed(1)} KB saved (${savingsPercent}% reduction)\n`);
  
  return report;
}

async function cleanMinifiedFiles() {
  console.log('🧹 Cleaning old minified files...');
  
  try {
    const command = process.platform === 'win32' 
      ? 'powershell'
      : 'find';
    
    const args = process.platform === 'win32'
      ? ['-Command', 'Get-ChildItem -Path "frontend" -Recurse -Filter "*.min.*" | Remove-Item -Force']
      : ['frontend', '-name', '*.min.*', '-delete'];
    
    await new Promise((resolve, reject) => {
      const cleanProcess = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        cwd: path.join(__dirname, '..')
      });
      
      cleanProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Cleaned old minified files');
          resolve();
        } else {
          reject(new Error(`Clean failed with exit code ${code}`));
        }
      });
      
      cleanProcess.on('error', reject);
    });
  } catch (error) {
    console.warn('⚠️  Could not clean old files:', error.message);
  }
}

async function main() {
  const command = process.argv[2] || 'all';
  const startTime = Date.now();
  
  try {
    switch (command) {
      case 'css':
        await minifyFiles('css', ['.css']);
        break;
        
      case 'js':
        await minifyFiles('js', ['.js']);
        break;
        
      case 'clean':
        await cleanMinifiedFiles();
        break;

    case 'production':
        console.log('🏗️  Starting production build...\n');
        await cleanMinifiedFiles();
        
        const [cssResults, jsResults] = await Promise.all([
          minifyFiles('css', ['.css']),
          minifyFiles('js', ['.js'])
        ]);
        
        console.log('🎯 Creating optimized bundles...');
        try {
          const JavaScriptBundler = require('./bundle-critical.js');
          const bundler = new JavaScriptBundler();
          await bundler.run();
        } catch (error) {
          console.warn('⚠️  Bundling failed:', error.message);
        }
        
        await generateBuildReport();
        
        const totalDuration = Date.now() - startTime;
        console.log(`🎉 Production build completed in ${totalDuration}ms`);
        
        if (cssResults.failed > 0 || jsResults.failed > 0) {
          console.log('⚠️  Some files failed to minify - check logs above');
          process.exit(1);
        }
        break;
        
      case 'all':
      default:
        console.log('🏗️  Building all files...\n');
        await Promise.all([
          minifyFiles('css', ['.css']),
          minifyFiles('js', ['.js'])
        ]);
        
        try {
          const JavaScriptBundler = require('./bundle-critical.js');
          const bundler = new JavaScriptBundler();
          await bundler.run();
        } catch (error) {
          console.warn('⚠️  Bundling failed:', error.message);
        }
        
        const duration = Date.now() - startTime;
        console.log(`🎉 Build completed in ${duration}ms`);
        break;
    }
  } catch (error) {
    console.error('💥 Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { minifyFiles, generateBuildReport, cleanMinifiedFiles };
