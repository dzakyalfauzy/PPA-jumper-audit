const XLSX = require('xlsx');

const workbook = XLSX.readFile('data_source.xlsx');

function dumpSheet(sheetName, limit = 20) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    let count = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].length > 0 && data[i].some(c => c !== undefined && c !== null && c !== "")) {
            console.log(`Row ${i + 1}:`, data[i]);
            count++;
            if (count >= limit) break;
        }
    }
}

dumpSheet('PP update All Area (New chart)', 30);
dumpSheet('Weekly Jumper', 30);
dumpSheet('AFI (wkly)', 30);
