type CustomerName = { first_name: string; last_name: string; company_name?: string };
export type CustomerContact = CustomerName & { id:string; email:string; mobile_phone:string; home_phone:string; work_phone:string; source_number:string|null };

export function customerDisplayName(customer: CustomerName, lastFirst = false) {
  const { first_name: first, last_name: last, company_name: company } = customer;
  const person = (lastFirst ? [last, first] : [first, last]).filter(Boolean).join(lastFirst ? ', ' : ' ');
  return [person, company].filter(Boolean).join(' · ');
}

export function customerJobContact(c: CustomerContact) {
  return { firstName:c.first_name, lastName:c.last_name || (!c.first_name ? c.company_name || '' : ''),
    email:c.email, phone:c.mobile_phone||c.home_phone||c.work_phone||'' };
}
