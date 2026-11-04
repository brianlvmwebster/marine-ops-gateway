import { SignIn } from '@clerk/nextjs';
export default function Page(){return <main className="auth-page"><div><a className="auth-brand" href="/">≋ MARINE OPS GATEWAY</a><h1>Your operations, connected.</h1><p>Sign in with your authorized email address.</p><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" /></div></main>;}
