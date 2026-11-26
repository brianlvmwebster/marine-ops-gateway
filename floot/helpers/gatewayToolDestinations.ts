export const gatewayOnlyTools = ['dock-scheduler', 'mapping'] as const;

export function isGatewayOnlyTool(key: string) {
  return gatewayOnlyTools.some(tool => tool === key);
}
