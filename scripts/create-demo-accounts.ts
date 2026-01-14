/**
 * Demo Account Creation Script
 * 
 * This script creates demo accounts for testing purposes.
 * Run with: npx ts-node scripts/create-demo-accounts.ts
 * 
 * Or use the API directly:
 * curl -X POST https://elearning-api.atsunari-coda.workers.dev/v1/auth/register \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"student@demo.example.com","password":"Demo1234!","name":"学習太郎"}'
 */

const API_URL = 'https://elearning-api.atsunari-coda.workers.dev';

interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  description: string;
}

const demoAccounts: DemoAccount[] = [
  {
    email: 'student@demo.example.com',
    password: 'Demo1234!',
    name: '学習太郎',
    role: 'student',
    description: '受講生（生徒）アカウント - コースの閲覧、購入、学習が可能',
  },
  {
    email: 'instructor@demo.example.com',
    password: 'Demo1234!',
    name: '講師花子',
    role: 'instructor',
    description: '講師アカウント - コース作成、収益管理、生徒管理が可能',
  },
  {
    email: 'admin@demo.example.com',
    password: 'Demo1234!',
    name: '管理次郎',
    role: 'admin',
    description: '管理者アカウント - ユーザー管理、コース承認が可能',
  },
];

async function createAccount(account: DemoAccount): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: account.email,
        password: account.password,
        name: account.name,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Created: ${account.email} (${account.role})`);
    } else {
      console.log(`⚠️ ${account.email}: ${data.error?.message || 'Already exists or error'}`);
    }
  } catch (error) {
    console.error(`❌ Failed to create ${account.email}:`, error);
  }
}

async function main() {
  console.log('🚀 Creating demo accounts...\n');
  
  for (const account of demoAccounts) {
    await createAccount(account);
  }
  
  console.log('\n📋 Demo Account Summary:');
  console.log('========================\n');
  
  for (const account of demoAccounts) {
    console.log(`【${account.role.toUpperCase()}】`);
    console.log(`  メール: ${account.email}`);
    console.log(`  パスワード: ${account.password}`);
    console.log(`  説明: ${account.description}`);
    console.log('');
  }
}

main();
