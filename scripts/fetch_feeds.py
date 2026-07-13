#!/usr/bin/env python3
"""Fetch every RSS/Atom/RDF feed listed in src/links.txt and write src/feeds.json.

Runs server-side (locally or in GitHub Actions) so the static site never has to
touch a flaky CORS proxy — the browser just reads the committed JSON.

No third-party dependencies: uses only the Python standard library.
"""

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
LINKS_FILE = ROOT / "src" / "links.txt"
OUT_FILE = ROOT / "src" / "feeds.json"

MAX_ITEMS = 30
TIMEOUT = 25
UA = "Mozilla/5.0 (compatible; NewsBytesBot/1.0; +https://badarinarayan.github.io)"

# Curated display names / categories, keyed by feed URL. Any URL in links.txt
# not listed here falls back to the feed's own <title> and "Feed".
META = {
    "https://economictimes.indiatimes.com/rssfeedsdefault.cms": ("Economic Times", "Business · India"),
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms": ("Times of India", "Top Stories"),
    "https://huggingface.co/blog/feed.xml": ("Hugging Face", "Machine Learning"),
    "https://deepmind.google/blog/feed": ("Google DeepMind", "AI Research"),
    "https://the-decoder.com/feed/": ("The Decoder", "AI News"),
    "https://www.kdnuggets.com/feed": ("KDnuggets", "Data Science"),
    "https://developer.nvidia.com/blog//feed": ("NVIDIA Developer", "Technical · AI"),
    "https://www.technologyreview.com/feed/": ("MIT Tech Review", "Technology"),
    "https://rss.slashdot.org/Slashdot/slashdotMain?format=xml": ("Slashdot", "Tech · News"),
    "https://www.aitrends.com/feed": ("AI Trends", "Artificial Intelligence"),
    "https://bair.berkeley.edu/blog/feed.xml": ("BAIR Blog", "Berkeley AI Research"),
    "http://feeds.feedburner.com/nvidiablog": ("NVIDIA Blog", "GPU · AI"),
    "http://www.linux-magazine.com/rss/feed/lmi_news": ("Linux Magazine", "Linux · News"),
    "https://pypi.org/rss/packages.xml": ("PyPI · New Packages", "Python"),
}


def local(tag):
    """Strip an XML namespace: '{http://...}title' -> 'title'."""
    return tag.split("}", 1)[-1] if "}" in tag else tag


def text_of(el):
    return (el.text or "").strip() if el is not None else ""


def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = re.sub(r"&nbsp;", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def truncate(s, n=260):
    return s[:n].rstrip() + "…" if len(s) > n else s


def _fmt(d):
    # Portable across Windows/Linux (avoids the glibc-only "%-d").
    return f"{d.day} {d.strftime('%b %Y')}"


def fmt_date(raw):
    if not raw:
        return ""
    raw = raw.strip()
    # RFC 822 (RSS pubDate): "Mon, 13 Jul 2026 08:30:00 GMT"
    try:
        return _fmt(parsedate_to_datetime(raw))
    except Exception:
        pass
    # ISO 8601 (Atom updated/published): "2026-07-13T08:30:00Z"
    try:
        return _fmt(datetime.fromisoformat(raw.replace("Z", "+00:00")))
    except Exception:
        return ""


def item_link(item):
    """RSS puts the URL in <link>text</link>; Atom uses <link href="..."/>."""
    for child in item:
        if local(child.tag) == "link":
            href = child.get("href")
            if href:
                return href.strip()
            if child.text and child.text.strip():
                return child.text.strip()
    return ""


def parse_items(xml_bytes):
    root = ET.fromstring(xml_bytes)
    entries = [c for c in root.iter() if local(c.tag) in ("item", "entry")]
    out = []
    for it in entries:
        title = ""
        summary = ""
        date = ""
        for child in it:
            name = local(child.tag)
            if name == "title" and not title:
                title = strip_html(text_of(child))
            elif name in ("description", "summary", "content") and not summary:
                summary = truncate(strip_html(text_of(child)))
            elif name in ("pubDate", "updated", "published", "date") and not date:
                date = fmt_date(text_of(child))
        link = item_link(it)
        if title or link:
            out.append({"title": title or "Untitled", "link": link, "date": date, "summary": summary})
        if len(out) >= MAX_ITEMS:
            break
    return out


def feed_title(xml_bytes):
    try:
        root = ET.fromstring(xml_bytes)
        for c in root.iter():
            if local(c.tag) == "title" and c.text and c.text.strip():
                return strip_html(c.text)
    except Exception:
        pass
    return ""


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.read()


def load_links():
    urls = []
    for line in LINKS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line)
    return urls


def main():
    urls = load_links()
    feeds = []
    failures = 0

    for url in urls:
        name, cat = META.get(url, (None, "Feed"))
        entry = {"url": url, "name": name, "cat": cat, "ok": False, "items": []}
        try:
            data = fetch(url)
            items = parse_items(data)
            if not name:
                entry["name"] = feed_title(data) or url
            entry["items"] = items
            entry["ok"] = len(items) > 0
            print(f"  [{'OK ' if entry['ok'] else 'EMPTY'}] {entry['name']} — {len(items)} items")
        except Exception as e:
            failures += 1
            entry["name"] = name or url
            print(f"  [FAIL] {url} — {e}", file=sys.stderr)
        feeds.append(entry)

    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feeds": feeds,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = sum(1 for f in feeds if f["ok"])
    print(f"\nWrote {OUT_FILE.relative_to(ROOT)} — {ok}/{len(feeds)} feeds OK, {failures} fetch failures")


if __name__ == "__main__":
    main()
