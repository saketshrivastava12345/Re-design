#!/usr/bin/env python3
"""
Builds every page of the GML India site except the homepage.

The homepage (index.html) is hand-authored — it carries the scroll journey and
is left untouched. Every other page is a shell of shared chrome (head, header,
navigation, hero band, footer) wrapped around a content fragment in
tools/pages/<slug>.html.

The generated files are committed, so the site stays a no-build static site.
Run this only when the chrome or the navigation changes:

    python tools/build_pages.py

It rewrites the pages listed in PAGES and nothing else.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRAG = os.path.join(ROOT, 'tools', 'pages')

FONTS = ("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700"
         "&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap")

# --------------------------------------------------------------- navigation --
# One definition, used for the desktop menu, the mobile sheet and the footer, so
# a link can never drift between the three.

SERVICES = [
    ('01', 'Ocean Cargo',     'ocean-cargo.html',     'LCL &middot; FCL &middot; NVOCC &middot; CFS'),
    ('02', 'Air Cargo',       'air-cargo.html',       'Door deliveries &middot; Ex-works &middot; Custom clearance'),
    ('03', 'ISO Tank',        'iso-tank.html',        'Nhava-Sheva &middot; Mundra &middot; Chennai'),
    ('04', 'Project Cargo',   'project-cargo.html',   'Heavy international logistics of every size'),
    ('05', 'Hazardous Cargo', 'hazardous-cargo.html', 'All nine classes &middot; sea, surface and air'),
    ('&mdash;', 'What We Do', 'services.html',        'The full service overview'),
]

ABOUT = [
    ('About Us',        'about.html'),
    ("Director's Note", 'directors-note.html'),
    ('GML Incorporation', 'incorporation.html'),
    ('Associates',      'associates.html'),
]

TOOLS = [
    ('Dimension Calculator', 'dimension-calculator.html'),
    ('World Time',           'world-time.html'),
    ('World Ports',          'world-ports.html'),
    ('Currency converter',   'currency-converter.html'),
    ('Set of Containers',    'containers.html'),
]

CONTACT = [
    ('Contact Us',    'contact.html'),
    ('Our Locations', 'locations.html'),
]

BRAND_SVG = """<svg viewBox="0 0 40 40" width="{size}" height="{size}" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-width="1.4" opacity=".45"/>
          <path d="M20 2v36" stroke="currentColor" stroke-width="1.4"/>
          <ellipse cx="20" cy="20" rx="8.4" ry="18" stroke="currentColor" stroke-width="1.4" opacity=".45"/>
          <path d="M2.6 13.4h34.8M2.6 26.6h34.8" stroke="currentColor" stroke-width="1.4" opacity=".45"/>
        </svg>"""


def li_list(items):
    return '\n'.join('              <li><a href="%s">%s</a></li>' % (href, label)
                     for label, href in items)


def mega_cards():
    out = []
    for no, ttl, href, sub in SERVICES:
        out.append(
            '              <a class="mega__card" href="%s">\n'
            '                <span class="mega__no">%s</span><span class="mega__ttl">%s</span>\n'
            '                <span class="mega__sub">%s</span>\n'
            '              </a>' % (href, no, ttl, sub))
    return '\n'.join(out)


def mnav_links(items):
    return '\n'.join('      <a href="%s">%s</a>' % (href, label) for label, href in items)


HEADER = """<a class="skip-link" href="#main">Skip to content</a>

<!-- ============================ HEADER ============================ -->
<header class="hdr" id="hdr">
  <div class="hdr__inner">
    <a class="brand" href="index.html" aria-label="Greenwich Meridian Logistics India — home">
      <span class="brand__mark" aria-hidden="true">
        %(brand34)s
      </span>
      <span class="brand__txt">
        <strong>GML<em>INDIA</em></strong>
        <small>Greenwich Meridian Logistics</small>
      </span>
    </a>

    <nav class="nav" aria-label="Primary">
      <ul class="nav__list">
        <li><a href="index.html" class="nav__link">Home</a></li>

        <li class="nav__item has-menu">
          <button class="nav__link nav__trigger" aria-expanded="false" aria-controls="menu-about">About Us<i aria-hidden="true"></i></button>
          <div class="mega mega--sm" id="menu-about">
            <ul class="mega__list">
%(about)s
            </ul>
          </div>
        </li>

        <li class="nav__item has-menu">
          <button class="nav__link nav__trigger" aria-expanded="false" aria-controls="menu-services">Services<i aria-hidden="true"></i></button>
          <div class="mega" id="menu-services">
            <div class="mega__grid">
%(services)s
            </div>
          </div>
        </li>

        <li class="nav__item has-menu">
          <button class="nav__link nav__trigger" aria-expanded="false" aria-controls="menu-tools">Instruments<i aria-hidden="true"></i></button>
          <div class="mega mega--sm" id="menu-tools">
            <ul class="mega__list">
%(tools)s
            </ul>
          </div>
        </li>

        <li><a href="sailing-schedule.html" class="nav__link">Sailing Schedule</a></li>
        <li><a href="careers.html" class="nav__link">Career</a></li>

        <li class="nav__item has-menu">
          <button class="nav__link nav__trigger" aria-expanded="false" aria-controls="menu-contact">Contact Us<i aria-hidden="true"></i></button>
          <div class="mega mega--sm" id="menu-contact">
            <ul class="mega__list">
%(contact)s
            </ul>
          </div>
        </li>
      </ul>
    </nav>

    <div class="hdr__cta">
      <a class="btn btn--ghost" href="tracking.html">Tracking</a>
      <a class="btn btn--solid" href="contact.html#quote">Get Quote</a>
    </div>

    <button class="burger" id="burger" aria-expanded="false" aria-controls="mnav" aria-label="Open menu">
      <span></span><span></span>
    </button>
  </div>
</header>

<!-- ===================== MOBILE NAVIGATION ===================== -->
<div class="mnav" id="mnav" hidden>
  <nav class="mnav__inner" aria-label="Mobile">
    <a class="mnav__top" href="index.html">Home</a>

    <details class="mnav__grp"><summary>About Us</summary>
%(m_about)s
    </details>

    <details class="mnav__grp"><summary>Services</summary>
      <a href="services.html">What We Do</a>
      <a href="ocean-cargo.html">Ocean Cargo</a>
      <a href="air-cargo.html">Air Cargo</a>
      <a href="iso-tank.html">ISO Tank</a>
      <a href="project-cargo.html">Project Cargo</a>
      <a href="hazardous-cargo.html">Hazardous Cargo</a>
    </details>

    <details class="mnav__grp"><summary>Instruments</summary>
%(m_tools)s
    </details>

    <a class="mnav__top" href="sailing-schedule.html">Sailing Schedule</a>
    <a class="mnav__top" href="careers.html">Career</a>

    <details class="mnav__grp"><summary>Contact Us</summary>
%(m_contact)s
    </details>

    <div class="mnav__cta">
      <a class="btn btn--ghost" href="tracking.html">Tracking</a>
      <a class="btn btn--solid" href="contact.html#quote">Get Quote</a>
    </div>
    <a class="mnav__call" href="tel:+912261489999">Call For Support! +91 22 6148 9999</a>
  </nav>
</div>
""" % {
    'brand34': BRAND_SVG.format(size=34),
    'about': li_list(ABOUT),
    'services': mega_cards(),
    'tools': li_list(TOOLS),
    'contact': li_list(CONTACT),
    'm_about': mnav_links(ABOUT),
    'm_tools': mnav_links(TOOLS),
    'm_contact': mnav_links(CONTACT),
}


FOOTER = """<!-- =========================== FOOTER =========================== -->
<footer class="ftr">
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">
        <a class="brand brand--ftr" href="index.html">
          <span class="brand__mark" aria-hidden="true">
            %(brand32)s
          </span>
          <span class="brand__txt"><strong>GML<em>INDIA</em></strong><small>Greenwich Meridian Logistics</small></span>
        </a>
        <p class="ftr__desc">Greenwich Meridian Logistics (India) Pvt. Ltd is one of the leading global logistics companies headquartered in Mumbai, India. Founded in 2002.</p>
        <a class="btn btn--line" href="company-profile.html">Download GML Profile</a>
      </div>

      <nav class="ftr__nav" aria-label="Footer">
        <div class="ftr__col">
          <h3>About Us</h3>
          <ul>
%(f_about)s
          </ul>
        </div>
        <div class="ftr__col">
          <h3>Services</h3>
          <ul>
            <li><a href="services.html">What We Do</a></li>
            <li><a href="ocean-cargo.html">Ocean Cargo</a></li>
            <li><a href="air-cargo.html">Air Cargo</a></li>
            <li><a href="iso-tank.html">ISO Tank</a></li>
            <li><a href="project-cargo.html">Project Cargo</a></li>
            <li><a href="hazardous-cargo.html">Hazardous Cargo</a></li>
          </ul>
        </div>
        <div class="ftr__col">
          <h3>Instruments</h3>
          <ul>
%(f_tools)s
          </ul>
        </div>
        <div class="ftr__col">
          <h3>Company</h3>
          <ul>
            <li><a href="sailing-schedule.html">Sailing Schedule</a></li>
            <li><a href="careers.html">Career</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="locations.html">Our Locations</a></li>
            <li><a href="warehousing.html">Warehousing</a></li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="ftr__mid">
      <div>
        <h3>Head Office</h3>
        <address>504, Shrishti Plaza, Behind Amar Tara Plastics, Saki &ndash; Vihar Road,<br>Powai, Andheri (E), Mumbai 400 072, India.</address>
      </div>
      <div>
        <h3>Quick Contact</h3>
        <p><a href="tel:+912261489999">+91 22 6148 9999</a> &middot; <a href="tel:+912261489910">+91 22 6148 9910</a><br><a href="mailto:info@gmlindia.net">info@gmlindia.net</a></p>
      </div>
    </div>

    <div class="ftr__btm">
      <p>&copy; <span id="yr">2026</span> Greenwich Meridian Logistics (India) Pvt. Ltd. All rights reserved.</p>
      <ul>
        <li><a href="terms.html">Terms &amp; Conditions</a></li>
        <li><a href="privacy.html">Privacy Policy</a></li>
        <li><a href="sitemap.html">Sitemap</a></li>
      </ul>
    </div>
  </div>
</footer>
""" % {
    'brand32': BRAND_SVG.format(size=32),
    'f_about': li_list(ABOUT),
    'f_tools': li_list(TOOLS),
}


SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<meta name="theme-color" content="#0A1420">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/favicon.svg">

<meta property="og:type" content="website">
<meta property="og:title" content="__OGTITLE__">
<meta property="og:description" content="__DESC__">
<meta property="og:image" content="assets/frames/poster.jpg">
<meta name="twitter:card" content="summary_large_image">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="__FONTS__" rel="stylesheet">
<link rel="stylesheet" href="assets/css/main.css">
<link rel="stylesheet" href="assets/css/pages.css">
</head>
<body class="page">

__HEADER__
<main id="main">

<!-- ============================== HERO ============================== -->
<section class="phero">
  <div class="wrap">
    <nav class="crumb" aria-label="Breadcrumb">
      <ol>
        <li><a href="index.html">Home</a></li>
__CRUMB__        <li aria-current="page">__CRUMB_SELF__</li>
      </ol>
    </nav>
    <p class="eyebrow">__EYEBROW__</p>
    <h1 class="phero__h1">__H1__</h1>
    <p class="phero__lede">__LEDE__</p>
  </div>
</section>

__BODY__
</main>

__FOOTER__
<script src="assets/js/main.js" defer></script>
<script src="assets/js/pages.js" defer></script>
</body>
</html>
"""


# Short label for the last breadcrumb crumb. The h1 is a headline; a crumb
# needs the page's name.
CRUMB = {
    'about': 'About Us',
    'directors-note': "Director's Note",
    'incorporation': 'GML Incorporation',
    'associates': 'Associates',
    'locations': 'Our Locations',
    'services': 'What We Do',
    'ocean-cargo': 'Ocean Cargo',
    'air-cargo': 'Air Cargo',
    'iso-tank': 'ISO Tank',
    'project-cargo': 'Project Cargo',
    'hazardous-cargo': 'Hazardous Cargo',
    'warehousing': 'Warehousing',
    'containers': 'Set of Containers',
    'dimension-calculator': 'Dimension Calculator',
    'world-time': 'World Time',
    'world-ports': 'World Ports',
    'currency-converter': 'Currency converter',
    'sailing-schedule': 'Sailing Schedule',
    'tracking': 'Tracking',
    'careers': 'Career',
    'contact': 'Contact Us',
    'company-profile': 'Company Profile',
    'terms': 'Terms &amp; Conditions',
    'privacy': 'Privacy Policy',
    'sitemap': 'Sitemap',
}


# ------------------------------------------------------------------ pages --
# slug, browser title, meta description, hero eyebrow, hero h1, hero lede,
# breadcrumb parent (label, href) or None.

PAGES = [
    ('about', 'About Us — Greenwich Meridian Logistics (India) Pvt. Ltd.',
     'Greenwich Meridian Logistics (India) Pvt. Ltd is one of the leading global logistics companies headquartered in Mumbai, India. Founded in 2002, operating through 21 offices with more than 450 members.',
     'About GML', 'We Have More Than 20 Years of Experience',
     'One of the leading global logistics companies headquartered in Mumbai, India.',
     ('About Us', 'about.html')),

    ('directors-note', "Director's Note — GML India",
     "The Director's Note from Mr. Mihir Kotecha and Mr. Bhavesh Thakker, Directors of Greenwich Meridian Logistics (India) Pvt. Ltd.",
     "Director's Note", 'A word from our Directors',
     'Air, surface and sea as modes of transportation, with the help of a global network and in-depth expertise in logistic technology.',
     ('About Us', 'about.html')),

    ('incorporation', 'GML Incorporation — Certification &amp; Membership',
     'GML India registrations and certifications: DG Shipping MTO, Federal Maritime Commission, ISO 9001:2015, AEO, C-TPAT, IATA, MSME, and global network memberships.',
     'GML takes pride in being registered with', 'Certification &amp; Membership Of Global Network',
     'Every registration, certification and network membership that GML India trades under.',
     ('About Us', 'about.html')),

    ('associates', 'Associates — GML Group companies in UAE, Kuwait, Oman, Canada &amp; USA',
     'The GML group and associate companies: MFL Logistics Dubai, Integrity Logistics Abu Dhabi, MFL Global Kuwait, Meridian Freight Links Oman, GML Canada and GML USA.',
     'Group &amp; Associates', 'The people who receive your cargo at the other end',
     'Six group and associate offices across the Middle East and North America, each with its own team, licence and local knowledge.',
     ('About Us', 'about.html')),

    ('locations', 'Our Locations — GML India offices',
     'GML India operates from 26 offices across India plus group offices in Dubai, Abu Dhabi, Kuwait, Oman, Canada and the USA.',
     'Our Presence in India, Middle East, USA &amp; Canada', 'Wherever your cargo starts, we are already there',
     'Twenty-six offices across India, and group companies covering the Middle East and North America.',
     ('Contact Us', 'contact.html')),

    ('services', 'What We Do — Ocean, Air, ISO Tank, Project &amp; Hazardous Cargo',
     'The full GML India service overview: Ocean Cargo, Air Cargo, ISO Tank, Project Cargo, Hazardous Cargo and warehousing.',
     'What we do', 'Safe And Reliable Industry Solutions!',
     'Customized holistic logistics solutions across air, surface and sea, from one streamlined point of contact.',
     None),

    ('ocean-cargo', 'Ocean Cargo — LCL, FCL, NVOCC and CFS',
     'GML India ocean freight: LCL, FCL, NVOCC and CFS operations, with 1650 destinations serviced by LCL weekly.',
     'Service 01', 'Ocean Cargo',
     'Reliable and quick global shipment services with master consolidating, fast handling of documents, and a globally uniform IT structure.',
     ('Services', 'services.html')),

    ('air-cargo', 'Air Cargo — GML India air freight',
     'GML India air freight: door deliveries, ex-works pick up, third country shipments, custom clearance and hazardous cargo, across 18 locations in India.',
     'Service 02', 'Air Cargo',
     'One of the key segments of logistics that GML is consistently expanding year on year with the help of a dedicated air cargo team.',
     ('Services', 'services.html')),

    ('iso-tank', 'ISO Tank — Import, export and empty yards',
     'GML India ISO Tank logistics from Nhava-Sheva, Mundra and Chennai, with dedicated empty yards and T11 gas tank specialisation.',
     'Service 03', 'ISO Tank',
     'End-to-end logistics solutions for ISO Tank transportation, from import to export.',
     ('Services', 'services.html')),

    ('project-cargo', 'Project Cargo — Heavy international logistics',
     'GML India project cargo: heavy international logistics of every size, from steel production to chemical plant, power plant to pharmaceutical.',
     'Service 04', 'Project Cargo',
     'Managing heavy international logistics of every size from start to finish in the interest of our global customers.',
     ('Services', 'services.html')),

    ('hazardous-cargo', 'Hazardous Cargo — All nine classes',
     'GML India hazardous cargo handling across all nine IMDG classes by sea, surface and air, with trained and compliant teams.',
     'Service 05', 'Hazardous Cargo',
     'One of the expert international shipping companies in handling hazardous goods.',
     ('Services', 'services.html')),

    ('warehousing', 'Warehousing — Storage across the GML group network',
     'Warehousing, CFS handling and storage solutions across the GML group network.',
     'Service', 'Warehousing',
     'Storage, consolidation and CFS handling across the group network.',
     ('Services', 'services.html')),

    ('containers', 'Set of Containers — ISO container specifications',
     'Internal dimensions, door openings, capacity and payload for standard ISO containers: 20ft, 40ft, high cube, reefer, open top, flat rack and ISO tank.',
     'Instruments', 'Set of Containers',
     'Internal dimensions, door openings, cubic capacity and payload for every box we book.',
     None),

    ('dimension-calculator', 'Dimension Calculator — CBM and chargeable weight',
     'Work out volume, volumetric weight and chargeable weight for sea and air shipments using the GML India dimension calculator.',
     'Instruments', 'Dimension Calculator',
     'Volume, volumetric weight and the chargeable weight your quote will actually be built on.',
     None),

    ('world-time', 'World Time — Local time at GML offices and world ports',
     'Live local time at every GML office and at the major ports and airports on our trade lanes.',
     'Instruments', 'World Time',
     'Live local time at every GML office and at the ports we work with, so you know who is awake.',
     None),

    ('world-ports', 'World Ports — UN/LOCODE port directory',
     'Searchable directory of the major sea ports on GML India trade lanes, with UN/LOCODE, country and region.',
     'Instruments', 'World Ports',
     'The sea ports on our trade lanes, with their UN/LOCODE and the region they sit in.',
     None),

    ('currency-converter', 'Currency Converter — Live rates for freight invoicing',
     'Convert freight amounts between currencies using live reference rates, with a manual rate entry for contract and customs rates.',
     'Instruments', 'Currency converter',
     'Convert an amount at a live reference rate, or at the contract rate you were given.',
     None),

    ('sailing-schedule', 'Sailing Schedule — Request a schedule',
     'Request a sailing schedule for any GML India trade lane. Ocean, air and ISO tank departures confirmed by our booking desk.',
     'Sailing Schedule', 'Sailing Schedule',
     'Tell us the lane and the week, and our booking desk sends back the live schedule with cut-offs.',
     None),

    ('tracking', 'Tracking — Track your GML shipment',
     'Track a GML India shipment by HBL No., Shipping Bill No., HAWB No. or MAWB No.',
     'Tracking', 'Track a shipment',
     'Enter the reference from your booking confirmation and we will pick it up from there.',
     None),

    ('careers', 'Career — Work at GML India',
     'Careers at Greenwich Meridian Logistics (India) Pvt. Ltd. More than 450 members across 21 offices. Send us your application.',
     'Career', 'Build a career that moves',
     'More than 450 members across 21 offices, in a business where the work is never the same twice.',
     None),

    ('contact', 'Contact Us — GML India',
     'Contact Greenwich Meridian Logistics (India) Pvt. Ltd. Head office in Powai, Mumbai. +91 22 6148 9999 — info@gmlindia.net',
     'How Can We Help?', 'Tell us what is moving.',
     'Please fill the form and our team will come back to you with a customized logistics solution.',
     None),

    ('company-profile', 'GML Profile — Company profile',
     'The Greenwich Meridian Logistics (India) Pvt. Ltd. company profile: who we are, what we move, where we are and what we are registered under.',
     'Company profile', 'GML India, on one page',
     'Everything a new counterparty, bank or vendor normally asks for, in the order they ask for it.',
     ('About Us', 'about.html')),

    ('terms', 'Terms &amp; Conditions — GML India',
     'Terms and conditions for the use of this website and a summary of the standard trading conditions under which GML India accepts business.',
     'Legal', 'Terms &amp; Conditions',
     'How this website may be used, and the conditions under which we accept business.',
     None),

    ('privacy', 'Privacy Policy — GML India',
     'How Greenwich Meridian Logistics (India) Pvt. Ltd. collects, uses and protects the personal data you share with us.',
     'Legal', 'Privacy Policy',
     'What we collect when you contact us, why we hold it, and how to have it removed.',
     None),

    ('sitemap', 'Sitemap — GML India',
     'Every page on the Greenwich Meridian Logistics (India) Pvt. Ltd. website.',
     'Sitemap', 'Every page on this site',
     'The whole site in one list.',
     None),
]


def build_one(slug, title, desc, eyebrow, h1, lede, parent):
    path = os.path.join(FRAG, slug + '.html')
    if not os.path.exists(path):
        raise SystemExit('missing content fragment: %s' % path)
    with open(path) as f:
        body = f.read().rstrip() + '\n'

    crumb = ''
    if parent and parent[1] != slug + '.html':
        crumb = '        <li><a href="%s">%s</a></li>\n' % (parent[1], parent[0])

    # mark every link to this page in the header (desktop menu and mobile sheet)
    header = re.sub(r'<a([^>]*?)href="%s"([^>]*?)>' % re.escape(slug + '.html'),
                    r'<a\1href="%s" aria-current="page"\2>' % (slug + '.html'),
                    HEADER)

    html = SHELL
    for token, value in (
        ('__TITLE__', title),
        ('__DESC__', desc),
        ('__OGTITLE__', re.sub(r'\s+&mdash;.*$', '', title)),
        ('__FONTS__', FONTS),
        ('__HEADER__', header),
        ('__FOOTER__', FOOTER),
        ('__CRUMB__', crumb),
        ('__CRUMB_SELF__', CRUMB.get(slug, re.sub('<[^>]+>', '', h1))),
        ('__EYEBROW__', eyebrow),
        ('__H1__', h1),
        ('__LEDE__', lede),
        ('__BODY__', body),
    ):
        html = html.replace(token, value)

    out = os.path.join(ROOT, slug + '.html')
    with open(out, 'w') as f:
        f.write(html)
    return out


def main():
    built = [build_one(*p) for p in PAGES]
    print('built %d pages' % len(built))
    for b in built:
        print('  ' + os.path.relpath(b, ROOT))


if __name__ == '__main__':
    main()
