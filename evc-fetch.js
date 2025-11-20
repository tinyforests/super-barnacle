// evc-fetch.js - Complete version with all EVCs and smart camera icons

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
    
    // Hide autocomplete when submitting
    hideAutocomplete();
    
    // Add loading state to button
    const searchBtn = document.getElementById("search-button");
    searchBtn.disabled = true;
    searchBtn.textContent = "Finding your garden...";
    
    geocodeAddress(addr);
  });

  // Setup address autocomplete
  setupAddressAutocomplete();

  // Close modal
  document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("evc-modal").style.display = "none";
  });

  // Email form - submit to Google Forms
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
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      // Check if we're on a secure context (HTTPS)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        alert("Geolocation requires a secure connection (HTTPS). Please use the address search instead.");
        return;
      }

      locationBtn.textContent = "Finding your garden...";
      locationBtn.disabled = true;

      // iOS Safari specific options
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
          
          // Button will be reset in displayModal
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
  // Store the searched address globally
  window.searchedAddress = address;
  
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&addressdetails=1`)
    .then(r => {
      if (!r.ok) throw new Error(`Geocode failed (${r.status})`);
      return r.json();
    })
    .then(results => {
      if (!results.length) throw new Error("Address not found.");
      
      // Check if address is in Victoria
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
      // Reset button on error
      const searchBtn = document.getElementById("search-button");
      searchBtn.disabled = false;
      searchBtn.textContent = "Find My Garden";
    });
}

// Address autocomplete functionality
let autocompleteTimeout;
let autocompleteResults = [];

function setupAddressAutocomplete() {
  const input = document.getElementById("address-input");
  const form = document.getElementById("address-form");
  
  // Create autocomplete dropdown
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
  dropdown.style.marginTop = "8px"; // Space between input and dropdown
  
  // Insert dropdown after the form
  form.parentNode.insertBefore(dropdown, form.nextSibling);
  
  // Position dropdown properly
  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // On mobile: fixed to input position, scrolls with page
      dropdown.style.position = "absolute";
      const formRect = form.getBoundingClientRect();
      dropdown.style.top = (formRect.height + 8) + "px";
      dropdown.style.left = "0";
      dropdown.style.width = "100%";
    } else {
      // On desktop: fixed position
      dropdown.style.position = "fixed";
      dropdown.style.top = (rect.bottom + 8) + "px";
      dropdown.style.left = rect.left + "px";
      dropdown.style.width = rect.width + "px";
    }
  }
  
  // Listen for input changes
  input.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      hideAutocomplete();
      return;
    }
    
    // Debounce API calls
    clearTimeout(autocompleteTimeout);
    autocompleteTimeout = setTimeout(() => {
      fetchAddressSuggestions(query);
    }, 300); // Wait 300ms after user stops typing
  });
  
  // Reposition on scroll
  window.addEventListener("scroll", () => {
    if (dropdown.style.display !== "none") {
      positionDropdown();
    }
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (e.target !== input && e.target.closest("#address-autocomplete") === null) {
      hideAutocomplete();
    }
  });
  
  // Update dropdown position on window resize
  window.addEventListener("resize", () => {
    if (dropdown.style.display !== "none") {
      positionDropdown();
    }
  });
  
  // Store positionDropdown for later use
  dropdown.positionDropdown = positionDropdown;
}

function fetchAddressSuggestions(query) {
  // Focus on Victoria, Australia for better results
  const url = `https://nominatim.openstreetmap.org/search?` +
    `format=json` +
    `&q=${encodeURIComponent(query + ', Victoria, Australia')}` +
    `&countrycodes=au` +
    `&limit=5` +
    `&addressdetails=1`;
  
  fetch(url)
    .then(r => r.json())
    .then(results => {
      // Filter to only Victoria results
      const victoriaResults = results.filter(result => {
        const address = result.address || {};
        return address.state === 'Victoria' || 
               address.state === 'VIC' ||
               result.display_name.includes('Victoria') ||
               result.display_name.includes('VIC');
      });
      
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
    // Show "Victoria only" message if no results
    dropdown.innerHTML = "";
    const noResults = document.createElement("div");
    noResults.style.padding = "12px 16px";
    noResults.style.fontFamily = "'IBM Plex Mono', monospace";
    noResults.style.fontSize = "14px";
    noResults.style.color = "#666";
    noResults.style.textAlign = "center";
    noResults.textContent = "No Victorian addresses found. We currently only serve Victoria.";
    dropdown.appendChild(noResults);
    dropdown.positionDropdown();
    dropdown.style.display = "block";
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
    
    // Format the address nicely
    const displayName = result.display_name;
    item.textContent = displayName;
    
    // Hover effect
    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#f7f7f7";
    });
    
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "white";
    });
    
    // Click to select
    item.addEventListener("click", () => {
      selectAddress(result);
    });
    
    dropdown.appendChild(item);
  });
  
  // Position and show dropdown
  dropdown.positionDropdown();
  dropdown.style.display = "block";
}

function selectAddress(result) {
  const input = document.getElementById("address-input");
  input.value = result.display_name;
  hideAutocomplete();
  
  // Double-check it's in Victoria (should already be filtered)
  const isVictoria = result.address?.state === 'Victoria' || 
                    result.address?.state === 'VIC' ||
                    result.display_name.includes('Victoria') ||
                    result.display_name.includes('VIC');
  
  if (!isVictoria) {
    alert("We currently only serve Victoria. Please enter a Victorian address.");
    return;
  }
  
  // Trigger the search automatically
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  
  // Store the address
  window.searchedAddress = result.display_name;
  
  // Update map
  map.setView([lat, lon], 12);
  marker && map.removeLayer(marker);
  marker = L.marker([lat, lon]).addTo(map);
  
  // Add loading state
  const searchBtn = document.getElementById("search-button");
  searchBtn.disabled = true;
  searchBtn.textContent = "Finding your garden...";
  
  // Fetch EVC data
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
      // Reset buttons on error
      const searchBtn = document.getElementById("search-button");
      searchBtn.disabled = false;
      searchBtn.textContent = "Find My Garden";
      
      const locationBtn = document.getElementById("location-button");
      locationBtn.disabled = false;
      locationBtn.textContent = "📍 Use My Location";
    });
}

// Helper function to check if plant image exists
function checkPlantImage(plantName) {
  return new Promise((resolve) => {
    // Extract common name from parentheses if present
    // e.g., "Eucalyptus camaldulensis (River Red-gum)" -> "River Red-gum"
    let nameForImage = plantName;
    const commonNameMatch = plantName.match(/\(([^)]+)\)/);
    if (commonNameMatch) {
      nameForImage = commonNameMatch[1].trim();
    }
    
    // Convert to lowercase filename with hyphens
    const imageName = nameForImage.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/['']/g, '');
    
    const img = new Image();
    img.onload = () => resolve({ exists: true, url: `images/plants/${imageName}.jpg` });
    img.onerror = () => resolve({ exists: false, url: null });
    img.src = `images/plants/${imageName}.jpg`;
  });
}

// Helper function to get kit details based on EVC name
function getKitDetails(evcName) {
  const kits = {
    'Box-Ironbark Forest': {
      image: 'box-ironbark-forest.png',
      description: 'Iconic ironbark and box eucalypts with diverse understory. Thrives in low-rainfall areas with nutrient-poor soils.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Drought-tolerant and fire-adapted species',
      slug: 'box-ironbark-forest'
    },
    'Brackish Grassland': {
      image: 'brackish-grassland.png',
      description: 'Salt-tolerant grassland communities near coastal areas. Important habitat for migratory birds.',
      canopy: 1,
      shrub: 2,
      groundcover: 7,
      specialFeature: 'Salt-tolerant species mix',
      slug: 'brackish-grassland'
    },
    'Coast Banksia Woodland': {
      image: 'coast-banksia-woodland.png',
      description: 'Coastal banksia-dominated woodland with heath understory. Perfect for sandy coastal soils.',
      canopy: 2,
      shrub: 4,
      groundcover: 4,
      specialFeature: 'Wind and salt resistant',
      slug: 'coast-banksia-woodland'
    },
    'Coastal Saltmarsh': {
      image: 'coastal-saltmarsh.png',
      description: 'Intertidal vegetation adapted to regular tidal inundation. Critical ecosystem for coastal biodiversity.',
      canopy: 0,
      shrub: 2,
      groundcover: 8,
      specialFeature: 'Salt and flood-tolerant species',
      slug: 'coastal-saltmarsh'
    },
    'Coastal Scrub': {
      image: 'coastal-scrub.png',
      description: 'Wind-pruned coastal vegetation adapted to salt spray and sandy soils. Essential dune stabilization.',
      canopy: 1,
      shrub: 5,
      groundcover: 4,
      specialFeature: 'Coastal wind and salt specialists',
      slug: 'coastal-scrub'
    },
    'Creekline Grassy Woodland': {
      image: 'creekline-grassy-woodland.png',
      description: 'Riparian woodland with grassy groundlayer along minor creeks. Protects waterways and provides wildlife corridors.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Creek edge specialists',
      slug: 'creekline-grassy-woodland'
    },
    'Creekline Herb-rich Woodland': {
      image: 'creekline-herb-rich-woodland.png',
      description: 'Diverse woodland along ephemeral creeks with rich herbaceous layer. High biodiversity in moist microhabitats.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Moisture-loving herb specialists',
      slug: 'creekline-herb-rich-woodland'
    },
    'Damp Sands Herb-rich Woodland': {
      image: 'damp-sands-herb-rich-woodland.png',
      description: 'Diverse woodland on seasonally damp sandy soils. Rich herbaceous groundlayer with high biodiversity.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Seasonal wetland species',
      slug: 'damp-sands-herb-rich-woodland'
    },
    'Estuarine Woodlands': {
      image: 'estuarine-woodlands.png',
      description: 'Coastal vegetation where rivers meet the sea. Adapted to brackish water and tidal influence.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Brackish water-tolerant species',
      slug: 'estuarine-woodlands'
    },
    'Floodplain Riparian Woodland': {
      image: 'floodplain-riparian-woodland.png',
      description: 'Riverine woodlands adapted to periodic flooding. Important for water quality and flood mitigation.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Flood-tolerant species',
      slug: 'floodplain-riparian-woodland'
    },
    'Grassy Dry Forest': {
      image: 'grassy-dry-forest.png',
      description: 'Open forest structure with colorful wildflowers. Thrives in well-drained soils.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Low-maintenance once established',
      slug: 'grassy-dry-forest'
    },
    'Grassy Forest': {
      image: 'grassy-forest.png',
      description: 'Tall eucalypt forest with grassy understory. Supports diverse wildlife in suburban settings.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Shade-creating canopy species',
      slug: 'grassy-forest'
    },
    'Grassy Woodland': {
      image: 'grassy-woodland.png',
      description: 'Open woodland with diverse native grasses. Perfect for larger suburban blocks.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Low-maintenance grassland mix',
      slug: 'grassy-woodland'
    },
    'Heathy Dry Forest': {
      image: 'heathy-dry-forest.png',
      description: 'Forest with dense heath understory. Thrives on nutrient-poor, well-drained soils.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Year-round flowering heaths',
      slug: 'heathy-dry-forest'
    },
    'Heathy Woodland': {
      image: 'heathy-woodland.png',
      description: 'Low open woodland with dense heath understory. Perfect for sandy soils.',
      canopy: 2,
      shrub: 4,
      groundcover: 4,
      specialFeature: 'Year-round flowering species',
      slug: 'heathy-woodland'
    },
    'Herb-rich Foothill Forest': {
      image: 'herb-rich-foothill.png',
      description: 'Diverse forest with rich herbaceous layer. Found on fertile foothill soils.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Diverse herb and wildflower mix',
      slug: 'herb-rich-foothill'
    },
    'Lowland Forest': {
      image: 'lowland-forest.png',
      description: 'Tall forest on flat to gently undulating terrain. Rich, productive ecosystems.',
      canopy: 4,
      shrub: 3,
      groundcover: 3,
      specialFeature: 'Tall canopy shade providers',
      slug: 'lowland-forest'
    },
    'Plains Grassy Woodland': {
      image: 'plains-grassy-woodland.png',
      description: 'Iconic River Red Gums with diverse grassland understory. Perfect for a Melbourne indigenous garden.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Drought-tolerant species mix',
      slug: 'plains-grassy-woodland'
    },
    'Riparian Forest': {
      image: 'riparian-forest.png',
      description: 'Waterway vegetation with deep-rooted trees. Stabilizes banks and filters runoff.',
      canopy: 4,
      shrub: 3,
      groundcover: 3,
      specialFeature: 'Moisture-loving species',
      slug: 'riparian-forest'
    },
    'Riparian Thicket': {
      image: 'riparian-thicket.png',
      description: 'Dense shrubby vegetation along streams. Excellent for erosion control and wildlife shelter.',
      canopy: 2,
      shrub: 5,
      groundcover: 3,
      specialFeature: 'Dense bank-stabilizing shrubs',
      slug: 'riparian-thicket'
    },
    'Riparian Woodland': {
      image: 'riparian-woodland.png',
      description: 'Open woodland along permanent and ephemeral waterways. Critical wildlife habitat.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Creek and river specialists',
      slug: 'riparian-woodland'
    },
    'Riverine Escarpment Scrub': {
      image: 'riverrine-escarpment-scrub.png',
      description: 'Shrubby vegetation on steep riverine slopes. Prevents erosion and creates microclimates.',
      canopy: 2,
      shrub: 5,
      groundcover: 3,
      specialFeature: 'Slope-stabilizing species',
      slug: 'riverrine-escarpment-scrub'
    },
    'Sand Heathland': {
      image: 'sand-heathland.png',
      description: 'Low heathland on coastal and inland sand deposits. Vibrant flowering display year-round.',
      canopy: 1,
      shrub: 5,
      groundcover: 4,
      specialFeature: 'Sandy soil specialists',
      slug: 'sand-heathland'
    },
    'Shrubby Dry Forest': {
      image: 'shrubby-dry-forest.png',
      description: 'Forest with prominent shrub layer. Thrives on drier, less fertile sites.',
      canopy: 3,
      shrub: 4,
      groundcover: 3,
      specialFeature: 'Drought-adapted shrub layer',
      slug: 'shrubby-dry-forest'
    },
    'Shrubby Foothill Forest': {
      image: 'shrubby-rich-foothill.png',
      description: 'Dense shrubby forest on foothill slopes. Rich in wattles and understory species.',
      canopy: 3,
      shrub: 4,
      groundcover: 3,
      specialFeature: 'Diverse shrub and wattle mix',
      slug: 'shrubby-rich-foothill'
    },
    'Stream-bank Shrubland': {
      image: 'stream-bank-shrubland.png',
      description: 'Shrub-dominated communities along small streams. Essential for streambank stability.',
      canopy: 2,
      shrub: 5,
      groundcover: 3,
      specialFeature: 'Erosion-controlling shrubs',
      slug: 'stream-bank-shrubland'
    },
    'Swamp Scrub': {
      image: 'swamp-scrub.png',
      description: 'Dense shrubby vegetation in seasonally inundated areas. Creates important wetland habitat.',
      canopy: 1,
      shrub: 6,
      groundcover: 3,
      specialFeature: 'Wetland and swamp specialists',
      slug: 'swamp-scrub'
    },
    'Swampy Riparian Complex': {
      image: 'swampy-riparian-complex.png',
      description: 'Wetland-riparian ecosystem along drainage lines with fluctuating water levels. Natural water filtration system.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Waterlogged soil tolerant',
      slug: 'swampy-riparian-complex'
    },
    'Swampy Riparian Woodland': {
      image: 'swampy-riparian-woodland.png',
      description: 'Waterlogged riparian areas with specialised vegetation. Natural water filtration system.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Waterlogged soil tolerant',
      slug: 'swampy-riparian-woodland'
    },
    'Treed Sand Heathland': {
      image: 'treed-sand-heathland.png',
      description: 'Heath with scattered tree cover on sandy soils. Diverse flowering shrub layer.',
      canopy: 2,
      shrub: 4,
      groundcover: 4,
      specialFeature: 'Sandy coastal species',
      slug: 'treed-sand-heathland'
    },
    'Valley Grassy Forest': {
      image: 'valley-grassy-forest.png',
      description: 'Tall eucalypt forest with rich fern and herb layer. Ideal for shaded valley slopes.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Shade-tolerant species mix',
      slug: 'valley-grassy-forest'
    },
    'Valley Heathy Forest': {
      image: 'valley-heathy-forest.png',
      description: 'Forest with heathy understory in sheltered valleys. Rich in flowering shrubs.',
      canopy: 3,
      shrub: 3,
      groundcover: 4,
      specialFeature: 'Valley-adapted heath mix',
      slug: 'valley-heathy-forest'
    },
    'Wet Heathland': {
      image: 'wet-heathland.png',
      description: 'Heath communities on poorly-drained soils. Spectacular seasonal flowering display.',
      canopy: 1,
      shrub: 5,
      groundcover: 4,
      specialFeature: 'Wetland heath specialists',
      slug: 'wet-heathland'
    }
  };

  return kits[evcName] || null;
}

function displayModal(name, status, region, code, lat, lon) {
  // Reset buttons when modal opens
  const searchBtn = document.getElementById("search-button");
  searchBtn.disabled = false;
  searchBtn.textContent = "Find My Garden";
  
  const locationBtn = document.getElementById("location-button");
  locationBtn.disabled = false;
  locationBtn.textContent = "📍 Use My Location";
  
  // Store coordinates globally for pre-order form
  window.currentLat = lat;
  window.currentLon = lon;
  window.currentEvcName = name;
  
  // Log this EVC lookup to Google Sheet
  const searchAddress = window.searchedAddress || `${lat}, ${lon}`;
  logEVCLookup(searchAddress, lat, lon, code, name);
  
  // Populate modal address with better formatting
  const modalAddressEl = document.getElementById("modal-address");
  if (modalAddressEl) {
    let displayAddress;
    if (window.searchedAddress) {
      // Format: "158 Tyson Road, Balwyn"
      // Input example: "158, Tyson Road, Balwyn, VIC 3103, Australia"
      const parts = window.searchedAddress.split(',').map(p => p.trim());
      
      if (parts.length >= 3) {
        // parts[0] = "158", parts[1] = "Tyson Road", parts[2] = "Balwyn"
        const streetNumber = parts[0];
        const streetName = parts[1];
        const suburb = parts[2];
        
        displayAddress = `${streetNumber} ${streetName}, ${suburb}`;
      } else if (parts.length === 2) {
        // Fallback if only 2 parts
        displayAddress = `${parts[0]}, ${parts[1]}`;
      } else {
        displayAddress = parts[0];
      }
    } else {
      // Use coordinates if no address
      displayAddress = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
    modalAddressEl.textContent = displayAddress;
  }
  
  // Set basic info from API
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

  // Show modal immediately with loading state
  const modal = document.getElementById("evc-modal");
  modal.style.display = "flex";
  setTimeout(() => modalMap.invalidateSize(), 0);
  
  // Show loading message
  const plantsDiv = document.getElementById("modal-plants");
  plantsDiv.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Loading plant data...</p>';
  plantsDiv.style.display = "block";

  // Fetch curated plant data from external JSON (async)
  fetch('curated-plants.json')
    .then(r => {
      if (!r.ok) throw new Error('Could not load plant data');
      return r.json();
    })
    .then(data => {
      const evcInfo = data.evcs[code];
      
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
        // Add title
        const titleEl = document.createElement("h2");
        titleEl.textContent = "Here's the indigenous plants that belong in your garden.";
        titleEl.style.fontFamily = "'Abril Fatface', serif";
        titleEl.style.fontSize = "28px";
        titleEl.style.marginTop = "30px";
        titleEl.style.marginBottom = "20px";
        titleEl.style.lineHeight = "1.2";
        titleEl.style.color = "inherit";
        plantsDiv.appendChild(titleEl);

        // Add plant layers
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
          
          // Process plants with image checking
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
            
            // Plant name
            const nameSpan = document.createElement("span");
            nameSpan.textContent = plant;
            nameSpan.style.flex = "1";
            item.appendChild(nameSpan);
            
            // Check if image exists before adding camera icon
            const imageCheck = await checkPlantImage(plant);
            
            if (imageCheck.exists) {
              // Camera icon with tooltip
              const cameraSpan = document.createElement("span");
              cameraSpan.className = "plant-camera";
              cameraSpan.innerHTML = "&#128247;"; // Camera emoji as HTML entity
              cameraSpan.style.cursor = "pointer";
              cameraSpan.style.fontSize = "1.2rem";
              cameraSpan.style.padding = "0.3rem 0.5rem";
              cameraSpan.style.borderRadius = "6px";
              cameraSpan.style.transition = "all 0.3s";
              cameraSpan.style.userSelect = "none";
              
              // Hover effect for camera
              cameraSpan.addEventListener("mouseenter", () => {
                cameraSpan.style.backgroundColor = "#3d4535";
                cameraSpan.style.transform = "scale(1.1)";
              });
              
              cameraSpan.addEventListener("mouseleave", () => {
                cameraSpan.style.backgroundColor = "transparent";
                cameraSpan.style.transform = "scale(1)";
              });
              
              // Image tooltip - append to body to avoid z-index issues
              const tooltip = document.createElement("div");
              tooltip.className = "plant-image-tooltip";
              tooltip.style.display = "none";
              tooltip.style.position = "fixed"; // Changed to fixed
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
              
              // Set size based on screen
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
              document.body.appendChild(tooltip); // Append to body, not to item
              
              // Show/hide tooltip on hover with positioning
              cameraSpan.addEventListener("mouseenter", () => {
                const rect = cameraSpan.getBoundingClientRect();
                
                if (window.innerWidth <= 768) {
                  // Mobile: centered in viewport, below the camera
                  tooltip.style.left = "50%";
                  tooltip.style.top = (rect.bottom + 10) + "px";
                  tooltip.style.transform = "translateX(-50%)";
                } else {
                  // Desktop: to the left of the camera
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
      } else {
        // No plant data available - description already shows message
      }

      // Always show Forest Kit, Tee, and Ebook sections regardless of plant data
      
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
      
      // Add descriptive text
      const kitIntro = document.createElement("p");
      kitIntro.textContent = "Purchase a curated indigenous planting kit ecologically suited to your location. Hand selected for structural diversity, wildlife value, and aesthetic beauty.";
      kitIntro.style.fontSize = "16px";
      kitIntro.style.lineHeight = "1.6";
      kitIntro.style.color = "#666";
      kitIntro.style.marginBottom = "25px";
      kitSection.appendChild(kitIntro);
      
      if (kitDetails) {
        // Single image for all kits - using a generic ecological garden kit image
        const kitImageContainer = document.createElement("div");
        kitImageContainer.style.marginBottom = "20px";
        kitImageContainer.style.borderRadius = "8px";
        kitImageContainer.style.overflow = "hidden";
        
        const kitImage = document.createElement("img");
        kitImage.src = `images/evcs/ecological-garden-kit.jpg`;
        kitImage.alt = `Ecological Garden Kit`;
        kitImage.style.width = "100%";
        kitImage.style.height = "200px";
        kitImage.style.objectFit = "cover";
        kitImage.style.display = "block";
        
        kitImage.onerror = function() {
          this.style.display = 'none';
          console.log(`Kit image not found: images/evcs/ecological-garden-kit.jpg`);
        };
        
        kitImageContainer.appendChild(kitImage);
        kitSection.appendChild(kitImageContainer);
        
        // EVC Name title above price
        const kitEvcName = document.createElement("h3");
        kitEvcName.textContent = name;
        kitEvcName.style.fontFamily = "'Abril Fatface', serif";
        kitEvcName.style.fontSize = "28px";
        kitEvcName.style.color = "#3d4535";
        kitEvcName.style.marginBottom = "20px";
        kitEvcName.style.lineHeight = "1.2";
        kitEvcName.style.letterSpacing = "0px";
        kitSection.appendChild(kitEvcName);
        
        // Description
        const kitDescription = document.createElement("p");
        kitDescription.textContent = kitDetails.description;
        kitDescription.style.marginBottom = "20px";
        kitDescription.style.color = "#666";
        kitDescription.style.fontSize = "16px";
        kitDescription.style.lineHeight = "1.6";
        kitSection.appendChild(kitDescription);
        
        // Features list
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
          
          // Add checkmark
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
        
        // Price - matching Tee section styling with mobile line break
        const kitPrice = document.createElement("div");
        kitPrice.style.fontFamily = "'Abril Fatface', serif";
        kitPrice.style.fontSize = "2.5rem";
        kitPrice.style.color = "#3d4535";
        kitPrice.style.marginBottom = "20px";
        kitPrice.innerHTML = '$89 <span style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">per m²</span> <span class="mobile-break" style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">plus shipping</span>';
        kitSection.appendChild(kitPrice);
        
        // Add mobile-specific styling for line break (only once)
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
        
        // Buy Your Garden Kit button
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
          // Build Stripe URL with metadata
          const stripeUrl = new URL("https://buy.stripe.com/3cI9AT2Y94Srb7f6xN5Vu01");
          const referenceId = `EVC-${name.replace(/\s+/g, '-')}_Address-${(window.searchedAddress || '').replace(/\s+/g, '-').substring(0, 50)}`;
          stripeUrl.searchParams.append("client_reference_id", referenceId);
          
          // Open Stripe checkout
          window.open(stripeUrl.toString(), '_blank');
        });
        
        kitSection.appendChild(kitButton);
        
        // Removed "Learn more" button
        
      } else {
        // No kit data available - show coming soon with button
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
          window.open("https://tinyforests.github.io/tinyforest/forest-kits.html", '_blank');
        });
        
        kitSection.appendChild(exploreButton);
      }
      
      plantsDiv.appendChild(kitSection);
      
      // Add EVC Tee section
      const teeSection = document.createElement("div");
      teeSection.style.marginTop = "20px";
      teeSection.style.padding = "30px";
      teeSection.style.background = "rgba(255, 255, 255, 0.5)";
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
      
      // Create image filename from EVC name
      const imageFilename = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/['']/g, '')
        .replace(/&/g, 'and')
        + '.png';
      
      // Image container
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
        
        // Show coming soon message
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
      
      // Only show purchase UI if tee is available
      teeImage.onload = function() {
        // Tee title with EVC name
        const teeEvcTitle = document.createElement("h3");
        teeEvcTitle.innerHTML = `${name} Tee`;
        teeEvcTitle.style.fontFamily = "'Abril Fatface', serif";
        teeEvcTitle.style.fontSize = "28px";
        teeEvcTitle.style.color = "#3d4535";
        teeEvcTitle.style.marginBottom = "15px";
        teeEvcTitle.style.lineHeight = "1.2";
        teeSection.appendChild(teeEvcTitle);
        
        // Koa Goods product details
        const teeDescription = document.createElement("div");
        teeDescription.innerHTML = `
          <p style="margin-bottom: 10px; font-weight: 600; color: #3d4535;">Koa Goods Classic Hemp Tee</p>
          <p style="margin-bottom: 8px; color: #666;">A timeless everyday layer made from a 210 gsm blend of hemp and organic cotton. Each piece is crafted by Koa Goods in carbon-neutral workshops, where a tree is planted for every order. Naturally breathable, soft against the skin, and designed with a relaxed fit and ribbed detailing.</p>
          
        `;
        teeDescription.style.marginBottom = "20px";
        teeDescription.style.fontSize = "16px";
        teeSection.appendChild(teeDescription);
        
        // Price
        const teePrice = document.createElement("div");
        teePrice.style.fontFamily = "'Abril Fatface', serif";
        teePrice.style.fontSize = "2.5rem";
        teePrice.style.color = "#3d4535";
        teePrice.style.marginBottom = "20px";
        teePrice.innerHTML = '$55 <span style="font-size: 1rem; font-family: \'IBM Plex Mono\', monospace; font-weight: normal;">plus shipping</span>';
        teeSection.appendChild(teePrice);
        
        // Size selector and button container
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
          
          // Build Stripe URL with client reference ID containing size and EVC
          const stripeUrl = new URL("https://buy.stripe.com/9B6aEXfKV0Cbcbjg8n5Vu00");
          // Create a reference ID that includes size and EVC (visible in Stripe dashboard)
          const referenceId = `Size-${size}_EVC-${name.replace(/\s+/g, '-')}`;
          stripeUrl.searchParams.append("client_reference_id", referenceId);
          
          // Open Stripe checkout in new tab
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
      
      // Show plants immediately (no email gate)
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

  // Populate hidden form fields
  document.getElementById("gf-evcCode").value = `EVC ${code}`;
  
  // Get address from reverse geocoding (async, doesn't block modal)
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

// EVC Lookup Logging Function
function logEVCLookup(address, lat, lon, evcCode, evcName) {
  // Google Form submission details
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScmuvklj5OJq7tJLLS2TCR8fRYoOh96WA_63a9YsGOsznLgdQ/formResponse';
  const ENTRY_IDS = {
    address: 'entry.124085928',
    latitude: 'entry.537784608',
    longitude: 'entry.683705898',
    evcCode: 'entry.1602420653',
    evcName: 'entry.615207214'
  };

  try {
    // Create a hidden form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = FORM_URL;
    form.target = 'log-iframe';
    form.style.display = 'none';

    // Add form fields
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

    // Create hidden iframe if it doesn't exist
    let iframe = document.getElementById('log-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'log-iframe';
      iframe.name = 'log-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    // Submit the form
    document.body.appendChild(form);
    form.submit();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(form);
    }, 1000);

    console.log('EVC lookup logged:', { address, lat, lon, evcCode, evcName });
  } catch (error) {
    console.error('Failed to log EVC lookup:', error);
    // Fail silently - don't interrupt user experience
  }
}

// Pre-order modal functions
function openPreorderModal(evcName) {
  const modal = document.getElementById("preorder-modal");
  const evcField = document.getElementById("preorder-evc");
  const addressField = document.getElementById("preorder-address");
  
  // Pre-fill the EVC field
  evcField.value = window.currentEvcName || evcName;
  
  // Pre-fill address - use stored searched address if available
  if (window.searchedAddress) {
    // Use the address they originally searched for
    addressField.value = window.searchedAddress;
  } else if (window.currentLat && window.currentLon) {
    // Fall back to reverse geocoding (for geolocation users)
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
  
  // Show modal
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closePreorderModal() {
  const modal = document.getElementById("preorder-modal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
  
  // Reset form
  document.getElementById("preorder-form").reset();
}

// Setup preorder modal close button
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("preorder-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePreorderModal);
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById("preorder-modal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closePreorderModal();
      }
    });
  }
  
  // Handle form submission
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
