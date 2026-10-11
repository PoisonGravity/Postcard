import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { client } from '../services/client';
import { friendService } from '../services/friendService';
import { postcardService } from '../services/postcardService';
import type { Friendship, Postcard, Profile } from '../models/types';
export function usePostcardController() {
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [friends,setFriends]=useState<Friendship[]>([]),[cards,setCards]=useState<Postcard[]>([]),[profiles,setProfiles]=useState<Record<string,Profile>>({});
 async function refresh() {
  const [fs,cs]=await Promise.all([friendService.list(),postcardService.list()]);
  const ids=new Set([...fs.flatMap(f=>[f.requester_id,f.addressee_id]),...cs.flatMap(c=>[c.sender_id,c.recipient_id])]);
  const entries=await Promise.all([...ids].map(async id=>[id,await friendService.profile(id)] as const));
  setProfiles(Object.fromEntries(entries)); setFriends(fs); setCards(cs);
 }
 useEffect(()=>{if(!client){setLoading(false);return;} const {data}=client.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setLoading(false);}); client.auth.getSession().then(({data,error})=>{if(error)setError(error.message);setUser(data.session?.user??null);setLoading(false)}); return ()=>data.subscription.unsubscribe();},[]);
 useEffect(()=>{if(!user){setFriends([]);setCards([]);setProfiles({});return;} let active=true;refresh().catch(e=>{if(active)setError(e.message)});const timer=setInterval(()=>refresh().catch(()=>{}),30000);return ()=>{active=false;clearInterval(timer)}},[user?.id]);
 async function run(action:()=>Promise<unknown>) {setBusy(true);setError('');try{await action();if(user)await refresh();return true;}catch(e){setError(e instanceof Error?e.message:'操作失败');return false;}finally{setBusy(false)}}
 return {user,loading,busy,error,friends,cards,profiles,run};
}

