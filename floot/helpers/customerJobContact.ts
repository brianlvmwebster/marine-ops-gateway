export type CustomerContact={id:string;first_name:string;last_name:string;email:string;mobile_phone:string;home_phone:string;work_phone:string;source_number:string|null};
export function customerJobContact(c:CustomerContact){return {firstName:c.first_name,lastName:c.last_name,email:c.email,phone:c.mobile_phone||c.home_phone||c.work_phone||''};}
