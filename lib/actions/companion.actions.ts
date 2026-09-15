'use server';

import {auth} from "@clerk/nextjs/server";
import {createSupabaseClient} from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export const createCompanion = async (formData: CreateCompanion) => {
    const { userId: author } = await auth();
    if(!author) throw new Error('You must be signed in to create a companion');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .insert({...formData, author })
        .select();

    if(error || !data?.[0]) throw new Error(error?.message || 'Failed to create a companion');

    revalidatePath('/');
    revalidatePath('/companions');
    revalidatePath('/my-journey');

    return data[0];
}

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient();

    let query = supabase.from('companions').select();

    if(subject && topic) {
        query = query.ilike('subject', `%${subject}%`)
            .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    } else if(subject) {
        query = query.ilike('subject', `%${subject}%`)
    } else if(topic) {
        query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`)
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: companions, error } = await query;

    if(error) throw new Error(error.message);

    return (companions ?? []) as Companion[];
}

export const getCompanion = async (id:string): Promise<Companion | null> => {
    const supabase = createSupabaseClient();
    const {data, error} = await supabase
        .from('companions')
        .select()
        .eq('id', id)
        .maybeSingle();

    // A malformed id (not a uuid) is a "not found", not a server failure.
    if(error?.code === '22P02') return null;
    if(error) throw new Error(error.message);

    return (data as Companion | null);
}

export const addToSessionHistory = async (companionId: string) => {
    const {userId} = await auth();
    if(!userId) throw new Error('You must be signed in to record a session');

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
    .from('session_history')
    .insert({companion_id: companionId, user_id: userId})
    .select();

    if(error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/my-journey');

    return data;
}

// session_history holds one row per lesson, so the same companion comes back
// once per session it was used in. The UI lists companions, not sessions, so
// collapse repeats — otherwise React sees duplicate keys.
const dedupeCompanions = (rows: { companions: unknown }[], limit: number) => {
    const seen = new Set<string>();
    const companions: Companion[] = [];

    for (const { companions: companion } of rows) {
        const entry = companion as Companion | null;
        if (!entry?.id || seen.has(entry.id)) continue;

        seen.add(entry.id);
        companions.push(entry);

        if (companions.length === limit) break;
    }

    return companions;
}

// Over-fetch so that collapsing repeats can still fill `limit` distinct companions.
const SESSION_FETCH_MULTIPLIER = 4;

export const getRecentSessions = async (limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .order('created_at', { ascending: false })
        .limit(limit * SESSION_FETCH_MULTIPLIER)

    if(error) throw new Error(error.message);

    return dedupeCompanions(data ?? [], limit);
}

export const getUserSessions = async (userId: string, limit = 10) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('session_history')
        .select(`companions:companion_id (*)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit * SESSION_FETCH_MULTIPLIER)

    if(error) throw new Error(error.message);

    return dedupeCompanions(data ?? [], limit);
}

// The session list is capped and de-duplicated, so it cannot be used to count
// lessons; ask the database for the real total instead.
export const getUserSessionCount = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { count, error } = await supabase
        .from('session_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

    if(error) throw new Error(error.message);

    return count ?? 0;
}

export const getUserCompanions = async (userId: string) => {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
        .from('companions')
        .select()
        .eq('author', userId)

    if(error) throw new Error(error.message);

    return (data ?? []) as Companion[];
}

export const newCompanionPermissions = async () => {
    const { userId, has } = await auth();
    if(!userId) return false;

    const supabase = createSupabaseClient();

    let limit = 0;

    if(has({ plan: 'pro' })) {
        return true;
    } else if(has({ feature: "10_active_companions" })) {
        limit = 10;
    } else if(has({ feature: "3_active_companions" })) {
        limit = 3;
    }

    const { count, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact', head: true })
        .eq('author', userId)

    if(error) throw new Error(error.message);

    return (count ?? 0) < limit;
}
