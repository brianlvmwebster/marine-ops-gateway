"""Read-only XLS conversion. Requires xlrd 2.0.2. Output must stay outside Git."""
import collections
import json
import pathlib
import sys
import xlrd

source, destination = map(pathlib.Path, sys.argv[1:3])
sheet = xlrd.open_workbook(str(source), use_mmap=False).sheet_by_index(0)
header = next(i for i in range(min(10, sheet.nrows)) if 'Customer Number' in sheet.row_values(i))
columns = [(i, str(value).strip()) for i, value in enumerate(sheet.row_values(header)) if value]
required = {'Customer Number', 'Active', 'First Name', 'Last Name', 'E-Mail'}
assert required.issubset({name for _, name in columns}), 'Unrecognized export columns'
rows, excluded, seen = [], 0, set()
for index in range(header + 1, sheet.nrows):
    raw = {name: str(sheet.cell_value(index, col)).strip() for col, name in columns}
    number = raw['Customer Number']
    if not number or number.startswith('Customer:'):
        continue
    assert number.isdigit(), 'Unexpected customer number at row %d' % (index + 1)
    assert number not in seen, 'Duplicate customer number'
    seen.add(number)
    if not (raw['First Name'] or raw['Last Name'] or raw.get('Company Name')):
        excluded += 1
        continue
    addresses = []
    for label, prefix in [('primary', ''), ('alternate', 'Alternate ')]:
        address = {'label': label}
        for key, heading in [('line1','Address 1'),('line2','Address 2'),('city','City'),('state','State'),('postal_code','Zip Code'),('county','County'),('country','Country')]:
            address[key] = raw.get(prefix + heading, '')
        if any(value for key, value in address.items() if key != 'label'):
            addresses.append(address)
    data = {key: raw[heading] for key, heading in [('first_name','First Name'),('last_name','Last Name'),('email','E-Mail'),('home_phone','Home Phone'),('work_phone','Work Phone'),('mobile_phone','Mobile Phone')]}
    if 'Company Name' in raw:
        data['company_name'] = raw['Company Name']
    data.update(addresses=addresses, notes='', status='active')
    assert all(len(value) <= 500 for value in raw.values()), 'Source field exceeds supported size'
    rows.append(dict(source_number=number, source_active=raw['Active'], source_record=raw, data=data))
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(rows, ensure_ascii=False), encoding='utf-8')
print(json.dumps({'source_records':len(seen),'included':len(rows),'excluded_unnamed':excluded,'source_active':dict(collections.Counter(r['source_active'] for r in rows))}))
