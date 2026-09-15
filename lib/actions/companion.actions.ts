'use server';

import {auth} from "@clerk/nextjs/server";
import {createSupabaseClient} from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { subjects } from "@/constants";
import { companionFormSchema } from "@/lib/validations/companion";

type Auth = Awaited<ReturnType<typeof auth>>;

// Resolves the caller's companion cap from their Clerk plan/features and
// compares it against the companions they already own.
const hasCompanionCapacity = async (userId: string, has: Auth['has']) => {
    if(has({ plan: 'pro' })) return true;

    const limit = has({ feature: "10_active_companions" }) ? 10
        : has({ feature: "3_active_companions" }) ? 3
        : 0;
    if(limit === 0) return false;

    const supabase = createSupabaseClient();
    const { count, error } = await supabase
        .from('companions')
        .select('id', { count: 'exact', head: true })
        .eq('author', userId)

    if(error) throw new Error(error.message);

    return (count ?? 0) < limit;
}

// Errors thrown from a server action are redacted in production, so expected
// failures are returned as values the form can show.
export const createCompanion = async (formData: unknown): Promise<CreateCompanionResult> => {
    const { userId: author, has } = await auth();
    if(!author) return { ok: false, error: 'You must be signed in to create a companion.' };

    const parsed = companionFormSchema.safeParse(formData);
    if(!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid companion details.' };
    }

    if(!(await hasCompanionCapacity(author, has))) {
        return { ok: false, error: 'You have reached your companion limit. Upgrade your plan to create more.' };
    }

    const supabase = createSupabaseClient();

    const { data, error } = await supabase
        .from('companions')
        .insert({ ...parsed.data, author })
        .select()
        .single();

    if(error || !data) {
        console.error('Failed to create a companion', error);
        return { ok: false, error: 'Failed to create a companion. Please try again.' };
    }

    revalidatePath('/');
    revalidatePath('/companions');
    revalidatePath('/my-journey');

    return { ok: true, companion: data as Companion };
}

const MAX_SEARCH_LENGTH = 100;

// Search params may repeat (?topic=a&topic=b); only the first value is used.
const firstParam = (value?: string | string[]) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

// `.or()` takes a raw PostgREST filter string, where `,` `(` `)` separate
// clauses. Double-quoting the value keeps user input inside a single clause.
const quoteFilterValue = (value: string) =>
    `"${value.slice(0, MAX_SEARCH_LENGTH).replace(/[\\"]/g, '\\$&')}"`;

export const getAllCompanions = async ({ limit = 10, page = 1, subject, topic }: GetAllCompanions) => {
    const supabase = createSupabaseClient();

    let query = supabase.from('companions').select();

    const subjectFilter = firstParam(subject);
    if(subjectFilter) {
        if(!(subjects as readonly string[]).includes(subjectFilter)) return [];
        query = query.eq('subject', subjectFilter);
    }

    const topicFilter = firstParam(topic);
    if(topicFilter) {
        const pattern = quoteFilterValue(`%${topicFilter}%`);
        query = query.or(`topic.ilike.${pattern},name.ilike.${pattern}`);
    }

    query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

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

    return hasCompanionCapacity(userId, has);
}
