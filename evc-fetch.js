// evc-fetch.js - Complete working version with all 29 EVCs and placeholder fallback

let map, marker, modalMap;

document.addEventListener("DOMContentLoaded", () => {
  // Legacy map (hidden via CSS)
  map = L.map("map").setView([-37.8136, 144.9631], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Address lookup
  document.getElementById("address-form").addEventListener("submit", e => {
    e.preventDefault();
    const addr = document.getElementById("address-input").value.trim();
    if (!addr) return alert("Please enter an address.");
    
    hideAutocomplete();
    
    const searchBtn = document.getElementById("search-button");
    searchBtn.disabled = true;
    searchBtn.textContent = "Finding your garden...";
    
    geocodeAddress(addr);
  });

  setupAddressAutocomplete();

  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("evc-modal").style.display = "none";
  });

  document.getElementById("gf-form").addEventListener("submit", e => {
    const btn = e.target.querySelector("button");
    setTimeout(() => {
      btn.textContent = "Thanks! Check your email soon.";
      btn.disabled = true;
    }, 500);
  });

  // Geolocation button
  const locationBtn = document.getElementById("location-button");
  if (locationBtn) {
    locationBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert("Geolocation requires a secure connection (HTTPS). Please use the address search instead.");
        return;
      }

      locationBtn.textContent = "Finding your garden...";
      locationBtn.disabled = true;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const options = {
        enableHighAccuracy: !isIOS,
        timeout: isIOS ? 30000 : 20000,
        maximumAge: isIOS ? 60000 : 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          map.setView([lat, lon], 12);
          marker && map.removeLayer(marker);
          marker = L.marker([lat, lon]).addTo(map);
          
          fetchEVCData(lat, lon);
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errorMsg = "Unable to get your location. ";
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              if (isIOS) {
                errorMsg += "On iPhone: Go to Settings → Safari → Location → Allow. Then refresh and try again.";
              } else {
                errorMsg += "Please allow location access in your browser settings and try again.";
              }
              break;
            case error.POSITION_UNAVAILABLE:
              if (isIOS) {
                errorMsg += "Make sure Location Services are enabled in Settings → Privacy & Security → Location Services.";
              } else {
                errorMsg += "Location information is unavailable. Please check your device's location settings.";
              }
              break;
            case error.TIMEOUT:
              errorMsg += "Location request timed out. Please try again or use the address search.";
              break;
            default:
              errorMsg += "An unknown error occurred.";
          }
          
          alert(errorMsg + " You can also enter your address instead.");
          locationBtn.textContent = "📍 Use My Location";
          locationBtn.disabled = false;
        },
        options
      );
    });
  }
});

function geocodeAddress(address) {
  window.searchedAddress = address;
  
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1`)
    .then(r => {
      if (!r.ok) throw new Error(`Geocode failed (${r.status})`);
      return r.json();
    })
    .then(results => {
      if (!results.length) throw new Error("Address not found.");
      
      const result = results[0];
      const isVictoria = result.address?.state === 'Victoria' || 
                        result.address?.state === 'VIC' ||
                        result.display_name.includes('Victoria') ||
                        result.display_name.includes('VIC');
      
      if (!isVictoria) {
        throw new Error("We currently only serve Victoria. Please enter a Victorian address.");
      }
      
      const [lat, lon] = [+result.lat, +result.lon];
      map.setView([lat, lon], 12);
      marker && map.removeLayer(marker);
      marker = L.marker([lat, lon]).addTo(map);
      fetchEVCData(lat, lon);
    })
    .catch(err => {
      alert(err.message);
      const searchBtn = document.getElementById("search-button");
      searchBtn.disabled = false;
      searchBtn.textContent = "Find My Garden";
    });
}

let autocompleteTimeout;
let autocompleteResults = [];

function setupAddressAutocomplete() {
  const input = document.getElementById("address-input");
  const form = document.getElementById("address-form");
  
  const dropdown = document.createElement("div");
  dropdown.id = "address-autocomplete";
  dropdown.style.display = "none";
  dropdown.style.position = "absolute";
  dropdown.style.zIndex = "1000";
  dropdown.style.backgroundColor = "white";
  dropdown.style.border = "2px solid #3d4535";
  dropdown.style.borderRadius = "8px";
  dropdown.style.maxHeight = "300px";
  dropdown.style.overflowY = "auto";
  dropdown.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
  dropdown.style.width = input.offsetWidth + "px";
  dropdown.style.marginTop = "8px";
  
  form.parentNode.insertBefore(dropdown, form.nextSibling);
  
  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      dropdown.style.position = "absolute";
      const formRect = form.getBoundingClientRect();
      dropdown.style.top = (formRect.height + 8) + "px";
      dropdown.style.left = "0";
      dropdown.style.width = "100%";
    } else {
      dropdown.style.position = "fixed";
      dropdown.style.top = (rect.bottom + 8) + "px";
      dropdown.style.left = rect.left + "px";
      dropdown.style.width = rect.width + "px";
    }
  }
  
  input.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      hideAutocomplete();
      return;
    }
    
    clearTimeout(autocompleteTimeout);
    autocompleteTimeout = setTimeout(() => {
      fetchAddressSuggestions(query);
    }, 300);
  });
  
  window.addEventListener("scroll", () => {
    if (dropdown.style.display !== "none") {
      positionDropdown();
    }
  });
  
  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.closest("#address-autocomplete") === null) {
      hideAutocomplete();
    }
  });
  
  window.addEventListener("resize", () => {
    if (dropdown.style.display !== "none") {
      positionDropdown();
    }
  });
  
  dropdown.positionDropdown = positionDropdown;
}

function fetchAddressSuggestions(query) {
  const url = `https://nominatim.openstreetmap.org/search?` +
    `format=json` +
    `&q=${encodeURIComponent(query + ', Victoria, Australia')}` +
    `&countrycodes=au` +
    `&limit=10` +
    `&addressdetails=1`;
  
  fetch(url)
    .then(r => r.json())
    .then(results => {
      const victoriaResults = results.filter(result => {
        const address = result.address || {};
        const isVictoria = address.state === 'Victoria' || 
               address.state === 'VIC' ||
               result.display_name.includes('Victoria') ||
               result.display_name.includes('VIC');
        
        const isResidential = (
          address.house_number &&
          !address.amenity &&
          !address.shop &&
          !address.office &&
          !address.tourism &&
          !result.name
        );
        
        return isVictoria && isResidential;
      })
      .slice(0, 5);
      
      autocompleteResults = victoriaResults;
      displayAutocompleteSuggestions(victoriaResults);
    })
    .catch(err => {
      console.error("Autocomplete error:", err);
    });
}

function displayAutocompleteSuggestions(results) {
  const dropdown = document.getElementById("address-autocomplete");
  
  if (!results || results.length === 0) {
    dropdown.style.display = "none";
    return;
  }
  
  dropdown.innerHTML = "";
  
  results.forEach((result, index) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.style.padding = "12px 16px";
    item.style.cursor = "pointer";
    item.style.borderBottom = index < results.length - 1 ? "1px solid #e2e8f0" : "none";
    item.style.transition = "background-color 0.2s";
    item.style.fontFamily = "'IBM Plex Mono', monospace";
    item.style.fontSize = "14px";
    
    const displayName = result.display_name;
    item.textContent = displayName;
    
    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#f7f7f7";
    });
    
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "white";
    });
    
    item.addEventListener("click", () => {
      selectAddress(result);
    });
    
    dropdown.appendChild(item);
  });
  
  dropdown.positionDropdown();
  dropdown.style.display = "block";
}

function selectAddress(result) {
  const input = document.getElementById("address-input");
  input.value = result.display_name;
  hideAutocomplete();
  
  const isVictoria = result.address?.state === 'Victoria' || 
                    result.address?.state === 'VIC' ||
                    result.display_name.includes('Victoria') ||
                    result.display_name.includes('VIC');
  
  if (!isVictoria) {
    alert("We currently only serve Victoria. Please enter a Victorian address.");
    return;
  }
  
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  
  window.searchedAddress = result.display_name;
  
  map.setView([lat, lon], 12);
  marker && map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  
  const searchBtn = document.getElementById("search-button");
  searchBtn.disabled = true;
  searchBtn.textContent = "Finding your garden...";
  
  fetchEVCData(lat, lon);
}

function hideAutocomplete() {
  const dropdown = document.getElementById("address-autocomplete");
  if (dropdown) {
    dropdown.style.display = "none";
    dropdown.innerHTML = "";
  }
}

function fetchEVCData(lat, lon) {
  const d = 0.02,
        bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`,
        url  = "https://opendata.maps.vic.gov.au/geoserver/wfs" +
               "?service=WFS&version=1.0.0&request=GetFeature" +
               "&typeName=open-data-platform:nv2005_evcbcs" +
               `&bbox=${bbox},EPSG:4326` +
               "&outputFormat=application/json";

  fetch(url)
    .then(r => r.text())
    .then(txt => {
      if (txt.trim().startsWith("<"))
        throw new Error("EVC service error. Try again later.");
      return JSON.parse(txt);
    })
    .then(data => {
      if (!data.features?.length)
        throw new Error("No EVC data found for this location.");
      const pt   = turf.point([lon, lat]),
            feat = data.features.find(f =>
                     f.geometry.type === "Polygon" &&
                     turf.booleanPointInPolygon(pt, turf.polygon(f.geometry.coordinates))
                   ) || data.features[0],
            p    = feat.properties;

      displayModal(p.x_evcname, p.evc_bcs_desc, p.bioregion, p.evc, lat, lon);
    })
    .catch(err => {
      alert(err.message);
      const searchBtn = document.getElementById("search-button");
      searchBtn.disabled = false;
      searchBtn.textContent = "Find My Garden";
      
      const locationBtn = document.getElementById("location-button");
      locationBtn.disabled = false;
      locationBtn.textContent = "📍 Use My Location";
    });
}

function checkPlantImage(plantName) {
  return new Promise((resolve) => {
    let nameForImage = plantName;
    const commonNameMatch = plantName.match(/\(([^)]+)\)/);
    if (commonNameMatch) {
      nameForImage = commonNameMatch[1].trim();
    }
    
    const imageName = nameForImage.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/['']/g, '');
    
    const img = new Image();
    img.onload = () => resolve({ exists: true, url: `images/plants/${imageName}.jpg` });
    img.onerror = () => resolve({ exists: false, url: null });
    img.src = `images/plants/${imageName}.jpg`;
  });
}

function getKitDetails(evcName) {
  const kits = {
    'Coast Banksia Woodland': {
      image: 'coast-banksia-woodland.jpg',
      description: 'Coastal banksia-dominated woodland with heath understory. Perfect for sandy coastal soils.',
      canopy: 1,
      shrub: 4,
      groundcover: 5,
      specialFeature: 'Wind and salt resistant',
      slug: 'coast-banksia-woodland'
    },
    'Damp Sands Herb-rich Woodland': {
      image: 'damp-sands-herb-rich-woodland.jpg',
      description: 'Diverse woodland on seasonally damp sandy soils. Rich herbaceous groundlayer with high biodiversity.',
      canopy: 1,
      shrub: 3,
      groundcover: 6,
      specialFeature: 'Seasonal wetland species',
      slug: 'damp-sands-herb-rich-woodland'
    },
    'Sand Heathland': {
      image: 'sand-heathland.jpg',
      description: 'Low heathland on coastal and inland sand deposits. Vibrant flowering display year-round.',
      canopy: 1,
      shrub: 5,
      groundcover: 4,
      specialFeature: 'Sandy soil specialists',
      slug: 'sand-heathland'
    },
    'Wet Heathland': {
      image: 'wet-heathland.jpg',
      description: 'Heath communities on poorly-drained soils. Spectacular seasonal flowering display.',
      canopy: 0,
      shrub: 6,
      groundcover: 4,
      specialFeature: 'Wetland heath specialists',
      slug: 'wet-heathland'
    },
    'Estuarine Wetland': {
      image: 'estuarine-wetland.jpg',
      description: 'Brackish wetland where tidal estuaries meet floodplains. Vital habitat for migratory birds.',
      canopy: 1,
      shrub: 2,
      groundcover: 7,
      specialFeature: 'Salt and flood-tolerant species',
      slug: 'estuarine-wetland'
    },
    'Lowland Forest': {
      image: 'lowland-forest.jpg',
      description: 'Tall forest on flat to gently undulating terrain. Rich, productive ecosystems.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Tall canopy shade providers',
      slug: 'lowland-forest'
    },
    'Riparian Forest': {
      image: 'riparian-forest.jpg',
      description: 'Waterway vegetation with deep-rooted trees. Stabilizes banks and filters runoff.',
      canopy: 4,
      shrub: 3,
      groundcover: 3,
      specialFeature: 'Moisture-loving species',
      slug: 'riparian-forest'
    },
    'Heathy Dry Forest': {
      image: 'heathy-dry-forest.jpg',
      description: 'Forest with dense heath understory. Thrives on nutrient-poor, well-drained soils.',
      canopy: 4,
      shrub: 3,
      groundcover: 3,
      specialFeature: 'Year-round flowering heaths',
      slug: 'heathy-dry-forest'
    },
    'Shrubby Dry Forest': {
      image: 'shrubby-dry-forest.jpg',
      description: 'Forest with prominent shrub layer. Thrives on drier, less fertile sites.',
      canopy: 3,
      shrub: 4,
      groundcover: 3,
      specialFeature: 'Drought-adapted shrub layer',
      slug: 'shrubby-dry-forest'
    },
    'Grassy Dry Forest': {
      image: 'grassy-dry-forest.jpg',
      description: 'Open forest structure with colorful wildflowers. Thrives in well-drained soils.',
      canopy: 4,
      shrub: 2,
      groundcover: 4,
      specialFeature: 'Low-maintenance once established',
      slug: 'grassy-dry-forest'
    },
    'Herb-rich Foothill Forest': {
      image: 'herb-rich-foothill-forest.jpg',
      description: 'Diverse forest with rich herbaceous layer. Found on fertile foothill soils.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Diverse herb and wildflower mix',
      slug: 'herb-rich-foothill-forest'
    },
    'Damp Forest': {
      image: 'damp-forest.jpg',
      description: 'Cool, moist forest with tree ferns and moisture-loving plants. Perfect for sheltered gullies and shaded areas with reliable moisture.',
      canopy: 4,
      shrub: 3,
      groundcover: 3,
      specialFeature: 'Tree fern specialists',
      slug: 'damp-forest'
    },
    'Valley Grassy Forest': {
      image: 'valley-grassy-forest.jpg',
      description: 'Tall eucalypt forest with rich fern and herb layer. Ideal for shaded valley slopes.',
      canopy: 4,
      shrub: 2,
      groundcover: 4,
      specialFeature: 'Shade-tolerant species mix',
      slug: 'valley-grassy-forest'
    },
    'Heathy Woodland': {
      image: 'heathy-woodland.jpg',
      description: 'Low open woodland with dense heath understory. Perfect for sandy soils.',
      canopy: 2,
      shrub: 4,
      groundcover: 4,
      specialFeature: 'Year-round flowering species',
      slug: 'heathy-woodland'
    },
    'Swamp Scrub': {
      image: 'swamp-scrub.jpg',
      description: 'Dense shrubby vegetation in seasonally inundated areas. Creates important wetland habitat.',
      canopy: 1,
      shrub: 6,
      groundcover: 3,
      specialFeature: 'Wetland and swamp specialists',
      slug: 'swamp-scrub'
    },
    'Plains Grassy Woodland': {
      image: 'plains-grassy-woodland.jpg',
      description: 'Iconic River Red Gums with diverse grassland understory. Perfect for a Melbourne indigenous garden.',
      canopy: 3,
      shrub: 2,
      groundcover: 5,
      specialFeature: 'Drought-tolerant species mix',
      slug: 'plains-grassy-woodland'
    },
    'Floodplain Riparian Woodland': {
      image: 'floodplain-riparian-woodland.jpg',
      description: 'Riverine woodlands adapted to periodic flooding. Important for water quality and flood mitigation.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Flood-tolerant species',
      slug: 'floodplain-riparian-woodland'
    },
    'Creekline Grassy Woodland': {
      image: 'creekline-grassy-woodland.jpg',
      description: 'Riparian woodland with grassy groundlayer along minor creeks. Protects waterways and provides wildlife corridors.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Creek edge specialists',
      slug: 'creekline-grassy-woodland'
    },
    'Swampy Riparian Woodland': {
      image: 'swampy-riparian-woodland.jpg',
      description: 'Waterlogged riparian areas with specialised vegetation. Natural water filtration system.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Waterlogged soil tolerant',
      slug: 'swampy-riparian-woodland'
    },
    'Swampy Riparian Complex': {
      image: 'swampy-riparian-complex.jpg',
      description: 'Wetland-riparian ecosystem along drainage lines with fluctuating water levels. Natural water filtration system.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Waterlogged soil tolerant',
      slug: 'swampy-riparian-complex'
    },
    'Valley Heathy Forest': {
      image: 'valley-heathy-forest.jpg',
      description: 'Forest with heathy understory in sheltered valleys. Rich in flowering shrubs.',
      canopy: 3,
      shrub: 4,
      groundcover: 3,
      specialFeature: 'Valley-adapted heath mix',
      slug: 'valley-heathy-forest'
    },
    'Creekline Herb-rich Woodland': {
      image: 'creekline-herb-rich-woodland.jpg',
      description: 'Diverse woodland along ephemeral creeks with rich herbaceous layer. High biodiversity in moist microhabitats.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Moisture-loving herb specialists',
      slug: 'creekline-herb-rich-woodland'
    },
    'Floodplain Wetland': {
      image: 'floodplain-wetland.jpg',
      description: 'Wetland vegetation adapted to seasonal waterlogging. Dominated by moisture-loving sedges, rushes, and wetland herbs. Natural water filtration system.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Wetland and waterway specialists',
      slug: 'floodplain-wetland'
    },
    'Grassy Woodland': {
      image: 'grassy-woodland.jpg',
      description: 'Open woodland with diverse native grasses. Perfect for larger suburban blocks.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Low-maintenance grassland mix',
      slug: 'grassy-woodland'
    },
    'Riparian Woodland': {
      image: 'riparian-woodland.jpg',
      description: 'Open woodland along permanent and ephemeral waterways. Critical wildlife habitat.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Creek and river specialists',
      slug: 'riparian-woodland'
    },
    'Stream Bank Shrubland': {
      image: 'stream-bank-shrubland.jpg',
      description: 'Shrub-dominated communities along small streams. Essential for streambank stability.',
      canopy: 2,
      shrub: 5,
      groundcover: 3,
      specialFeature: 'Erosion-controlling shrubs',
      slug: 'stream-bank-shrubland'
    },
    'Coastal Alkaline Scrub': {
      image: 'coastal-alkaline-scrub.jpg',
      description: 'Scrubland on limestone and calcarenite soils behind coastal dunes. Dominated by Coast Banksia and Coast Tea-tree with lime-loving understory species adapted to alkaline conditions.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Alkaline soil specialists',
      slug: 'coastal-alkaline-scrub'
    },
    'Brackish Grassland': {
      image: 'brackish-grassland.jpg',
      description: 'Salt-tolerant grassland communities near coastal areas. Important habitat for migratory birds.',
      canopy: 0,
      shrub: 2,
      groundcover: 8,
      specialFeature: 'Salt-tolerant species mix',
      slug: 'brackish-grassland'
    },
    'Swampy Woodland': {
      image: 'swampy-woodland.jpg',
      description: 'Waterlogged woodland on poorly drained soils. Dominated by Swamp Gum with sedges, grasses, and moisture-loving herbs. Natural water filtration system.',
      canopy: 3,
      shrub: 2,
      groundcover: 5,
      specialFeature: 'Wetland habitat specialists',
      slug: 'swampy-woodland'
    }
  };

  return kits[evcName] || null;
}

function displayModal(name, status, region, code, lat, lon) {
  // Clean mosaic EVC names
  if (name && name.includes('/')) {
    name = name.split('/')[0].trim();
    console.log('Cleaned mosaic EVC name to:', name);
  }
  
  // Clean aggregate EVC names
  if (name && name.includes('Aggregate')) {
    name = name.replace(/\s+Aggregate$/i, '').trim();
    console.log('Cleaned aggregate EVC name to:', name);
  }
  
  // Map mosaic/complex EVC codes
  const mosaicCodeMapping = {
    '921': '2',
    '904': '2',
    '1': '160'
  };

  if (mosaicCodeMapping[code]) {
    console.log('Remapping mosaic EVC code', code, 'to', mosaicCodeMapping[code]);
    code = mosaicCodeMapping[code];
  }
  
  // Reset buttons
  const searchBtn = document.getElementById("search-button");
  searchBtn.disabled = false;
  searchBtn.textContent = "Find My Garden";
  
  const locationBtn = document.getElementById("location-button");
  locationBtn.disabled = false;
  locationBtn.textContent = "📍 Use My Location";
  
  // Store coordinates globally
  window.currentLat = lat;
  window.currentLon = lon;
  window.currentEvcName = name;
  
  // Log lookup
  const searchAddress = window.searchedAddress || `${lat}, ${lon}`;
  logEVCLookup(searchAddress, lat, lon, code, name);
  
  // Populate modal address
  const modalAddressEl = document.getElementById("modal-address");
  if (modalAddressEl) {
    let displayAddress;
    if (window.searchedAddress) {
      const parts = window.searchedAddress.split(',').map(p => p.trim());
      
      if (parts.length >= 3) {
        const streetNumber = parts[0];
        const streetName = parts[1];
        const suburb = parts[2];
        displayAddress = `${streetNumber} ${streetName}, ${suburb}`;
      } else if (parts.length === 2) {
        displayAddress = `${parts[0]}, ${parts[1]}`;
      } else {
        displayAddress = parts[0];
      }
    } else {
      displayAddress = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
    modalAddressEl.textContent = displayAddress;
  }
  
  // Set basic info
  document.getElementById("modal-evc-name").textContent = name || "Unknown";
  
  const statusEl = document.getElementById("modal-evc-status");
  statusEl.textContent = status || "Not specified";
  statusEl.style.lineHeight = "1.2";
  statusEl.style.marginBottom = "5px";
  
  const regionEl = document.getElementById("modal-evc-region");
  regionEl.textContent = region || "Not specified";
  regionEl.style.lineHeight = "1.2";

  // Setup modal map
  modalMap && modalMap.remove();
  modalMap = L.map("modal-map").setView([lat, lon], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(modalMap);
  L.marker([lat, lon]).addTo(modalMap);

  // Show modal
  const modal = document.getElementById("evc-modal");
  modal.style.display = "flex";
  setTimeout(() => modalMap.invalidateSize(), 0);
  
  // Show loading
  const plantsDiv = document.getElementById("modal-plants");
  plantsDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading plant data...</p>';
  plantsDiv.style.display = "block";

  // Fetch plant data
  fetch('curated-plants.json')
  .then(r => {
    if (!r.ok) throw new Error('Could not load plant data');
    return r.json();
  })
  .then(data => {
    console.log('EVC Code being looked up:', code);
    console.log('EVC Name:', name);
    const evcInfo = data.evcs[code];
    console.log('Found evcInfo:', evcInfo);
      
      // Set description
      const descriptionEl = document.getElementById("modal-evc-description");
      if (evcInfo?.description) {
        descriptionEl.textContent = evcInfo.description;
      } else {
        descriptionEl.innerHTML = `We're still researching the best plant species for <strong>${name}</strong>. Check back soon for our curated recommendations!`;
        descriptionEl.style.fontStyle = "normal";
        descriptionEl.style.color = "#666";
      }

      // Build plant list
      const plantsDiv = document.getElementById("modal-plants");
      plantsDiv.innerHTML = "";
      
      if (evcInfo?.recommendations && evcInfo.recommendations.length > 0) {
        const titleEl = document.createElement("h2");
        titleEl.textContent = "Here's the indigenous plants that belong in your garden.";
        titleEl.style.fontFamily = "'Abril Fatface', serif";
        titleEl.style.fontSize = "28px";
        titleEl.style.marginTop = "30px";
        titleEl.style.marginBottom = "20px";
        titleEl.style.lineHeight = "1.2";
        titleEl.style.color = "inherit";
        plantsDiv.appendChild(titleEl);

        evcInfo.recommendations.forEach(sec => {
          const layerDiv = document.createElement("div");
          layerDiv.className = "layer";
          layerDiv.style.marginBottom = "20px";
          layerDiv.style.overflow = "visible";
          
          const heading = document.createElement("h3");
          heading.textContent = sec.layer;
          heading.style.fontWeight = "700";
          heading.style.fontSize = "16px";
          heading.style.marginBottom = "10px";
          heading.style.lineHeight = "1.3";
          heading.style.color = "inherit";
          layerDiv.appendChild(heading);
          
          const list = document.createElement("ul");
          list.style.listStyle = "none";
          list.style.padding = "0";
          list.style.margin = "0";
          list.style.overflow = "visible";
          
          sec.plants.forEach(async (plant) => {
            const item = document.createElement("li");
            item.style.padding = "8px 12px";
            item.style.borderBottom = "1px solid #e2e8f0";
            item.style.fontSize = "14px";
            item.style.display = "flex";
            item.style.alignItems = "center";
            item.style.justifyContent = "space-between";
            item.style.gap = "10px";
            item.style.position = "relative";
            item.style.overflow = "visible";
            
            const nameSpan = document.createElement("span");
            nameSpan.textContent = plant;
            nameSpan.style.flex = "1";
            item.appendChild(nameSpan);
            
            const imageCheck = await checkPlantImage(plant);
            
            if (imageCheck.exists) {
              const cameraSpan = document.createElement("span");
              cameraSpan.className = "plant-camera";
              cameraSpan.innerHTML = "&#128247;";
              cameraSpan.style.cursor = "pointer";
              cameraSpan.style.fontSize = "1.2rem";
              cameraSpan.style.padding = "0.3rem 0.5rem";
              cameraSpan.style.borderRadius = "6px";
              cameraSpan.style.transition = "all 0.3s";
              cameraSpan.style.userSelect = "none";
              
              cameraSpan.addEventListener("mouseenter", () => {
                cameraSpan.style.backgroundColor = "#3d4535";
                cameraSpan.style.transform = "scale(1.1)";
              });
              
              cameraSpan.addEventListener("mouseleave", () => {
                cameraSpan.style.backgroundColor = "transparent";
                cameraSpan.style.transform = "scale(1)";
              });
              
              const tooltip = document.createElement("div");
              tooltip.className = "plant-image-tooltip";
              tooltip.style.display = "none";
              tooltip.style.position = "fixed";
              tooltip.style.zIndex = "99999";
              tooltip.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.3)";
              tooltip.style.borderRadius = "8px";
              tooltip.style.overflow = "hidden";
              tooltip.style.pointerEvents = "none";
              
              const img = document.createElement("img");
              img.src = imageCheck.url;
              img.alt = plant;
              img.style.objectFit = "cover";
              img.style.display = "block";
              img.style.borderRadius = "8px";
              
              if (window.innerWidth <= 768) {
                tooltip.style.width = "200px";
                tooltip.style.height = "200px";
                img.style.width = "200px";
                img.style.height = "200px";
              } else {
                tooltip.style.width = "250px";
                tooltip.style.height = "250px";
                img.style.width = "250px";
                img.style.height = "250px";
              }
              
              tooltip.appendChild(img);
              document.body.appendChild(tooltip);
              
              cameraSpan.addEventListener("mouseenter", () => {
                const rect = cameraSpan.getBoundingClientRect();
                
                if (window.innerWidth <= 768) {
                  tooltip.style.left = "50%";
                  tooltip.style.top = (rect.bottom + 10) + "px";
                  tooltip.style.transform = "translateX(-50%)";
                } else {
                  tooltip.style.left = (rect.left - 250 - 20) + "px";
                  tooltip.style.top = (rect.top + rect.height / 2) + "px";
                  tooltip.style.transform = "translateY(-50%)";
                }
                
                tooltip.style.display = "block";
              });
              
              cameraSpan.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
              });
              
              item.appendChild(cameraSpan);
            }
            
            list.appendChild(item);
          });
          
          layerDiv.appendChild(list);
          plantsDiv.appendChild(layerDiv);
        });
      }

      // Forest Kit Section
      const kitDetails = getKitDetails(name);
      
      const kitSection = document.createElement("div");
      kitSection.style.marginTop = "40px";
      kitSection.style.padding = "30px";
      kitSection.style.background = "rgba(255, 255, 255, 0.5)";
      kitSection.style.borderRadius = "12px";
      kitSection.style.border = "1px solid #e2e8f0";
      
      const kitTitle = document.createElement("h2");
      kitTitle.textContent = "Grow your own Ecological Garden.";
      kitTitle.style.fontFamily = "'Abril Fatface', serif";
      kitTitle.style.fontSize = "28px";
      kitTitle.style.marginBottom = "15px";
      kitTitle.style.lineHeight = "1.2";
      kitTitle.style.color = "#3d4535";
      kitSection.appendChild(kitTitle);
      
      const kitIntro = document.createElement("p");
      kitIntro.textContent = "Purchase a curated indigenous planting kit ecologically suited to your location. Hand selected for structural diversity, wildlife value, and aesthetic beauty.";
      kitIntro.style.fontSize = "16px";
      kitIntro.style.lineHeight = "1.6";
      kitIntro.style.color = "#666";
      kitIntro.style.marginBottom = "25px";
      kitSection.appendChild(kitIntro);
      
      if (kitDetails) {
        const kitImageContainer = document.createElement("div");
        kitImageContainer.style.marginBottom = "20px";
        kitImageContainer.style.borderRadius = "8px";
        kitImageContainer.style.overflow = "hidden";
        
        const kitImage = document.createElement("img");
        kitImage.src = `images/evcs/${kitDetails.image}`;
        kitImage.alt = `${name} Forest Kit`;
        kitImage.style.width = "100%";
        kitImage.style.height = "200px";
        kitImage.style.objectFit = "cover";
        kitImage.style.display = "block";
        
        kitImage.onerror = function() {
          console.log(`Kit image not found: images/evcs/${kitDetails.image}, using fallback`);
          this.src = 'images/evcs/ecological-garden-kit.jpg';
          
          this.onerror = function() {
            this.style.display = 'none';
            console.log('Fallback image also not found, hiding image');
          };
        };
        
        kitImageContainer.appendChild(kitImage);
        kitSection.appendChild(kitImageContainer);
        
        const kitEvcName = document.createElement("h3");
        kitEvcName.textContent = name;
        kitEvcName.style.fontFamily = "'Abril Fatface', serif";
        kitEvcName.style.fontSize = "28px";
        kitEvcName.style.color = "#3d4535";
        kitEvcName.style.marginBottom = "20px";
        kitEvcName.style.lineHeight = "1.2";
        kitEvcName.style.letterSpacing = "0px";
        kitSection.appendChild(kitEvcName);
        
        const kitDescription = document.createElement("p");
        kitDescription.textContent = kitDetails.description;
        kitDescription.style.marginBottom = "20px";
        kitDescription.style.color = "#666";
        kitDescription.style.fontSize = "16px";
        kitDescription.style.lineHeight = "1.6";
        kitSection.appendChild(kitDescription);
        
        const featuresList = document.createElement("ul");
        featuresList.style.listStyle = "none";
        featuresList.style.margin = "1.5rem 0";
        featuresList.style.padding = "0";
        
        const features = [
          '10 indigenous plants per m²',
          `${kitDetails.canopy} canopy, ${kitDetails.shrub} shrub, ${kitDetails.groundcover} groundcover`,
          kitDetails.specialFeature,
          'Full planting guide included'
        ];
        
        features.forEach(feature => {
          const li = document.createElement("li");
          li.textContent = feature;
          li.style.padding = "0.5rem 0";
          li.style.paddingLeft = "1.5rem";
          li.style.position = "relative";
          li.style.color = "#3d4535";
          
          const checkmark = document.createElement("span");
          checkmark.textContent = "✓";
          checkmark.style.position = "absolute";
          checkmark.style.left = "0";
          checkmark.style.color = "#3d4535";
          checkmark.style.fontWeight = "bold";
          li.insertBefore(checkmark, li.firstChild);
          
          featuresList.appendChild(li);
        });
        
        kitSection.appendChild(featuresList);
        
        const kitPrice = document.createElement("div");
        kitPrice.style.fontFamily = "'Abril Fatface', serif";
        kitPrice.style.fontSize = "2.5rem";
        kitPrice.style.color = "#3d4535";
        kitPrice.style.marginBottom = "20px";
        kitPrice.innerHTML = '$89 <span style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">per m²</span> <span class="mobile-break" style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">plus shipping</span>';
        kitSection.appendChild(kitPrice);
        
        if (!document.getElementById('kit-mobile-style')) {
          const style = document.createElement('style');
          style.id = 'kit-mobile-style';
          style.textContent = `
            @media (max-width: 768px) {
              .mobile-break::before {
                content: "\\A";
                white-space: pre;
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        const kitButton = document.createElement("button");
        kitButton.textContent = "Buy Your Garden Kit";
        kitButton.style.background = "#3d4535";
        kitButton.style.color = "#fff0dc";
        kitButton.style.border = "none";
        kitButton.style.padding = "14px 28px";
        kitButton.style.borderRadius = "50px";
        kitButton.style.fontSize = "16px";
        kitButton.style.fontWeight = "600";
        kitButton.style.cursor = "pointer";
        kitButton.style.transition = "all 0.2s";
        kitButton.style.width = "100%";
        
        kitButton.addEventListener("mouseover", () => {
          kitButton.style.transform = "scale(1.02)";
        });
        
        kitButton.addEventListener("mouseout", () => {
          kitButton.style.transform = "scale(1)";
        });
        
        kitButton.addEventListener("click", () => {
          const cleanEvcName = name
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
          
          const timestamp = new Date().toISOString().split('T')[0];
          const referenceId = `KIT_${cleanEvcName}_EVC-${code}_DATE-${timestamp}`;
          
          const stripeUrl = new URL("https://buy.stripe.com/3cI9AT2Y94Srb7f6xN5Vu01");
          stripeUrl.searchParams.append("client_reference_id", referenceId);
          
          console.log("=== Stripe Forest Kit Order ===");
          console.log("EVC Name:", name);
          console.log("EVC Code:", code);
          console.log("Reference ID:", referenceId);
          console.log("==============================");
          
          window.open(stripeUrl.toString(), '_blank');
        });

        kitSection.appendChild(kitButton);
        
      } else {
        const comingSoon = document.createElement("p");
        comingSoon.innerHTML = `We don't have a forest kit for <strong>${name}</strong> yet, but we're curating one! In the meantime, explore our other kits to see what's possible with native plantings.`;
        comingSoon.style.color = "#666";
        comingSoon.style.fontSize = "16px";
        comingSoon.style.lineHeight = "1.6";
        comingSoon.style.marginBottom = "20px";
        kitSection.appendChild(comingSoon);
        
        const exploreButton = document.createElement("button");
        exploreButton.textContent = "Explore forest kits →";
        exploreButton.style.background = "#3d4535";
        exploreButton.style.color = "#fff0dc";
        exploreButton.style.border = "none";
        exploreButton.style.padding = "14px 28px";
        exploreButton.style.borderRadius = "50px";
        exploreButton.style.fontSize = "16px";
        exploreButton.style.fontWeight = "600";
        exploreButton.style.cursor = "pointer";
        exploreButton.style.transition = "all 0.2s";
        exploreButton.style.width = "100%";
        
        exploreButton.addEventListener("mouseover", () => {
          exploreButton.style.transform = "scale(1.02)";
        });
        
        exploreButton.addEventListener("mouseout", () => {
          exploreButton.style.transform = "scale(1)";
        });
        
        exploreButton.addEventListener("click", () => {
          window.location.href = "explore.html";
        });
        
        kitSection.appendChild(exploreButton);
      }
      
      plantsDiv.appendChild(kitSection);
      
      // Tee Section
      const teeSection = document.createElement("div");
      teeSection.style.marginTop = "20px";
      teeSection.style.padding = "30px";
      teeSection.style.background = "rgba(255, 255, 255, 0.7)";
      teeSection.style.borderRadius = "12px";
      teeSection.style.border = "1px solid #e2e8f0";
      
      const teeTitle = document.createElement("h2");
      teeTitle.textContent = "Wear your Ecological Garden.";
      teeTitle.style.fontFamily = "'Abril Fatface', serif";
      teeTitle.style.fontSize = "28px";
      teeTitle.style.marginBottom = "15px";
      teeTitle.style.lineHeight = "1.2";
      teeTitle.style.color = "#3d4535";
      teeSection.appendChild(teeTitle);
      
      const imageFilename = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/['']/g, '')
        .replace(/&/g, 'and')
        + '.jpg';
      
      const imageContainer = document.createElement("div");
      imageContainer.style.marginBottom = "20px";
      imageContainer.style.textAlign = "center";
      
      const teeImage = document.createElement("img");
      teeImage.src = `images/tees/${imageFilename}`;
      teeImage.alt = `${name} Tee`;
      teeImage.style.maxWidth = "100%";
      teeImage.style.height = "auto";
      teeImage.style.borderRadius = "8px";
      teeImage.style.maxHeight = "300px";
      teeImage.style.objectFit = "contain";
      
      let teeAvailable = true;
      
      teeImage.onerror = function() {
        teeAvailable = false;
        this.style.display = 'none';
        console.log(`Tee image not found: images/tees/${imageFilename}`);
        
        const comingSoon = document.createElement("div");
        comingSoon.style.padding = "30px 20px";
        comingSoon.style.textAlign = "center";
        comingSoon.style.background = "rgba(255, 240, 220, 0.3)";
        comingSoon.style.borderRadius = "8px";
        
        const icon = document.createElement("div");
        icon.textContent = "👕";
        icon.style.fontSize = "48px";
        icon.style.marginBottom = "15px";
        comingSoon.appendChild(icon);
        
        const message = document.createElement("p");
        message.innerHTML = `We're creating a unique design for <strong>${name}</strong>. Check out our other ecological tees while you wait!`;
        message.style.color = "#666";
        message.style.fontSize = "16px";
        message.style.lineHeight = "1.6";
        message.style.margin = "0";
        comingSoon.appendChild(message);
        
        teeSection.appendChild(comingSoon);
      };
      
      imageContainer.appendChild(teeImage);
      teeSection.appendChild(imageContainer);
      
      teeImage.onload = function() {
        const teeEvcTitle = document.createElement("h3");
        teeEvcTitle.innerHTML = `${name} Tee`;
        teeEvcTitle.style.fontFamily = "'Abril Fatface', serif";
        teeEvcTitle.style.fontSize = "28px";
        teeEvcTitle.style.color = "#3d4535";
        teeEvcTitle.style.marginBottom = "15px";
        teeEvcTitle.style.lineHeight = "1.2";
        teeSection.appendChild(teeEvcTitle);
        
        const teeDescription = document.createElement("div");
        teeDescription.innerHTML = `
          <p style="margin-bottom: 10px; font-weight: 600; color: #3d4535;">Koa Goods Classic Hemp Tee</p>
          <p style="margin-bottom: 8px; color: #666;">A timeless everyday layer made from a 210 gsm blend of hemp and organic cotton. Each piece is crafted by Koa Goods in carbon-neutral workshops, where a tree is planted for every order. Naturally breathable, soft against the skin, and designed with a relaxed fit and ribbed detailing.</p>
        `;
        teeDescription.style.marginBottom = "20px";
        teeDescription.style.fontSize = "16px";
        teeSection.appendChild(teeDescription);
        
        const teePrice = document.createElement("div");
        teePrice.style.fontFamily = "'Abril Fatface', serif";
        teePrice.style.fontSize = "2.5rem";
        teePrice.style.color = "#3d4535";
        teePrice.style.marginBottom = "20px";
        teePrice.innerHTML = '$55 <span style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">plus shipping</span>';
        teeSection.appendChild(teePrice);
        
        const teeControls = document.createElement("div");
        teeControls.style.display = "flex";
        teeControls.style.gap = "10px";
        teeControls.style.alignItems = "center";
        
        const sizeSelect = document.createElement("select");
        sizeSelect.id = "tee-size-select";
        sizeSelect.style.flex = "1";
        sizeSelect.style.padding = "12px";
        sizeSelect.style.fontSize = "16px";
        sizeSelect.style.border = "2px solid #3d4535";
        sizeSelect.style.borderRadius = "50px";
        sizeSelect.style.background = "white";
        sizeSelect.style.cursor = "pointer";
        sizeSelect.innerHTML = `
          <option value="" disabled selected>Choose size</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        `;
        teeControls.appendChild(sizeSelect);
        
        const teeButton = document.createElement("button");
        teeButton.textContent = "Buy now";
        teeButton.style.background = "#3d4535";
        teeButton.style.color = "#fff0dc";
        teeButton.style.border = "none";
        teeButton.style.padding = "12px 24px";
        teeButton.style.borderRadius = "50px";
        teeButton.style.fontSize = "16px";
        teeButton.style.fontWeight = "600";
        teeButton.style.cursor = "pointer";
        teeButton.style.transition = "all 0.2s";
        teeButton.style.whiteSpace = "nowrap";
        
        teeButton.addEventListener("mouseover", () => {
          teeButton.style.transform = "scale(1.02)";
        });
        
        teeButton.addEventListener("mouseout", () => {
          teeButton.style.transform = "scale(1)";
        });
        
        teeButton.addEventListener("click", async () => {
          const size = sizeSelect.value;
          if (!size) {
            alert("Please choose a size first.");
            return;
          }
          
          const cleanEvcName = name
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .toLowerCase();
          
          const timestamp = new Date().toISOString().split('T')[0];
          const referenceId = `TEE_${cleanEvcName}_SIZE-${size}_EVC-${code}_DATE-${timestamp}`;
          
          const stripeUrl = new URL("https://buy.stripe.com/bJe4gzcyJbgP1wF8FV5Vu04");
          stripeUrl.searchParams.append("client_reference_id", referenceId);
          
          console.log("=== Stripe T-Shirt Order ===");
          console.log("EVC Name:", name);
          console.log("EVC Code:", code);
          console.log("Size:", size);
          console.log("Reference ID:", referenceId);
          console.log("===========================");
          
          window.open(stripeUrl.toString(), '_blank');
        });
        
        teeControls.appendChild(teeButton);
        teeSection.appendChild(teeControls);
        
        const teeHint = document.createElement("div");
        teeHint.textContent = "Your size and EVC design are automatically included in your order.";
        teeHint.style.marginTop = "10px";
        teeHint.style.fontSize = "14px";
        teeHint.style.color = "#666";
        teeSection.appendChild(teeHint);
      };
      
      plantsDiv.appendChild(teeSection);
      plantsDiv.style.display = "block";
    })
    .catch(err => {
      console.error('Failed to load plant data:', err);
      document.getElementById("modal-evc-description").textContent = 
        "Plant data currently unavailable. Please try again later.";
      const plantsDiv = document.getElementById("modal-plants");
      plantsDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Unable to load plant data. Please try again later.</p>';
      plantsDiv.style.display = "block";
    });

  document.getElementById("gf-evcCode").value = `EVC ${code}`;
  
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    .then(r => r.json())
    .then(data => {
      const address = data.display_name || `${lat}, ${lon}`;
      document.getElementById("gf-address").value = address;
    })
    .catch(() => {
      document.getElementById("gf-address").value = `${lat}, ${lon}`;
    });
}

function logEVCLookup(address, lat, lon, evcCode, evcName) {
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScmuvklj5OJq7tJLLS2TCR8fRYoOh96WA_63a9YsGOsznLgdQ/formResponse';
  const ENTRY_IDS = {
    address: 'entry.124085928',
    latitude: 'entry.537784608',
    longitude: 'entry.683705898',
    evcCode: 'entry.1602420653',
    evcName: 'entry.615207214'
  };

  try {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = FORM_URL;
    form.target = 'log-iframe';
    form.style.display = 'none';

    const fields = {
      [ENTRY_IDS.address]: address || 'Unknown',
      [ENTRY_IDS.latitude]: lat?.toFixed(6) || '',
      [ENTRY_IDS.longitude]: lon?.toFixed(6) || '',
      [ENTRY_IDS.evcCode]: evcCode || '',
      [ENTRY_IDS.evcName]: evcName || ''
    };

    Object.keys(fields).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = fields[key];
      form.appendChild(input);
    });

    let iframe = document.getElementById('log-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'log-iframe';
      iframe.name = 'log-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    
    setTimeout(() => {
      document.body.removeChild(form);
    }, 1000);

    console.log('EVC lookup logged:', { address, lat, lon, evcCode, evcName });
  } catch (error) {
    console.error('Failed to log EVC lookup:', error);
  }
}

function openPreorderModal(evcName) {
  const modal = document.getElementById("preorder-modal");
  const evcField = document.getElementById("preorder-evc");
  const addressField = document.getElementById("preorder-address");
  
  evcField.value = window.currentEvcName || evcName;
  
  if (window.searchedAddress) {
    addressField.value = window.searchedAddress;
  } else if (window.currentLat && window.currentLon) {
    addressField.value = "Loading address...";
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${window.currentLat}&lon=${window.currentLon}`)
      .then(r => r.json())
      .then(data => {
        const address = data.display_name || `${window.currentLat}, ${window.currentLon}`;
        addressField.value = address;
      })
      .catch(() => {
        addressField.value = `${window.currentLat}, ${window.currentLon}`;
      });
  }
  
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePreorderModal() {
  const modal = document.getElementById("preorder-modal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
  document.getElementById("preorder-form").reset();
}

document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("preorder-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePreorderModal);
  }
  
  const modal = document.getElementById("preorder-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closePreorderModal();
      }
    });
  }
  
  const form = document.getElementById("preorder-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      setTimeout(() => {
        closePreorderModal();
        alert("Thank you for your pre-order! We'll be in touch soon to confirm details and arrange delivery.");
      }, 500);
    });
  }
});
