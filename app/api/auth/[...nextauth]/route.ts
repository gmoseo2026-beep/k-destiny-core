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
    // [SECURITY / H-2] provider 가 "검증했다"고 명시한 이메일만 User.email 에 저장한다.
    //
    // /api/user/claim-unlock 의 이메일 2차 경로는 "세션 이메일 = provider 가 검증한 이메일"을
    // 전제로 게스트 결제를 계정에 귀속시킨다. 그런데 기존 profile 콜백은 검증 플래그를 보지 않고
    // provider 가 준 문자열을 그대로 받아 썼다. 미인증 이메일을 그대로 신뢰하면, 공격자가
    // 피해자의 이메일을 자기 소셜 계정에 등록하는 것만으로 그 이메일로 결제한 게스트 주문을
    // 가져갈 수 있다(피해자는 게스트라 콩닥에 계정이 없어 AccountNotLinked 방어도 걸리지 않는다).
    //
    // 검증되지 않았으면 email 을 null 로 떨어뜨린다. 로그인 자체는 계속 되고, 이메일 2차 경로만
    // 비활성화된다(1차 kd_claim 쿠키 경로는 그대로 동작) — 의도한 fail-closed 다.
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
      profile(profile) {
        const account = profile.kakao_account;
        // 카카오는 미인증·무효 이메일을 내려줄 수 있다고 문서가 명시한다 → 두 플래그를 모두 본다.
        const verifiedEmail =
          account?.is_email_verified === true && account?.is_email_valid !== false
            ? account.email ?? null
            : null;

        return {
          id: profile.id.toString(),
          name: profile.kakao_account?.profile?.nickname,
          email: verifiedEmail,
          image: profile.kakao_account?.profile?.profile_image_url?.replace('http://', 'https://'),
        };
      },
    }),
    // 네이버는 이메일 인증 여부를 나타내는 플래그를 응답에 포함하지 않는다(네이버 계정 이메일은
    // 계정 소유 이메일 자체다). 플래그가 생기면 여기서도 동일하게 검사할 것.
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
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          // OIDC email_verified 클레임. 구글 계정은 Gmail 이 아닌 외부 주소로도 만들 수 있고,
          // 그 경우 false 가 내려올 수 있다.
          email: profile.email_verified ? profile.email : null,
          image: profile.picture,
        };
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
