let db;

// Mapping names to IDs used in your world SVG (e.g., 2-letter ISO codes)
const countryToCode = {
    "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS", "Andorra": "AD",
    "Angola": "AO", "Anguilla": "AI", "Antigua and Barbuda": "AG", "Argentina": "AR", "Armenia": "AM",
    "Aruba": "AW", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS",
    "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE",
    "Belize": "BZ", "Benin": "BJ", "Bermuda": "BM", "Bhutan": "BT", "Bolivia": "BO",
    "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR", "British Virgin Islands": "VG", "Brunei": "BN",
    "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI", "Cambodia": "KH", "Cameroon": "CM",
    "Canada": "CA", "Cape Verde": "CV", "Cayman Islands": "KY", "Central African Republic": "CF", "Chad": "TD",
    "Chile": "CL", "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG",
    "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY", "Czech Republic": "CZ",
    "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM", "Dominican Republic": "DO", "Ecuador": "EC",
    "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
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
    "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Caledonia": "NC",
    "New Zealand": "NZ", "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "Niue": "NU",
    "Norfolk Island": "NF", "Northern Mariana Islands": "MP", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
    "Palau": "PW", "Palestinian Territory": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY",
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
    "Uzbekistan": "UZ", "Vanuatu": "VU", "Venezuela": "VE", "Vietnam": "VN", "United States Virgin Islands": "VI",
    "Wallis and Futuna": "WF", "Western Sahara": "EH", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW", "Côte d'Ivoire": "CI", "Eswatini (Swaziland)": "SZ", "Gaza Strip": "GS"
};

// --- Utility: Safe element creation ---
function el(tag, text = null) {
    const e = document.createElement(tag);
    if (text !== null) e.textContent = text;
    return e;
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
        const res = await fetch('{{ "/plugs.json" | relative_url }}');
        db = await res.json();

        const svgRes = await fetch('{{ "/world.svg" | relative_url }}');
        const svgText = await svgRes.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

        stripSVG(svgDoc);

        const svgElement = svgDoc.documentElement;

        const container = document.getElementById('map-container');
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

        // Attach events safely
        document.getElementById('plugDropdown')
            .addEventListener('change', updateByPlug);

        document.getElementById('countryDropdown')
            .addEventListener('change', updateByCountry);

    } catch (e) {
        console.error("Initialization failed:", e);
    }
}

// --- Dropdowns ---
function populateDropdowns() {
    const plugDrop = document.getElementById('plugDropdown');
    const countryDrop = document.getElementById('countryDropdown');

    db.plug_types.forEach(p => {
        const option = el('option');
        option.value = p.type;
        option.textContent = `Type ${p.type}`;
        plugDrop.appendChild(option);
    });

    let countries = [];
    db.plug_types.forEach(p => countries.push(...p.countries));

    [...new Set(countries)].sort().forEach(c => {
        const option = el('option');
        option.value = c;
        option.textContent = c;
        countryDrop.appendChild(option);
    });
}

// --- Highlight reset ---
function resetHighlights() {
    document.querySelectorAll('.country')
        .forEach(el => el.classList.remove('highlight'));
}

// --- Update by Plug ---
function updateByPlug() {
    const type = document.getElementById('plugDropdown').value;
    const data = db.plug_types.find(p => p.type === type);
    if (!data) return;

    resetHighlights();

    data.countries.forEach(name => {
        const code = countryToCode[name];
        document.querySelectorAll(`path[id='${code}']`)
            .forEach(el => el.classList.add('highlight'));
    });

    renderPlugInfo(data);
    renderSVG(data.svg);
    updateTable(data.countries);
}

// --- Update by Country ---
function updateByCountry() {
    const country = document.getElementById('countryDropdown').value;
    if (!country) return;

    resetHighlights();

    const code = countryToCode[country];
    document.querySelectorAll(`path[id='${code}']`)
        .forEach(el => el.classList.add('highlight'));

    const usedPlugs = db.plug_types.filter(p =>
        p.countries.includes(country)
    );

    if (usedPlugs.length > 0) {
        renderCountryInfo(country, usedPlugs);
        renderSVG(usedPlugs[0].svg);
    }

    updateTable([country]);
}

// --- Render Info (SAFE) ---
function renderPlugInfo(data) {
    const container = document.getElementById('info-text');
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
    container.innerHTML = "";

    const list = plugs.map(p => `Type ${p.type}`).join(', ');

    container.append(
        el('h5', country),
        el('p', `Uses: ${list}`)
    );
}

// --- Render SVG safely ---
function renderSVG(svgString) {
    const container = document.getElementById('svg-display');
    container.innerHTML = "";

    const clean = sanitizeSVG(svgString);

    const wrapper = document.createElement('div');
    wrapper.innerHTML = clean;

    const svg = wrapper.querySelector('svg');
    if (svg) container.appendChild(svg);
}

// --- Table ---
function updateTable(countries) {
    const tbody = document.getElementById('country-table-body');
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

init();