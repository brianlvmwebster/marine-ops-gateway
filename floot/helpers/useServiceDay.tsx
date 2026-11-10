import {useEffect,useState} from 'react';
import {serviceTime} from './serviceTime';
const currentDay=()=>serviceTime.fromUtc(new Date().toISOString()).serviceDate;
export function useServiceDay(){
 const [day,setDay]=useState(currentDay);
 useEffect(()=>{const update=()=>setDay(currentDay());const timer=window.setInterval(update,30000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};},[]);
 return day;
}
