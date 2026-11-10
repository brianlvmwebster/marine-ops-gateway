import {createHash} from 'node:crypto';
export const calendarTarget={
 eventsPath(calendarId:string,eventId?:string){const base=calendarId==='primary'?'/me/calendar/events':'/me/calendars/'+encodeURIComponent(calendarId)+'/events';return eventId?base+'/'+encodeURIComponent(eventId):base;},
 transactionId(email:string,calendarId:string,jobId:string){const h=createHash('sha256').update(email.toLowerCase()+'|'+calendarId+'|'+jobId).digest('hex').slice(0,32);return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
};