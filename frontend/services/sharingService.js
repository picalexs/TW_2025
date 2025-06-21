class SharingService {  

  constructor() {
    this.baseURL = window.location.port === '8080' ? 
      window.location.origin : 
      (window.APP_CONFIG?.api?.baseURL || 'http://localhost:8080');
  }

  sharePet(pet, platform = 'facebook') {
    const petURL = `${this.baseURL}/frontend/pets/pet-details/pet-details.html?id=${pet.id}`;
    const imageURL = pet.imagePath 
      ? `${this.baseURL}/api/static/${pet.imagePath}`
      : `${this.baseURL}/frontend/assets/default-pet-profile.jpg`;
    
    const shareText = this.generateShareText(pet);
    
    switch (platform.toLowerCase()) {
      case 'facebook':
        this.shareOnFacebook(petURL, shareText);
        break;
      case 'twitter':
        this.shareOnTwitter(petURL, shareText, pet);
        break;
      case 'whatsapp':
        this.shareOnWhatsApp(shareText, petURL);
        break;
      case 'email':
        this.shareViaEmail(pet, petURL, shareText);
        break;
      case 'copy':
        this.copyToClipboard(petURL, shareText);
        break;
      default:
        console.warn('Unsupported sharing platform:', platform);
    }
  }

  generateShareText(pet) {
    const location = pet.address?.city || 'Unknown location';
    const ageText = pet.age ? ` (${pet.age} years old)` : '';
    const breedText = pet.breed && pet.breed !== 'Mixed Breed' ? ` - ${pet.breed}` : '';
    
    return `🐾 Meet ${pet.name}${ageText}, a lovely ${pet.species}${breedText} looking for a forever home in ${location}! ❤️ #PetAdoption #AdoptDontShop`;
  }


  shareOnFacebook(url, text) {
    const shareURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    this.openShareWindow(shareURL, 'Facebook');
  }

  shareOnTwitter(url, text, pet) {
    const hashtags = this.generateHashtags(pet);
    const tweetText = `${text}\n\n${url}`;
    const shareURL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&hashtags=${encodeURIComponent(hashtags)}`;
    this.openShareWindow(shareURL, 'Twitter');
  }

  shareOnWhatsApp(text, url) {
    const message = `${text}\n\nSee more details: ${url}`;
    const shareURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
    this.openShareWindow(shareURL, 'WhatsApp');
  }

  shareViaEmail(pet, url, text) {
    const subject = `🐾 Meet ${pet.name} - Available for Adoption!`;
    const body = this.generateEmailBody(pet, url, text);
    const mailtoURL = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoURL;
  }

  async copyToClipboard(url, text) {
    const shareContent = `${text}\n\nSee more details: ${url}`;
    
    try {
      await navigator.clipboard.writeText(shareContent);
      this.showNotification('Link copied to clipboard!', 'success');
    } catch (error) {
      this.fallbackCopyToClipboard(shareContent);
    }
  }

  generateHashtags(pet) {
    const hashtags = ['PetAdoption', 'AdoptDontShop'];
    
    if (pet.species) {
      hashtags.push(pet.species === 'dog' ? 'Dogs' : pet.species === 'cat' ? 'Cats' : pet.species);
    }
    
    if (pet.sizeCategory) {
      hashtags.push(`${pet.sizeCategory}${pet.species || 'Pet'}`);
    }
    
    if (pet.address?.city) {
      hashtags.push(pet.address.city.replace(/\s+/g, ''));
    }
    
    if (pet.tags) {
      pet.tags.forEach(tag => {
        const tagName = (tag.name || tag).replace(/\s+/g, '');
        if (tagName.length <= 20) {
          hashtags.push(tagName);
        }
      });
    }
    
    return hashtags.slice(0, 10).join(',');
  }

  generateEmailBody(pet, url, text) {
    const location = pet.address?.city || 'Unknown location';
    const details = [];
    
    if (pet.species) details.push(`Species: ${pet.species}`);
    if (pet.breed) details.push(`Breed: ${pet.breed}`);
    if (pet.age) details.push(`Age: ${pet.age} years`);
    if (pet.gender) details.push(`Gender: ${pet.gender}`);
    if (pet.sizeCategory) details.push(`Size: ${pet.sizeCategory}`);
    if (pet.adoptionFee) details.push(`Adoption Fee: $${pet.adoptionFee}`);
    
    return `Hi there!

I wanted to share this adorable pet that's looking for a forever home:

🐾 ${pet.name}

${details.join('\n')}
Location: ${location}

${pet.description ? `About ${pet.name}:\n${pet.description}\n\n` : ''}

${pet.relationWithOthers ? `Personality:\n${pet.relationWithOthers}\n\n` : ''}

You can see more photos and details, or contact the shelter directly here:
${url}

Help spread the word and find ${pet.name} a loving home! 🏠❤️

#PetAdoption #AdoptDontShop`;
}

  openShareWindow(url, platform) {
    const width = 600;
    const height = 400;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);
    
    window.open(
      url,
      `share-${platform}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showNotification('Link copied to clipboard!', 'success');
    } catch (error) {
      this.showNotification('Failed to copy link', 'error');
    }
    
    document.body.removeChild(textArea);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      transition: opacity 0.3s ease;
    `;
    
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

  getRSSFeedURLs() {
    return {
      all: `${this.baseURL}/api/rss/pets`,
      popular: `${this.baseURL}/api/rss/pets?sortBy=popular`,
      recent: `${this.baseURL}/api/rss/pets?sortBy=newest`,
      dogs: `${this.baseURL}/api/rss/pets?species=dog`,
      cats: `${this.baseURL}/api/rss/pets?species=cat`,
      birds: `${this.baseURL}/api/rss/pets?species=bird`,
      rabbits: `${this.baseURL}/api/rss/pets?species=rabbit`
    };
  }

  getCustomRSSFeedURL(filters = {}) {
    const params = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    
    return `${this.baseURL}/api/rss/pets?${params.toString()}`;
  }

  getLocationRSSFeedURL(city, country, popular = false) {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (country) params.append('country', country);
    if (popular) params.append('sortBy', 'popular');
    
    return popular 
      ? `${this.baseURL}/api/rss/popular-by-location?${params.toString()}`
      : `${this.baseURL}/api/rss/pets?${params.toString()}`;
  }

  getBreedRSSFeedURL(breed, species) {
    const params = new URLSearchParams();
    if (breed) params.append('breed', breed);
    if (species) params.append('species', species);
    
    return `${this.baseURL}/api/rss/recent-by-breed?${params.toString()}`;
  }

  shareRSSFeed(feedURL, feedTitle = 'Pet Adoption RSS Feed') {
    const shareText = `🔔 Subscribe to our ${feedTitle} to get notified about new pets available for adoption!`;
    const shareContent = `${shareText}\n\nRSS Feed URL: ${feedURL}`;
    
    this.copyToClipboard(feedURL, shareText);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SharingService;
}

if (typeof window !== 'undefined') {
  window.SharingService = SharingService;
}
