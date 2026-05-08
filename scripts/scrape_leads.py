#!/usr/bin/env python3
"""
Lead scraper for Nigerian short-let listings.
Scrapes PropertyPro.ng and Spleet for short-let / serviced apartment listings
in Lagos and Abuja, then exports to CSV ready for bulk import.

Usage:
    pip install requests beautifulsoup4
    python scrape_leads.py

Output: leads_YYYY-MM-DD.csv ready to paste into the bulk import.
"""

import csv
import re
import sys
import time
from datetime import datetime
from urllib.parse import urljoin

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Install dependencies: pip install requests beautifulsoup4")
    sys.exit(1)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# Locations to target (high-end areas)
LAGOS_AREAS = ["lekki", "ikoyi", "victoria-island", "banana-island", "oniru", "ikate"]
ABUJA_AREAS = ["maitama", "asokoro", "wuse-2", "jabi", "katampe"]


def normalize_phone(text):
    """Extract a Nigerian phone number from text."""
    if not text:
        return ""
    # Find sequences that look like Nigerian numbers
    matches = re.findall(r'(\+?234|0)([789][01]\d{8})', text)
    if matches:
        prefix, rest = matches[0]
        return f"+234{rest}" if prefix in ("+234", "234") else f"0{rest}"
    return ""


def extract_email(text):
    if not text:
        return ""
    match = re.search(r'[\w._-]+@[\w.-]+\.[a-zA-Z]{2,}', text)
    return match.group(0) if match else ""


def scrape_propertypro(city, area, page=1):
    """Scrape PropertyPro.ng short-let listings."""
    leads = []
    url = f"https://www.propertypro.ng/property-for-rent/short-let/in-{area}/{city.lower()}?page={page}"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        # Listings - PropertyPro uses .single-room-sale or similar containers
        listings = soup.select(".single-room-sale, .listings-property, article.property")
        
        for listing in listings[:20]:  # Cap per page
            # Title / business name
            title_el = listing.select_one("h2 a, h3 a, .listings-property-title a, a.property-title")
            if not title_el:
                continue
            title = title_el.get_text(strip=True)
            link = urljoin(url, title_el.get("href", ""))
            
            # Location
            location_el = listing.select_one(".listings-property-loc, .property-loc, .listing-location, address")
            location = location_el.get_text(strip=True) if location_el else area.replace("-", " ").title()
            
            # Need to fetch detail page for contact (PropertyPro hides phone behind click)
            detail_data = {"phone": "", "email": "", "agent": ""}
            try:
                time.sleep(1.2)
                d_resp = requests.get(link, headers=HEADERS, timeout=20)
                d_soup = BeautifulSoup(d_resp.text, "html.parser")
                
                # Agent block
                agent_el = d_soup.select_one(".agent-name, .single-property-agent-name, .agent")
                if agent_el:
                    detail_data["agent"] = agent_el.get_text(strip=True)
                
                # Look for any phone-like number on the page
                page_text = d_soup.get_text()
                detail_data["phone"] = normalize_phone(page_text)
                detail_data["email"] = extract_email(page_text)
            except Exception:
                pass
            
            leads.append({
                "business_name": title[:200],
                "contact_name": detail_data["agent"][:200],
                "email": detail_data["email"],
                "phone": detail_data["phone"],
                "instagram": "",
                "location": location[:100],
                "city": city,
                "property_type": "short_let",
                "source": "propertypro",
                "source_url": link,
                "notes": ""
            })
        
        return leads
    
    except requests.RequestException as e:
        print(f"  ⚠️  PropertyPro error for {area}: {e}")
        return []


def scrape_nigeria_property_centre(city, area):
    """Scrape NigeriaPropertyCentre.com short-let listings."""
    leads = []
    
    city_slug = city.lower()
    url = f"https://nigeriapropertycentre.com/for-rent/short-let-property/{city_slug}/{area}/showtype"
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        
        listings = soup.select(".wp-block-group, .property-list, article")[:15]
        
        for listing in listings:
            title_el = listing.select_one("h4 a, h3 a, .property-title a")
            if not title_el:
                continue
            
            title = title_el.get_text(strip=True)
            link = urljoin(url, title_el.get("href", ""))
            
            location_el = listing.select_one("address, .voffset-bottom-xs")
            location = location_el.get_text(strip=True) if location_el else area.title()
            
            phone = ""
            agent = ""
            try:
                time.sleep(1.2)
                d_resp = requests.get(link, headers=HEADERS, timeout=20)
                d_soup = BeautifulSoup(d_resp.text, "html.parser")
                page_text = d_soup.get_text()
                phone = normalize_phone(page_text)
                agent_el = d_soup.select_one(".agent-name, h4.text-uppercase")
                if agent_el:
                    agent = agent_el.get_text(strip=True)
            except Exception:
                pass
            
            leads.append({
                "business_name": title[:200],
                "contact_name": agent[:200],
                "email": "",
                "phone": phone,
                "instagram": "",
                "location": location[:100],
                "city": city,
                "property_type": "short_let",
                "source": "npc",
                "source_url": link,
                "notes": ""
            })
        
        return leads
    
    except requests.RequestException as e:
        print(f"  ⚠️  NPC error for {area}: {e}")
        return []


def main():
    all_leads = []
    
    print("\n🔍 Scraping Lagos areas...")
    for area in LAGOS_AREAS:
        print(f"  · {area}")
        all_leads.extend(scrape_propertypro("Lagos", area))
        time.sleep(2)
        all_leads.extend(scrape_nigeria_property_centre("Lagos", area))
        time.sleep(2)
    
    print("\n🔍 Scraping Abuja areas...")
    for area in ABUJA_AREAS:
        print(f"  · {area}")
        all_leads.extend(scrape_propertypro("Abuja", area))
        time.sleep(2)
        all_leads.extend(scrape_nigeria_property_centre("Abuja", area))
        time.sleep(2)
    
    # Dedupe by source_url
    seen = set()
    unique = []
    for lead in all_leads:
        key = lead.get("source_url") or lead["business_name"]
        if key in seen:
            continue
        seen.add(key)
        unique.append(lead)
    
    # Filter: only keep leads with at least one contact method
    contactable = [l for l in unique if l["email"] or l["phone"]]
    
    out_file = f"leads_{datetime.now().strftime('%Y-%m-%d')}.csv"
    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "business_name", "contact_name", "email", "phone",
            "instagram", "location", "city", "property_type",
            "source", "source_url", "notes"
        ])
        writer.writeheader()
        writer.writerows(contactable)
    
    print(f"\n✅ Total scraped: {len(unique)}")
    print(f"   Contactable (has email or phone): {len(contactable)}")
    print(f"   Saved to: {out_file}")
    print(f"\nNext: open {out_file}, copy to clipboard, paste in /admin/outreach Bulk Import")


if __name__ == "__main__":
    main()
