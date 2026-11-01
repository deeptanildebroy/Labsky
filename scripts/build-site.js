const fs = require('fs');
const path = require('path');

// 1. Read SPEC.md
const specRaw = fs.readFileSync('SPEC.md', 'utf8');

// Global site config
const siteConfig = {
    name: 'QUALISSURE Laboratory Services',
    shortName: 'Qualissure',
    tagline: 'PAN INDIA FOOTPRINT',
    phone1: '+91 80177 07173',
    phone2: '+91 98312 87086',
    email: 'info@qualissure.com',
    address: '361, Prantik Pally, 45/361 Bose Pukur Road, Near Dhanmath / 47B Bus Stand, Kolkata - 700107, West Bengal, India',
    social: {
        instagram: 'https://instagram.com',
        facebook: 'https://facebook.com',
        linkedin: 'https://linkedin.com',
        whatsapp: 'https://wa.me/918017707173'
    },
    accreditations: [
        { title: 'NABL ACCREDITED LABORATORY', file: 'nabl-certificate-and-scope.html', desc: 'ISO/IEC 17025 accredited chemical and biological testing scope' },
        { title: 'FSSAI NOTIFIED LABORATORY', file: 'fssai-notification.html', desc: 'Notified laboratory for regulatory food product testing' },
        { title: 'WBPCB RECOGNIZED LABORATORY', file: 'wbpcb-recognition.html', desc: 'Recognized by West Bengal Pollution Control Board for environmental analysis' },
        { title: 'ISO 9001:2015 CERTIFIED LABORATORY', file: 'iso-9001-2015-certificate.html', desc: 'Quality Management Systems certified operations' }
    ]
};

// Safe typo corrections from Section 10
function applySafeFixes(text) {
    if (!text) return '';
    return text
        .replace(/Sliver \(Ag\)/g, 'Silver (Ag)')
        .replace(/Biological Oxygen Demand \(BOD\)/g, 'Biochemical Oxygen Demand (BOD)')
        .replace(/Soil\s+,Sludge/g, 'Soil, Sludge');
}

// Parse SPEC.md service pages
function parseServicePages(md) {
    const cleanMd = md.replace(/\r/g, '');
    const lines = cleanMd.split('\n');
    const pages = [];
    let currentPage = null;
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Page header: ### 4.1 Animal Food & Feeds
        const matchPage = line.match(/^###\s+([456]\.\d+)\s+(.+)$/);
        if (matchPage) {
            if (currentPage) pages.push(currentPage);
            const id = matchPage[1];
            const title = applySafeFixes(matchPage[2].trim());
            let category = 'food-agricultural-products';
            let categoryName = 'Food & Agricultural Products';
            let categoryHub = 'food-agricultural-products.html';

            if (id.startsWith('5.')) {
                category = 'environmental-monitoring';
                categoryName = 'Environmental Monitoring';
                categoryHub = 'environmental-monitoring.html';
            } else if (id.startsWith('6.')) {
                category = 'water-testing';
                categoryName = 'Water Testing';
                categoryHub = 'water-testing.html';
            }

            currentPage = {
                id,
                rawTitle: title,
                title,
                category,
                categoryName,
                categoryHub,
                navLabel: title,
                h1: title,
                slug: '',
                url: '',
                heroImages: [],
                source: '',
                intro: [],
                sections: []
            };
            currentSection = null;
            continue;
        }

        if (line.startsWith('## 5.') || line.startsWith('## 6.') || line.startsWith('## 7.')) {
            if (currentPage) {
                pages.push(currentPage);
                currentPage = null;
            }
            if (line.startsWith('## 7.')) break;
            continue;
        }

        if (!currentPage) continue;

        // Metadata
        if (line.startsWith('- **Nav label (wireframe):**')) {
            currentPage.navLabel = applySafeFixes(line.replace('- **Nav label (wireframe):**', '').trim());
            continue;
        }
        if (line.startsWith('- **Page H1 (from source deck):**')) {
            currentPage.h1 = applySafeFixes(line.replace('- **Page H1 (from source deck):**', '').trim());
            continue;
        }
        if (line.startsWith('- **Suggested URL:**')) {
            const u = line.replace('- **Suggested URL:**', '').replace(/`/g, '').trim();
            currentPage.url = u;
            const parts = u.split('/');
            currentPage.slug = parts[parts.length - 1];
            continue;
        }
        if (line.startsWith('- **Hero image:**') || line.startsWith('- **Hero images:**')) {
            const matches = [...line.matchAll(/assets\/images\/([a-zA-Z0-9_\-\.]+)/g)].map(m => m[1]);
            currentPage.heroImages = matches;
            continue;
        }
        if (line.startsWith('- **Source:**')) {
            currentPage.source = line.replace('- **Source:**', '').trim();
            continue;
        }

        // #### Section
        if (line.startsWith('#### ')) {
            currentSection = {
                title: applySafeFixes(line.replace('#### ', '').trim()),
                contentLines: []
            };
            currentPage.sections.push(currentSection);
            continue;
        }

        // Accumulate lines
        if (!currentSection) {
            if (line.trim().length > 0 && !line.startsWith('- **')) {
                currentPage.intro.push(applySafeFixes(line.trim()));
            }
        } else {
            currentSection.contentLines.push(applySafeFixes(line));
        }
    }

    // Fallback slug if url was missing
    pages.forEach(p => {
        if (!p.slug) {
            p.slug = p.navLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
    });

    return pages;
}

const servicePages = parseServicePages(specRaw);
console.log(`Parsed ${servicePages.length} service pages successfully.`);

// Helper to render section content lines into modern Bootstrap HTML
function renderSectionContent(lines, secTitle = '') {
    let html = '';
    let listItems = [];
    let inPanel = false;

    const isBenefitSection = /benefit|why\s+choose|importance|why\s+is/i.test(secTitle);

    function flushList() {
        if (listItems.length === 0) return;

        if (isBenefitSection) {
            html += `<ul class="benefit-list">`;
            listItems.forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += `</ul>`;
        } else {
            // Analytical Parameter Ledger / Grid
            html += `<div class="parameter-grid">`;
            listItems.forEach(item => {
                html += `<div class="parameter-card"><span class="parameter-card-bullet"></span><span class="parameter-card-text">${item}</span></div>`;
            });
            html += `</div>`;
        }
        listItems = [];
    }

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const line = rawLine.trim();

        // Check for ##### Subheading
        if (line.startsWith('##### ')) {
            flushList();
            if (inPanel) {
                html += `</div>`; // close previous analytical-panel
            }
            const subTitle = line.replace('##### ', '').trim();
            html += `
        <div class="analytical-panel">
          <div class="analytical-panel-header">
            <h4 class="analytical-panel-title">${subTitle}</h4>
          </div>`;
            inPanel = true;
            continue;
        }

        // Check for **Label:**
        if (line.startsWith('**') && line.includes(':**')) {
            flushList();
            const label = line.replace(/\*\*/g, '').replace(':', '').trim();
            html += `<div class="small fw-bold text-uppercase text-primary mt-3 mb-2" style="letter-spacing: 0.05em;">${label}</div>`;
            continue;
        }

        // Check for bullet: - item
        if (line.startsWith('- ') || line.startsWith('* ')) {
            listItems.push(line.substring(2).trim());
            continue;
        }

        // Numbered step: 1. Item
        if (/^\d+\.\s+/.test(line)) {
            flushList();
            const stepText = line.replace(/^\d+\.\s+/, '').trim();
            const num = line.match(/^(\d+)\./)[1];
            html += `
        <div class="methodology-step">
          <div class="methodology-num">${num}</div>
          <div class="methodology-content">
            <p>${stepText}</p>
          </div>
        </div>`;
            continue;
        }

        // Normal paragraph
        if (line.length > 0) {
            flushList();
            html += `<p class="editorial-lead">${line}</p>`;
        }
    }

    flushList();
    if (inPanel) {
        html += `</div>`;
    }

    return html;
}

// Generate shared components
function getTopUtilityBar() {
    return `
    <!-- Top Utility Bar -->
    <div class="top-utility-bar">
        <div class="container d-flex flex-wrap justify-content-between align-items-center py-1">
            <div class="d-flex align-items-center flex-wrap gap-3">
                <span><i class="bi bi-telephone-fill text-primary me-1"></i><a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}">${siteConfig.phone1}</a></span>
                <span class="d-none d-md-inline text-muted">|</span>
                <span><i class="bi bi-telephone-fill text-primary me-1"></i><a href="tel:${siteConfig.phone2.replace(/\s+/g, '')}">${siteConfig.phone2}</a></span>
                <span class="d-none d-md-inline text-muted">|</span>
                <span><i class="bi bi-envelope-fill text-primary me-1"></i><a href="mailto:${siteConfig.email}">${siteConfig.email}</a></span>
            </div>
            <div class="d-flex align-items-center gap-3 mt-1 mt-md-0">
                <span class="pan-india-badge"><i class="bi bi-geo-alt-fill me-1"></i>PAN INDIA FOOTPRINT</span>
                <div class="d-none d-sm-flex align-items-center gap-2 ms-2">
                    <a href="${siteConfig.social.instagram}" target="_blank" rel="noopener" title="Instagram"><i class="bi bi-instagram"></i></a>
                    <a href="${siteConfig.social.facebook}" target="_blank" rel="noopener" title="Facebook"><i class="bi bi-facebook"></i></a>
                    <a href="${siteConfig.social.linkedin}" target="_blank" rel="noopener" title="LinkedIn"><i class="bi bi-linkedin"></i></a>
                    <a href="${siteConfig.social.whatsapp}" target="_blank" rel="noopener" title="WhatsApp"><i class="bi bi-whatsapp"></i></a>
                </div>
            </div>
        </div>
    </div>`;
}

function getNavbar(activeCategory = '', rootPath = '') {
    return `
    <!-- Main Navigation Bar -->
    <div class="container-fluid sticky-top bg-white shadow-sm">
        <div class="container">
            <nav class="navbar navbar-expand-lg navbar-light py-lg-0 px-lg-3">
                <a href="${rootPath}index.html" class="navbar-brand d-flex align-items-center">
                    <img class="img-fluid me-3" src="${rootPath}img/qls_logo.png" alt="Qualissure Logo" style="width: 50px; height: 50px;">
                    <div>
                        <h1 class="text-primary m-0 fs-3 fw-bold">Qualissure</h1>
                        <span class="text-muted small text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.1em; display:block; margin-top:-4px;">Laboratory Services</span>
                    </div>
                </a>
                <button type="button" class="navbar-toggler me-2" data-bs-toggle="collapse" data-bs-target="#navbarCollapse">
                    <i class="bi bi-list fs-2"></i>
                </button>
                <div class="collapse navbar-collapse" id="navbarCollapse">
                    <div class="navbar-nav ms-auto py-0 align-items-lg-center">
                        <a href="${rootPath}index.html" class="nav-item nav-link ${activeCategory === 'home' ? 'active' : ''}">Home</a>
                        
                        <!-- Company Dropdown -->
                        <div class="nav-item dropdown">
                            <a href="#" class="nav-link dropdown-toggle ${activeCategory === 'company' ? 'active' : ''}" data-bs-toggle="dropdown">Company</a>
                            <div class="dropdown-menu bg-primary m-0 shadow">
                                <a href="${rootPath}about-us.html" class="dropdown-item text-white">About Us</a>
                                <a href="${rootPath}vision-mission-values.html" class="dropdown-item text-white">Our Vision, Mission & Values</a>
                            </div>
                        </div>

                        <!-- Services Dropdown with Testing flyout -->
                        <div class="nav-item dropdown">
                            <a href="${rootPath}services.html" class="nav-link dropdown-toggle ${activeCategory.startsWith('services') ? 'active' : ''}" data-bs-toggle="dropdown">Services</a>
                            <div class="dropdown-menu bg-primary m-0 shadow">
                                <div class="dropdown-submenu">
                                    <a href="${rootPath}services.html#testing" class="dropdown-item text-white">Testing</a>
                                    <div class="dropdown-menu bg-primary m-0 shadow">
                                        <a href="${rootPath}food-agricultural-products.html" class="dropdown-item text-white">Food & Agricultural Products</a>
                                        <a href="${rootPath}nutritional-labelling.html" class="dropdown-item text-white">Nutritional Labelling</a>
                                        <a href="${rootPath}shelf-life-testing.html" class="dropdown-item text-white">Shelf-Life Testing</a>
                                        <a href="${rootPath}environmental-monitoring.html" class="dropdown-item text-white">Environmental Monitoring</a>
                                        <a href="${rootPath}water-testing.html" class="dropdown-item text-white">Water Testing</a>
                                    </div>
                                </div>
                                <a href="${rootPath}consultancy.html" class="dropdown-item text-white">Consultancy</a>
                                <a href="${rootPath}training.html" class="dropdown-item text-white">Training</a>
                            </div>
                        </div>

                        <!-- Accreditations & Recognitions Dropdown -->
                        <div class="nav-item dropdown">
                            <a href="#" class="nav-link dropdown-toggle ${activeCategory === 'accreditations' ? 'active' : ''}" data-bs-toggle="dropdown">Accreditations</a>
                            <div class="dropdown-menu bg-primary m-0 shadow">
                                <a href="${rootPath}nabl-certificate-and-scope.html" class="dropdown-item text-white">NABL Certificate & Scope</a>
                                <a href="${rootPath}fssai-notification.html" class="dropdown-item text-white">FSSAI Notification</a>
                                <a href="${rootPath}wbpcb-recognition.html" class="dropdown-item text-white">WBPCB Recognition</a>
                                <a href="${rootPath}iso-9001-2015-certificate.html" class="dropdown-item text-white">ISO 9001: 2015 Certificate</a>
                            </div>
                        </div>

                        <a href="${rootPath}careers.html" class="nav-item nav-link ${activeCategory === 'careers' ? 'active' : ''}">Careers</a>
                        <a href="${rootPath}contact-us.html" class="nav-item nav-link ${activeCategory === 'contact' ? 'active' : ''}">Contact Us</a>
                    </div>
                </div>
            </nav>
        </div>
    </div>`;
}

function getFloatingActionBar(rootPath = '') {
    return `
    <!-- Floating Action Bar -->
    <div class="floating-action-bar d-none d-md-flex">
        <a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}" class="fab-btn fab-call" title="Call Us">
            <i class="bi bi-telephone fs-5"></i>
            <span>Call</span>
        </a>
        <a href="mailto:${siteConfig.email}" class="fab-btn fab-email" title="Email Us">
            <i class="bi bi-envelope fs-5"></i>
            <span>Email</span>
        </a>
    </div>`;
}

function getAccreditationsStrip(rootPath = '') {
    return `
    <!-- Band 2: Moving Accreditations Strip -->
    <div class="accred-marquee-wrapper">
        <div class="container-fluid px-0">
            <div class="client-carousel" style="animation-duration: 25s;">
                ${siteConfig.accreditations.concat(siteConfig.accreditations).map(a => `
                    <a href="${rootPath}${a.file}" class="accred-badge-card">
                        <i class="bi bi-patch-check-fill text-primary fs-4"></i>
                        <span>${a.title}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    </div>`;
}

function getFooter(rootPath = '') {
    return `
    <!-- Footer Start -->
    <footer class="container-fluid footer position-relative bg-dark text-white-50 py-5">
        <div class="container py-4">
            <div class="row g-5">
                <div class="col-lg-4 col-md-6 pe-lg-4">
                    <a href="${rootPath}index.html" class="navbar-brand">
                        <h2 class="h2 text-primary mb-2">${siteConfig.shortName} <span class="text-white">LS</span></h2>
                    </a>
                    <div class="mb-3">
                        <span class="pan-india-badge"><i class="bi bi-geo-alt-fill me-1"></i>PAN INDIA FOOTPRINT</span>
                    </div>
                    <p class="small text-white-50 mb-3">${siteConfig.name} is a premier analytical laboratory providing comprehensive testing for Food & Agricultural Products, Environmental Monitoring, and Water Testing.</p>
                    <div class="d-flex gap-2">
                        <a class="btn btn-sm btn-outline-light rounded-circle" href="${siteConfig.social.instagram}"><i class="bi bi-instagram"></i></a>
                        <a class="btn btn-sm btn-outline-light rounded-circle" href="${siteConfig.social.facebook}"><i class="bi bi-facebook"></i></a>
                        <a class="btn btn-sm btn-outline-light rounded-circle" href="${siteConfig.social.linkedin}"><i class="bi bi-linkedin"></i></a>
                        <a class="btn btn-sm btn-outline-light rounded-circle" href="${siteConfig.social.whatsapp}"><i class="bi bi-whatsapp"></i></a>
                    </div>
                </div>

                <div class="col-lg-2 col-md-6">
                    <h5 class="text-light mb-3">Quick Links</h5>
                    <ul class="list-unstyled small mb-0">
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}index.html">Home</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}about-us.html">About Us</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}vision-mission-values.html">Vision & Values</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}careers.html">Careers</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}contact-us.html">Contact Us</a></li>
                    </ul>
                </div>

                <div class="col-lg-3 col-md-6">
                    <h5 class="text-light mb-3">Core Services</h5>
                    <ul class="list-unstyled small mb-0">
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}food-agricultural-products.html">Food & Agricultural Products</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}environmental-monitoring.html">Environmental Monitoring</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}water-testing.html">Water Testing</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}nutritional-labelling.html">Nutritional Labelling</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}shelf-life-testing.html">Shelf-Life Testing</a></li>
                        <li class="mb-2"><a class="text-white-50 text-decoration-none" href="${rootPath}consultancy.html">Consultancy & Training</a></li>
                    </ul>
                </div>

                <div class="col-lg-3 col-md-6">
                    <h5 class="text-light mb-3">Contact Details</h5>
                    <p class="small text-white-50 mb-2"><i class="bi bi-geo-alt-fill text-primary me-2"></i>${siteConfig.address}</p>
                    <p class="small text-white-50 mb-2"><i class="bi bi-telephone-fill text-primary me-2"></i>${siteConfig.phone1}, ${siteConfig.phone2}</p>
                    <p class="small text-white-50 mb-0"><i class="bi bi-envelope-fill text-primary me-2"></i>${siteConfig.email}</p>
                </div>
            </div>

            <hr class="border-secondary my-4">

            <div class="row align-items-center">
                <div class="col-md-6 text-center text-md-start small">
                    &copy; ${new Date().getFullYear()} <strong class="text-white">${siteConfig.name}</strong>. All Rights Reserved.
                </div>
                <div class="col-md-6 text-center text-md-end small mt-2 mt-md-0">
                    <span class="text-white-50">Accredited by NABL | Notified by FSSAI | Recognized by WBPCB</span>
                </div>
            </div>
        </div>
    </footer>
    <!-- Footer End -->

    <!-- Back to Top -->
    <a href="#" class="back-to-top" aria-label="Scroll to top" title="Scroll to top">
        <i class="bi bi-arrow-up"></i>
    </a>

    <!-- JavaScript Libraries -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="${rootPath}lib/wow/wow.min.js"></script>
    <script src="${rootPath}lib/easing/easing.min.js"></script>
    <script src="${rootPath}lib/waypoints/waypoints.min.js"></script>
    <script src="${rootPath}lib/counterup/counterup.min.js"></script>

    <!-- Template Javascript -->
    <script src="${rootPath}js/main.js"></script>`;
}

// Generate an individual service page (Anti-slop / design-taste-frontend compliant)
function generateServicePageHtml(page) {
    const rootPath = '../../../';
    const heroImg = page.heroImages[0] ? `${rootPath}img/assets/images/${page.heroImages[0]}` : `${rootPath}img/carousel-1.jpg`;

    // Get intro description for hero
    let heroSubtitle = page.intro[0] || '';
    if (!heroSubtitle && page.sections.length > 0) {
        const firstP = page.sections[0].contentLines.find(l => l.trim().length > 0 && !l.startsWith('-') && !l.startsWith('*') && !l.startsWith('#'));
        if (firstP) heroSubtitle = firstP;
    }

    // Get related pages from same category
    const related = servicePages
        .filter(p => p.category === page.category && p.id !== page.id)
        .slice(0, 3);

    // In-page navigation items
    const tocItems = page.sections.map((s, idx) => ({
        id: `sec-${idx}`,
        title: s.title
    }));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${page.h1} | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta content="${page.h1}, ${page.categoryName}, laboratory testing, Qualissure" name="keywords">
    <meta content="${heroSubtitle || page.h1 + ' testing services by QUALISSURE Laboratory Services.'}" name="description">

    <!-- Favicon -->
    <link href="${rootPath}img/favicon.ico" rel="icon">

    <!-- Google Web Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">

    <!-- Icon Font Stylesheet -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">

    <!-- Customized Bootstrap Stylesheet -->
    <link href="${rootPath}css/bootstrap.min.css" rel="stylesheet">

    <!-- Template Stylesheet -->
    <link href="${rootPath}css/style.css" rel="stylesheet">
</head>

<body>
    ${getTopUtilityBar()}
    ${getNavbar(page.category, rootPath)}
    ${getFloatingActionBar(rootPath)}

    <!-- Editorial Hero Start -->
    <header class="service-hero-editorial">
        <div class="container">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="${rootPath}index.html">Home</a></li>
                    <li class="breadcrumb-item"><a href="${rootPath}services.html">Services</a></li>
                    <li class="breadcrumb-item active" aria-current="page">${page.navLabel}</li>
                </ol>
            </nav>
            <div class="row align-items-center g-5">
                <div class="col-lg-7">
                    <h1 class="service-hero-title">${page.h1}</h1>
                    <p class="service-hero-desc">${heroSubtitle}</p>
                    <div class="d-flex flex-wrap gap-3 align-items-center">
                        <a href="${rootPath}contact-us.html" class="btn btn-primary px-4 py-3 fw-bold text-white rounded-0 shadow-none">
                            Inquire for Testing
                        </a>
                        <a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}" class="btn btn-outline-dark px-4 py-3 rounded-0 shadow-none">
                            <i class="bi bi-telephone me-2"></i>Consult a Specialist
                        </a>
                    </div>
                </div>
                <div class="col-lg-5">
                    <div class="service-hero-img-wrap">
                        <img src="${heroImg}" alt="${page.h1}">
                    </div>
                </div>
            </div>
        </div>
    </header>
    <!-- Editorial Hero End -->

    <!-- Main Editorial Content Layout -->
    <main class="container py-5 mt-2">
        <div class="row g-5">
            <!-- Left Rail (Sticky Navigation + Laboratory Specs) -->
            <aside class="col-lg-3">
                <div class="service-rail">
                    ${tocItems.length > 0 ? `
                    <nav class="service-rail-nav">
                        <div class="service-rail-nav-title">On This Page</div>
                        ${tocItems.map(item => `
                            <a href="#${item.id}">${item.title}</a>
                        `).join('')}
                    </nav>` : ''}

                    <div class="service-rail-card">
                        <h6 class="text-dark fw-bold mb-3" style="font-family: 'Red Rose', serif;">Testing Standards</h6>
                        <p class="small text-muted mb-3">All analytical procedures adhere to national and international statutory guidelines.</p>
                        <div class="d-flex flex-column gap-2 small">
                            <div class="d-flex align-items-center text-dark"><i class="bi bi-shield-check text-primary me-2"></i>ISO/IEC 17025 Standard</div>
                            <div class="d-flex align-items-center text-dark"><i class="bi bi-shield-check text-primary me-2"></i>NABL Accredited Scope</div>
                            <div class="d-flex align-items-center text-dark"><i class="bi bi-shield-check text-primary me-2"></i>FSSAI / WBPCB Recognized</div>
                        </div>
                    </div>

                    <div class="service-rail-card">
                        <h6 class="text-dark fw-bold mb-2" style="font-family: 'Red Rose', serif;">Direct Technical Desk</h6>
                        <p class="small text-muted mb-3">Discuss sample collection protocol, container requirements, and preservation methods.</p>
                        <a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}" class="text-primary fw-bold text-decoration-none d-block mb-1">${siteConfig.phone1}</a>
                        <a href="mailto:${siteConfig.email}" class="text-secondary small text-decoration-none">${siteConfig.email}</a>
                    </div>
                </div>
            </aside>

            <!-- Main Content Column -->
            <div class="col-lg-9">
                ${page.intro.length > 0 ? `
                <section class="editorial-section">
                    <h2 class="editorial-section-title">Overview</h2>
                    ${page.intro.map(p => `<p class="editorial-lead">${p}</p>`).join('')}
                </section>` : ''}

                ${page.sections.map((sec, idx) => `
                    <section class="editorial-section" id="sec-${idx}">
                        <h2 class="editorial-section-title">${sec.title}</h2>
                        ${renderSectionContent(sec.contentLines, sec.title)}
                    </section>
                `).join('')}
            </div>
        </div>
    </main>

    <!-- Consultation Callout Banner -->
    <section class="service-cta-banner">
        <div class="container text-center">
            <h3>Ready to Schedule Testing for ${page.navLabel}?</h3>
            <p>Submit your sample details or request a custom analytical protocol. Our accredited laboratory provides prompt sample handling, certified testing, and legally defensible reporting.</p>
            <div class="d-flex justify-content-center gap-3 flex-wrap">
                <a href="${rootPath}contact-us.html" class="btn btn-primary px-4 py-3 fw-bold text-white rounded-0 shadow-none">
                    Contact Our Experts
                </a>
                <a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}" class="btn btn-outline-light px-4 py-3 rounded-0 shadow-none">
                    <i class="bi bi-telephone me-2"></i>Call Technical Office
                </a>
            </div>
        </div>
    </section>

    <!-- Related Services -->
    ${related.length > 0 ? `
    <section class="container py-5">
        <div class="mb-4">
            <h3 class="editorial-section-title" style="font-size: 1.6rem;">Related ${page.categoryName}</h3>
        </div>
        <div class="row g-4">
            ${related.map(r => {
        const rImg = r.heroImages[0] ? `${rootPath}img/assets/images/${r.heroImages[0]}` : `${rootPath}img/carousel-1.jpg`;
        return `
                    <div class="col-md-4">
                        <div class="related-service-card">
                            <img src="${rImg}" alt="${r.navLabel}">
                            <div class="related-service-card-body">
                                <h5 class="related-service-card-title">${r.navLabel}</h5>
                                <p class="small text-muted flex-grow-1">${r.intro[0] ? r.intro[0].slice(0, 110) + '...' : 'Specialized laboratory analysis and regulatory compliance parameters.'}</p>
                                <a href="${rootPath}services/testing/${r.category}/${r.slug}.html" class="text-primary fw-bold text-decoration-none small mt-2">
                                    View Service Parameters →
                                </a>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    </section>` : ''}

    ${getFooter(rootPath)}
</body>
</html>`;
}

// Write out all 50 service pages
let writtenCount = 0;
servicePages.forEach(page => {
    const dirPath = path.join('services', 'testing', page.category);
    fs.mkdirSync(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${page.slug}.html`);
    fs.writeFileSync(filePath, generateServicePageHtml(page), 'utf8');
    writtenCount++;
});
console.log(`Generated and written ${writtenCount} service pages.`);

// 2. Build Category Hub Pages
function generateHubPage(title, categorySlug, pageList, desc) {
    const rootPath = '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${title} | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta content="${title}, laboratory analysis, Qualissure" name="keywords">
    <meta content="${desc}" name="description">

    <link href="img/favicon.ico" rel="icon">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>

<body>
    ${getTopUtilityBar()}
    ${getNavbar('services', '')}
    ${getFloatingActionBar('')}

    <!-- Hero Header -->
    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.88), rgba(3, 27, 78, 0.88)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">${title}</h1>
            <p class="fs-5 text-white-50 mx-auto mb-4" style="max-width: 800px;">${desc}</p>
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb justify-content-center mb-0">
                    <li class="breadcrumb-item"><a href="index.html" class="text-white-50">Home</a></li>
                    <li class="breadcrumb-item"><a href="services.html" class="text-white-50">Services</a></li>
                    <li class="breadcrumb-item active text-white" aria-current="page">${title}</li>
                </ol>
            </nav>
        </div>
    </div>

    <!-- Hub Cards Grid -->
    <div class="container-fluid py-5">
        <div class="container">
            <div class="text-center mx-auto mb-5" style="max-width: 700px;">
                <span class="pan-india-badge mb-2">COMPREHENSIVE TESTING SERVICES</span>
                <h2 class="display-6 mb-3">Explore Specialized Sub-Divisions</h2>
                <p class="text-secondary">Select a testing category below for complete parameter lists, methodologies, and regulatory compliance standards.</p>
            </div>

            <div class="row g-4">
                ${pageList.map(p => {
        const img = p.heroImages[0] ? `img/assets/images/${p.heroImages[0]}` : 'img/carousel-1.jpg';
        return `
                    <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.1s">
                        <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden d-flex flex-column">
                            <div class="position-relative" style="height: 200px; overflow: hidden;">
                                <img class="w-100 h-100" src="${img}" alt="${p.navLabel}" style="object-fit: cover; transition: transform 0.4s ease;">
                            </div>
                            <div class="card-body p-4 d-flex flex-column flex-grow-1">
                                <h5 class="card-title text-dark mb-3">${p.navLabel}</h5>
                                <p class="card-text text-secondary small flex-grow-1 mb-4">
                                    ${p.intro[0] ? p.intro[0].slice(0, 140) + '...' : 'Comprehensive laboratory testing, chemical parameters, and compliance analysis.'}
                                </p>
                                <div class="mt-auto pt-3 border-top">
                                    <a href="services/testing/${p.category}/${p.slug}.html" class="btn btn-primary btn-sm rounded-pill px-3 fw-bold w-100 text-center">
                                        View Service Details <i class="bi bi-arrow-right ms-1"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                  `;
    }).join('')}
            </div>
        </div>
    </div>

    <!-- Category Bottom CTA -->
    <div class="container-fluid py-5 bg-light border-top">
        <div class="container text-center py-4">
            <h3 class="mb-3">Need Custom Parameters or Regulatory Guidance?</h3>
            <p class="text-secondary mb-4 mx-auto" style="max-width: 650px;">Our accredited specialists can help design a testing regimen customized to your product specifications and statutory requirements.</p>
            <div class="d-flex justify-content-center gap-3 flex-wrap">
                <a href="contact-us.html" class="btn btn-primary btn-lg rounded-pill px-4 fw-bold shadow">
                    <i class="bi bi-envelope me-2"></i>Contact Our Specialists
                </a>
                <a href="tel:${siteConfig.phone1.replace(/\s+/g, '')}" class="btn btn-outline-primary btn-lg rounded-pill px-4">
                    <i class="bi bi-telephone me-2"></i>Call Technical Team
                </a>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
}

// Generate the 3 category hubs
const foodPages = servicePages.filter(p => p.category === 'food-agricultural-products');
const envPages = servicePages.filter(p => p.category === 'environmental-monitoring');
const waterPages = servicePages.filter(p => p.category === 'water-testing');

fs.writeFileSync('food-agricultural-products.html', generateHubPage(
    'Food & Agricultural Products Testing',
    'food-agricultural-products',
    foodPages,
    'Specialized laboratory divisions covering sensory, chemical, microbiological, nutritional, and residue testing in compliance with FSSAI, BIS, and international food safety standards.'
), 'utf8');

fs.writeFileSync('environmental-monitoring.html', generateHubPage(
    'Environmental Monitoring Services',
    'environmental-monitoring',
    envPages,
    'Specialized environmental monitoring categories supporting Environmental Impact Assessments (EIA), WBPCB compliance, baseline studies, air, noise, stack, and soil monitoring.'
), 'utf8');

fs.writeFileSync('water-testing.html', generateHubPage(
    'Water Testing Services',
    'water-testing',
    waterPages,
    'Comprehensive water testing divisions spanning drinking water (IS 10500), processed food industry water, wastewater, groundwater, sea water, and industrial cooling systems.'
), 'utf8');

console.log('Generated the 3 Category Hub pages.');


// 4. Update index.html

function getTrustedClientsSection() {
    return `
    <!-- Client Start -->
    <div class="container-fluid container-team py-5">
        <div class="container pb-5">
            <div class="text-center mx-auto wow fadeInUp" data-wow-delay="0.1s" style="max-width: 600px;">
                <h1 class="display-6 mb-3">Our Trusted Clients</h1>
                <p class="mb-5">We are proud to partner with leading organizations in the healthcare and analysis
                    industry.</p>
            </div>
            <div class="client-carousel-wrapper wow fadeInUp" data-wow-delay="0.3s">
                <div class="client-carousel">
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Aditya-Birla.jpeg" alt="Aditya Birla Group">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Aecom.jpeg" alt="AECOM">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Airport.jpeg" alt="Airport Authority of India">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Amazon.jpeg" alt="Amazon">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Bharat-Petroleum.jpeg" alt="Bharat Petroleum">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/DVC.jpeg" alt="DVC">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Durgapur-projects-ltd.jpeg" alt="Durgapur Projects Ltd">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/GPT-Group.jpeg" alt="GPT Group">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Gammon.jpeg" alt="Gammon India">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/HP.jpeg" alt="HPCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/IndianOil.jpeg" alt="IOCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/LNT.jpeg" alt="L&T">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/NALCO.jpeg" alt="NALCO">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/NCC.jpeg" alt="NCC">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Rites.jpeg" alt="RITES">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/TATA.jpeg" alt="TATA">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Taj.jpeg" alt="Taj Hotels">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/UltraTech.jpeg" alt="UltraTech Cement">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/WBSEDCL.jpeg" alt="WBSEDCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/WPIL.jpeg" alt="WPIL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/bvg.jpeg" alt="BVG India">
                        </div>
                    </div>
                    <!-- Cloned items for seamless loop -->
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Aditya-Birla.jpeg" alt="Aditya Birla Group">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Aecom.jpeg" alt="AECOM">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Airport.jpeg" alt="Airport Authority of India">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Amazon.jpeg" alt="Amazon">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Bharat-Petroleum.jpeg" alt="Bharat Petroleum">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/DVC.jpeg" alt="DVC">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Durgapur-projects-ltd.jpeg" alt="Durgapur Projects Ltd">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/GPT-Group.jpeg" alt="GPT Group">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Gammon.jpeg" alt="Gammon India">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/HP.jpeg" alt="HPCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/IndianOil.jpeg" alt="IOCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/LNT.jpeg" alt="L&T">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/NALCO.jpeg" alt="NALCO">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/NCC.jpeg" alt="NCC">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Rites.jpeg" alt="RITES">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/TATA.jpeg" alt="TATA">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/Taj.jpeg" alt="Taj Hotels">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/UltraTech.jpeg" alt="UltraTech Cement">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/WBSEDCL.jpeg" alt="WBSEDCL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/WPIL.jpeg" alt="WPIL">
                        </div>
                    </div>
                    <div class="client-item">
                        <div class="client-logo-box">
                            <img src="img/bvg.jpeg" alt="BVG India">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Client End -->
    `;
}

function generateHomePage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${siteConfig.name} - Premier Analytical Testing Laboratory</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta content="Qualissure, food testing, environmental monitoring, water testing, NABL accredited, FSSAI, WBPCB, ISO 9001" name="keywords">
    <meta content="QUALISSURE Laboratory Services provides NABL accredited, FSSAI notified, WBPCB recognized laboratory testing for Food & Agricultural Products, Environmental Monitoring, and Water Testing across India." name="description">

    <link href="img/favicon.ico" rel="icon">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>

<body>
    ${getTopUtilityBar()}
    ${getNavbar('home', '')}
    ${getFloatingActionBar('')}

    <!-- Band 1: Hero Carousel — Moving Slides Our Services -->
    <div class="container-fluid header-carousel px-0 mb-0 position-relative">
        <div id="header-carousel" class="carousel slide carousel-fade" data-bs-ride="carousel">
            <div class="carousel-inner">
                <!-- Slide 1: Food & Ag -->
                <div class="carousel-item active">
                    <img class="w-100" src="img/assets/images/food-0d4be68e.jpg" alt="Food & Agricultural Product Testing" style="height: 600px; object-fit: cover; filter: brightness(0.65);">
                    <div class="carousel-caption d-flex align-items-center">
                        <div class="container">
                            <div class="row justify-content-start">
                                <div class="col-lg-8 text-start">
                                    <span class="pan-india-badge mb-3">PAN INDIA FOOTPRINT</span>
                                    <h2 class="display-3 text-white fw-bold animated slideInDown mb-3" style="text-shadow: 2px 2px 10px rgba(0,0,0,0.6);">Food & Agricultural Products Testing</h2>
                                    <p class="fs-5 text-white mb-4 animated slideInRight">Specialized testing divisions covering nutritional analysis, pesticide residues, heavy metals, and regulatory compliance.</p>
                                    <div class="d-flex flex-wrap gap-3 animated slideInUp">
                                        <a href="food-agricultural-products.html" class="btn btn-primary py-3 px-5 rounded-pill fw-bold shadow">Learn More</a>
                                        <a href="contact-us.html" class="btn btn-outline-light py-3 px-5 rounded-pill fw-bold shadow">Contact Us</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Slide 2: Environmental -->
                <div class="carousel-item">
                    <img class="w-100" src="img/assets/images/env-82dbc26c.jpg" alt="Environmental Monitoring" style="height: 600px; object-fit: cover; filter: brightness(0.65);">
                    <div class="carousel-caption d-flex align-items-center">
                        <div class="container">
                            <div class="row justify-content-start">
                                <div class="col-lg-8 text-start">
                                    <span class="pan-india-badge mb-3">WBPCB RECOGNIZED</span>
                                    <h2 class="display-3 text-white fw-bold animated slideInDown mb-3" style="text-shadow: 2px 2px 10px rgba(0,0,0,0.6);">Environmental Monitoring Services</h2>
                                    <p class="fs-5 text-white mb-4 animated slideInRight">Baseline studies, ambient air, stack emissions, work zone air quality, noise, and soil monitoring.</p>
                                    <div class="d-flex flex-wrap gap-3 animated slideInUp">
                                        <a href="environmental-monitoring.html" class="btn btn-primary py-3 px-5 rounded-pill fw-bold shadow">Learn More</a>
                                        <a href="contact-us.html" class="btn btn-outline-light py-3 px-5 rounded-pill fw-bold shadow">Contact Us</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Slide 3: Water Testing -->
                <div class="carousel-item">
                    <img class="w-100" src="img/assets/images/water-832f5541.jpg" alt="Water Testing Services" style="height: 600px; object-fit: cover; filter: brightness(0.65);">
                    <div class="carousel-caption d-flex align-items-center">
                        <div class="container">
                            <div class="row justify-content-start">
                                <div class="col-lg-8 text-start">
                                    <span class="pan-india-badge mb-3">NABL ACCREDITED PARAMETERS</span>
                                    <h2 class="display-3 text-white fw-bold animated slideInDown mb-3" style="text-shadow: 2px 2px 10px rgba(0,0,0,0.6);">Comprehensive Water Testing</h2>
                                    <p class="fs-5 text-white mb-4 animated slideInRight">Drinking water (IS 10500), packaged water, food processing process water, and industrial effluent monitoring.</p>
                                    <div class="d-flex flex-wrap gap-3 animated slideInUp">
                                        <a href="water-testing.html" class="btn btn-primary py-3 px-5 rounded-pill fw-bold shadow">Learn More</a>
                                        <a href="contact-us.html" class="btn btn-outline-light py-3 px-5 rounded-pill fw-bold shadow">Contact Us</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#header-carousel" data-bs-slide="prev" aria-label="Previous Slide">
                <span class="carousel-control-custom-prev"><i class="bi bi-chevron-left"></i></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#header-carousel" data-bs-slide="next" aria-label="Next Slide">
                <span class="carousel-control-custom-next"><i class="bi bi-chevron-right"></i></span>
                <span class="visually-hidden">Next</span>
            </button>
        </div>
    </div>
    <!-- Carousel End -->

    ${getAccreditationsStrip('')}

    <!-- Core Services Overview Start -->
    <div class="container-fluid py-5 mt-4">
        <div class="container">
            <div class="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style="max-width: 700px;">
                <span class="pan-india-badge mb-2">OUR EXPERTISE</span>
                <h1 class="display-6 mb-3">Three Core Testing Pillars</h1>
                <p class="text-secondary">Explore our accredited laboratory divisions delivering precise parameters, advanced instrumentation, and regulatory compliance.</p>
            </div>

            <div class="row g-4">
                <!-- Card 1: Food & Ag -->
                <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.1s">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden d-flex flex-column">
                        <img src="img/assets/images/food-0d4be68e.jpg" alt="Food Testing" style="height: 230px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="card-title text-primary mb-2">Food & Agricultural Products</h4>
                            <span class="badge bg-light text-primary border mb-3 py-2 px-3 fw-medium">Testing Sub-Divisions</span>
                            <p class="text-secondary small mb-4">Complete testing for cereals, dairy, spices, beverages, oils, fruits, honey, packaged foods, and nutritional labeling.</p>
                            <div class="mt-auto">
                                <a href="food-agricultural-products.html" class="btn btn-outline-primary rounded-pill w-100 fw-bold">Explore Food Testing</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Environmental -->
                <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.2s">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden d-flex flex-column">
                        <img src="img/assets/images/env-82dbc26c.jpg" alt="Environmental Monitoring" style="height: 230px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="card-title text-primary mb-2">Environmental Monitoring</h4>
                            <span class="badge bg-light text-primary border mb-3 py-2 px-3 fw-medium">Monitoring Sub-Divisions</span>
                            <p class="text-secondary small mb-4">Baseline studies, ambient air, stack emissions, work zone fugitive emissions, noise, vibration, and effluent water analysis.</p>
                            <div class="mt-auto">
                                <a href="environmental-monitoring.html" class="btn btn-outline-primary rounded-pill w-100 fw-bold">Explore Environmental Monitoring</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Water Testing -->
                <div class="col-lg-4 col-md-6 wow fadeInUp" data-wow-delay="0.3s">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden d-flex flex-column">
                        <img src="img/assets/images/water-832f5541.jpg" alt="Water Testing" style="height: 230px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="card-title text-primary mb-2">Water Testing</h4>
                            <span class="badge bg-light text-primary border mb-3 py-2 px-3 fw-medium">Water Testing Matrices</span>
                            <p class="text-secondary small mb-4">Drinking water (IS 10500), ground water, process water for food industries, packaged drinking water, cooling tower, and sea water.</p>
                            <div class="mt-auto">
                                <a href="water-testing.html" class="btn btn-outline-primary rounded-pill w-100 fw-bold">Explore Water Testing</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Core Services Overview End -->

    <!-- About Company Highlight -->
    <div class="container-fluid py-5 bg-light">
        <div class="container">
            <div class="row g-5 align-items-center">
                <div class="col-lg-6 wow fadeIn" data-wow-delay="0.1s">
                    <img class="img-fluid rounded-3 shadow" src="img/about-1.jpg" alt="Qualissure Laboratory">
                </div>
                <div class="col-lg-6 wow fadeIn" data-wow-delay="0.3s">
                    <span class="pan-india-badge mb-2">ABOUT QUALISSURE</span>
                    <h2 class="display-6 mb-4">Accredited Precision & Scientific Integrity</h2>
                    <p class="text-secondary leading-relaxed mb-4">At QUALISSURE Laboratory Services, we provide state-of-the-art analytical testing services across environmental, water, and food sectors. Our laboratory operates with strict compliance to ISO/IEC 17025 quality management systems, ensuring high accuracy, reproducibility, and legal defensibility of all analytical data.</p>
                    <div class="row g-3 mb-4">
                        <div class="col-sm-6">
                            <div class="p-3 bg-white rounded border-start border-4 border-primary">
                                <h6 class="mb-1 text-primary">NABL Accredited</h6>
                                <p class="small text-muted mb-0">Certified testing scope</p>
                            </div>
                        </div>
                        <div class="col-sm-6">
                            <div class="p-3 bg-white rounded border-start border-4 border-success">
                                <h6 class="mb-1 text-success">FSSAI Notified</h6>
                                <p class="small text-muted mb-0">Statutory food safety</p>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-3">
                        <a href="about-us.html" class="btn btn-primary rounded-pill px-4 py-2">Read Company Profile</a>
                        <a href="contact-us.html" class="btn btn-outline-primary rounded-pill px-4 py-2">Contact Us</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Trusted Clients Section -->
    ${getTrustedClientsSection()}

    ${getFooter('')}
</body>
</html>`;
}

fs.writeFileSync('index.html', generateHomePage(), 'utf8');
console.log('Updated index.html');

// 5. Generate Other Required Pages
// 5a. About Us
function generateAboutPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>About Us | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('company', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">About Us</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">Committed to delivering reliable, objective, and timely analytical services across India.</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row g-5 align-items-center">
                <div class="col-lg-6">
                    <img class="img-fluid rounded-3 shadow" src="img/about-2.jpg" alt="About Qualissure">
                </div>
                <div class="col-lg-6">
                    <span class="pan-india-badge mb-2">ESTABLISHED LABORATORY</span>
                    <h2 class="display-6 mb-4">Dedicated to Scientific Rigour & Precision</h2>
                    <p class="text-secondary leading-relaxed mb-3">QUALISSURE Laboratory Services (QLS) provides an extensive portfolio of analytical testing services across environmental, water, and food sectors. We prioritize precision, customer satisfaction, and service excellence at competitive rates.</p>
                    <p class="text-secondary leading-relaxed mb-4">Operating with a PAN INDIA FOOTPRINT, our team of experienced chemists, microbiologists, and environmental scientists employ standardized international methodologies (BIS, APHA, CPCB, FSSAI, ISO) ensuring trustworthy, defensible results for regulatory compliance and product quality assurance.</p>
                    <a href="contact-us.html" class="btn btn-primary rounded-pill px-4 py-2 fw-bold">Contact Our Team</a>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
}
fs.writeFileSync('about-us.html', generateAboutPage(), 'utf8');
fs.writeFileSync('about.html', generateAboutPage(), 'utf8');

// 5b. Vision, Mission & Values
function generateVisionPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Vision, Mission & Values | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('company', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">Our Vision, Mission & Values</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">The scientific principles and commitments guiding every analytical test we perform.</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row g-4">
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded-3 h-100 border-top border-4 border-primary shadow-sm">
                        <i class="bi bi-eye text-primary display-5 mb-3"></i>
                        <h4 class="text-dark mb-3">Our Vision</h4>
                        <p class="text-secondary">To be recognized as a leading and trusted analytical testing laboratory across India, setting benchmarks in scientific accuracy, technological innovation, and reliable reporting.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded-3 h-100 border-top border-4 border-success shadow-sm">
                        <i class="bi bi-compass text-success display-5 mb-3"></i>
                        <h4 class="text-dark mb-3">Our Mission</h4>
                        <p class="text-secondary">To provide objective, precise, and timely analytical services that empower industries, agricultural producers, and regulatory bodies to ensure environmental health and food safety.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="p-4 bg-light rounded-3 h-100 border-top border-4 border-dark shadow-sm">
                        <i class="bi bi-shield-check text-dark display-5 mb-3"></i>
                        <h4 class="text-dark mb-3">Our Values</h4>
                        <ul class="text-secondary small ps-3 mb-0">
                            <li class="mb-2"><strong>Integrity:</strong> Unbiased, objective reporting adhering to strict quality protocols.</li>
                            <li class="mb-2"><strong>Excellence:</strong> State-of-the-art instrumentation and continuous calibration.</li>
                            <li class="mb-2"><strong>Client Centricity:</strong> Transparent communication and fast turnaround.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
}
fs.writeFileSync('vision-mission-values.html', generateVisionPage(), 'utf8');

// 5c. Careers Page (Wireframe fields)
function generateCareersPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Careers | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('careers', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">CAREERS</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">Join our scientific community dedicated to analytical precision, environmental safety, and public health.</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="bg-light p-4 p-md-5 rounded-3 shadow-sm border">
                        <h3 class="text-center text-primary mb-4">Application Form</h3>
                        <form id="career-form">
                            <div class="row g-3">
                                <div class="col-12">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="post" name="post" placeholder="POST APPLIED FOR" required>
                                        <label for="post">POST APPLIED FOR *</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="name" name="name" placeholder="FULL NAME" required>
                                        <label for="name">FULL NAME *</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-floating">
                                        <textarea class="form-control" placeholder="ADDRESS" id="address" name="address" style="height: 90px"></textarea>
                                        <label for="address">ADDRESS</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="tel" class="form-control" id="mobile" name="mobile" placeholder="MOBILE NUMBER" required>
                                        <label for="mobile">MOBILE NUMBER *</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="email" class="form-control" id="email" name="email" placeholder="EMAIL ID" required>
                                        <label for="email">EMAIL ID *</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="qualification" name="qualification" placeholder="QUALIFICATION">
                                        <label for="qualification">QUALIFICATION</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="experience" name="experience" placeholder="EXPERIENCE">
                                        <label for="experience">EXPERIENCE</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label text-dark fw-medium" for="resume">UPLOAD RESUME (PDF/DOC, Max 5MB) *</label>
                                    <input type="file" class="form-control" id="resume" name="resume" accept=".pdf,.doc,.docx" required>
                                </div>
                                <div class="col-12 text-center mt-4">
                                    <div id="career-status" class="alert alert-success d-none mb-3"></div>
                                    <button class="btn btn-primary btn-lg w-100 py-3 rounded-pill fw-bold shadow" type="submit" id="career-submit">
                                        SUBMIT
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}

    <script>
        document.getElementById('career-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('career-submit');
            const status = document.getElementById('career-status');
            btn.disabled = true;
            btn.innerHTML = 'Submitting application...';
            setTimeout(function() {
                status.className = 'alert alert-success';
                status.innerHTML = 'Application submitted successfully! Our HR department will review your profile and contact you.';
                status.classList.remove('d-none');
                btn.innerHTML = 'SUBMITTED';
                document.getElementById('career-form').reset();
            }, 1000);
        });
    </script>
</body>
</html>`;
}
fs.writeFileSync('careers.html', generateCareersPage(), 'utf8');

// 5d. Contact Us Page (Wireframe fields)
function generateContactPage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Contact Us | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('contact', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">CONTACT US</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">Get in touch with our laboratory team for testing inquiries, sample submission, and service quotations.</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row g-5">
                <!-- Left: Get In Touch -->
                <div class="col-lg-5">
                    <h3 class="text-primary fw-bold mb-4">Get In Touch</h3>
                    
                    <div class="bg-light p-4 rounded-3 border-start border-4 border-primary mb-4 shadow-sm">
                        <h5 class="text-dark mb-2"><i class="bi bi-envelope-fill text-primary me-2"></i>EMAIL US</h5>
                        <p class="text-secondary mb-1">Official Mail ID:</p>
                        <a href="mailto:${siteConfig.email}" class="fs-5 text-primary fw-bold text-decoration-none">${siteConfig.email}</a>
                    </div>

                    <div class="bg-light p-4 rounded-3 border-start border-4 border-success mb-4 shadow-sm">
                        <h5 class="text-dark mb-2"><i class="bi bi-telephone-fill text-success me-2"></i>CALL US</h5>
                        <p class="text-secondary mb-1">Direct Lines:</p>
                        <p class="fs-5 text-dark fw-bold mb-0">${siteConfig.phone1}</p>
                        <p class="fs-5 text-dark fw-bold mb-0">${siteConfig.phone2}</p>
                    </div>

                    <div class="bg-light p-4 rounded-3 border-start border-4 border-dark shadow-sm">
                        <h5 class="text-dark mb-2"><i class="bi bi-geo-alt-fill text-dark me-2"></i>ADDRESS</h5>
                        <p class="text-secondary mb-0 leading-relaxed">${siteConfig.address}</p>
                    </div>
                </div>

                <!-- Right: Contact Form -->
                <div class="col-lg-7">
                    <div class="bg-light p-4 p-md-5 rounded-3 border shadow-sm">
                        <h3 class="text-primary fw-bold mb-4">Send Us a Message</h3>
                        <form id="contact-form">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="cname" placeholder="YOUR NAME" required>
                                        <label for="cname">YOUR NAME *</label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-floating">
                                        <input type="email" class="form-control" id="cemail" placeholder="YOUR EMAIL" required>
                                        <label for="cemail">YOUR EMAIL *</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-floating">
                                        <input type="tel" class="form-control" id="cmobile" placeholder="YOUR MOBILE NUMBER" required>
                                        <label for="cmobile">YOUR MOBILE NUMBER *</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-floating">
                                        <input type="text" class="form-control" id="csubject" placeholder="SUBJECT" required>
                                        <label for="csubject">SUBJECT *</label>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <div class="form-floating">
                                        <textarea class="form-control" placeholder="MESSAGE" id="cmessage" style="height: 140px" required></textarea>
                                        <label for="cmessage">MESSAGE *</label>
                                    </div>
                                </div>
                                <div class="col-12 text-center mt-3">
                                    <div id="contact-status" class="alert alert-success d-none mb-3"></div>
                                    <button class="btn btn-success btn-lg w-100 py-3 rounded-pill fw-bold shadow" type="submit" id="contact-submit">
                                        <i class="bi bi-send me-2"></i>SEND MESSAGE
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}

    <script>
        document.getElementById('contact-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('contact-submit');
            const status = document.getElementById('contact-status');
            btn.disabled = true;
            btn.innerHTML = 'Sending message...';
            setTimeout(function() {
                status.className = 'alert alert-success';
                status.innerHTML = 'Thank you! Your message has been sent successfully. We will respond promptly.';
                status.classList.remove('d-none');
                btn.innerHTML = 'MESSAGE SENT';
                document.getElementById('contact-form').reset();
            }, 1000);
        });
    </script>
</body>
</html>`;
}
fs.writeFileSync('contact-us.html', generateContactPage(), 'utf8');
fs.writeFileSync('contact.html', generateContactPage(), 'utf8');

// 5e. Accreditations Pages
siteConfig.accreditations.forEach(acc => {
    const accHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${acc.title} | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('accreditations', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <span class="pan-india-badge mb-3">OFFICIAL ACCREDITATION & CREDENTIALS</span>
            <h1 class="display-4 text-white fw-bold mb-3">${acc.title}</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">${acc.desc}</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8 text-center">
                    <div class="card border-0 shadow-sm p-5 rounded-3 bg-light">
                        <i class="bi bi-patch-check-fill text-primary display-1 mb-4"></i>
                        <h2 class="text-dark mb-3">${acc.title}</h2>
                        <p class="text-secondary leading-relaxed mb-4">${acc.desc}. QUALISSURE Laboratory Services maintains rigorous quality assurance protocols, inter-laboratory comparisons, and regular third-party audits to uphold this recognition.</p>
                        <div class="p-4 bg-white rounded border mb-4 text-start">
                            <h6 class="text-primary fw-bold mb-2">Scope & Verification Notice:</h6>
                            <p class="small text-muted mb-0">Certified scope documentation and notification copies are available on formal request for regulatory submissions, audits, and tender filings. Please contact our quality department.</p>
                        </div>
                        <div class="d-flex justify-content-center gap-3">
                            <a href="contact-us.html" class="btn btn-primary rounded-pill px-4">Contact Quality Department</a>
                            <a href="services.html" class="btn btn-outline-primary rounded-pill px-4">Explore Testing Scope</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
    fs.writeFileSync(acc.file, accHtml, 'utf8');
});
console.log('Generated the 4 accreditation pages.');

// 5f. Services Overview Page
function generateServicesOverview() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Services | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('services', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">Our Services</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 750px;">Analytical testing, consultancy, and technical training across food, environmental, and water sectors.</p>
        </div>
    </div>

    <div class="container-fluid py-5" id="testing">
        <div class="container">
            <div class="text-center mx-auto mb-5" style="max-width: 700px;">
                <span class="pan-india-badge mb-2">TESTING PORTFOLIO</span>
                <h2 class="display-6 mb-3">Accredited Testing Sub-Divisions</h2>
                <p class="text-secondary">Comprehensive chemical, biological, physical, and residue testing performed in accordance with national and international standards.</p>
            </div>

            <div class="row g-4 mb-5">
                <div class="col-lg-4 col-md-6">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                        <img src="img/assets/images/food-0d4be68e.jpg" alt="Food Testing" style="height: 200px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="text-primary mb-2">Food & Agricultural Products</h4>
                            <p class="text-secondary small mb-4">Dedicated categories including cereals, bakery, beverages, meat, fish, dairy, oils, spices, honey, infant foods, and FSSAI license testing.</p>
                            <a href="food-agricultural-products.html" class="btn btn-outline-primary rounded-pill mt-auto fw-bold">Explore All Categories <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4 col-md-6">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                        <img src="img/assets/images/env-82dbc26c.jpg" alt="Environmental Monitoring" style="height: 200px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="text-primary mb-2">Environmental Monitoring</h4>
                            <p class="text-secondary small mb-4">Categories covering baseline studies, ambient air, stack emissions, work zone air quality, noise, soil, effluent, and solid waste.</p>
                            <a href="environmental-monitoring.html" class="btn btn-outline-primary rounded-pill mt-auto fw-bold">Explore All Categories <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4 col-md-6">
                    <div class="card h-100 border-0 shadow-sm rounded-3 overflow-hidden">
                        <img src="img/assets/images/water-832f5541.jpg" alt="Water Testing" style="height: 200px; object-fit: cover;">
                        <div class="card-body p-4 d-flex flex-column">
                            <h4 class="text-primary mb-2">Water Testing</h4>
                            <p class="text-secondary small mb-4">Water matrices including drinking water (IS 10500), food industry process water, packaged drinking water, ground water, and sea water.</p>
                            <a href="water-testing.html" class="btn btn-outline-primary rounded-pill mt-auto fw-bold">Explore All Categories <i class="bi bi-arrow-right"></i></a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Additional Specialized Capabilities -->
            <div class="row g-4 mt-3">
                <div class="col-md-6 col-lg-3">
                    <div class="p-4 bg-light rounded-3 h-100 border-start border-4 border-primary">
                        <h5 class="text-dark mb-2">Nutritional Labelling</h5>
                        <p class="small text-secondary mb-3">Macro & micronutrients, vitamins, minerals, fatty acid profiles, and caloric calculations compliant with FSSAI standards.</p>
                        <a href="nutritional-labelling.html" class="small text-primary fw-bold text-decoration-none">Learn More <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3">
                    <div class="p-4 bg-light rounded-3 h-100 border-start border-4 border-success">
                        <h5 class="text-dark mb-2">Shelf-Life Testing</h5>
                        <p class="small text-secondary mb-3">Accelerated and real-time stability studies determining microbial safety, organoleptic quality, and expiration dating.</p>
                        <a href="shelf-life-testing.html" class="small text-success fw-bold text-decoration-none">Learn More <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3">
                    <div class="p-4 bg-light rounded-3 h-100 border-start border-4 border-info">
                        <h5 class="text-dark mb-2">Consultancy Services</h5>
                        <p class="small text-secondary mb-3">Quality management, laboratory setup, statutory compliance advisory, and regulatory liaison.</p>
                        <a href="consultancy.html" class="small text-info fw-bold text-decoration-none">Learn More <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3">
                    <div class="p-4 bg-light rounded-3 h-100 border-start border-4 border-dark">
                        <h5 class="text-dark mb-2">Training Programs</h5>
                        <p class="small text-secondary mb-3">Professional training in analytical instrumentation, microbiological techniques, and ISO/IEC 17025 implementation.</p>
                        <a href="training.html" class="small text-dark fw-bold text-decoration-none">Learn More <i class="bi bi-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
}
fs.writeFileSync('services.html', generateServicesOverview(), 'utf8');
fs.writeFileSync('service.html', generateServicesOverview(), 'utf8');

// 5g. Dedicated pages for Nutritional Labelling, Shelf-Life Testing, Consultancy, Training
function generateGenericInfoPage(title, subtitle, icon, desc, bullets) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${title} | ${siteConfig.name}</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <link href="img/favicon.ico" rel="icon">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Red+Rose:wght@600;700&display=swap" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.4/font/bootstrap-icons.css">
    <link href="lib/animate/animate.min.css" rel="stylesheet">
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body>
    ${getTopUtilityBar()}
    ${getNavbar('services', '')}
    ${getFloatingActionBar('')}

    <div class="container-fluid page-header py-5 mb-5 position-relative" style="background: linear-gradient(rgba(3, 27, 78, 0.9), rgba(3, 27, 78, 0.9)), url('img/carousel-1.jpg') center/cover no-repeat;">
        <div class="container py-5 text-center mt-3">
            <h1 class="display-4 text-white fw-bold mb-3">${title}</h1>
            <p class="fs-5 text-white-50 mx-auto" style="max-width: 700px;">${subtitle}</p>
        </div>
    </div>

    <div class="container-fluid py-5">
        <div class="container">
            <div class="row g-5 align-items-center">
                <div class="col-lg-6">
                    <div class="bg-light p-4 p-md-5 rounded-3 border-start border-4 border-primary shadow-sm">
                        <i class="bi ${icon} text-primary display-4 mb-3"></i>
                        <h2 class="text-dark mb-3">${title}</h2>
                        <p class="text-secondary leading-relaxed mb-4">${desc}</p>
                        <h5 class="text-primary mb-3">Key Capabilities:</h5>
                        <ul class="list-unstyled mb-4">
                            ${bullets.map(b => `<li class="mb-2 d-flex align-items-start"><i class="bi bi-check2-circle text-primary me-2 mt-1"></i><span>${b}</span></li>`).join('')}
                        </ul>
                        <a href="contact-us.html" class="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow">Inquire About ${title}</a>
                    </div>
                </div>
                <div class="col-lg-6">
                    <img src="img/about-3.jpg" alt="${title}" class="img-fluid rounded-3 shadow">
                </div>
            </div>
        </div>
    </div>

    ${getFooter('')}
</body>
</html>`;
}

fs.writeFileSync('nutritional-labelling.html', generateGenericInfoPage(
    'Nutritional Labelling Services',
    'FSSAI & Global Standard Nutritional Fact Profiling',
    'bi-card-checklist',
    'We provide precise nutritional analysis for packaged food products, generating compliant Nutritional Information Panels in full accordance with FSSAI Labelling and Display Regulations.',
    [
        'Energy, Protein, Carbohydrates, and Total Sugars',
        'Total Fat, Saturated Fat, Monounsaturated & Polyunsaturated Fat, Trans Fat',
        'Cholesterol & Sodium levels',
        'Added Sugars, Dietary Fiber, and Minerals (Calcium, Iron, Potassium)',
        'Water-soluble and Fat-soluble Vitamin profiling'
    ]
), 'utf8');

fs.writeFileSync('shelf-life-testing.html', generateGenericInfoPage(
    'Shelf-Life Testing Services',
    'Accelerated & Real-Time Stability Studies',
    'bi-hourglass-split',
    'Our shelf-life evaluation programs assist food and beverage manufacturers in establishing valid "Best Before" and "Expiry" dates based on empirical physical, chemical, and microbiological data under controlled environmental conditions.',
    [
        'Accelerated Shelf Life Testing (ASLT) under elevated temperature and humidity',
        'Real-time ambient and refrigerated stability monitoring',
        'Microbial spoilage monitoring (TVC, Yeast & Mould, Coliforms)',
        'Chemical stability (Peroxide Value, Free Fatty Acids, Rancidity markers)',
        'Moisture gain / loss and packaging barrier integrity evaluation'
    ]
), 'utf8');

fs.writeFileSync('consultancy.html', generateGenericInfoPage(
    'Laboratory & Compliance Consultancy',
    'Expert Technical Guidance for Laboratories & Industrial QA/QC',
    'bi-briefcase',
    'QUALISSURE provides high-level consultancy to industrial plants, food processing units, and testing laboratories seeking accreditation, statutory regulatory approvals, or quality system optimization.',
    [
        'Implementation of ISO/IEC 17025 Quality Management Systems',
        'NABL accreditation preparation and internal audit support',
        'WBPCB statutory environmental clearance and consent advisory',
        'FSSAI regulatory licensing and product approval guidance',
        'Laboratory setup, instrumentation selection, and method validation'
    ]
), 'utf8');

fs.writeFileSync('training.html', generateGenericInfoPage(
    'Technical Training Programs',
    'Professional Skill Development in Analytical Sciences',
    'bi-mortarboard',
    'We conduct specialized technical training programs for laboratory chemists, QC/QA professionals, students, and industrial operators to master standardized analytical testing procedures.',
    [
        'Hands-on training in spectrophotometry, chromatography, and wet chemical analysis',
        'Environmental sampling protocols for air, water, stack, and soil',
        'Food microbiology and sterile microbiological testing techniques',
        'ISO/IEC 17025 awareness, uncertainty of measurement, and documentation',
        'Good Laboratory Practices (GLP) and analytical data validation'
    ]
), 'utf8');

console.log('Build complete! All files generated according to SPEC.md.');
