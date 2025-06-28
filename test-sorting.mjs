#!/usr/bin/env node

// Simple test script to verify ID key detection and sorting
import { readFileSync } from 'fs';
import { detectIdKeysInSingleJson } from '../src/utils/jsonCompare.js';

const testFile1 = JSON.parse(readFileSync('./public/sort-test-1.json', 'utf8'));
const testFile2 = JSON.parse(readFileSync('./public/sort-test-2.json', 'utf8'));

console.log('Test File 1:', JSON.stringify(testFile1, null, 2));
console.log('Test File 2:', JSON.stringify(testFile2, null, 2));

console.log('\n=== ID Key Detection ===');
const idKeys1 = detectIdKeysInSingleJson(testFile1);
const idKeys2 = detectIdKeysInSingleJson(testFile2);

console.log('ID Keys in File 1:', idKeys1);
console.log('ID Keys in File 2:', idKeys2);

// Test array sorting
const originalArray1 = testFile1.products;
const originalArray2 = testFile2.products;

console.log('\n=== Original Arrays ===');
console.log('File 1 products order:', originalArray1.map(p => p.id));
console.log('File 2 products order:', originalArray2.map(p => p.id));

// Sort both arrays by 'id' key
const sortedArray1 = [...originalArray1].sort((a, b) => a.id.localeCompare(b.id));
const sortedArray2 = [...originalArray2].sort((a, b) => a.id.localeCompare(b.id));

console.log('\n=== Sorted Arrays ===');
console.log('File 1 products sorted:', sortedArray1.map(p => p.id));
console.log('File 2 products sorted:', sortedArray2.map(p => p.id));

console.log('\n=== Verification ===');
const sortedIds1 = sortedArray1.map(p => p.id).join(',');
const sortedIds2 = sortedArray2.map(p => p.id).join(',');
console.log('Arrays sort to same order:', sortedIds1 === sortedIds2 ? 'YES' : 'NO');
console.log('Expected order: A,B,C,D');
console.log('File 1 sorted order:', sortedIds1);
console.log('File 2 sorted order:', sortedIds2);
