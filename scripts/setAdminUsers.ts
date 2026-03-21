import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY（推奨）または SUPABASE_KEY を設定してください。');
    process.exit(1);
}

const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

if (adminEmails.length === 0) {
    console.error('ADMIN_EMAILS にカンマ区切りでメールアドレスを設定してください（例: a@x.jp,b@x.jp）。');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setAdminUsers() {
    console.log('管理者権限を設定中...\n');

    for (const email of adminEmails) {
        try {
            const { data, error } = await supabase.from('users').update({ role: 'admin' }).eq('email', email).select();

            if (error) {
                console.error(`❌ ${email}: エラー - ${error.message}`);
            } else if (data && data.length > 0) {
                console.log(`✅ ${email}: 管理者に設定しました`);
            } else {
                console.log(`⚠️  ${email}: ユーザーが見つかりません`);
            }
        } catch (err) {
            console.error(`❌ ${email}: 予期しないエラー -`, err);
        }
    }

    console.log('\n完了しました。');
}

setAdminUsers();
