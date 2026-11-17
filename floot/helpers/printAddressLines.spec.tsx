import {printAddressLines} from './printAddressLines';

describe('printed return/storage address',()=>{
 it('formats Google-style addresses without postal code or country',()=>{
  expect(printAddressLines('123 Main Street, Webster, MA 01570, USA')).toEqual(['123 Main Street','Webster, MA']);
  expect(printAddressLines('42 Lake Road, North Grosvenordale, CT 06255-1234, United States')).toEqual(['42 Lake Road','North Grosvenordale, CT']);
 });
 it('handles multiline and manually entered city/state addresses',()=>{
  expect(printAddressLines('123 Main Street\nWebster, MA 01570')).toEqual(['123 Main Street','Webster, MA']);
  expect(printAddressLines('123 Main Street\nWebster MA 01570')).toEqual(['123 Main Street','Webster, MA']);
  expect(printAddressLines('123 Main Street, Webster, Massachusetts')).toEqual(['123 Main Street','Webster, Massachusetts']);
 });
 it('preserves unit details with the street',()=>{
  expect(printAddressLines('123 Main Street, Apt 4, Webster, MA 01570, USA')).toEqual(['123 Main Street, Apt 4','Webster, MA']);
 });
 it('preserves unrecognized free-form addresses instead of guessing',()=>{
  expect(printAddressLines('Customer dock behind the marina')).toEqual(['Customer dock behind the marina']);
  expect(printAddressLines('123 Main Street')).toEqual(['123 Main Street']);
  expect(printAddressLines('12 King Street, London, UK')).toEqual(['12 King Street, London, UK']);
 });
 it('removes imported labels and puts house number before street name',()=>{
  expect(printAddressLines('Street name:   Main Street\r\nHouse number:   123\r\nCity:   Webster\r\nState:   MA\r\nZip:   01570')).toEqual(['123 Main Street','Webster, MA']);
  expect(printAddressLines('House Number: 42; Street Name: Lake Road; City: Webster; State: Massachusetts; Zip: 01570')).toEqual(['42 Lake Road','Webster, Massachusetts']);
 });
 it('handles partial imported fields without printing labels or a ZIP-only line',()=>{
  expect(printAddressLines('City: Webster\nState: MA\nZip: 01570')).toEqual(['Webster, MA']);
  expect(printAddressLines('Street name: Main Street\nHouse number: \nCity: Webster\nState: MA')).toEqual(['Main Street','Webster, MA']);
  expect(printAddressLines('Street Name: \nHouse Number: \nCity: \nState: \nZip: 01570')).toEqual(['—']);
 });
 it('uses the existing placeholder for a blank address',()=>{
  expect(printAddressLines('  ')).toEqual(['—']);
 });
});
