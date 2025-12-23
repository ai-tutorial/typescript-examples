/**
 * Quick script to create a sample table image for testing
 */
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join } from 'path';

const canvas = createCanvas(800, 400);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 800, 400);

// Title
ctx.fillStyle = 'black';
ctx.font = 'bold 24px Arial';
ctx.fillText('Q4 2024 Sales Report', 250, 40);

// Table headers
ctx.font = 'bold 16px Arial';
const headers = ['Product', 'Units Sold', 'Revenue', 'Growth %'];
const colWidths = [200, 150, 200, 150];
let x = 50;
let y = 80;

// Draw header row
ctx.fillStyle = '#e0e0e0';
ctx.fillRect(x, y, 700, 40);
ctx.fillStyle = 'black';
headers.forEach((header, i) => {
    ctx.fillText(header, x + 10, y + 25);
    x += colWidths[i];
});

// Table data
const data = [
    ['Laptop Pro', '1,245', '$1,245,000', '+15%'],
    ['Tablet X', '3,890', '$778,000', '+8%'],
    ['Phone Z', '5,670', '$2,268,000', '+22%'],
    ['Watch S', '2,100', '$420,000', '-5%'],
];

ctx.font = '16px Arial';
y = 120;

data.forEach((row, rowIndex) => {
    x = 50;
    // Alternate row colors
    if (rowIndex % 2 === 0) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(x, y, 700, 40);
    }
    ctx.fillStyle = 'black';
    row.forEach((cell, i) => {
        ctx.fillText(cell, x + 10, y + 25);
        x += colWidths[i];
    });
    y += 40;
});

// Total row
ctx.fillStyle = '#d0d0d0';
ctx.fillRect(50, y, 700, 40);
ctx.fillStyle = 'black';
ctx.font = 'bold 16px Arial';
x = 50;
const totals = ['TOTAL', '12,905', '$4,711,000', '+12%'];
totals.forEach((cell, i) => {
    ctx.fillText(cell, x + 10, y + 25);
    x += colWidths[i];
});

// Draw grid lines
ctx.strokeStyle = '#999';
ctx.lineWidth = 1;

// Vertical lines
x = 50;
for (let i = 0; i <= headers.length; i++) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x, y + 40);
    ctx.stroke();
    if (i < headers.length) x += colWidths[i];
}

// Horizontal lines
for (let i = 0; i <= data.length + 2; i++) {
    const lineY = 80 + (i * 40);
    ctx.beginPath();
    ctx.moveTo(50, lineY);
    ctx.lineTo(750, lineY);
    ctx.stroke();
}

// Save to file
const buffer = canvas.toBuffer('image/png');
const outputPath = join(process.cwd(), 'assets', 'complex_table.png');
writeFileSync(outputPath, buffer);
console.log(`Table image created at: ${outputPath}`);
