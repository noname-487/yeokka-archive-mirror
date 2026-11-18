"""Read original YouTube descriptions for private participant review."""
import argparse
import csv
import getpass
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

API = 'https://www.googleapis.com/youtube/v3/videos'
ID = re.compile(r'[A-Za-z0-9_-]{11}')
BATCH = 50
MAX_RESPONSE = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def descriptions(rows, key, opener=None):
    opener = opener if opener is not None else build_opener(NoRedirect())
    for i in range(0, len(rows), BATCH):
        batch = rows[i:i + BATCH]
        ids = [row['videoId'] for row in batch]
        if not all(ID.fullmatch(v) for v in ids):
            raise ValueError('Invalid video ID in archive queue.')
        params = urlencode({'part': 'snippet', 'id': ','.join(ids),
                            'fields': 'items(id,snippet(description))'})
        request = Request(API + '?' + params, headers={'x-goog-api-key': key})
        try:
            with opener.open(request, timeout=20) as response:
                raw = response.read(MAX_RESPONSE + 1)
        except HTTPError as e:
            raise ValueError(f'YouTube API HTTP {e.code}. Check API access, quota, or key restrictions.') from None
        except (URLError, OSError):
            raise ValueError('Could not reach the YouTube API.') from None
        if len(raw) > MAX_RESPONSE:
            raise ValueError('YouTube API response exceeded the size limit.')
        try:
            payload = json.loads(raw)
        except (ValueError, UnicodeError):
            raise ValueError('Invalid JSON returned by YouTube.') from None
        if not isinstance(payload, dict) or 'error' in payload or not isinstance(payload.get('items', []), list):
            raise ValueError('Unexpected response from YouTube.')
        found = {}
        for item in payload.get('items', []):
            if not isinstance(item, dict) or item.get('id') not in ids or item['id'] in found:
                raise ValueError('Unexpected video ID in the YouTube API response.')
            snippet = item.get('snippet')
            if not isinstance(snippet, dict) or not isinstance(snippet.get('description'), str):
                continue
            found[item['id']] = snippet['description']
        for row in batch:
            v = row['videoId']
            yield {**row, 'status': 'available' if v in found else 'unavailable',
                   'description': found.get(v)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int, default=10, help='Review this many pending videos (1–250).')
    parser.add_argument('--dry-run', action='store_true', help='List selected videos without calling YouTube.')
    parser.add_argument('--cache-check', action='store_true', help='Use in the cache workflow; print only aggregate status.')
    args = parser.parse_args()
    if not 1 <= args.limit <= 250:
        parser.error('--limit must be between 1 and 250')
    queue = subprocess.check_output([sys.executable, str(Path(__file__).with_name('review-guests.py')),
                                     '--limit', str(args.limit)], encoding='utf-8')
    rows = [{k: r[k] for k in ('videoId', 'date', 'title')} for r in csv.DictReader(io.StringIO(queue))]
    if args.dry_run or not rows:
        for row in rows:
            print(json.dumps(row, ensure_ascii=False))
        return
    key = os.environ.get('YOUTUBE_API_KEY', '').strip()
    if not key and args.cache_check:
        print('YouTube API check skipped: repository secret is not configured.')
        return
    if not key and sys.stdin.isatty():
        key = getpass.getpass('YouTube API key (hidden): ').strip()
    if not key:
        parser.exit(2, 'Set YOUTUBE_API_KEY in your local environment or enter it at the hidden prompt.\n')
    if not re.fullmatch(r'[A-Za-z0-9_-]{20,200}', key):
        parser.exit(2, 'The YouTube API key format is invalid.\n')
    try:
        if args.cache_check:
            available = sum(row['status'] == 'available' for row in descriptions(rows, key))
            print(f'YouTube API check: {available} descriptions readable, {len(rows) - available} unavailable.')
        else:
            for row in descriptions(rows, key):
                print(json.dumps(row, ensure_ascii=False))
    except ValueError as e:
        parser.exit(1, str(e) + '\n')


if __name__ == '__main__':
    main()
