class RSSManager {  
  constructor() {
    this.baseUrl = window.location.origin;
    if (window.location.port === '8888' || window.location.host.includes(':8888')) {
      this.apiBaseUrl = `${this.baseUrl}/api`;
    } else {
      this.apiBaseUrl = `http://localhost:8888/api`;
    }
  }

  init() {
    console.log('RSSManager: Initializing...');
    this.createRSSWidget();
    this.attachEventListeners();
    console.log('RSSManager: Initialization complete');
  }

  createRSSWidget() {
    console.log('RSSManager: Creating RSS widget...');
    const existingWidget = document.getElementById('rss-sharing-widget');
    console.log('RSSManager: Existing widget found:', !!existingWidget);
    if (existingWidget) {
      existingWidget.className = 'rss-sharing-widget';
      existingWidget.style.display = 'block';
      existingWidget.style.background = '#f0f8ff';
      existingWidget.style.border = '2px solid #007bff';
      existingWidget.style.padding = '10px';
      existingWidget.style.margin = '10px 0';
      existingWidget.innerHTML = `
      <div class="rss-widget-header">
        <h3 data-i18n="rssFeeds" data-i18n-fallback="RSS Feeds & Sharing">
          <i class="icon-rss"></i> RSS Feeds & Sharing
        </h3>
        <button id="toggle-rss-widget" class="btn btn-sm btn-secondary">
          <span data-i18n="shareFeeds" data-i18n-fallback="Share Feeds">Share Feeds</span>
        </button>
      </div>
      
      <div id="rss-widget-content" class="rss-widget-content" style="display: none;">
        <div class="rss-feed-types">
          <div class="feed-type-card">
            <div class="feed-icon">📰</div>
            <h4 data-i18n="recentPets" data-i18n-fallback="Recent Pets">Recent Pets</h4>
            <p data-i18n="recentPetsDesc" data-i18n-fallback="Latest pets available for adoption">
              Latest pets available for adoption
            </p>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('recent')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('recent')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card trending">
            <div class="feed-icon">🔥</div>
            <h4 data-i18n="trendingPets" data-i18n-fallback="Trending Pets">Trending Pets</h4>
            <p data-i18n="trendingPetsDesc" data-i18n-fallback="Most popular pets based on engagement">
              Most popular pets based on engagement
            </p>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('trending')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('trending')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card">
            <div class="feed-icon">📍</div>
            <h4 data-i18n="byLocation" data-i18n-fallback="By Location">By Location</h4>
            <p data-i18n="byLocationDesc" data-i18n-fallback="Pets filtered by geographic area">
              Pets filtered by geographic area
            </p>
            <div class="location-filters">
              <input type="text" id="location-filter" class="form-input" 
                     placeholder="Enter city or region..." 
                     data-i18n-placeholder="enterLocation" 
                     data-i18n-placeholder-fallback="Enter city or region...">
            </div>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('location')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('location')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card">
            <div class="feed-icon">🐕</div>
            <h4 data-i18n="byBreed" data-i18n-fallback="By Breed">By Breed</h4>
            <p data-i18n="byBreedDesc" data-i18n-fallback="Pets filtered by species and breed">
              Pets filtered by species and breed
            </p>
            <div class="breed-filters">
              <select id="species-for-rss" class="form-select">
                <option value="" data-i18n="allSpecies" data-i18n-fallback="All Species">All Species</option>
                <option value="dog" data-i18n="dog" data-i18n-fallback="Dog">Dog</option>
                <option value="cat" data-i18n="cat" data-i18n-fallback="Cat">Cat</option>
                <option value="bird" data-i18n="bird" data-i18n-fallback="Bird">Bird</option>
                <option value="rabbit" data-i18n="rabbit" data-i18n-fallback="Rabbit">Rabbit</option>
                <option value="other" data-i18n="other" data-i18n-fallback="Other">Other</option>
              </select>
              <input type="text" id="breed-filter" class="form-input" 
                     placeholder="Enter breed (optional)..." 
                     data-i18n-placeholder="enterBreed" 
                     data-i18n-placeholder-fallback="Enter breed (optional)...">
            </div>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('breed')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('breed')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>
        </div>

        <div class="sharing-options" id="sharing-options" style="display: none;">
          <h4 data-i18n="shareVia" data-i18n-fallback="Share Via">Share Via</h4>
          <div class="social-sharing-buttons">
            <button class="social-btn twitter" onclick="rssManager.shareOnSocial('twitter')">
                Twitter
            </button>
            <button class="social-btn facebook" onclick="rssManager.shareOnSocial('facebook')">
                Facebook
            </button>
            <button class="social-btn linkedin" onclick="rssManager.shareOnSocial('linkedin')">
                LinkedIn
            </button>
            <button class="social-btn email" onclick="rssManager.shareOnSocial('email')">
              <i class="icon-email"></i> Email
            </button>
          </div>
          
          <div class="embed-code-section">
            <h5 data-i18n="embedCode" data-i18n-fallback="Embed Code">Embed Code</h5>
            <textarea id="embed-code" readonly class="embed-code-textarea"></textarea>
            <button class="btn btn-sm btn-secondary" onclick="rssManager.copyEmbedCode()">
              <i class="icon-copy"></i> <span data-i18n="copyEmbed" data-i18n-fallback="Copy Embed">Copy Embed</span>
            </button>
          </div>        </div>
      </div>
    `;
      console.log('RSSManager: Setting innerHTML on existing widget...');
      return;
    }

    const widget = document.createElement('div');
    widget.id = 'rss-sharing-widget';
    widget.className = 'rss-sharing-widget';
    widget.innerHTML = `
      <div class="rss-widget-header">
        <h3 data-i18n="rssFeeds" data-i18n-fallback="RSS Feeds & Sharing">
          <i class="icon-rss"></i> RSS Feeds & Sharing
        </h3>
        <button id="toggle-rss-widget" class="btn btn-sm btn-secondary">
          <span data-i18n="shareFeeds" data-i18n-fallback="Share Feeds">Share Feeds</span>
        </button>
      </div>
      
      <div id="rss-widget-content" class="rss-widget-content" style="display: none;">
        <div class="rss-feed-types">
          <div class="feed-type-card">
            <div class="feed-icon">📰</div>
            <h4 data-i18n="recentPets" data-i18n-fallback="Recent Pets">Recent Pets</h4>
            <p data-i18n="recentPetsDesc" data-i18n-fallback="Latest pets available for adoption">
              Latest pets available for adoption
            </p>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('recent')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('recent')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card trending">
            <div class="feed-icon">🔥</div>
            <h4 data-i18n="trendingPets" data-i18n-fallback="Trending Pets">Trending Pets</h4>
            <p data-i18n="trendingPetsDesc" data-i18n-fallback="Most popular pets based on engagement">
              Most popular pets based on engagement
            </p>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('trending')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('trending')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card">
            <div class="feed-icon">📍</div>
            <h4 data-i18n="byLocation" data-i18n-fallback="By Location">By Location</h4>
            <p data-i18n="byLocationDesc" data-i18n-fallback="Pets filtered by geographic area">
              Pets filtered by geographic area
            </p>
            <div class="location-filters">
              <input type="text" id="location-filter" class="form-input" 
                     placeholder="Enter city or region..." 
                     data-i18n-placeholder="enterLocation" 
                     data-i18n-placeholder-fallback="Enter city or region...">
            </div>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('location')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('location')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>

          <div class="feed-type-card">
            <div class="feed-icon">🐕</div>
            <h4 data-i18n="byBreed" data-i18n-fallback="By Breed">By Breed</h4>
            <p data-i18n="byBreedDesc" data-i18n-fallback="Pets filtered by species and breed">
              Pets filtered by species and breed
            </p>
            <div class="breed-filters">
              <select id="species-for-rss" class="form-select">
                <option value="" data-i18n="allSpecies" data-i18n-fallback="All Species">All Species</option>
                <option value="dog" data-i18n="dog" data-i18n-fallback="Dog">Dog</option>
                <option value="cat" data-i18n="cat" data-i18n-fallback="Cat">Cat</option>
                <option value="bird" data-i18n="bird" data-i18n-fallback="Bird">Bird</option>
                <option value="rabbit" data-i18n="rabbit" data-i18n-fallback="Rabbit">Rabbit</option>
                <option value="other" data-i18n="other" data-i18n-fallback="Other">Other</option>
              </select>
              <input type="text" id="breed-filter" class="form-input" 
                     placeholder="Enter breed (optional)..." 
                     data-i18n-placeholder="enterBreed" 
                     data-i18n-placeholder-fallback="Enter breed (optional)...">
            </div>
            <div class="feed-actions">
              <button class="btn btn-sm btn-primary" onclick="rssManager.copyFeedUrl('breed')">
                <i class="icon-copy"></i> <span data-i18n="copyRSS" data-i18n-fallback="Copy RSS">Copy RSS</span>
              </button>
              <button class="btn btn-sm btn-secondary" onclick="rssManager.shareFeed('breed')">
                <i class="icon-share"></i> <span data-i18n="share" data-i18n-fallback="Share">Share</span>
              </button>
            </div>
          </div>
        </div>

        <div class="sharing-options" id="sharing-options" style="display: none;">
          <h4 data-i18n="shareVia" data-i18n-fallback="Share Via">Share Via</h4>
          <div class="social-sharing-buttons">
            <button class="social-btn twitter" onclick="rssManager.shareOnSocial('twitter')">
              <i class="icon-twitter"></i> Twitter
            </button>
            <button class="social-btn facebook" onclick="rssManager.shareOnSocial('facebook')">
              <i class="icon-facebook"></i> Facebook
            </button>
            <button class="social-btn linkedin" onclick="rssManager.shareOnSocial('linkedin')">
              <i class="icon-linkedin"></i> LinkedIn
            </button>
            <button class="social-btn email" onclick="rssManager.shareOnSocial('email')">
              <i class="icon-email"></i> Email
            </button>
          </div>
          
          <div class="embed-code-section">
            <h5 data-i18n="embedCode" data-i18n-fallback="Embed Code">Embed Code</h5>
            <textarea id="embed-code" readonly class="embed-code-textarea"></textarea>
            <button class="btn btn-sm btn-secondary" onclick="rssManager.copyEmbedCode()">
              <i class="icon-copy"></i> <span data-i18n="copyEmbed" data-i18n-fallback="Copy Embed">Copy Embed</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const container = document.querySelector('.section-header') || document.querySelector('main');
    if (container) {
      container.appendChild(widget);
    }
  }

  attachEventListeners() {
    const toggleButton = document.getElementById('toggle-rss-widget');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        const content = document.getElementById('rss-widget-content');
        if (content) {
          const isVisible = content.style.display !== 'none';
          content.style.display = isVisible ? 'none' : 'block';
        }
      });
    }  
  }
  
  async copyFeedUrl(type) {
    try {
      const url = this.getRSSFeedUrl(type);
      await navigator.clipboard.writeText(url);
      
      this.showNotification('RSS feed URL copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy RSS URL:', error);
      this.showNotification('Failed to copy URL. Please try again.', 'error');
    }
  }

  getRSSFeedUrl(type) {
    let params = new URLSearchParams();
    
    if (type === 'trending') {
      const baseUrl = `${this.apiBaseUrl}/rss/trending`;
      const locationFilter = document.getElementById('location-filter');
      if (locationFilter && locationFilter.value.trim()) {
        params.append('zone', locationFilter.value.trim());
      }
      params.append('limit', '20');
      return `${baseUrl}?${params.toString()}`;
    } else {
      const baseUrl = `${this.apiBaseUrl}/rss/pets`;
      
      if (type === 'recent') {
        params.append('type', 'recent');
      } else if (type === 'location') {
        params.append('type', 'recent');
        const locationFilter = document.getElementById('location-filter');
        if (locationFilter && locationFilter.value.trim()) {
          params.append('zone', locationFilter.value.trim());
        }
      } else if (type === 'breed') {
        params.append('type', 'recent');
        const speciesSelect = document.getElementById('species-for-rss');
        const breedInput = document.getElementById('breed-filter');
        
        if (speciesSelect && speciesSelect.value) {
          params.append('species', speciesSelect.value);
        }
        if (breedInput && breedInput.value.trim()) {
          params.append('breed', breedInput.value.trim());
        }
      } else {
        params.append('type', 'recent');
      }
      
      params.append('limit', '20');
      return `${baseUrl}?${params.toString()}`;
    }
  }
  async shareFeed(type) {
    try {
      let params = new URLSearchParams();
      
      if (type === 'trending') {
        params.append('type', 'trending');
      } else if (type === 'recent') {
        params.append('type', 'recent');
      } else if (type === 'location') {
        params.append('type', 'recent');
        const locationFilter = document.getElementById('location-filter');
        if (locationFilter && locationFilter.value.trim()) {
          params.append('zone', locationFilter.value.trim());
        }
      } else if (type === 'breed') {
        params.append('type', 'recent');
        const speciesSelect = document.getElementById('species-for-rss');
        const breedInput = document.getElementById('breed-filter');
        
        if (speciesSelect && speciesSelect.value) {
          params.append('species', speciesSelect.value);
        }
        if (breedInput && breedInput.value.trim()) {
          params.append('breed', breedInput.value.trim());
        }
      } else {
        params.append('type', 'recent');
      }
      
      const apiUrl = `${this.apiBaseUrl}/rss/share?${params.toString()}`;
      
      this.showNotification('Loading sharing options...', 'info');
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Backend server not available. Please ensure the server is running on port 8888.');
        }
        throw new Error(`Server error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.currentShareData = data.data;
        
        if (data.data.socialSharing && !data.data.socialLinks) {
          this.currentShareData.socialLinks = data.data.socialSharing;
        }
        
        this.showSharingOptions();
      } else {
        throw new Error(data.message || 'Failed to get sharing links');
      }
    } catch (error) {
      console.error('RSSManager: Failed to get sharing options:', error);
      
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        this.showNotification('Backend server not available. Please ensure the server is running on port 8888.', 'error');
      } else {
        this.showNotification(`Failed to get sharing options: ${error.message}`, 'error');
      }
    }
  }

  showSharingOptions() {
    const sharingOptions = document.getElementById('sharing-options');
    if (sharingOptions && this.currentShareData) {
      const embedTextarea = document.getElementById('embed-code');
      if (embedTextarea) {
        let embedCode = this.currentShareData.embedCode;
        if (!embedCode && this.currentShareData.links && this.currentShareData.links.rss) {
          const rssUrl = this.currentShareData.links.rss;
          embedCode = `<!-- RSS Feed Widget -->\n<iframe src="https://rss.app/embed/v1/?src=${encodeURIComponent(rssUrl)}" style="width: 100%; height: 400px; border: none;"></iframe>\n\n<!-- Alternative: Direct RSS Link -->\n<a href="${rssUrl}" target="_blank">Subscribe to RSS Feed</a>`;
        }
        embedTextarea.value = embedCode || 'No embed code available';
      }
      
      sharingOptions.style.display = 'block';
      sharingOptions.scrollIntoView({ behavior: 'smooth' });
      
      this.showNotification('Sharing options loaded successfully!', 'success');
    } else {
      console.error('RSSManager: Could not show sharing options - missing element or data');
      this.showNotification('Failed to load sharing options', 'error');
    }
  }

  async shareOnSocial(platform) {
    console.log('RSSManager: Sharing on platform:', platform);
    console.log('RSSManager: Current share data:', this.currentShareData);
    if (!this.currentShareData) {
      this.showNotification('No sharing data available. Please try clicking "Share" first.', 'error');
      return;
    }
    const socialLinks = this.currentShareData.socialSharing || this.currentShareData.socialLinks;
    if (!socialLinks) {
      this.showNotification('Social sharing links not available', 'error');
      console.error('RSSManager: No social links found in data:', this.currentShareData);
      return;
    }
    const url = socialLinks[platform];
    console.log('RSSManager: Opening URL for', platform, ':', url);
    if (url) {
      try {
        let topOffset = 20;
        const navbar = document.querySelector('.navbar, nav, header');
        if (navbar) {
          const rect = navbar.getBoundingClientRect();
          topOffset = rect.bottom + window.scrollY + 16;
        }
        const left = window.innerWidth - 340;
        const popupFeatures = `width=600,height=400,scrollbars=yes,resizable=yes,top=${topOffset},left=${left}`;
        if (platform === 'facebook' || platform === 'linkedin') {
          if (this.currentShareData.shareText) {
            await this.showShareTextDialog(this.currentShareData.shareText, platform, url);
          } else {
            window.open(url, '_blank', popupFeatures);
          }
        } else {
          window.open(url, '_blank', popupFeatures);
        }
        const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
        this.showNotification(`Opening ${platformName} sharing window...`, 'success');
      } catch (error) {
        console.error('RSSManager: Failed to open sharing window:', error);
        this.showNotification('Failed to open sharing window. Please try again.', 'error');
      }
    } else {
      this.showNotification(`${platform} sharing not available`, 'error');
      console.error('RSSManager: No URL found for platform:', platform);
    }
  }

  async showShareTextDialog(shareText, platform, shareUrl) {
    const platformName = platform === 'facebook' ? 'Facebook' : 'LinkedIn';
    let linkToShare = shareUrl;
    if (this.currentShareData && this.currentShareData.links && this.currentShareData.links.rss) {
      linkToShare = this.currentShareData.links.rss;
    }
    const modal = document.createElement('div');
    modal.className = 'share-text-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">Share on ${platformName}</h3>
      <p style="color: #666; margin-bottom: 20px;">
        Copy this text and the link to share on ${platformName}:
      </p>
      <textarea readonly style="
        width: 100%;
        height: 100px;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: inherit;
        resize: vertical;
        box-sizing: border-box;
      ">${shareText}\n${linkToShare}</textarea>
      <div style="margin-top: 20px; text-align: right;">
        <button id="copy-share-text" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          margin-right: 10px;
          cursor: pointer;
        ">Copy Text</button>
        <button id="open-share-platform" style="
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          margin-right: 10px;
          cursor: pointer;
        ">Open ${platformName}</button>
        <button id="close-share-modal" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">Close</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    const copyBtn = modal.querySelector('#copy-share-text');
    const openBtn = modal.querySelector('#open-share-platform');
    const closeBtn = modal.querySelector('#close-share-modal');
    const textarea = modal.querySelector('textarea');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(textarea.value);
        copyBtn.textContent = '✅ Copied!';
        copyBtn.style.background = '#28a745';
        setTimeout(() => {
          copyBtn.innerHTML = 'Copy Text';
          copyBtn.style.background = '#007bff';
        }, 2000);
      } catch (error) {
        console.warn('Could not copy to clipboard:', error);
        textarea.select();
        this.showNotification('Please manually copy the selected text', 'info');
      }
    });
    openBtn.addEventListener('click', () => {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
      modal.remove();
    });
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    textarea.select();
  }

  async copyEmbedCode() {
    try {
      const embedTextarea = document.getElementById('embed-code');
      
      if (embedTextarea && embedTextarea.value && embedTextarea.value.trim() !== '' && embedTextarea.value !== 'No embed code available') {
        await navigator.clipboard.writeText(embedTextarea.value);
        this.showNotification('Embed code copied to clipboard!', 'success');
      } else {
        this.showNotification('No embed code available. Please try sharing a feed first.', 'error');
      }
    } catch (error) {
      console.error('RSSManager: Failed to copy embed code:', error);
      
      try {
        const embedTextarea = document.getElementById('embed-code');
        if (embedTextarea) {
          embedTextarea.select();
          document.execCommand('copy');
          this.showNotification('Embed code copied to clipboard!', 'success');
        }
      } catch (fallbackError) {
        this.showNotification('Failed to copy embed code. Please copy manually from the text area.', 'error');
      }
    }
  }


  async testEmbedCode() {
    try {
      const embedTextarea = document.getElementById('embed-code');
      
      if (embedTextarea && embedTextarea.value && embedTextarea.value.trim() !== '' && embedTextarea.value !== 'No embed code available') {
        const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSS Embed Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .note { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .embed-container { border: 2px dashed #007bff; padding: 20px; border-radius: 8px; }
        .instructions { margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>RSS Embed Code Test</h1>
        <div class="note">
            <strong>Testing Note:</strong> This embed widget requires your RSS feed to be publicly accessible. 
            Since you're running locally, the widget might show an error. This is normal for local development.
        </div>
        
        <h3>Your Embed Code:</h3>
        <div class="embed-container">
            ${embedTextarea.value}
        </div>
        
        <div class="instructions">
            <h4>For Production Use:</h4>
            <ul>
                <li>Deploy your RSS feed to a public server</li>
                <li>Update the RSS URLs in the embed code to use your public domain</li>
                <li>Test the embed code on your live website</li>
            </ul>
            
            <h4>Local Testing Alternatives:</h4>
            <ul>
                <li>Use a local RSS reader like Thunderbird or Outlook</li>
                <li>Use browser RSS extensions</li>
                <li>Test the RSS XML directly: <a href="${this.getCurrentRSSUrl()}" target="_blank">Open RSS Feed</a></li>
            </ul>
        </div>
    </div>
</body>
</html>
        `;
        
        const testWindow = window.open('', '_blank');
        testWindow.document.write(testHtml);
        testWindow.document.close();
        
        this.showNotification('Embed test page opened in new window', 'success');
      } else {
        this.showNotification('No embed code available. Please try sharing a feed first.', 'error');
      }
    } catch (error) {
      console.error('RSSManager: Failed to test embed code:', error);
      this.showNotification('Failed to create embed test page', 'error');
    }
  }

  async copyRSSUrl() {
    try {
      if (this.currentShareData && this.currentShareData.links && this.currentShareData.links.rss) {
        await navigator.clipboard.writeText(this.currentShareData.links.rss);
        this.showNotification('RSS URL copied to clipboard!', 'success');
      } else {
        const demoUrl = `${this.apiBaseUrl}/rss/demo`;
        await navigator.clipboard.writeText(demoUrl);
        this.showNotification('Demo RSS URL copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('RSSManager: Failed to copy RSS URL:', error);
      this.showNotification('Failed to copy RSS URL', 'error');
    }
  }

  getCurrentRSSUrl() {
    if (this.currentShareData && this.currentShareData.links && this.currentShareData.links.rss) {
      return this.currentShareData.links.rss;
    }
    return `${this.apiBaseUrl}/rss/demo`;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    let topOffset = 20;
    const navbar = document.querySelector('.navbar, nav, header');
    if (navbar) {
      const rect = navbar.getBoundingClientRect();
      topOffset = rect.bottom + window.scrollY + 16;
    }
    Object.assign(notification.style, {
      position: 'fixed',
      top: `${topOffset}px`,
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word',
      background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8',
      boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.15)'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getCurrentPageRSSLinks() {
    const currentFilters = this.getCurrentPageFilters();
    const links = {};
    
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    const queryString = params.toString();
    
    links.recent = `${this.apiBaseUrl}/rss/pets?type=recent&${queryString}`;
    links.trending = `${this.apiBaseUrl}/rss/trending?${queryString}`;
    links.popular = `${this.apiBaseUrl}/rss/pets?type=popular&${queryString}`;
    
    return links;
  }

  getCurrentPageFilters() {
    return {
      species: document.getElementById('species-filter')?.value || '',
      breed: document.getElementById('breed-search')?.value || '',
      city: document.getElementById('city-filter')?.value || '',
      size: document.getElementById('size-filter')?.value || '',
      age: document.getElementById('age-filter')?.value || ''
    };
  }
}

const rssManager = new RSSManager();

if (typeof window !== 'undefined') {
  window.rssManager = rssManager;
}

export default RSSManager;
