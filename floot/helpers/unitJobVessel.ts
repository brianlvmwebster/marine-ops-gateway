export type JobUnit={id:string;customer_id:string|null;name:string;year:string;make:string;model:string;vin:string;unit_type:string;status:string;review_flags:string[];reviewed:boolean};
export function unitJobVessel(u:Pick<JobUnit,'year'|'make'|'model'|'vin'>){return {year:u.year==='0'?'':u.year,make:u.make,model:u.model,hullId:u.vin,engine:''};}
export const emptyUnitVessel={year:'',make:'',model:'',hullId:'',engine:''};
