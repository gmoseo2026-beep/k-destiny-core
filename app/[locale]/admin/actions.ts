'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Role, SubscriptionTier } from '@prisma/client';

export async function updateUserRole(userId: string, role: Role) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to update user role:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

export async function updateSubscriptionTier(userId: string, tier: SubscriptionTier) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { tier },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to update subscription tier:', error);
    return { success: false, error: 'Failed to update subscription tier' };
  }
}

export async function updateUsageTokens(userId: string, tokens: number) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { usageTokens: tokens },
    });
    revalidatePath('/[locale]/admin', 'page');
    return { success: true };
  } catch (error) {
    console.error('Failed to update usage tokens:', error);
    return { success: false, error: 'Failed to update usage tokens' };
  }
}
