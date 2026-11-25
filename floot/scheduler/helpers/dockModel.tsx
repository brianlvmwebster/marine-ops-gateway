// @ts-nocheck
// Migrated from model.js; source behavior retained.
import { submissionDates } from './dockJobMetadata';
// Address, date, and row translation migrated from the original Apps Script.
export function translateRow_(
  source,
  rowNumber
) {
  const firstName =
    clean_(
      source[
        'Customer Name - First Name'
      ]
    );
  const lastName =
    clean_(
      source[
        'Customer Name - Last Name'
      ]
    );
  const fullName =
    [
      firstName,
      lastName
    ]
      .filter(Boolean)
      .join(' ');
  const rawAddress =
    clean_(
      source[
        'Product Location/Address'
      ]
    );
  const parsedAddress =
    parseAddress_(
      rawAddress
    );
  const latitude =
    parseCoordinate_(
      source[
        'Latitude'
      ]
    );
  const longitude =
    parseCoordinate_(
      source[
        'Longitude'
      ]
    );
  const appointment =
    clean_(
      source[
        'Appointment'
      ]
    );
  return {
    rowNumber,
    origin: 'sheet',
    submittedDates: submissionDates(source),
    roNumber:
      clean_(
        source['RO#']
      ),
    firstName,
    lastName,
    fullName,
    rawAddress,
    address:
      parsedAddress.fullAddress,
    street:
      parsedAddress.street,
    houseNumber:
      parsedAddress.houseNumber,
    town:
      parsedAddress.city,
    state:
      parsedAddress.state,
    zip:
      parsedAddress.zip,
    country:
      parsedAddress.country,
    bodyOfWater:
      clean_(
        source[
          'Body of Water'
        ]
      ),
    otherBody:
      clean_(
        source[
          'Other Body'
        ]
      ),
    phone:
      clean_(
        source[
          'Contact Phone'
        ]
      ),
    appointment,
    appointmentTimeMinutes: parseAppointmentTime_(appointment),
    appointmentDate:
      parseAppointmentDate_(
        appointment
      ),
    workDescription:
      clean_(
        source[
          'Description of Work'
        ]
      ),
    submissionId:
      clean_(
        source[
          'Submission ID'
        ]
      ),
    submissionEditUrl:
      clean_(
        source[
          'Submission Edit URL'
        ]
      ),
    latitude,
    longitude,
    hasCoordinates:
      Number.isFinite(
        latitude
      ) &&
      Number.isFinite(
        longitude
      ),
    completed:
      parseBoolean_(
        source[
          'Completed'
        ]
      ),
    completionSignature: clean_(source['Completion Signature']),
    completionDate: clean_(source['Completion Date']),
    notes:
      clean_(
        source[
          'Notes'
        ]
      )
  };
}
/************************************************************
 * SET COMPLETED
 ************************************************************/
export function parseAddress_(
  rawAddress
) {
  let text =
    String(
      rawAddress || ''
    ).trim();
  if (!text) {
    return {
      houseNumber: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      fullAddress: ''
    };
  }
  text =
    text.replace(
      /\\n/g,
      '\n'
    );
  const fields = {};
  text
    .split(
      /\r?\n/
    )
    .forEach(
      function(line) {
        const match =
          line.match(
            /^\s*([^:]+):\s*(.*?)\s*$/
          );
        if (!match) {
          return;
        }
        fields[
          match[1]
            .trim()
            .toLowerCase()
        ] =
          match[2].trim();
      }
    );
  if (!['house number', 'street name', 'city', 'state', 'postal code'].some(key => fields[key])) {
    return { houseNumber: '', street: '', city: '', state: '', zip: '', country: '', fullAddress: text.replace(/\r?\n/g, ', ') };
  }
  const houseNumber =
    fields[
      'house number'
    ] || '';
  const street =
    fields[
      'street name'
    ] || '';
  const city =
    fields[
      'city'
    ] || '';
  const state =
    fields[
      'state'
    ] || '';
  const zip =
    fields[
      'postal code'
    ] || '';
  const country =
    fields[
      'country'
    ] ||
    'United States';
  const streetAddress =
    [
      houseNumber,
      street
    ]
      .filter(Boolean)
      .join(' ');
  const locality =
    [
      city,
      state,
      zip
    ]
      .filter(Boolean)
      .join(', ');
  const fullAddress =
    [
      streetAddress,
      locality,
      country
    ]
      .filter(Boolean)
      .join(', ');
  return {
    houseNumber,
    street,
    city,
    state,
    zip,
    country,
    fullAddress
  };
}
/************************************************************
 * APPOINTMENT DATE
 ************************************************************/
// Sort by the start of a time slot, never by the date's day/year numbers.
export function parseAppointmentTime_(value) {
  const text = clean_(value);
  const twelveHour = /\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?/i.exec(text);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] || 0);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    return (hour % 12 + (twelveHour[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + minute;
  }
  const twentyFourHour = /\b(\d{1,2}):(\d{2})\b/.exec(text);
  if (!twentyFourHour) return null;
  const hour = Number(twentyFourHour[1]);
  const minute = Number(twentyFourHour[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

export function parseAppointmentDate_(
  appointment
) {
  const text =
    clean_(
      appointment
    );
  if (!text) {
    return '';
  }
  const match =
    text.match(
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/i
    );
  if (!match) {
    return '';
  }
  const months = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12'
  };
  const month =
    months[
      match[1].toLowerCase()
    ];
  if (!month) {
    return '';
  }
  return (
    match[3] +
    '-' +
    month +
    '-' +
    String(
      match[2]
    ).padStart(
      2,
      '0'
    )
  );
}
/************************************************************
 * BOOLEAN
 ************************************************************/
export function parseBoolean_(
  value
) {
  const text =
    clean_(
      value
    ).toLowerCase();
  return (
    text === 'true' ||
    text === 'yes' ||
    text === 'completed' ||
    text === '1'
  );
}
/************************************************************
 * COORDINATE
 ************************************************************/
export function parseCoordinate_(
  value
) {
  const text =
    clean_(
      value
    );
  if (!text) {
    return null;
  }
  const number =
    Number(
      text
    );
  return Number.isFinite(
    number
  )
    ? number
    : null;
}
/************************************************************
 * VALIDATE ROW
 ************************************************************/
export function clean_(
  value
) {
  return String(
    value === null ||
    value === undefined
      ? ''
      : value
  ).trim();
}
/************************************************************
 * VERIFY SCHEMA
 ************************************************************/
