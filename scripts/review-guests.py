"""Review creator-supplied video descriptions or participant names, offline."""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER = ROOT / 'worker/index.js'
CHECKED = ROOT / 'config/guest-reviewed-empty.json'
INDEX = re.compile(r'^const verifiedGuests=(\{.*?\n\});', re.M | re.S)
DIVIDER = re.compile(r'^\s*(?:=\s*){6,}$')
GUEST_LINE = re.compile(r'^(?:w\.\s*)?([\w.· ()-]{1,65}?)\s*[-–:]\s*https://(?:www\.)?(?:youtube\.com|youtu\.be|chzzk\.naver\.com|twitch\.tv)/\S+$', re.I)
NAME = re.compile(r'^[\w.· ()-]{1,65}$')
HOST_LINE = re.compile(r'^여까\s+(?:치지직|유튜브)\s+https://\S+$')
ARCHIVE_HEADER = re.compile(r'^20\d\d \d\d \d\d\b')


def parse_description(description):
    lines = [line.strip() for line in description.splitlines() if line.strip()]
    separators = [i for i, line in enumerate(lines) if DIVIDER.fullmatch(line)]
    if len(separators) == 1 and lines and ARCHIVE_HEADER.match(lines[0]):
        tail = lines[separators[0] + 1:]
        if not tail:
            return []
        matches = [GUEST_LINE.fullmatch(line) for line in tail]
        if all(matches):
            return list(dict.fromkeys(m[1] for m in matches if m[1] != '여까'))
    if not separators and lines and ARCHIVE_HEADER.match(lines[0]) and len(lines) == 3 and all(HOST_LINE.fullmatch(line) for line in lines[1:]):
        return []
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, help='CSV with videoId and description or members. Use | between explicitly confirmed names.')
    parser.add_argument('--apply', action='store_true', help='Apply the reviewed import. Existing registered names are preserved.')
    parser.add_argument('--limit', type=int, default=100, help='Maximum number of pending videos listed without input.')
    args = parser.parse_args()
    if args.apply and not args.input:
        parser.error('--apply requires --input')
    source = WORKER.read_text(encoding='utf-8')
    index = INDEX.search(source)
    guests = json.loads(index[1])
    checked = set(json.loads(CHECKED.read_text(encoding='utf-8')))
    videos = {}
    for month in sorted((ROOT / 'docs/data').glob('*/*.json')):
        for e in json.loads(month.read_text(encoding='utf-8'))['events']:
            if e['videoId']:
                videos[e['videoId']] = e

    pending = sorted((e for v, e in videos.items() if v not in guests and v not in checked), key=lambda e: e['date'], reverse=True)
    print(f'{len(videos)} linked videos; {len(set(videos) & guests.keys())} with names; {len(set(videos) & checked)} checked without names; {len(pending)} pending.', file=sys.stderr)
    if not args.input:
        rows = csv.writer(sys.stdout)
        rows.writerow(['videoId', 'date', 'title', 'description', 'members'])
        rows.writerows([e['videoId'], e['date'], e['title'], '', ''] for e in pending[:max(0, args.limit)])
        return

    with args.input.open(encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        fields = set(reader.fieldnames or [])
        if 'videoId' not in fields or not fields & {'description', 'members'}:
            parser.error('expected videoId and description or members')
        rows = list(reader)
    ids = [r['videoId'].strip() for r in rows if r.get('videoId')]
    duplicate = {v for v, n in Counter(ids).items() if n > 1}
    result = csv.writer(sys.stdout)
    result.writerow(['videoId', 'status', 'members'])
    additions, empty = {}, set()
    for row in sorted(rows, key=lambda r: videos.get((r.get('videoId') or '').strip(), {}).get('date', ''), reverse=True):
        v = (row.get('videoId') or '').strip()
        if v not in videos or v in duplicate:
            result.writerow([v, 'unknown or duplicate video', ''])
            continue
        if v in guests:
            result.writerow([v, 'already registered', ' | '.join(guests[v])])
            continue
        explicit = (row.get('members') or '').strip()
        if explicit:
            names = list(dict.fromkeys(n.strip() for n in explicit.split('|')))
            names = names if 0 < len(names) <= 25 and all(NAME.fullmatch(n) for n in names) else None
        else:
            names = parse_description(row.get('description') or '')
        if names:
            additions[v] = names
        elif names == []:
            empty.add(v)
        result.writerow([v, 'add' if names else 'no names' if names == [] else 'needs review', ' | '.join(names or [])])

    if args.apply:
        if additions:
            records = ',\n'.join(' ' + json.dumps(v) + ':' + json.dumps(names, ensure_ascii=False, separators=(',', ':')) for v, names in sorted((guests | additions).items()))
            WORKER.write_text(source[:index.start(1)] + '{\n' + records + '\n}' + source[index.end(1):], encoding='utf-8')
        if empty or additions:
            CHECKED.write_text(json.dumps(sorted((checked | empty) - additions.keys()), indent=1) + '\n', encoding='utf-8')
        print(f'Added {len(additions)} videos; confirmed {len(empty)} descriptions without names.', file=sys.stderr)


if __name__ == '__main__':
    main()
