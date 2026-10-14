import fs from 'fs';

const barXml = fs.readFileSync('xml_bar.xml', 'utf8');
const comboXml = fs.readFileSync('xml_combo.xml', 'utf8');

console.log('Bar dLbls in ser:', barXml.match(/<c:ser>[\s\S]*?<c:dLbls>[\s\S]*?<\/c:dLbls>/g));
console.log('Combo dLbls in ser:', comboXml.match(/<c:ser>[\s\S]*?<c:dLbls>[\s\S]*?<\/c:dLbls>/g));

console.log('Bar dLbls after ser:', barXml.match(/<\/c:ser>\s*<c:dLbls>[\s\S]*?<\/c:dLbls>/g));
console.log('Combo dLbls after ser:', comboXml.match(/<\/c:ser>\s*<c:dLbls>[\s\S]*?<\/c:dLbls>/g));
