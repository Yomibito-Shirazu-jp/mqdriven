import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY（推奨）または SUPABASE_KEY を設定してください。');
    process.exit(1);
}

const userId = process.env.TARGET_USER_ID || process.argv[2];
if (!userId) {
    console.error('対象ユーザー ID を TARGET_USER_ID または第1引数で指定してください。');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setAdminById() {
    console.log(`ユーザーID ${userId} を管理者に設定中...\n`);

    try {
        const { data: users, error: searchError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .or(`id.eq.${userId},id.ilike.%${userId}%`);

        if (searchError) {
            console.error('❌ 検索エラー:', searchError.message);
            return;
        }

        if (!users || users.length === 0) {
            console.log('⚠️  該当するユーザーが見つかりません');
            return;
        }

        console.log(`${users.length}件のユーザーが見つかりました:\n`);

        for (const user of users) {
            console.log(`ID: ${user.id}`);
            console.log(`名前: ${user.name || '未設定'}`);
            console.log(`メール: ${user.email || '未設定'}`);
            console.log(`現在の役割: ${user.role || '未設定'}\n`);

            const { error: updateError } = await supabase.from('users').update({ role: 'admin' }).eq('id', user.id);

            if (updateError) {
                console.error(`❌ 更新エラー: ${updateError.message}`);
            } else {
                console.log('✅ 管理者に設定しました\n');
            }
        }
    } catch (err) {
        console.error('❌ 予期しないエラー:', err);
    }
}

setAdminById();
