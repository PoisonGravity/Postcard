import { useState, type FormEvent } from 'react';
import { defaultVerificationMethod, verificationMethods, verificationMode, type VerificationMethod } from '../config/auth';
import { authService } from '../services/authService';

type Props = { busy: boolean; run: (task: () => Promise<unknown>) => Promise<boolean> };

export function AuthForm({ busy, run }: Props) {
  const [register, setRegister] = useState(false);
  const [notice, setNotice] = useState('');
  const [method, setMethod] = useState<VerificationMethod | null>(defaultVerificationMethod());
  const [pending, setPending] = useState(false);
  const verificationEnabled = verificationMode !== 'off' && verificationMethods.length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get('name') || '');
    const email = String(values.get('email') || '');
    const phone = String(values.get('phone') || '');
    const password = String(values.get('password') || '');
    const identifier = method === 'phone' ? phone : email;
    await run(async () => {
      if (!register) return authService.login(email, password);
      if (verificationEnabled && method) {
        await (method === 'phone' ? authService.requestPhoneCode(phone, name) : authService.requestEmailCode(email, name));
        setPending(true);
        setNotice(`验证码已发送到${method === 'phone' ? '手机' : '邮箱'}，请输入后完成注册。`);
        return;
      }
      const result = await authService.registerEmail(email, password, name);
      if (result.verificationRequired) setNotice('当前 Supabase 项目仍要求邮箱确认，请在 Auth 设置中关闭 Confirm email。');
    });
    void identifier;
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const identifier = method === 'phone' ? String(values.get('phone') || '') : String(values.get('email') || '');
    const name = String(values.get('name') || '');
    const token = String(values.get('token') || '');
    await run(async () => authService.verifyCode(identifier, token, method!));
    setPending(false);
    setNotice('验证成功，欢迎进入你的邮局。');
    void name;
  }

  const toggleMode = () => { setRegister(value => !value); setPending(false); setNotice(''); };
  if (pending && method) return <form className="panel auth" onSubmit={verify}>
    <h2>输入验证码</h2><p>{method === 'phone' ? '短信验证码' : '邮箱验证码'}已发送，请输入 6 位验证码。</p>
    <label>{method === 'phone' ? '手机号' : '邮箱'}<input name={method === 'phone' ? 'phone' : 'email'} type={method === 'phone' ? 'tel' : 'email'} required /></label>
    <label>验证码<input name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></label>
    <button disabled={busy}>{busy ? '验证中…' : '完成验证'}</button>
    <button type="button" className="secondary" disabled={busy} onClick={() => { const form = document.querySelector<HTMLFormElement>('form.auth'); if (!form) return; const data = new FormData(form); void run(() => authService.resendCode(String(data.get(method === 'phone' ? 'phone' : 'email') || ''), String(data.get('name') || ''), method!)); }}>重新发送</button>
    <p role="status">{notice}</p>
  </form>;

  return <form className="panel auth" onSubmit={submit}>
    <h2>{register ? '创建你的邮局' : '欢迎回到邮笺'}</h2><p>把一段风景，寄给想念的人。</p>
    {register && <label>昵称<input name="name" required maxLength={40} /></label>}
    {register && verificationEnabled && <div className="auth-methods"><small>启用验证时优先使用手机：</small>{verificationMethods.map(item => <button type="button" className={method === item ? '' : 'secondary'} key={item} onClick={() => setMethod(item)}>{item === 'phone' ? '手机验证码' : '邮箱验证码'}</button>)}</div>}
    {register && method === 'phone' && verificationEnabled ? <label>手机号<input name="phone" type="tel" autoComplete="tel" required placeholder="+86 13800000000" /></label> : <label>邮箱<input name="email" type="email" autoComplete="email" required /></label>}
    {!verificationEnabled || !register ? <label>密码<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required /></label> : null}
    <button disabled={busy}>{busy ? '处理中…' : register && verificationEnabled ? '发送验证码' : register ? '注册' : '登录'}</button>
    <button type="button" className="secondary" onClick={toggleMode}>{register ? '已有账号，去登录' : '没有账号，去注册'}</button><p role="status">{notice}</p>
  </form>;
}
