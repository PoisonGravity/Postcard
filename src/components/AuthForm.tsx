import { useState } from 'react';
import { authService } from '../services/authService';
export function AuthForm({busy,run}:{busy:boolean;run:(f:()=>Promise<unknown>)=>Promise<boolean>}) {
 const [register,setRegister]=useState(false),[notice,setNotice]=useState('');
 return <form className="panel auth" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await run(async()=>{if(register){const logged=await authService.register(String(f.get('email')),String(f.get('password')),String(f.get('name')));if(!logged)setNotice('请检查邮箱，确认注册后再登录。');}else await authService.login(String(f.get('email')),String(f.get('password')));});}}>
  <h2>{register?'创建你的邮局':'欢迎回到邮笺'}</h2><p>把一段风景，寄给想念的人。</p>
  {register&&<label>昵称<input name="name" required maxLength={40}/></label>}
  <label>邮箱<input name="email" type="email" autoComplete="email" required/></label><label>密码<input name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={8} required/></label>
  <button disabled={busy}>{busy?'处理中…':register?'注册':'登录'}</button><button type="button" className="secondary" onClick={()=>setRegister(!register)}>{register?'已有账号，去登录':'没有账号，去注册'}</button><p role="status">{notice}</p>
 </form>;
}

