import { SignUp } from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><div><a className="auth-brand" href="/">≋ MARINE OPS GATEWAY</a><h1>Create your account.</h1><p>Use your authorized email address to access this private gateway.</p><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" /></div></main>;}
