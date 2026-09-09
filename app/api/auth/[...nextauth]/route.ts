import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.kakao_account?.profile?.nickname,
          email: profile.kakao_account?.email,
          image: profile.kakao_account?.profile?.profile_image_url?.replace('http://', 'https://'),
        };
      },
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID || '',
      clientSecret: process.env.NAVER_CLIENT_SECRET || '',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      const userId = (token.id as string) || (token.sub as string);

      if (userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true, tier: true, premiumEndDate: true, email: true, name: true, image: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          if (dbUser.email) token.email = dbUser.email;
          if (dbUser.name) token.name = dbUser.name;
          if (dbUser.image) token.picture = dbUser.image;

          const expired =
            dbUser.tier === 'PREMIUM' &&
            dbUser.premiumEndDate !== null &&
            dbUser.premiumEndDate <= new Date();
          token.tier = expired ? 'FREE' : dbUser.tier;
        } else {
          // [SECURITY / H-8] 탈퇴·삭제된 사용자의 토큰을 즉시 무효화한다.
          //
          // 세션 전략이 jwt 라 Session 행 Cascade 삭제로는 세션이 끊기지 않는다. else 분기가
          // 없으면 토큰이 마지막 id/role/tier 를 그대로 유지한 채 만료(기본 30일)까지 살아남는다.
          // delete 라우트가 ADMIN 삭제를 막기 때문에 운영상 "강등 후 삭제"가 유일한 정상 절차인데,
          // 그 사이 대상이 요청을 보내지 않으면 role='ADMIN' 인 채로 동결되고 DB 에 행이 없어
          // 다시 강등할 수단조차 없다. 정상 절차를 따를수록 재현되는 경로다.
          //
          // id 를 지우면 session 콜백이 session.user.id 를 '' 로 만들고, 모든 라우트의
          // `session?.user?.id` 가드가 401 로 떨어진다(getAdminSessionOrThrow 포함).
          delete token.id;
          delete token.role;
          delete token.tier;
          token.sub = undefined;
        }
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, tier: true, premiumEndDate: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          const expired =
            dbUser.tier === 'PREMIUM' &&
            dbUser.premiumEndDate !== null &&
            dbUser.premiumEndDate <= new Date();
          token.tier = expired ? 'FREE' : dbUser.tier;
        } else {
          // [SECURITY / H-8] 이메일로도 사용자를 못 찾으면 탈퇴한 계정이다 → 토큰 무효화.
          delete token.id;
          delete token.role;
          delete token.tier;
          token.sub = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = ((token.id as string) || (token.sub as string)) || '';
        session.user.role = token.role as string;
        session.user.tier = token.tier as string;
        // Explicitly pass email & name from JWT to prevent loss
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name;
        if (token.picture) session.user.image = token.picture;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
