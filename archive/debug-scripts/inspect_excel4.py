import pandas as pd
import json

excel_path = 'data_source.xlsx'
xls = pd.ExcelFile(excel_path)
mapping = []

def clean_dict(d):
    new_d = {}
    for k, v in d.items():
        if pd.isna(v):
            pass
        else:
            new_d[str(k)] = str(v)
    return new_d

for sheet in xls.sheet_names:
    df = pd.read_excel(excel_path, sheet_name=sheet, header=None)
    
    # cari index baris yang punya paling banyak cell terisi
    best_idx = 0
    max_cells = 0
    for i in range(min(20, len(df))):
        cells = df.iloc[i].dropna()
        if len(cells) > max_cells:
            max_cells = len(cells)
            best_idx = i
            
    header_row = [str(x) if not pd.isna(x) else f"Unnamed_{j}" for j, x in enumerate(df.iloc[best_idx])]
    
    samples = []
    for i in range(best_idx + 1, min(best_idx + 6, len(df))):
        row_dict = {}
        for j, val in enumerate(df.iloc[i]):
            if not pd.isna(val):
                row_dict[header_row[j]] = str(val)
        if row_dict:
            samples.append(row_dict)

    mapping.append({
        'sheet': sheet,
        'best_header_row_index': best_idx,
        'headers': header_row,
        'samples': samples
    })

with open('excel_mapping_smart.json', 'w') as f:
    json.dump(mapping, f, indent=2)
print("Mapping exported to excel_mapping_smart.json")
