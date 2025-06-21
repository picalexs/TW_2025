const fs = require('fs').promises;
const path = require('path');

class JavaScriptBundler {
  constructor() {
    this.frontendDir = path.join(__dirname, '..', 'frontend');
    this.outputDir = path.join(this.frontendDir, 'bundles');
  }

  async createOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async readMinifiedFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      return '';
    }
  }

  async createCriticalBundle() {
    const criticalFiles = [
      path.join(this.frontendDir, 'config.min.js'),
      path.join(this.frontendDir, 'utils', 'imagePathHandler.min.js')
    ];

    let bundleContent = `// Critical JavaScript Bundle - Generated ${new Date().toISOString()}\n`;
    bundleContent += `// Contains: config.min.js, imagePathHandler.min.js\n\n`;

    for (const filePath of criticalFiles) {
      const content = await this.readMinifiedFile(filePath);
      if (content) {
        const fileName = path.basename(filePath);
        bundleContent += `\n/* === ${fileName} === */\n`;
        bundleContent += content;
        bundleContent += `\n/* === End ${fileName} === */\n`;
      }
    }

    const outputPath = path.join(this.outputDir, 'critical.min.js');
    await fs.writeFile(outputPath, bundleContent);
    return outputPath;
  }

  async createUtilsBundle() {
    const utilsFiles = [
      path.join(this.frontendDir, 'utils', 'cardRenderer.min.js'),
      path.join(this.frontendDir, 'utils', 'carousel.min.js')
    ];

    let bundleContent = `// Utils JavaScript Bundle - Generated ${new Date().toISOString()}\n`;
    bundleContent += `// Contains: cardRenderer.min.js, carousel.min.js\n\n`;

    for (const filePath of utilsFiles) {
      const content = await this.readMinifiedFile(filePath);
      if (content) {
        const fileName = path.basename(filePath);
        bundleContent += `\n/* === ${fileName} === */\n`;
        bundleContent += content;
        bundleContent += `\n/* === End ${fileName} === */\n`;
      }
    }

    const outputPath = path.join(this.outputDir, 'utils.min.js');
    await fs.writeFile(outputPath, bundleContent);
    return outputPath;
  }

  async calculateSavings(bundlePaths) {
    console.log('\n📊 Bundle Analysis:');
    
    for (const bundlePath of bundlePaths) {
      try {
        const stats = await fs.stat(bundlePath);
        const fileName = path.basename(bundlePath);
        console.log(`├── ${fileName}: ${(stats.size / 1024).toFixed(1)} KB`);
      } catch (error) {
        console.warn(`⚠️  Could not analyze ${bundlePath}`);
      }
    }

    console.log('\n💡 Benefits:');
    console.log('├── Reduced HTTP requests');
    console.log('├── Better browser caching');
    console.log('├── Improved initial page load');
    console.log('└── Smaller total transfer size due to compression\n');
  }

  async run() {
    try {
      await this.createOutputDir();
      
      const bundlePaths = await Promise.all([
        this.createCriticalBundle(),
        this.createUtilsBundle()
      ]);

      await this.calculateSavings(bundlePaths);

      console.log('🎉 JavaScript bundling completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Update HTML files to use bundles instead of individual files');
      console.log('2. Consider using these bundles in production builds');
      console.log('3. Keep individual files for development/debugging');

    } catch (error) {
      console.error('💥 Bundling failed:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const bundler = new JavaScriptBundler();
  bundler.run();
}

module.exports = JavaScriptBundler;
