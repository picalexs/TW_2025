(function() {
    'use strict';
      window.PetWidgetConfig = window.PetWidgetConfig || {
        apiUrl: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:8080'
          : 'https://pet-center.site',
        limit: 10,
        showTitle: true,
        title: 'Recent Pets for Adoption',
        showRSSLink: true,
        showViewAllLink: true,
        maxWidth: '600px',
        borderRadius: '8px',
        padding: '16px'
    };
    
    function createPetWidget(containerId, config) {
        config = Object.assign({}, window.PetWidgetConfig, config || {});
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Pet Widget: Container not found:', containerId);
            return;
        }
        
        container.innerHTML = `
            <div id="pet-widget-${containerId}" style="
                max-width: ${config.maxWidth}; 
                border: 1px solid #ddd; 
                border-radius: ${config.borderRadius}; 
                padding: ${config.padding}; 
                font-family: Arial, sans-serif; 
                background: #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                ${config.showTitle ? `
                <div style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                    <span style="font-size: 20px; margin-right: 8px;">🐾</span>
                    <h4 style="margin: 0; color: #333; font-size: 16px;">${config.title}</h4>
                </div>
                ` : ''}
                <div id="pet-widget-items-${containerId}" style="min-height: 100px;">
                    <div style="text-align: center; color: #666; padding: 20px;">
                        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: petWidgetSpin 1s linear infinite;"></div>
                        <p style="margin: 8px 0 0 0;">Loading pets...</p>
                    </div>
                </div>
                ${(config.showRSSLink || config.showViewAllLink) ? `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee;">
                    ${config.showRSSLink ? `<a href="${config.apiUrl}/api/rss/pets?type=recent&limit=${config.limit}" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">📡 RSS Feed</a>` : ''}
                    ${(config.showRSSLink && config.showViewAllLink) ? '<span style="color: #ccc; margin: 0 8px;">•</span>' : ''}
                    ${config.showViewAllLink ? `<a href="${config.apiUrl}/pets" target="_blank" style="color: #007bff; text-decoration: none; font-size: 12px;">View All Pets</a>` : ''}
                </div>
                ` : ''}
            </div>
        `;
        
        if (!document.getElementById('pet-widget-styles')) {
            const style = document.createElement('style');
            style.id = 'pet-widget-styles';
            style.textContent = `
                @keyframes petWidgetSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .pet-widget-card {
                    margin-bottom: 12px; 
                    padding-bottom: 12px; 
                    border-bottom: 1px solid #f0f0f0;
                    transition: background-color 0.2s ease;
                }
                .pet-widget-card:hover {
                    background-color: #f9f9f9;
                    border-radius: 4px;
                    padding: 8px;
                    margin: 4px -8px 8px -8px;
                }
                .pet-widget-card:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
            `;
            document.head.appendChild(style);
        }
        
        loadPetsData(containerId, config);
    }
    
    function loadPetsData(containerId, config) {
        const itemsContainer = document.getElementById(`pet-widget-items-${containerId}`);
        const jsonApiUrl = `${config.apiUrl}/api/pets/feed?format=json&type=recent&limit=${config.limit}`;
        const rssUrl = `${config.apiUrl}/api/rss/pets?type=recent&limit=${config.limit}`;
        
        function displayError(message) {
            itemsContainer.innerHTML = `<p style="color: #999; text-align: center; padding: 20px; margin: 0;">${message}</p>`;
        }
        
        function displayPets(pets) {
            if (!pets || pets.length === 0) {
                displayError('No pets available at the moment');
                return;
            }
            
            itemsContainer.innerHTML = pets.map(pet => {
                const name = pet.name || pet.NAME || 'Unknown';
                const species = pet.species || pet.SPECIES || '';
                const breed = pet.breed || pet.BREED || '';
                const age = pet.age || pet.AGE || '';
                const city = pet.city || pet.CITY || '';
                const description = pet.description || pet.DESCRIPTION || '';
                
                const petInfo = [species, breed].filter(Boolean).join(' ');
                const location = city ? ` • ${city}` : '';
                const desc = description.length > 80 ? description.substring(0, 80) + '...' : description;
                
                const ageDisplay = age ? ` (${age})` : '';
                
                return `
                    <div class="pet-widget-card">
                        <h5 style="margin: 0 0 4px 0; color: #333; font-size: 14px;">
                            🐕 ${name}${ageDisplay}
                        </h5>
                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                            ${petInfo}${location}
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #888; line-height: 1.4;">
                            ${desc}
                        </p>
                    </div>
                `;
            }).join('');
        }
        
        fetch(jsonApiUrl)
            .then(response => {
                if (!response.ok) throw new Error('JSON API failed');
                return response.json();
            })
            .then(data => {
                if (data.success && data.data) {
                    displayPets(data.data);
                } else {
                    throw new Error('Invalid data format');
                }
            })
            .catch(error => {
                console.error('Error loading pets data:', error);
                displayError('Failed to load pets data. Please try again later.');
            });
    }
    
    function autoInitialize() {
        const widgets = document.querySelectorAll('.pet-adoption-widget');
        widgets.forEach((widget, index) => {
            if (!widget.id) {
                widget.id = `auto-pet-widget-${index}`;
            }
            
            const config = {
                apiUrl: widget.dataset.apiUrl || window.PetWidgetConfig.apiUrl,
                limit: parseInt(widget.dataset.limit) || window.PetWidgetConfig.limit,
                showTitle: widget.dataset.showTitle !== 'false',
                title: widget.dataset.title || window.PetWidgetConfig.title,
                showRSSLink: widget.dataset.showRssLink !== 'false',
                showViewAllLink: widget.dataset.showViewAllLink !== 'false'
            };
            
            createPetWidget(widget.id, config);
        });
    }
    
    window.createPetWidget = createPetWidget;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitialize);
    } else {
        autoInitialize();
    }
})();
