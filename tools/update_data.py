"""Refresh the data embedded in index.html from a folder of dashboard CSVs.

Usage: python3 tools/update_data.py <csv_dir> [export_date_dd/mm/yyyy]
<csv_dir> holds the CSV files named as in FILES below (any missing file keeps its current data).
"""
import json, os, re, sys

FILES = {'gmv': 'gmv_monthly.csv', 'meta_ads': 'meta_monthly.csv', 'tiktok_ads': 'tiktok_monthly.csv',
         'shopee_ads': 'shopee_ads_monthly.csv', 'dd_gmv': 'dd_gmv.csv', 'dd_meta': 'dd_meta.csv',
         'dd_tiktok': 'dd_tiktok.csv', 'dd_shopee_ads': 'dd_shopee_ads.csv', 'shopee_live_gmv': 'shopee_live_gmv.csv',
         'tiktok_gmvmax_m': 'tiktok_gmvmax_monthly.csv', 'tiktok_ttshop_m': 'tiktok_ttshop_monthly.csv',
         'meta_daily': 'meta_daily.csv', 'tiktok_daily': 'tiktok_daily.csv', 'shopee_ads_daily': 'shopee_ads_daily.csv',
         'tiktok_gmv_daily': 'tiktok_gmv_daily.csv', 'campaigns': 'campaigns.csv'}

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = os.path.join(root, 'index.html')
html = open(page, encoding='utf-8').read()
m = re.search(r'const RAW=(\{.*?\}), parsed=\{\}', html, re.S)
if not m:
    sys.exit('RAW data block not found in index.html')
raw = json.loads(m.group(1))
src = sys.argv[1]
changed = []
for key, name in FILES.items():
    p = os.path.join(src, name)
    if os.path.exists(p):
        raw[key] = open(p, encoding='utf-8').read().replace('\r', '')
        changed.append(name)
html = html[:m.start(1)] + json.dumps(raw, ensure_ascii=False) + html[m.end(1):]
if len(sys.argv) > 2:
    html = re.sub(r'bản web xuất ngày [0-9/]+', 'bản web xuất ngày ' + sys.argv[2], html)
open(page, 'w', encoding='utf-8').write(html)
print('updated:', ', '.join(changed) or 'nothing')
