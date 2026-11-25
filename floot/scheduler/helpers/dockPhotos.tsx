// @ts-nocheck
// Migrated from photos.js; source behavior retained.
import { AppError } from './dockErrors';

export const PHOTO_COLUMNS = ['Job Photo 1', 'Job Photo 2'];
export const MAX_PHOTO_JSON = 49000;

export function validatePhoto(photo) {
  if (!photo || typeof photo.name !== 'string' || !photo.name.trim() || photo.name.length > 120 ||
      typeof photo.dataUrl !== 'string' || JSON.stringify(photo).length > MAX_PHOTO_JSON ||
      !/^data:image\/jpeg;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(photo.dataUrl)) {
    throw new AppError('Each photo must be a compressed JPEG with a name and at most 49,000 JSON characters.');
  }
  const bytes = Buffer.from(photo.dataUrl.split(',')[1], 'base64');
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new AppError('Invalid JPEG photo.');
  }
  return { name: photo.name, dataUrl: photo.dataUrl };
}

export function readPhotos(source) {
  return PHOTO_COLUMNS.flatMap(label => {
    if (!source[label]) return [];
    try { return [validatePhoto(JSON.parse(source[label]))]; }
    catch { throw new AppError(`The stored photo in "${label}" is invalid. Correct that cell before loading jobs.`, 503); }
  });
}
