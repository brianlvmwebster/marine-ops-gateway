import 'server-only';
import { betterAuth } from 'better-auth';
import { authOptions } from './auth-config.mjs';
let instance:ReturnType<typeof betterAuth>|undefined;
export function getAuth(){return instance ??= betterAuth(authOptions());}
