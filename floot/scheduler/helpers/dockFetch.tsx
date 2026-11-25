export async function dockFetch(input: string, init: RequestInit = {}) {
  const url = new URL(input, window.location.origin);
  if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) throw new Error('Unexpected scheduler endpoint.');
  const method = (init.method || 'GET').toUpperCase();
  const action = method === 'DELETE' ? 'delete' : method === 'PUT' ? 'edit' : null;
  if (action) url.searchParams.set('_action', action);
  const response=await fetch('/_api/dock/' + url.pathname.slice(5) + url.search, { ...init, method: action ? 'POST' : method });
  if(response.status===401){window.top!.location.href='/login?next='+encodeURIComponent('/dockscheduler');throw new Error('Sign in to Marine Ops.');}
  return response;
}

