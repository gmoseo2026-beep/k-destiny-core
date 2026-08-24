import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  const args = process.argv.slice(2);
  const isConfirm = args.includes('--confirm');

  console.log('--- 콩닥 테스트 계정 정리 스크립트 ---');
  if (!isConfirm) {
    console.log('⚠️ [DRY-RUN 모드] 실제 데이터는 삭제되지 않습니다.');
    console.log('실제로 삭제하려면 스크립트 뒤에 --confirm 을 붙여 실행하세요.\n');
  } else {
    console.log('🚨 [실행 모드] 데이터를 실제로 삭제합니다!\n');
  }

  // 이메일이 없는 유저만 찾기
  const usersToDelete = await prisma.user.findMany({
    where: {
      role: {
        not: 'ADMIN'
      },
      email: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    }
  });

  console.log(`총 ${usersToDelete.length}개의 테스트 계정이 발견되었습니다.`);
  usersToDelete.forEach((user, index) => {
    console.log(`  ${index + 1}. [${user.role}] ${user.name || '이름없음'} (${user.email || '이메일없음'}) - ID: ${user.id}`);
  });

  if (usersToDelete.length === 0) {
    console.log('\n삭제할 테스트 계정이 없습니다.');
    return;
  }

  if (!isConfirm) {
    console.log('\n실제로 삭제하시려면 다음 명령어를 실행하세요:');
    console.log('npx tsx scripts/cleanup_test_users.ts --confirm');
    return;
  }

  console.log('\n삭제를 진행합니다...');
  
  const userIds = usersToDelete.map(u => u.id);

  try {
    // 1. Compatibility 삭제 (onDelete: Cascade 설정이 없으므로 수동 삭제)
    const compatResult = await prisma.compatibility.deleteMany({
      where: {
        userId: {
          in: userIds
        }
      }
    });
    console.log(`- Compatibility 데이터 삭제 완료: ${compatResult.count}건`);

    // 2. User 삭제 (Account, Session, UserSajuProfile, PurchasedReport 등은 schema에 설정된 Cascade로 인해 자동 삭제됨)
    const userResult = await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds
        }
      }
    });
    console.log(`- User 데이터 (및 연결된 종속 데이터) 삭제 완료: ${userResult.count}건`);

    console.log('\n✅ 테스트 계정 정리가 완료되었습니다. 현재 관리자(ADMIN) 계정만 남았습니다.');
  } catch (error) {
    console.error('\n❌ 삭제 중 오류가 발생했습니다:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
