"""Sonda: disponibilidad de pilas (STACK_ID) NISAR GCOV por punto. Solo metadatos."""
import collections
import json
import sys
import httpx

CMR = 'https://cmr.earthdata.nasa.gov/search'
GCOV = 'C3622241360-ASF'
POINTS = {
    'La Mojana, CO': (-74.75, 8.55),
    'Pantanal, BR': (-57.0, -18.0),
    'Sudd, SS': (30.5, 7.5),
    'Rondonia, BR': (-63.0, -10.5),
    'Central Valley, US': (-120.5, 36.8),
    'Petermann, GL': (-61.0, 80.7),
    'Vatnajokull, IS': (-17.0, 64.4),
    'Kilauea, US': (-155.28, 19.41),
    'Bangladesh': (90.4, 24.3),
    'Punjab, IN': (75.5, 30.8),
    'Valencia, ES': (-0.45, 39.4),
    'Los Angeles, US': (-118.4, 34.2),
    'Mekong, VN': (105.6, 10.0),
    'Okavango, BW': (22.8, -19.3),
    'Aral, KZ': (59.5, 45.0),
    'Thwaites, AQ': (-106.8, -75.3),
}


def attrs(umm):
    return {a['Name']: a['Values'][0] for a in umm.get('AdditionalAttributes', []) if a.get('Values')}


def main():
    out = {}
    with httpx.Client(timeout=40, headers={'User-Agent': 'nisar-explorer/0.1'}) as c:
        for name, (lon, lat) in POINTS.items():
            r = c.get(f'{CMR}/granules.umm_json', params={'short_name': 'NISAR_L2_GCOV*', 'options[short_name][pattern]': 'true', 'point': f'{lon},{lat}', 'page_size': 400, 'sort_key': '-start_date'})
            r.raise_for_status()
            hits = r.headers.get('CMR-Hits')
            stacks = collections.defaultdict(list)
            for item in r.json()['items']:
                u = item['umm']
                a = attrs(u)
                stacks[a.get('STACK_ID', '?')].append((u['TemporalExtent']['RangeDateTime']['BeginningDateTime'][:10], a.get('FREQUENCY_A_POLARIZATION_CONCAT', '?'), u['CollectionReference'].get('ShortName','?')[13:]))
            print(f'\n{name}  hits={hits}')
            for sid, rows in sorted(stacks.items(), key=lambda kv: -len(kv[1])):
                dates = sorted({d for d, _, _ in rows})
                pols = sorted({p for _, p, _ in rows})
                print(f'  {sid}: {len(rows)} granules, {len(dates)} fechas {dates[0]} → {dates[-1]} pols={pols} cols={sorted({c for _,_,c in rows})}')
            out[name] = {sid: sorted(rows) for sid, rows in stacks.items()}
    json.dump(out, open(sys.argv[1], 'w'), indent=1)


main()
