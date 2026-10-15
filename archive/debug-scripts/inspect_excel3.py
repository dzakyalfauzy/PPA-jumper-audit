import pandas as pd
import json

excel_path = 'data_source.xlsx'
xls = pd.ExcelFile(excel_path)
mapping = []

def clean_dict(d):
    new_d = {}
    for k, v in d.items():
        if pd.isna(v):
            new_d[str(k)] = None
        else:
            new_d[str(k)] = str(v)
    return new_d

for sheet in xls.sheet_names:
    df = pd.read_excel(excel_path, sheet_name=sheet, nrows=5)
    cols = list(df.columns)
    sample = [clean_dict(r) for r in df.head(3).to_dict(orient='records')]
    mapping.append({
        'sheet': sheet,
        'columns': [str(c) for c in cols],
        'sample': sample
    })

with open('excel_mapping.json', 'w') as f:
    json.dump(mapping, f, indent=2)
print("Mapping exported to excel_mapping.json")
