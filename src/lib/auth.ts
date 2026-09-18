import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

let pendingAnonymousSession: Promise<User> | null = null;

const startAnonymousSession = async (): Promise<User> => {
  if (!supabase) {
    throw new Error('Supabaseの接続情報が設定されていません。');
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('匿名ユーザーを作成できませんでした。');
  }

  return data.user;
};

export const ensureAnonymousSession = (): Promise<User> => {
  if (!pendingAnonymousSession) {
    pendingAnonymousSession = startAnonymousSession().catch((error) => {
      pendingAnonymousSession = null;
      throw error;
    });
  }

  return pendingAnonymousSession;
};
