import "./loadEnv.js";
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('_api/auth/microsoft_integrations_authorize',async c => {
  try {
    const { handle } = await import("./endpoints/auth/microsoft_integrations_authorize_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/auth/microsoft_integrations_callback',async c => {
  try {
    const { handle } = await import("./endpoints/auth/microsoft_integrations_callback_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/jobs',async c => {
  try {
    const { handle } = await import("./endpoints/jobs_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/jobs/save',async c => {
  try {
    const { handle } = await import("./endpoints/jobs/save_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/calendar/status',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/status_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/calendar/sync',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/sync_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/calendar/activate',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/activate_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/calendar/webhook',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/webhook_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/calendar/list',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/list_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/calendar/select',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/select_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/calendar/settings',async c => {
  try {
    const { handle } = await import("./endpoints/calendar/settings_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/imports/run',async c => {
  try {
    const { handle } = await import("./endpoints/imports/run_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/imports/status',async c => {
  try {
    const { handle } = await import("./endpoints/imports/status_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/imports/job',async c => {
  try {
    const { handle } = await import("./endpoints/imports/job_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/imports/resolve',async c => {
  try {
    const { handle } = await import("./endpoints/imports/resolve_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.get('_api/maps/status',async c => {
  try {
    const { handle } = await import("./endpoints/maps/status_GET.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/maps/autocomplete',async c => {
  try {
    const { handle } = await import("./endpoints/maps/autocomplete_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})
app.post('_api/maps/select',async c => {
  try {
    const { handle } = await import("./endpoints/maps/select_POST.js");
    let request = c.req.raw;
    const response = await handle(request);
    if (!(response instanceof Response) && response.constructor.name !== "Response") {
      return c.text("Invalid response format. handle should always return a Response object." + response.constructor.name, 500);
    }
    return response;
  } catch (e) {
    console.error(e);
    return c.text("Error loading endpoint code " + e.message,  500)
  }
})

// Workflow endpoints added after the initial Floot export.
app.post('/_api/jobs/workflow', async c => {
  const {handle}=await import('./endpoints/jobs/workflow_POST.js');
  return handle(c.req.raw);
});
app.get('/_api/assignments/list', async c => {
  const {handle}=await import('./endpoints/assignments/list_GET.js');
  return handle(c.req.raw);
});
app.post('/_api/assignments/save', async c => {
  const {handle}=await import('./endpoints/assignments/save_POST.js');
  return handle(c.req.raw);
});


app.post('/_api/gateway/dispatch',async c=>{const {handle}=await import('./endpoints/gateway/dispatch_POST.js');return handle(c.req.raw);});

// Personal dashboard and Service Admin review endpoints.
app.get('/_api/access/session',async c=>{const {handle}=await import('./endpoints/access/session_GET.js');return handle(c.req.raw);});
app.get('/_api/dashboard/preferences',async c=>{const {handle}=await import('./endpoints/dashboard/preferences_GET.js');return handle(c.req.raw);});
app.post('/_api/dashboard/preferences',async c=>{const {handle}=await import('./endpoints/dashboard/preferences_POST.js');return handle(c.req.raw);});
app.post('/_api/jobs/complete',async c=>{const {handle}=await import('./endpoints/jobs/complete_POST.js');return handle(c.req.raw);});


// Floot-native gateway and company login routes.
app.get('/_api/gateway/links',async c=>{const {handle}=await import('./endpoints/gateway/links_GET.js');return handle(c.req.raw);});
app.post('/_api/gateway/links',async c=>{const {handle}=await import('./endpoints/gateway/links_POST.js');return handle(c.req.raw);});
app.get('/_api/gateway/members',async c=>{const {handle}=await import('./endpoints/gateway/members_GET.js');return handle(c.req.raw);});
app.post('/_api/gateway/members',async c=>{const {handle}=await import('./endpoints/gateway/members_POST.js');return handle(c.req.raw);});
app.get('/_api/gateway/image',async c=>{const {handle}=await import('./endpoints/gateway/image_GET.js');return handle(c.req.raw);});
app.post('/_api/gateway/image_upload',async c=>{const {handle}=await import('./endpoints/gateway/image_upload_POST.js');return handle(c.req.raw);});
app.post('/_api/gateway/image_complete',async c=>{const {handle}=await import('./endpoints/gateway/image_complete_POST.js');return handle(c.req.raw);});
app.get('/_api/auth/session',async c=>{const {handle}=await import('./endpoints/auth/session_GET.js');return handle(c.req.raw);});
app.post('/_api/auth/logout',async c=>{const {handle}=await import('./endpoints/auth/logout_POST.js');return handle(c.req.raw);});
app.get('/_api/auth/microsoft_login_authorize',async c=>{const {handle}=await import('./endpoints/auth/microsoft_login_authorize_GET.js');return handle(c.req.raw);});
app.get('/_api/auth/microsoft_login_callback',async c=>{const {handle}=await import('./endpoints/auth/microsoft_login_callback_GET.js');return handle(c.req.raw);});
app.post('/_api/auth/microsoft_login_establish_session',async c=>{const {handle}=await import('./endpoints/auth/microsoft_login_establish_session_POST.js');return handle(c.req.raw);});

app.use("/*", serveStatic({ root: "./static" }));
app.use('/*', serveStatic({ root: './dist' }))
app.get("*", async (c, next) => {
  const p = c.req.path;
  if (p.startsWith("/_api")) {
    return next();
  }
  return serveStatic({ path: "./dist/index.html" })(c, next);
});
serve({ fetch: app.fetch, port: 3333 });
console.log("Running at http://localhost:3333")
      