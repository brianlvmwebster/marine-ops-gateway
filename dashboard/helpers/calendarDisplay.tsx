export const pickupCategories=[
 {label:'Road Pickup',color:'#92400e',background:'#fff7df'},
 {label:'Customer Drop-off (Land)',color:'#1d4ed8',background:'#eff6ff'},
 {label:'Customer Drop-off (Webster Lake)',color:'#0f766e',background:'#f0fdfa'},
 {label:'Water Pickup (Webster Lake)',color:'#7e22ce',background:'#faf5ff'},
 {label:'LVM Slip Customer',color:'#be185d',background:'#fdf2f8'}
];
export function pickupCategory(value:string){return pickupCategories.find(c=>c.label===value)||{label:value||'Not specified',color:'#475569',background:'#f1f5f9'};}
