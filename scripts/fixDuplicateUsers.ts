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
    console.error('ADMIN_EMAILS にカンマ区切りでメールアドレスを設定してください。');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixDuplicateUsers() {
    console.log('重複ユーザーを確認して管理者権限を設定中...\n');

    for (const email of adminEmails) {
        try {
            const { data: users, error: fetchError } = await supabase
                .from('users')
                .select('id, name, email, role, created_at')
                .eq('email', email)
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error(`❌ ${email}: エラー - ${fetchError.message}`);
                continue;
            }

            if (!users || users.length === 0) {
                console.log(`⚠️  ${email}: ユーザーが見つかりません`);
                continue;
            }

            console.log(`📧 ${email}: ${users.length}件のレコードが見つかりました`);

            for (const user of users) {
                const { error: updateError } = await supabase.from('users').update({ role: 'admin' }).eq('id', user.id);

                if (updateError) {
                    console.error(`  ❌ ID ${user.id}: 更新エラー - ${updateError.message}`);
                } else {
                    console.log(`  ✅ ID ${user.id} (${user.name}): 管理者に設定しました`);
                }
            }

            console.log('');
        } catch (err) {
            console.error(`❌ ${email}: 予期しないエラー -`, err);
        }
    }

    console.log('完了しました。');
}

fixDuplicateUsers();
