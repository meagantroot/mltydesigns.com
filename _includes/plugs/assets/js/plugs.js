let db;

// Mapping names to IDs used in your world SVG (e.g., 2-letter ISO codes)
const countryToCode = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS", "Andorra": "AD",
    "Angola": "AO", "Anguilla": "AI", "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM",
    "Aruba": "AW", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS",
    "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE",
    "Belize": "BZ", "Benin": "BJ", "Bermuda": "BM", "Bhutan": "BT", "Bolivia": "BO",
    "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "British Virgin Islands": "VG", "Brunei": "BN",
    "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Canary Islands": "IC", "Cambodia": "KH", "Cameroon": "CM",
    "Canada": "CA", "Cape Verde": "CV", "Cayman Islands": "KY", "Central African Republic": "CF", "Chad": "TD",
    "Chile": "CL", "China": "CN", "Cook Islands": "CK", "Colombia": "CO", "Comoros": "KM", "Congo": "CG",
    "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czech Republic": "CZ",
    "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "East Timor (Timor-Leste)": "TL", "Ecuador": "EC",
    "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE", "Eswatini": "SZ",
    "Ethiopia": "ET", "Falkland Islands": "FK", "Faroe Islands": "FO", "Fiji": "FJ", "Finland": "FI",
    "France": "FR", "French Guiana": "GF", "French Polynesia": "PF", "Gabon": "GA", "Gambia": "GM",
    "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Gibraltar": "GI", "Greece": "GR",
    "Greenland": "GL", "Grenada": "GD", "Guadeloupe": "GP", "Guam": "GU", "Guatemala": "GT",
    "Guernsey": "GG", "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT",
    "Honduras": "HN", "Hong Kong": "HK", "Hungary": "HU", "Iceland": "IS", "India": "IN",
    "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE", "Isle of Man": "IM",
    "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jersey": "JE",
    "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "North Korea": "KP",
    "South Korea": "KR", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA", "Latvia": "LV",
    "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI",
    "Lithuania": "LT", "Luxembourg": "LU", "Macau": "MO", "North Macedonia": "MK", "Madagascar": "MG",
    "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV", "Mali": "ML", "Malta": "MT",
    "Marshall Islands": "MH", "Martinique": "MQ", "Mauritania": "MR", "Mauritius": "MU", "Mayotte": "YT",
    "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC", "Mongolia": "MN",
    "Montenegro": "ME", "Montserrat": "MS", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
    "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "Netherlands Antilles": "AN", "New Caledonia": "NC",
    "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "Niue": "NU",
    "Norfolk Island": "NF", "Northern Mariana Islands": "MP", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
    "Palau": "PW", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY",
    "Peru": "PE", "Philippines": "PH", "Pitcairn": "PN", "Poland": "PL", "Portugal": "PT",
    "Puerto Rico": "PR", "Qatar": "QA", "Reunion": "RE", "Romania": "RO", "Russia": "RU",
    "Rwanda": "RW", "Saint Helena": "SH", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC", "Saint Pierre and Miquelon": "PM",
    "Saint Vincent and the Grenadines": "VC", "Samoa": "WS", "San Marino": "SM", "Sao Tome and Principe": "ST", "Saudi Arabia": "SA",
    "Senegal": "SN", "Serbia": "RS", "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG",
    "Slovakia": "SK", "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA",
    "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR",
    "Svalbard and Jan Mayen": "SJ", "Swaziland": "SZ", "Sweden": "SE", "Switzerland": "CH", "Syria": "SY",
    "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH", "Timor-Leste": "TL",
    "Togo": "TG", "Tokelau": "TK", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN",
    "Turkey": "TR", "Turkmenistan": "TM", "Turks and Caicos Islands": "TC", "Tuvalu": "TV", "Uganda": "UG",
    "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US", "Uruguay": "UY",
    "Uzbekistan": "UZ", "Vatican City": "VA", "Vanuatu": "VU", "Venezuela": "VE", "Vietnam": "VN", "United States Virgin Islands": "VI",
    "Wallis and Futuna": "WF", "West Bank": "WE", "Western Sahara": "EH", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW", "Côte d'Ivoire": "CI", "Eswatini (Swaziland)": "SZ", "Gaza Strip": "GS", "Saint Martin": "SX", "Saint Barthélemy":"BL"
};

// --- Utility ---
function el(tag, text = null) {
    const e = document.createElement(tag);
    if (text !== null) e.textContent = text;
    return e;
}

// --- Normalize country names ---
function normalizeCountryName(name) {
    return name
        .trim()
        .replace(/\u2019/g, "'"); // fix curly apostrophes
}

// --- Sanitize SVG ---
function sanitizeSVG(svgString) {
    return DOMPurify.sanitize(svgString, {
        USE_PROFILES: { svg: true, svgFilters: true }
    });
}

// --- Strip dangerous SVG nodes ---
function stripSVG(svgDoc) {
    svgDoc.querySelectorAll('script, foreignObject').forEach(e => e.remove());

    svgDoc.querySelectorAll('*').forEach(el => {
        [...el.attributes].forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
    });
}

// --- Init ---
async function init() {
    try {
        const res = await fetch('/assets/plugs.json');
        db = await res.json();

        const svgRes = await fetch('/assets/world.svg');
        const svgText = await svgRes.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

        stripSVG(svgDoc);

        const svgElement = svgDoc.documentElement;

        const container = document.getElementById('map-container');
        if (!container) {
            console.error("map-container not found");
            return;
        }

        container.innerHTML = "";
        container.appendChild(svgElement);

        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', '100%');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        if (!svgElement.hasAttribute('viewBox')) {
            const bbox = svgElement.getBBox();
            svgElement.setAttribute(
                'viewBox',
                `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
            );
        }

        svgElement.querySelectorAll('path').forEach(p => {
            p.classList.add('country');
        });

        populateDropdowns();

        document.getElementById('plugDropdown')
            ?.addEventListener('change', updateByPlug);

        document.getElementById('countryDropdown')
            ?.addEventListener('change', updateByCountry);

    } catch (e) {
        console.error("Initialization failed:", e);
    }
}

// --- Dropdowns ---
function populateDropdowns() {
    const plugDrop = document.getElementById('plugDropdown');
    const countryDrop = document.getElementById('countryDropdown');

    if (!plugDrop || !countryDrop) {
        console.error("Dropdown elements not found");
        return;
    }

    // 🔑 Add placeholders FIRST
    const plugPlaceholder = el('option', '-- please choose one --');
    plugPlaceholder.value = "";
    plugPlaceholder.selected = true;
    plugPlaceholder.disabled = true;
    plugDrop.appendChild(plugPlaceholder);

    const countryPlaceholder = el('option', '-- please choose one --');
    countryPlaceholder.value = "";
    countryPlaceholder.selected = true;
    countryPlaceholder.disabled = true;
    countryDrop.appendChild(countryPlaceholder);

    // Populate plugs
    db.plug_types.forEach(p => {
        const option = el('option');
        option.value = p.type;
        option.textContent = `Type ${p.type}`;
        plugDrop.appendChild(option);
    });

    // Populate countries
    let countries = [];
    db.plug_types.forEach(p => countries.push(...p.countries));

    [...new Set(countries)].sort().forEach(c => {
        const option = el('option');
        option.value = c;
        option.textContent = c;
        countryDrop.appendChild(option);
    });
}

function resetHighlights() {
    const map = document.getElementById('map-container');
    if (!map) return;

    map.querySelectorAll('.country').forEach(el => {
        el.classList.remove('highlight');
        el.style.fill = '';
    });
}

// --- Update by Plug ---
function updateByPlug() {
    const map = document.getElementById('map-container');
    if (!map) return;

    const type = document.getElementById('plugDropdown')?.value;
    if (!type) return;
    const data = db.plug_types.find(p => p.type === type);
    if (!data) return;

    resetHighlights();

    let missing = [];

    data.countries.forEach(name => {
        const normalized = normalizeCountryName(name);
        const code = countryToCode[normalized];

        if (!code) {
            missing.push(name);
            return;
        }

        map.querySelectorAll(
            `path[id='${code}'], path[id='${code.toLowerCase()}'], path[id*='${code}']`
        ).forEach(el => {
            el.classList.add('highlight');
            el.style.fill = '#ff6600';
        });
    });

    if (missing.length) {
        console.warn("Missing country codes:", missing);
    }

    renderPlugInfo(data);
    renderSVG(data.svg);
    updateTable(data.countries);
    document.getElementById('countryDropdown').selectedIndex = 0;
}

// --- Update by Country ---
function updateByCountry() {
    const map = document.getElementById('map-container');
    if (!map) return;

    const country = document.getElementById('countryDropdown')?.value;
    if (!country) return;

    resetHighlights();

    const normalized = normalizeCountryName(country);
    const code = countryToCode[normalized];

    if (!code) {
        console.warn("Missing country code for:", country);
        return;
    }

    map.querySelectorAll(
        `path[id='${code}'], path[id='${code.toLowerCase()}'], path[id*='${code}']`
    ).forEach(el => {
        el.classList.add('highlight');
        el.style.fill = '#ff6600';
    });

    const usedPlugs = db.plug_types.filter(p =>
        p.countries.includes(country)
    );

    if (usedPlugs.length > 0) {
        renderCountryInfo(country, usedPlugs);
        renderSVG(usedPlugs[0].svg);
    }

    updateTable([country]);

    // ✅ Reset the OTHER dropdown
    document.getElementById('plugDropdown').selectedIndex = 0;
}

// --- Render Info ---
function renderPlugInfo(data) {
    const container = document.getElementById('info-text');
    if (!container) return;

    container.innerHTML = "";

    container.append(
        el('h5', `Type ${data.type}`),
        el('div', `Voltage: ${data.voltage}`),
        el('div', data.physical_description),
        el('div', data.history)
    );
}

function renderCountryInfo(country, plugs) {
    const container = document.getElementById('info-text');
    if (!container) return;

    container.innerHTML = "";

    const list = plugs.map(p => `Type ${p.type}`).join(', ');

    container.append(
        el('h5', country),
        el('p', `Uses: ${list}`)
    );
}

// --- Render SVG ---
function renderSVG(svgString) {
    const container = document.getElementById('svg-display');
    if (!container) return;

    container.innerHTML = "";

    if (!svgString || typeof svgString !== "string") return;

    const clean = sanitizeSVG(svgString);

    const doc = new DOMParser().parseFromString(clean, "image/svg+xml");

    stripSVG(doc);

    const svg = doc.documentElement;

    if (!svg || svg.nodeName !== "svg") return;

    svg.setAttribute("width", "120");
    svg.setAttribute("height", "120");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const imported = document.importNode(svg, true);
    container.appendChild(imported);
}

// --- Table ---
function updateTable(countries) {
    const tbody = document.getElementById('country-table-body');
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!countries || countries.length === 0) {
        const tr = el('tr');
        const td = el('td', 'No results.');
        td.colSpan = 2;
        td.className = "text-muted text-center";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    countries.sort().forEach(country => {
        const plugs = db.plug_types
            .filter(p => p.countries.includes(country))
            .map(p => `Type ${p.type}`)
            .join(', ');

        const tr = el('tr');
        tr.append(
            el('td', country),
            el('td', plugs)
        );

        tbody.appendChild(tr);
    });
}

// --- Start safely ---
document.addEventListener('DOMContentLoaded', init);
