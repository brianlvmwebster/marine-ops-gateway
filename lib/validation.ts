export type ButtonLink = { id: string; title: string; url: string; description: string; image: string; newTab: boolean; slug?:string };
export function webUrl(value: string) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } }
export function validButtons(value: unknown): value is ButtonLink[] {
  if (!Array.isArray(value) || value.length > 100) return false;
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return value.every(b => {
    if (!b || typeof b.id !== 'string' || !/^[\w-]{1,80}$/.test(b.id) || ids.has(b.id)) return false;
    ids.add(b.id);
    if(b.slug!==undefined&&b.slug!==''){
      if(typeof b.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)||b.slug.length>60||slugs.has(b.slug))return false;
      slugs.add(b.slug);
    }
    return typeof b.title === 'string' && b.title.trim().length > 0 && b.title.length <= 80 && typeof b.url === 'string' && b.url.length <= 2048 && webUrl(b.url) && typeof b.description === 'string' && b.description.length <= 180 && typeof b.image === 'string' && b.image.length <= 2048 && (!b.image || webUrl(b.image) || /^\/api\/images\/[\w-]+$/.test(b.image)) && typeof b.newTab === 'boolean';
  });
}
