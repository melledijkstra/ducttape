import os
from bs4 import BeautifulSoup
import requests

INPUT_FILE = "input/bookmarks.html"
OUTPUT_FILE = "output/bookmarks_cleaned.html"
TIMEOUT_SECONDS = 5

def clean_bookmarks():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    seen_urls = set()
    duplicate_count = 0
    broken_count = 0
    
    # Find all anchor tags with an href attribute
    links = soup.find_all("a")
    print(f"Found {len(links)} total bookmarks. Processing...")

    for a_tag in links:
        url = a_tag.get("href")
        
        # Skip placeholders or empty links
        if not url or url.startswith("javascript:"):
            continue

        # 1. Check for duplicates
        if url in seen_urls:
            a_tag.decompose()  # Removes the tag completely from the soup tree
            duplicate_count += 1
            continue
        
        # 2. Check for broken links (HTTP status >= 400)
        # Skip internal/local links if any
        if url.startswith("http://") or url.startswith("https://"):
            try:
                # Use HEAD request for speed; allow redirects
                response = requests.head(url, timeout=TIMEOUT_SECONDS, allow_redirects=True)
                
                # If HEAD fails or isn't supported, fallback to GET
                if response.status_code == 405:
                    response = requests.get(url, timeout=TIMEOUT_SECONDS, allow_redirects=True)
                
                if response.status_code >= 400:
                    print(f"[Broken] {response.status_code} -> {url}")
                    a_tag.decompose()
                    broken_count += 1
                else:
                    seen_urls.add(url)
                    
            except requests.RequestException:
                # Catches timeouts, connection errors, DNS failures
                print(f"[Broken] Connection Failed -> {url}")
                a_tag.decompose()
                broken_count += 1
        else:
            seen_urls.add(url)

    # Write the modified soup back to a new file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(str(soup))

    print("\n--- Processing Complete ---")
    print(f"Removed Duplicates: {duplicate_count}")
    print(f"Removed Broken Links: {broken_count}")
    print(f"Cleaned bookmarks saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_bookmarks()