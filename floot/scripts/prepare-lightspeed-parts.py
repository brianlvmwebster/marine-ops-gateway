"""Read the Lightspeed XLS without editing it. Private output belongs in ignored backups."""
import hashlib,json,pathlib,sys
from decimal import Decimal
import xlrd
source,destination=map(pathlib.Path,sys.argv[1:3])
s=xlrd.open_workbook(str(source),use_mmap=False).sheet_by_index(0)
assert s.ncols==127 and s.cell_value(1,82)=='Part Number' and s.cell_value(1,116)=='Supplier Code','Unexpected source columns'
assert s.row_values(1)==json.loads((pathlib.Path(__file__).parent.parent/'pages/parts-source-columns.json').read_text(encoding='utf-8')),'Source headings changed; review mapping'
fields={'supplier_code':116,'part_number':82,'description':24,'supplier_name':118,'category':20,'manufacturer':46,'manufacturer_part_number':50,'upc':120,'comments':22}
numbers={'on_hand':72,'available':11,'active_price':1,'retail_price':96,'sale_price':98,'replacement_cost':94,'inventory_value':32,'reorder_point':88,'minimum':60,'maximum':58}
rows=[];keys=set()
for i in range(2,s.nrows):
 raw=[str(v) for v in s.row_values(i)]
 if not any(raw) or raw[1].startswith('Parts Inventory:'):continue
 d={k:raw[c].strip() for k,c in fields.items()}
 for k,c in numbers.items():
  value=raw[c].strip().replace(',','');assert value and Decimal(value).is_finite(),(i,k)
  d[k]=format(Decimal(value),'f')
 assert raw[7] in ['True','False'];d['active']=raw[7]=='True';d['bins']=[raw[c].strip() for c in [13,16,18]]
 key=(d['supplier_code'],d['part_number']);assert all(key) and key not in keys;keys.add(key)
 rows.append({'row':i+1,'data':d,'source':raw})
assert len(rows)==24097
payload={'batch':hashlib.sha256(source.read_bytes()).hexdigest(),'headers':s.row_values(1),'rows':rows}
destination.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'parts':len(rows),'active':sum(r['data']['active'] for r in rows),'inactive':sum(not r['data']['active'] for r in rows),'negative_stock':sum(Decimal(r['data']['on_hand'])<0 for r in rows)}))
