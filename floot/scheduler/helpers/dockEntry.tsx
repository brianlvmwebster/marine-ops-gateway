// @ts-nocheck
// Migrated from entry.js; source behavior retained.
import {appointmentTitle} from './dockAppointmentTitle';
import { AppError } from './dockErrors';

export function validateJobFields(input, { required = true } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Enter the job details.');
  const limits = { firstName: 100, lastName: 100, street: 250, city: 100, state: 50, zip: 20, phone: 50, roNumber: 100, bodyOfWater: 200, workDescription: 4000, notes: 20000 };
  const result = {};
  for (const [key, max] of Object.entries(limits)) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || input[key].length > max || /\x00/.test(input[key]))) throw new AppError(`${key} must be text of at most ${max} characters.`);
    result[key] = (input[key] || '').trim();
  }
  for (const key of ['firstName', 'lastName', 'street', 'city', 'state', 'bodyOfWater', 'workDescription']) {
    if (required && !result[key]) throw new AppError('Fill in the customer name, address, body of water, and work description.');
  }
  for (const key of ['street', 'city', 'state', 'zip']) {
    if (/[\r\n]/.test(result[key])) throw new AppError('Enter each address field on a single line.');
  }
  return result;
}

export function validateEntry(input) {
  const result = validateJobFields(input);
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.requestId || '')) throw new AppError('Invalid submission reference. Reload the form.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(input.start || '') || !Number.isFinite(Date.parse(input.start)) || new Date(input.start).toISOString() !== input.start) throw new AppError('Choose an available appointment time.');
  if (!Number.isInteger(input.duration) || input.duration < 30 || input.duration > 480 || input.duration % 30) throw new AppError('Choose a duration from 30 minutes to 8 hours.');
  return { ...result, ...(input.appointmentTitle !== undefined ? {appointmentTitle:appointmentTitle(input.appointmentTitle)} : {}), requestId: input.requestId.toLowerCase(), start: input.start, duration: input.duration };
}

export function entrySource(entry, appointment) {
  return {
    'Submission ID': `scheduler-${entry.requestId}`,
    'Customer Name - First Name': entry.firstName,
    'Customer Name - Last Name': entry.lastName,
    'Product Location/Address': `Street Name: ${entry.street}\nCity: ${entry.city}\nState: ${entry.state}\nPostal Code: ${entry.zip}`,
    'Body of Water': entry.bodyOfWater,
    'Other Body': '',
    'Contact Phone': entry.phone,
    'RO#': entry.roNumber,
    'Description of Work': entry.workDescription,
    Notes: entry.notes,
    Appointment: appointment,
    Completed: false,
  };
}
