import fs from 'fs';

const cGood = fs.readFileSync('cGood.xml', 'utf8');
const cBad = fs.readFileSync('cBad.xml', 'utf8');

// Find differences
const goodTags = cGood.match(/<[^>]+>/g) || [];
const badTags = cBad.match(/<[^>]+>/g) || [];

console.log('Total tags Good:', goodTags.length, 'Bad:', badTags.length);
const diffTags = badTags.filter(t => !goodTags.includes(t));
console.log('Tags in Bad but not in Good:\n', [...new Set(diffTags)]);
