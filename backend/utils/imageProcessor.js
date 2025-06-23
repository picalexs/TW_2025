const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ImageProcessor {
  static get DEFAULT_SETTINGS() {
    return {
      profilePicture: {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 92
      },
      petMedia: {
        maxWidth: 3000,
        maxHeight: 3000,
        quality: 92
      },
      thumbnail: {
        maxWidth: 400,
        maxHeight: 400,
        quality: 80
      },
      format: 'webp',
      compressionLevel: 4,
      effort: 2
    };
  }

  static async processImage(inputBuffer, options = {}) {
    const settings = { ...this.DEFAULT_SETTINGS, ...options };
    
    try {
      if (inputBuffer.length > 50 * 1024 * 1024) {
        throw new Error('File too large to process (max 50MB)');
      }

      const metadata = await sharp(inputBuffer).metadata();
      console.log(`Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      const targetType = options.type || 'petMedia';
      const targetSettings = settings[targetType] || settings.petMedia;
      let sharpInstance = sharp(inputBuffer);

      sharpInstance = sharpInstance.jpeg({ mozjpeg: false }).png({ compressionLevel: 6 });

      if (metadata.width > targetSettings.maxWidth || metadata.height > targetSettings.maxHeight) {
        sharpInstance = sharpInstance.resize(
          targetSettings.maxWidth,
          targetSettings.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: 'lanczos3'
          }
        );
        console.log(`Resizing to max ${targetSettings.maxWidth}x${targetSettings.maxHeight}`);
      }      
      
      const processedBuffer = await sharpInstance
        .webp({
          quality: targetSettings.quality,
          effort: Math.min(settings.effort, 3),
          lossless: false,
          nearLossless: false,
          smartSubsample: true
        })
        .toBuffer();

      console.log(`Image processed successfully`);

      return processedBuffer;
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  static async processAndSaveFile(file, outputPath, options = {}) {
    try {
      const fileMimeType = file.mimetype || file.mimeType;
      if (!fileMimeType || !fileMimeType.startsWith('image/')) {
        await fs.writeFile(outputPath, file.buffer);
        return {
          path: outputPath,
          originalSize: file.buffer.length,
          processedSize: file.buffer.length,
          format: path.extname(file.filename || outputPath).slice(1),
          processed: false
        };
      }
      
      const processedBuffer = await this.processImage(file.buffer, options);
      const webpPath = path.extname(outputPath) 
        ? outputPath.replace(/\.[^.]+$/, '.webp')
        : outputPath + '.webp';
      const dir = path.dirname(webpPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(webpPath, processedBuffer);

      return {
        path: webpPath,
        originalSize: file.buffer.length,
        processedSize: processedBuffer.length,
        format: 'webp',
        processed: true
      };
    } catch (error) {
      console.error('Error processing and saving file:', error);
      throw new Error(`Failed to process and save file: ${error.message}`);
    }
  }

  static async generateThumbnail(inputBuffer, outputPath, options = {}) {
    const thumbnailSettings = {
      ...this.DEFAULT_SETTINGS.thumbnail,
      ...options
    };

    try {
      const thumbnailBuffer = await sharp(inputBuffer)
        .resize(thumbnailSettings.maxWidth, thumbnailSettings.maxHeight, {
          fit: 'cover',
          position: 'center'
        })
        .webp({
          quality: thumbnailSettings.quality,
          effort: this.DEFAULT_SETTINGS.effort
        })
        .toBuffer();

      const webpPath = outputPath.replace(/\.[^.]+$/, '.webp');
      await fs.writeFile(webpPath, thumbnailBuffer);
      
      return webpPath;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw new Error(`Thumbnail generation failed: ${error.message}`);
    }
  }

  static async validateImage(buffer, options = {}) {
    const maxSize = options.maxSize || 10 * 1024 * 1024;
    const allowedFormats = options.allowedFormats || ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
    
    try {
      if (buffer.length > maxSize) {
        throw new Error(`File too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB (max: ${maxSize / 1024 / 1024}MB)`);
      }

      const metadata = await sharp(buffer).metadata();
      
      if (!allowedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`);
      }

      const maxDimension = options.maxDimension || 5000;
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        throw new Error(`Image too large: ${metadata.width}x${metadata.height} (max: ${maxDimension}x${maxDimension})`);
      }

      return {
        valid: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: buffer.length,
          channels: metadata.channels,
          hasAlpha: metadata.hasAlpha
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  static async getImageInfo(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density,
        space: metadata.space
      };
    } catch (error) {
      throw new Error(`Failed to get image info: ${error.message}`);
    }
  }
}

module.exports = ImageProcessor;