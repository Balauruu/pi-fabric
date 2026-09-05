"""Bounded HN-only supplementation of two engine-discovered threads."""
import concurrent.futures
import datetime
import html
import json
from pathlib import Path
import re
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parent
IDS = ['49516848', '49501147']

def fetch(item_id):
    url = f'https://hn.algolia.com/api/v1/items/{item_id}'
    output = {'url': url, 'hn_url': f'https://news.ycombinator.com/item?id={item_id}',
              'retrieved_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SQLite-HN-evidence-probe/1.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            output['status'] = response.status
            output['data'] = json.load(response)
    except Exception as exc:
        output['error_type'] = type(exc).__name__
        if isinstance(exc, urllib.error.HTTPError):
            output['status'] = exc.code
        else:
            output['error'] = 'HN API request failed; no credentials logged'
    (ROOT / f'hn-{item_id}.json').write_text(json.dumps(output, indent=2))
    return output

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(fetch, IDS))

for result in results:
    data = result.get('data', {})
    print(json.dumps({k: v for k, v in result.items() if k != 'data'}))
    print('Story:', data.get('title'), 'date:', data.get('created_at'), 'points:', data.get('points'))
    def walk(nodes):
        for node in nodes:
            text = node.get('text') or ''
            text = html.unescape(re.sub(r'<[^>]+>', ' ', text))
            text = ' '.join(text.split())
            if text:
                yield {'id': node.get('id'), 'author': node.get('author'), 'created_at': node.get('created_at'), 'text': text}
            yield from walk(node.get('children', []))
    comments = list(walk(data.get('children', [])))
    (ROOT / f'hn-{data.get("id", result["hn_url"].split("=")[-1])}-comments.json').write_text(json.dumps(comments, indent=2))
    print('Comments returned:', len(comments))
    for comment in comments[:35]:
        print(json.dumps(comment, ensure_ascii=False))
