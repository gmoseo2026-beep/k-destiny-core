'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role, SubscriptionTier } from '@prisma/client';
import { getAdminSessionOrThrow, logAdminAction } from '@/lib/adminAuth';

export async function updateUserRole(userId: string, role: Role) {
  try {
    const admin = await getAdminSessionOrThrow();
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    await logAdminAction({
      adminUserId: admin.id,
      action: "ROLE_CHANGE",
      targetType: "USER",
      targetId: userId,
      detail: { role },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update user role:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update role';
    return { success: false, error: msg };
  }
}

export async function updateSubscriptionTier(userId: string, tier: SubscriptionTier) {
  try {
    const admin = await getAdminSessionOrThrow();
    await prisma.user.update({
      where: { id: userId },
      data: { tier },
    });
    await logAdminAction({
      adminUserId: admin.id,
      action: "TIER_CHANGE",
      targetType: "USER",
      targetId: userId,
      detail: { tier },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update subscription tier:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update subscription tier';
    return { success: false, error: msg };
  }
}

export async function updateUsageTokens(userId: string, tokens: number) {
  try {
    await getAdminSessionOrThrow();
    await prisma.user.update({
      where: { id: userId },
      data: { usageTokens: tokens },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to update usage tokens:', error);
    const msg = error instanceof Error ? error.message : 'Failed to update usage tokens';
    return { success: false, error: msg };
  }
}


// A3: 게스트 열람 링크는 열람권 그 자체라서, 서버가 감사 로그를 남긴 뒤에만 링크를 돌려준다
export async function issueGuestViewLink(orderId: string) {
  try {
    const admin = await getAdminSessionOrThrow();
    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { orderId: true, userId: true },
    });
    if (!order) return { success: false, error: '주문을 찾을 수 없습니다.' };
    if (order.userId) return { success: false, error: '회원 주문은 보관함에서 열람합니다.' };
    await logAdminAction({
      adminUserId: admin.id,
      action: "GUEST_LINK_COPY",
      targetType: "ORDER",
      targetId: orderId,
    });
    return { success: true, link: `https://kongdak.kr/ko/pay/complete?paymentId=${order.orderId}` };
  } catch (error: unknown) {
    console.error('Failed to issue guest view link:', error);
    return { success: false, error: '링크 발급에 실패했습니다.' };
  }
}
