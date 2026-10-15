const XLSX = require('xlsx');

const workbook = XLSX.readFile('data_source.xlsx');
console.log("Sheet Names:");
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    if (data.length > 0) {
        console.log("Row 1 (Header/Title?):", data[0]);
        if (data.length > 1) console.log("Row 2:", data[1]);
        if (data.length > 2) console.log("Row 3:", data[2]);
        console.log("Total rows:", data.length);
    }
}
