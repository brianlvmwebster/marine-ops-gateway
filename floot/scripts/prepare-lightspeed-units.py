"""Read the Lightspeed customer-unit XLS without editing it. Keep output outside Git."""
import collections, hashlib, json, pathlib, sys
import xlrd
source,destination=map(pathlib.Path,sys.argv[1:3])
sheet=xlrd.open_workbook(str(source),use_mmap=False).sheet_by_index(0)
header=next(i for i in range(min(20,sheet.nrows)) if 'Customer Number' in sheet.row_values(i))
columns={str(v).strip():i for i,v in enumerate(sheet.row_values(header)) if v}
assert {'Customer Number','VIN 1','Make','Model','Length'}<=columns.keys(),'Unrecognized unit export'
rows=[];excluded=0
for i in range(header+1,sheet.nrows):
 raw={k:str(sheet.cell_value(i,c)).strip() for k,c in columns.items()}
 if not any(raw.values()) or raw['Customer Number'].startswith('Customer Units:'):continue
 number=raw['Customer Number']
 if not number or (number.isdigit() and int(number)==0):excluded+=1;continue
 assert number.isdigit(),'Unexpected customer reference at row %s'%(i+1)
 rows.append(dict(row=i+1,customer_number=number,vin=raw['VIN 1'],make=raw['Make'],model=raw['Model'],length=raw['Length']))
vins=collections.Counter(r['vin'].upper() for r in rows if r['vin'])
def fingerprint(r):return tuple(r[k] for k in ['customer_number','vin','make','model','length'])
identical=collections.Counter(fingerprint(r) for r in rows)
for r in rows:r['flags']=(['repeated_vin'] if r['vin'] and vins[r['vin'].upper()]>1 else [])+(['identical_row'] if identical[fingerprint(r)]>1 else [])
payload=dict(batch=hashlib.sha256(source.read_bytes()).hexdigest(),excluded=excluded,rows=rows)
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(payload,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(included=len(rows),excluded=excluded,review_rows=sum(bool(r['flags']) for r in rows))))
