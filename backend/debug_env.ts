import { load } from '@std/dotenv';
await load({ export: true });
console.log('SHARED_SECRET:', Deno.env.get('SHARED_SECRET'));
console.log('JWT_SECRET:', Deno.env.get('JWT_SECRET'));
