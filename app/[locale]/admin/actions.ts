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
  } catch (error: any) {
    console.error('Failed to update user role:', error);
    return { success: false, error: error.message || 'Failed to update role' };
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
  } catch (error: any) {
    console.error('Failed to update subscription tier:', error);
    return { success: false, error: error.message || 'Failed to update subscription tier' };
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
  } catch (error: any) {
    console.error('Failed to update usage tokens:', error);
    return { success: false, error: error.message || 'Failed to update usage tokens' };
  }
}

