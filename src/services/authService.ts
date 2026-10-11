import { db } from './client';
export const authService = {
  async login(email:string,password:string) { const {error}=await db().auth.signInWithPassword({email,password}); if(error) throw error; },
  async register(email:string,password:string,name:string) { const {data,error}=await db().auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:location.origin}}); if(error) throw error; return Boolean(data.session); },
  async logout() { const {error}=await db().auth.signOut(); if(error) throw error; }
};

