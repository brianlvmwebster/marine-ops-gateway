// @ts-nocheck
import {AppError} from './dockErrors';
import {clean_} from './dockModel';
export function waterFields(source) {
  const selection = clean_(source['Body of Water']);
  const isOther = /^other(?:\s*(?:\.{3}|…))?$/i.test(selection);
  const otherBody = isOther ? clean_(source['Other Body']) : '';
  return { bodyOfWaterSelection: selection, bodyOfWater: otherBody || selection, otherBody, isOther };
}

export function validateCompletion(completed, signature, date) {
  if (typeof completed !== 'boolean') throw new AppError('Completed must be true or false.');
  if (!completed) return;
  if (typeof signature !== 'string' || !signature.trim() || signature.trim().length > 100 || /[\r\n\x00-\x1f]/.test(signature)) throw new AppError('Enter a signature of 1–100 characters.');
  const parsed = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00Z') : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new AppError('Select a valid completion date.');
}

