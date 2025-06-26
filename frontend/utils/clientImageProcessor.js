function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class ClientImageProcessor {
  static get SETTINGS() {
    return {
      maxPreviewSize: 2 * 1024 * 1024,
      previewQuality: 0.8,
      
      profilePicture: {
        maxWidth: 800,
        maxHeight: 800
      },
      petMedia: {
        maxWidth: 1200,
        maxHeight: 1200
      },
      supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']
    };
  }

  static async validateAndPreviewFiles(files, type = 'petMedia') {
    const validFiles = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const fileInfo = await this.processFileForPreview(file, type);
        validFiles.push(fileInfo);
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }
    
    return { validFiles, errors };
  }

  static async processFileForPreview(file, type = 'petMedia') {
    if (!this.SETTINGS.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported format: ${file.type}`);
    }
    
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: 10MB)`);
    }
    
    const previewUrl = URL.createObjectURL(file);
    const dimensions = await this.getImageDimensions(previewUrl);
    const settings = this.SETTINGS[type] || this.SETTINGS.petMedia;
    const willResize = dimensions.width > settings.maxWidth || dimensions.height > settings.maxHeight;
    
    return {
      file: file,
      originalName: file.name,
      originalSize: file.size,
      originalType: file.type,
      previewUrl: previewUrl,
      dimensions: dimensions,
      willResize: willResize,
      warning: this.getFileWarnings(file, dimensions, type)
    };
  }

  static getImageDimensions(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  }  static getFileWarnings(file, dimensions, type) {
    const warnings = [];
    const settings = this.SETTINGS[type] || this.SETTINGS.petMedia;
    
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large file size');
    }
    
    if (dimensions.width > settings.maxWidth * 2 || dimensions.height > settings.maxHeight * 2) {
      warnings.push('Very large image - will be resized');
    }
    
    return warnings;
  }  static createFileInfoDisplay(fileInfo) {
    const container = document.createElement('div');
    container.className = 'file-info-display';
    container.innerHTML = `
      <div class="file-info-header">
        <span class="file-name">${escapeHTML(fileInfo.originalName)}</span>
      </div>
      <div class="file-info-details">
        <div class="dimensions">${escapeHTML(fileInfo.dimensions.width)} × ${escapeHTML(fileInfo.dimensions.height)}px</div>
        ${fileInfo.willResize ? '<div class="resize-notice">Will be resized</div>' : ''}
      </div>
      ${fileInfo.warning.length > 0 ? `
        <div class="file-warnings">
          ${fileInfo.warning.map(w => `<div class="warning">${escapeHTML(w)}</div>`).join('')}
        </div>
      ` : ''}
    `;
    
    return container;
  }

  static cleanupPreviewUrls(fileInfos) {
    fileInfos.forEach(fileInfo => {
      if (fileInfo.previewUrl) {
        URL.revokeObjectURL(fileInfo.previewUrl);
      }
    });
  }
}

const style = document.createElement('style');
style.textContent = `
  .file-info-display {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 12px;
    margin: 8px 0;
    background: #f9f9f9;
    font-family: inherit;
  }
    .file-info-header {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .file-name {
    font-weight: 600;
    color: #333;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .file-info-details {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9em;
    color: #555;
  }
    .dimensions {
    color: #777;
  }
  
  .resize-notice {
    background: #fff3cd;
    color: #856404;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8em;
  }
  
  .file-warnings {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
  }
  
  .warning {
    color: #856404;
    background: #fff3cd;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.85em;
    margin: 4px 0;
  }
`;

document.head.appendChild(style);
window.ClientImageProcessor = ClientImageProcessor;