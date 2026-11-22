import {randomUUID} from 'node:crypto';
import {LAKEVIEW_ID, PlatformError, requireCompany, requireManager, requireTool, validateMembershipChange} from './policy.ts';
import type {Access, Role} from './policy.ts';

// SQL is injected so the same authorization operations are exercised against real PostgreSQL in CI.
export function platformStore(sql: any) {
  async function operator(tx: any, userId: number) {
    const rows = await tx`select user_id from platform_operators where user_id=${userId}`;
    if (!rows.length) throw new PlatformError(403, 'Platform operator access required.');
  }
  async function membership(tx: any, userId: number, companyId: string): Promise<Access | undefined> {
    const rows = await tx`select m.*, c.status as company_status from platform_memberships m
      join platform_companies c on c.id=m.company_id where m.user_id=${userId} and m.company_id=${companyId}`;
    return rows[0];
  }
  async function lockCompany(tx: any, companyId: string) {
    const rows = await tx`select id from platform_companies where id=${companyId} for update`;
    if (!rows.length) throw new PlatformError(404, 'Company not found.');
  }
  async function audit(tx: any, actor: number, companyId: string, action: string, detail: object) {
    await tx`insert into platform_audit(actor_user_id,company_id,action,detail)
      values(${actor},${companyId},${action},${tx.json(detail)})`;
  }
  return {
    async overview(userId: number) {
      const operators = await sql`select user_id from platform_operators where user_id=${userId}`;
      const companies = await sql`select c.*, m.role, m.status as membership_status
        from platform_companies c left join platform_memberships m on m.company_id=c.id and m.user_id=${userId}
        where ${operators.length > 0} or (m.status='active' and c.status='active') order by c.name`;
      const tools = await sql`select key,name,path,available,rollout_company_id from platform_tools order by name`;
      return {operator: operators.length > 0, companies, tools};
    },
    async company(userId: number, companyId: string) {
      const ops = await sql`select user_id from platform_operators where user_id=${userId}`;
      const access = await membership(sql, userId, companyId);
      if (!ops.length) requireCompany(access);
      const companies = await sql`select * from platform_companies where id=${companyId}`;
      if (!companies.length) throw new PlatformError(404, 'Company not found.');
      const canManage = !!ops.length || ['owner','admin'].includes(access?.role || '');
      const members = canManage ? await sql`select m.*,u.email,u.display_name from platform_memberships m
        join users u on u.id=m.user_id where m.company_id=${companyId} order by u.email` : [];
      const tools = await sql`select t.key,t.name,t.path,t.available,t.rollout_company_id,
        coalesce(e.status,'disabled') as status,coalesce(e.version,0) as version
        from platform_tools t left join platform_entitlements e on e.tool_key=t.key and e.company_id=${companyId} order by t.name`;
      return {company:companies[0],role:access?.role || null,activeMember:access?.status==='active'&&access?.company_status==='active',canManage,operator:!!ops.length,members,tools};
    },
    async createCompany(actor: number, input: {slug: string; name: string}) {
      return sql.begin(async (tx: any) => {
        await operator(tx, actor);
        const id = randomUUID();
        const rows = await tx`insert into platform_companies(id,slug,name) values(${id},${input.slug},${input.name})
          on conflict(slug) do nothing returning *`;
        if (!rows.length) throw new PlatformError(409, 'That company address is already in use.');
        await audit(tx, actor, id, 'company.created', {slug:input.slug});
        return rows[0];
      });
    },
    async setMembership(actor: number, companyId: string, input: {email: string; role: Role; status: string; version: number}) {
      return sql.begin(async (tx: any) => {
        await lockCompany(tx, companyId);
        const ops = await tx`select user_id from platform_operators where user_id=${actor}`;
        const access = await membership(tx, actor, companyId);
        if (!ops.length) requireManager(access);
        const users = await tx`select id from users where lower(email)=${input.email.toLowerCase()}`;
        if (users.length !== 1) throw new PlatformError(400, 'An existing, unambiguous registered user is required.');
        const userId = users[0].id;
        const before = (await tx`select * from platform_memberships where company_id=${companyId} and user_id=${userId}`)[0];
        if (!ops.length) validateMembershipChange(access!.role, before?.role, input.role);
        if ((before?.version || 0) !== input.version) throw new PlatformError(409, 'Membership changed. Reload and try again.');
        if (before?.role === 'owner' && before.status === 'active' && (input.role !== 'owner' || input.status !== 'active')) {
          const owners = await tx`select user_id from platform_memberships where company_id=${companyId} and role='owner' and status='active'`;
          if (owners.length <= 1) throw new PlatformError(409, 'Keep at least one active company owner.');
        }
        await tx`insert into platform_memberships(company_id,user_id,role,status) values(${companyId},${userId},${input.role},${input.status})
          on conflict(company_id,user_id) do update set role=excluded.role,status=excluded.status,version=platform_memberships.version+1`;
        await audit(tx, actor, companyId, 'membership.updated', {userId,role:input.role,status:input.status});
        return {saved:true};
      });
    },
    async setEntitlement(actor: number, companyId: string, input: {toolKey: string; status: string; version: number}) {
      return sql.begin(async (tx: any) => {
        await operator(tx, actor);
        await lockCompany(tx, companyId);
        const tool = (await tx`select * from platform_tools where key=${input.toolKey}`)[0];
        if (!tool || (input.status === 'enabled' && (!tool.available || (tool.rollout_company_id && tool.rollout_company_id !== companyId))))
          throw new PlatformError(409, 'This tool is not ready for this company.');
        const before = (await tx`select version from platform_entitlements where company_id=${companyId} and tool_key=${input.toolKey}`)[0];
        if ((before?.version || 0) !== input.version) throw new PlatformError(409, 'Tool access changed. Reload and try again.');
        await tx`insert into platform_entitlements(company_id,tool_key,status) values(${companyId},${input.toolKey},${input.status})
          on conflict(company_id,tool_key) do update set status=excluded.status,version=platform_entitlements.version+1,updated_at=now()`;
        await audit(tx,actor,companyId,'entitlement.updated',{toolKey:input.toolKey,status:input.status});
        return {saved:true};
      });
    },
    async toolAccess(userId: number, companyId: string, toolKey: string) {
      // One statement provides a consistent membership + entitlement snapshot; no cached grants.
      const rows = await sql`select m.company_id,m.role,m.status,c.status as company_status,t.available,t.rollout_company_id,e.status as tool_status
        from platform_memberships m join platform_companies c on c.id=m.company_id
        join platform_entitlements e on e.company_id=m.company_id and e.tool_key=${toolKey}
        join platform_tools t on t.key=e.tool_key where m.user_id=${userId} and m.company_id=${companyId}`;
      const row=rows[0];
      return requireTool(row, row && {...row,status:row.tool_status});
    },
    async legacyServiceAccess(serviceUserId: string) {
      const users = await sql`select auth_user_id from native_gateway_members where service_user_id=${serviceUserId} and enabled and auth_user_id is not null`;
      if (users.length !== 1) throw new PlatformError(403, 'Your company membership has not been linked.');
      return this.toolAccess(users[0].auth_user_id, LAKEVIEW_ID, 'service-desk');
    }
  };
}
