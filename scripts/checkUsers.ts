import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('環境変数 SUPABASE_URL と SUPABASE_KEY（または SUPABASE_SERVICE_ROLE_KEY）を設定してください。');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUsers() {
    console.log('ユーザー情報を確認中...\n');

    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('エラー:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('ユーザーが見つかりません');
        return;
    }

    console.table(data);
}

checkUsers().catch(console.error);
