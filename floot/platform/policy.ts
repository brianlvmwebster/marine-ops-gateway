export const LAKEVIEW_ID = '00000000-0000-4000-8000-000000000001';
export class PlatformError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export type Role = 'owner' | 'admin' | 'member';
export type Access = {company_id: string; company_status: string; role: Role; status: string};
export function requireCompany(access: Access | undefined) {
  if (!access || access.company_status !== 'active' || access.status !== 'active')
    throw new PlatformError(403, 'Company access is unavailable.');
  return access;
}
export function requireManager(access: Access | undefined) {
  const value = requireCompany(access);
  if (!['owner', 'admin'].includes(value.role)) throw new PlatformError(403, 'Company administrator access required.');
  return value;
}
export function requireTool(access: Access | undefined, tool: {available: boolean; status: string; rollout_company_id: string | null} | undefined) {
  const company = requireCompany(access);
  if (!tool?.available || tool.status !== 'enabled' || (tool.rollout_company_id && tool.rollout_company_id !== company.company_id))
    throw new PlatformError(403, 'This tool is not enabled for your company.');
  return company;
}
export function validateMembershipChange(actor: Role, before: Role | undefined, after: Role) {
  if (actor === 'member' || (actor === 'admin' && (before === 'owner' || after === 'owner')))
    throw new PlatformError(403, 'Only company owners can manage owners.');
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    throw new PlatformError(403, 'Request origin is not allowed.');
}
