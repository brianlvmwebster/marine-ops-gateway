import postgres from 'postgres';
// Deliberate operator bootstrap: never accept an HTTP request or infer from users.role.
const id=Number(process.argv[2]);
if(!process.env.DATABASE_URL || !Number.isSafeInteger(id) || id<=0)
  throw new Error('Usage: DATABASE_URL=<standalone database> node scripts/platform-operator.mjs <existing user id>');
const sql=postgres(process.env.DATABASE_URL,{max:1});
try {
  await sql.begin(async tx=>{
    const users=await tx`select id from users where id=${id}`;
    if(users.length!==1)throw new Error('User does not exist.');
    await tx`insert into platform_operators(user_id) values(${id}) on conflict do nothing`;
    await tx`insert into platform_audit(actor_user_id,action,detail) values(${id},'operator.bootstrapped',${tx.json({source:'operator-cli'})})`;
  });
  console.log('Platform operator registered.');
}finally{await sql.end();}
