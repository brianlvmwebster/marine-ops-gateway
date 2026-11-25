import {AppError} from './dockErrors';
export function defaultAppointmentTitle(scheduleName:string,lastName:string){return `DC-${scheduleName.trim()||'Schedule'}-${lastName.trim()||'Customer'}`;}
export function appointmentTitle(value:unknown){if(typeof value!=='string'||!value.trim()||value.length>255||/[\x00-\x1f\x7f]/.test(value))throw new AppError('Appointment title must be one line of 1–255 characters.');return value.trim();}
