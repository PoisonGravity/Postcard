import { db } from './client';
import type { Friendship, Profile } from '../models/types';
export const friendService = {
 async list() {const {data,error}=await db().from('friendships').select('*'); if(error) throw error; return data as Friendship[];},
 async profile(id:string) {const {data,error}=await db().from('profiles').select('id,display_name,city').eq('id',id).single(); if(error) throw error; return data as Profile;},
 async request(id:string) {const {error}=await db().rpc('request_friend',{target_id:id}); if(error) throw error;},
 async accept(id:string) {const {error}=await db().rpc('accept_friend',{friendship_id:id}); if(error) throw error;}
};

