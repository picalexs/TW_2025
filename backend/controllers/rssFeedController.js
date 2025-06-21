const { sendResponse } = require('../utils/helpers');
const RSSFeedModel = require('../models/rssFeedModel');

class RSSFeedController {
    constructor() {
        this.rssFeedModel = new RSSFeedModel();
    }

    async generateRSSFeed(req, res) {
        try {
            const { type = 'recent', zone, breed, species, limit = 20 } = req.query;
            
            const pets = await this.rssFeedModel.getPetsForRSSFeed({
                type,
                zone,
                breed,
                species,
                limit
            });
            
            const rssXml = this.generateRSSXML(pets, type, { zone, breed, species });
            
            res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.writeHead(200);
            res.end(rssXml);
            
        } catch (error) {
            console.error('Error generating RSS feed:', error);
            sendResponse(res, 500, {
                error: 'Failed to generate RSS feed',
                message: error.message,
                code: 'RSS_GENERATION_ERROR'
            });
        }
    }

    async generateTrendingRSSFeed(req, res) {
        try {
            const { zone, radius = 50, limit = 20 } = req.query;
            const pets = await this.rssFeedModel.getTrendingPets({
                zone,
                limit
            });
            
            const rssXml = this.generateTrendingRSSXML(pets, { zone, radius });
            
            res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=1800');
            res.writeHead(200);
            res.end(rssXml);
            
        } catch (error) {
            console.error('Error generating trending RSS feed:', error);
            sendResponse(res, 500, {
                error: 'Failed to generate trending RSS feed',
                message: error.message,
                code: 'RSS_TRENDING_ERROR'
            });
        }
    }
    
    generateRSSXML(pets, feedType, filters) {
        const feedTitle = this.getFeedTitle(feedType, filters);
        const feedDescription = this.getFeedDescription(feedType, filters);
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${this.escapeXML(feedTitle)}</title>
        <description>${this.escapeXML(feedDescription)}</description>
        <link>${baseUrl}/pets</link>
        <atom:link href="${baseUrl}/api/rss/pets?type=${feedType}" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <pubDate>${new Date().toUTCString()}</pubDate>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>Pet Adoption Platform RSS Generator</generator>
`;

        pets.forEach(pet => {
            const petUrl = `${baseUrl}/pets/pet-details?id=${pet.ID}`;
            const imageUrl = pet.IMAGE_PATH ? `${baseUrl}/${pet.IMAGE_PATH}` : `${baseUrl}/assets/default-pet-profile.jpg`;
            
            rssXml += `
        <item>
            <title>${this.escapeXML(pet.NAME)} - ${this.escapeXML(pet.SPECIES)} for Adoption</title>
            <description><![CDATA[
                <img src="${imageUrl}" alt="${this.escapeXML(pet.NAME)}" style="max-width: 300px; float: left; margin-right: 15px;"/>
                <h3>${this.escapeXML(pet.NAME)}</h3>
                <p><strong>Species:</strong> ${this.escapeXML(pet.SPECIES)}</p>
                <p><strong>Breed:</strong> ${this.escapeXML(pet.BREED || 'Mixed Breed')}</p>
                <p><strong>Age:</strong> ${pet.AGE ? pet.AGE + ' years' : 'Unknown'}</p>
                <p><strong>Gender:</strong> ${this.escapeXML(pet.GENDER)}</p>
                <p><strong>Size:</strong> ${this.escapeXML(pet.SIZE_CATEGORY)}</p>
                <p><strong>Color:</strong> ${this.escapeXML(pet.COLOR)}</p>
                <p><strong>Location:</strong> ${this.escapeXML(pet.CITY || 'Not specified')}, ${this.escapeXML(pet.COUNTRY || '')}</p>
                <p><strong>Adoption Fee:</strong> ${pet.ADOPTION_FEE ? '$' + pet.ADOPTION_FEE : 'Contact shelter'}</p>
                <p><strong>Shelter:</strong> ${this.escapeXML(pet.SHELTER_NAME || 'Not specified')}</p>
                ${pet.DESCRIPTION ? '<p><strong>Description:</strong> ' + this.escapeXML(pet.DESCRIPTION) + '</p>' : ''}
                ${pet.VIEWS_COUNT ? '<p><strong>Views:</strong> ' + pet.VIEWS_COUNT + '</p>' : ''}
                ${pet.FAVORITES_COUNT ? '<p><strong>Favorites:</strong> ' + pet.FAVORITES_COUNT + '</p>' : ''}
                <div style="clear: both;"></div>
            ]]></description>
            <link>${petUrl}</link>
            <guid isPermaLink="true">${petUrl}</guid>
            <pubDate>${new Date(pet.CREATED_AT).toUTCString()}</pubDate>
            <category>${this.escapeXML(pet.SPECIES)}</category>
            ${pet.BREED ? '<category>' + this.escapeXML(pet.BREED) + '</category>' : ''}
            <enclosure url="${imageUrl}" type="image/jpeg"/>
        </item>`;
        });
        
        rssXml += `
    </channel>
</rss>`;
        
        return rssXml;
    }
    
    generateTrendingRSSXML(pets, filters) {
        const feedTitle = `Trending Pets for Adoption${filters.zone ? ' in ' + filters.zone : ''}`;
        const feedDescription = `Most popular and trending pets available for adoption${filters.zone ? ' in the ' + filters.zone + ' area' : ''}`;
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        let rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>${this.escapeXML(feedTitle)}</title>
        <description>${this.escapeXML(feedDescription)}</description>
        <link>${baseUrl}/pets</link>
        <atom:link href="${baseUrl}/api/rss/trending" rel="self" type="application/rss+xml"/>
        <language>en-us</language>
        <pubDate>${new Date().toUTCString()}</pubDate>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <generator>Pet Adoption Platform RSS Generator</generator>
        <category>Trending</category>
        <category>Popular</category>
`;

        pets.forEach(pet => {
            const petUrl = `${baseUrl}/pets/pet-details?id=${pet.ID}`;
            const imageUrl = pet.IMAGE_PATH ? `${baseUrl}/${pet.IMAGE_PATH}` : `${baseUrl}/assets/default-pet-profile.jpg`;
            const popularityScore = pet.POPULARITY_SCORE || 0;
            
            rssXml += `
        <item>
            <title>🔥 TRENDING: ${this.escapeXML(pet.NAME)} - ${this.escapeXML(pet.SPECIES)} for Adoption</title>
            <description><![CDATA[
                <img src="${imageUrl}" alt="${this.escapeXML(pet.NAME)}" style="max-width: 300px; float: left; margin-right: 15px;"/>
                <h3>🔥 TRENDING: ${this.escapeXML(pet.NAME)}</h3>
                <p><strong>Popularity Score:</strong> ${popularityScore}</p>
                <p><strong>Species:</strong> ${this.escapeXML(pet.SPECIES)}</p>
                <p><strong>Breed:</strong> ${this.escapeXML(pet.BREED || 'Mixed Breed')}</p>
                <p><strong>Age:</strong> ${pet.AGE ? pet.AGE + ' years' : 'Unknown'}</p>
                <p><strong>Gender:</strong> ${this.escapeXML(pet.GENDER)}</p>
                <p><strong>Size:</strong> ${this.escapeXML(pet.SIZE_CATEGORY)}</p>
                <p><strong>Color:</strong> ${this.escapeXML(pet.COLOR)}</p>
                <p><strong>Location:</strong> ${this.escapeXML(pet.CITY || 'Not specified')}, ${this.escapeXML(pet.COUNTRY || '')}</p>
                <p><strong>Adoption Fee:</strong> ${pet.ADOPTION_FEE ? '$' + pet.ADOPTION_FEE : 'Contact shelter'}</p>
                <p><strong>Shelter:</strong> ${this.escapeXML(pet.SHELTER_NAME || 'Not specified')}</p>
                ${pet.DESCRIPTION ? '<p><strong>Description:</strong> ' + this.escapeXML(pet.DESCRIPTION) + '</p>' : ''}
                <p><strong>Engagement Stats:</strong></p>
                <ul>
                    <li>Views: ${pet.VIEWS_COUNT || 0}</li>
                    <li>Favorites: ${pet.FAVORITES_COUNT || 0}</li>
                    <li>Adoption Requests: ${pet.ADOPTION_REQUESTS_COUNT || 0}</li>
                </ul>
                <div style="clear: both;"></div>
            ]]></description>
            <link>${petUrl}</link>
            <guid isPermaLink="true">${petUrl}</guid>
            <pubDate>${new Date(pet.CREATED_AT).toUTCString()}</pubDate>
            <category>Trending</category>
            <category>${this.escapeXML(pet.SPECIES)}</category>
            ${pet.BREED ? '<category>' + this.escapeXML(pet.BREED) + '</category>' : ''}
            <enclosure url="${imageUrl}" type="image/jpeg"/>
        </item>`;
        });
        
        rssXml += `
    </channel>
</rss>`;
        
        return rssXml;
    }

    async getShareableLinks(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const searchParams = url.searchParams;
        
        const type = searchParams.get('type') || 'recent';
        const zone = searchParams.get('zone');
        const breed = searchParams.get('breed');
        const species = searchParams.get('species');
        const limit = searchParams.get('limit') || '10';
        
        const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
        
        try {
            const links = {
                rss: `${baseUrl}/api/rss/pets?type=${type}&zone=${zone || ''}&breed=${breed || ''}&species=${species || ''}&limit=${limit}`,
                trending: `${baseUrl}/api/rss/trending?zone=${zone || ''}&limit=${limit}`,
                json: `${baseUrl}/api/pets/feed?type=${type}&zone=${zone || ''}&breed=${breed || ''}&species=${species || ''}&limit=${limit}`,
                web: `${baseUrl}/pets?species=${species || ''}&breed=${breed || ''}`
            };
            const shareText = this.generateShareText(type, { zone, breed, species });
            const embedCode = this.generateEmbedCode(links.rss, type, { zone, breed, species });
            
            sendResponse(res, 200, {
                success: true,
                data: {
                    links,
                    shareText,
                    embedCode,                    
                    socialSharing: {
                        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(links.web)}`,
                        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(links.web)}`,
                        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(links.web)}`,
                        email: `mailto:?subject=${encodeURIComponent('Check out these pets for adoption!')}&body=${encodeURIComponent(shareText + '\n\n' + links.web)}`
                    }
                }
            });
            
        } catch (error) {
            console.error('Error generating shareable links:', error);
            sendResponse(res, 500, {
                error: 'Failed to generate shareable links',
                message: error.message,
                code: 'SHARE_LINKS_ERROR'
            });
        }
    }

    async generateDemoRSSFeed(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const searchParams = url.searchParams;
            
            const type = searchParams.get('type') || 'recent';
            const zone = searchParams.get('zone');
            const breed = searchParams.get('breed');
            const species = searchParams.get('species');
            
            const samplePets = [
                {
                    ID: 1,
                    NAME: 'Buddy',
                    SPECIES: 'Dog',
                    BREED: 'Golden Retriever',
                    AGE: 3,
                    GENDER: 'male',
                    SIZE_CATEGORY: 'large',
                    COLOR: 'Golden',
                    DESCRIPTION: 'Friendly and energetic dog looking for an active family.',
                    ADOPTION_FEE: 350,
                    CREATED_AT: new Date(),
                    CITY: 'Bucharest',
                    COUNTRY: 'Romania',
                    SHELTER_NAME: 'Happy Paws Shelter',
                    VIEWS_COUNT: 156,
                    FAVORITES_COUNT: 23,
                    ADOPTION_REQUESTS_COUNT: 5
                },
                {
                    ID: 2,
                    NAME: 'Luna',
                    SPECIES: 'Cat',
                    BREED: 'Persian',
                    AGE: 2,
                    GENDER: 'female',
                    SIZE_CATEGORY: 'medium',
                    COLOR: 'White',
                    DESCRIPTION: 'Gentle and calm cat perfect for indoor living.',
                    ADOPTION_FEE: 200,
                    CREATED_AT: new Date(Date.now() - 86400000),
                    CITY: 'Cluj-Napoca',
                    COUNTRY: 'Romania',
                    SHELTER_NAME: 'Feline Friends',
                    VIEWS_COUNT: 89,
                    FAVORITES_COUNT: 15,
                    ADOPTION_REQUESTS_COUNT: 3
                },
                {
                    ID: 3,
                    NAME: 'Charlie',
                    SPECIES: 'Dog',
                    BREED: 'Labrador Mix',
                    AGE: 5,
                    GENDER: 'male',
                    SIZE_CATEGORY: 'large',
                    COLOR: 'Black',
                    DESCRIPTION: 'Loyal and well-trained dog, great with kids.',
                    ADOPTION_FEE: 300,
                    CREATED_AT: new Date(Date.now() - 172800000),
                    CITY: 'Timisoara',
                    COUNTRY: 'Romania',
                    SHELTER_NAME: 'Rescue Haven',
                    VIEWS_COUNT: 234,
                    FAVORITES_COUNT: 31,
                    ADOPTION_REQUESTS_COUNT: 8
                }
            ];
            
            let filteredPets = samplePets;
            if (species) {
                filteredPets = filteredPets.filter(pet => 
                    pet.SPECIES.toLowerCase() === species.toLowerCase()
                );
            }
            if (breed) {
                filteredPets = filteredPets.filter(pet => 
                    pet.BREED.toLowerCase().includes(breed.toLowerCase())
                );
            }
            if (zone) {
                filteredPets = filteredPets.filter(pet => 
                    pet.CITY.toLowerCase().includes(zone.toLowerCase())
                );
            }
            
            const rssXml = this.generateRSSXML(filteredPets, type, { zone, breed, species });
            
            res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.writeHead(200);
            res.end(rssXml);
            
        } catch (error) {
            console.error('Error generating demo RSS feed:', error);
            sendResponse(res, 500, {
                error: 'Failed to generate demo RSS feed',
                message: error.message,
                code: 'RSS_DEMO_ERROR'
            });
        }
    }
    
    getFeedTitle(feedType, filters) {
        let title = feedType === 'popular' ? 'Popular Pets for Adoption' : 'Recent Pets for Adoption';
        
        if (filters.zone) title += ` in ${filters.zone}`;
        if (filters.species) title += ` - ${filters.species}`;
        if (filters.breed) title += ` - ${filters.breed}`;
        
        return title;
    }
    
    getFeedDescription(feedType, filters) {
        let description = feedType === 'popular' 
            ? 'Most popular pets available for adoption based on views, favorites, and adoption requests'
            : 'Latest pets available for adoption';
            
        if (filters.zone) description += ` in the ${filters.zone} area`;
        if (filters.species) description += `. Filtered for ${filters.species}`;
        if (filters.breed) description += ` - ${filters.breed} breed`;
        
        return description;
    }
    
    generateShareText(type, filters) {
        let text = type === 'popular' 
            ? 'Check out these popular pets available for adoption!'
            : 'Discover amazing pets looking for their forever homes!';
            
        if (filters.zone) text += ` Located in ${filters.zone}.`;
        if (filters.species) text += ` ${filters.species} lovers, this is for you!`;
        
        return text;    }

    generateEmbedCode(rssUrl, type, filters) {
        const { zone, breed, species } = filters;
        const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
        
        let description = 'Pet Adoption RSS Feed';
        if (type === 'trending') {
            description = 'Trending Pets for Adoption';
        } else if (type === 'popular') {
            description = 'Popular Pets for Adoption';
        } else {
            description = 'Recent Pets for Adoption';
        }
        
        if (species) {
            description += ` - ${species.charAt(0).toUpperCase() + species.slice(1)}s`;
        }
        if (breed) {
            description += ` - ${breed}`;
        }
        if (zone) {
            description += ` in ${zone}`;
        }

        const url = new URL(rssUrl);
        const params = url.searchParams;
        const jsonUrl = `${baseUrl}/api/pets/feed?${params.toString()}`;
        
        const embedCode = `<!-- Pet Adoption RSS Feed Widget -->
<div id="pet-rss-widget" style="max-width: 600px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; font-family: Arial, sans-serif; background: #fff;">
    <div style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <span style="font-size: 20px; margin-right: 8px;">🐾</span>
        <h4 style="margin: 0; color: #333; font-size: 16px;">${description}</h4>
    </div>
    <div id="pet-rss-items" style="min-height: 100px;">
        <div style="text-align: center; color: #666; padding: 20px;">
            <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin: 8px 0 0 0;">Loading pets...</p>
        </div>
    </div>
    <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
        <a href="${rssUrl}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">📡 RSS Feed</a>
        <span style="color: #ccc; margin: 0 8px;">•</span>
        <a href="${baseUrl}/pets" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">View All Pets</a>
    </div>
</div>

<style>
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>

<script>
(function() {
    // Try to load from JSON API first (better for local dev), fallback to RSS
    const jsonApiUrl = '${jsonUrl}';
    const rssUrl = '${rssUrl}';
    const container = document.getElementById('pet-rss-items');
    
    function displayError(message) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px; margin: 0;">' + message + '</p>';
    }
    
    function displayPets(pets) {
        if (!pets || pets.length === 0) {
            displayError('No pets available at the moment');
            return;
        }
        
        container.innerHTML = pets.slice(0, 5).map(pet => {
            const age = pet.age || pet.AGE || 'Unknown age';
            const name = pet.name || pet.NAME || 'Unnamed pet';
            const species = pet.species || pet.SPECIES || '';
            const breed = pet.breed || pet.BREED || '';
            const description = pet.description || pet.DESCRIPTION || '';
            const city = pet.city || pet.CITY || '';
            
            const petInfo = [species, breed].filter(Boolean).join(' • ');
            const location = city ? ' in ' + city : '';
            const desc = description.length > 100 ? description.substring(0, 100) + '...' : description;
            
            return \`
                <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;">
                    <h5 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">
                        🐕 \${name} (\${age})
                    </h5>
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                        \${petInfo}\${location}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                        \${desc}
                    </p>
                </div>
            \`;
        }).join('');
    }
    
    // Try JSON API first
    fetch(jsonApiUrl)
        .then(response => {
            if (!response.ok) throw new Error('JSON API failed');
            return response.json();
        })
        .then(data => {
            const pets = data.data || data.pets || data;
            displayPets(Array.isArray(pets) ? pets : []);
        })
        .catch(() => {
            // Fallback to RSS parsing
            fetch(rssUrl)
                .then(response => {
                    if (!response.ok) throw new Error('RSS feed failed');
                    return response.text();
                })
                .then(str => {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(str, "text/xml");
                    const items = xml.querySelectorAll("item");
                    
                    const pets = Array.from(items).map(item => {
                        const title = item.querySelector("title")?.textContent || '';
                        const description = item.querySelector("description")?.textContent || '';
                        
                        // Extract name and age from title (format: "Name (Age)")
                        const titleMatch = title.match(/^(.+?)\\s*\\((.+?)\\)/);
                        const name = titleMatch ? titleMatch[1] : title;
                        const age = titleMatch ? titleMatch[2] : '';
                        
                        return { name, age, description, species: '', breed: '', city: '' };
                    });
                    
                    displayPets(pets);
                })
                .catch(() => {
                    displayError('Unable to load pet data. RSS feed may not be accessible.');
                });
        });
})();
</script>`;

        return embedCode;
    }

    escapeXML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

module.exports = new RSSFeedController();