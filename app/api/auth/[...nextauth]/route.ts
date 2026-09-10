import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import type { JWT } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? null;

/**
 * [SECURITY / H-8, M-3] 삭제된 사용자의 JWT 를 완전히 무효화한다.
 *
 * 세션 전략이 jwt 라 Session 행 Cascade 삭제로는 세션이 끊기지 않는다. 식별자를 하나라도
 * 남기면 jwt 콜백의 재조회 분기가 그 값으로 사용자를 다시 찾아내 토큰이 되살아난다.
 */
function invalidateToken(token: JWT) {
  delete token.id;
  delete token.role;
  delete token.tier;
  delete token.name;
  delete token.picture;
  token.email = undefined;
  token.sub = undefined;
}

/**
 * [SECURITY / M-1] User.email 을 항상 소문자로 저장하고, 조회도 소문자로 맞춘다.
 *
 * Postgres 의 유니크 인덱스는 대소문자를 구분하므로 `a@x.com` 과 `A@x.com` 이 공존할 수 있었다.
 * register 라우트는 toLowerCase 하지만 OAuth 생성 경로는 provider 원문을 그대로 저장했기 때문에,
 * next-auth 의 AccountNotLinked 방어(getUserByEmail = 대소문자 구분 정확 일치)는 케이스만 바꿔도
 * 우회됐다. 반면 결제 주문 매칭은 대소문자를 무시하므로, 이 비대칭이 그대로 결제 탈취 경로의
 * 증폭기가 된다.
 *
 * getUserByEmail 은 소문자로 먼저 찾고, 못 찾으면 원문으로 한 번 더 본다. 이 패치 이전에
 * 대소문자가 섞인 채 저장된 기존 계정이 중복 생성되지 않도록 하는 하위 호환 경로다.
 */
const baseAdapter = PrismaAdapter(prisma);

const normalizedAdapter: Adapter = {
  ...baseAdapter,
  createUser: (data: Omit<AdapterUser, 'id'>) =>
    baseAdapter.createUser!({ ...data, email: normalizeEmail(data.email) as string }),
  getUserByEmail: async (email) => {
    const lowered = normalizeEmail(email);
    const byLower = lowered ? await baseAdapter.getUserByEmail!(lowered) : null;
    if (byLower || lowered === email) return byLower;
    return baseAdapter.getUserByEmail!(email);
  },
};

export const authOptions: NextAuthOptions = {
  adapter: normalizedAdapter,
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

        // [SECURITY / M-1] register 는 소문자로 저장한다 → 조회도 소문자로 맞춘다.
        const user = await prisma.user.findUnique({
          where: { email: normalizeEmail(credentials.email) ?? credentials.email },
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
          //
          // [SECURITY / M-3] email 도 반드시 함께 지운다.
          //
          // 예전에는 id/role/tier/sub 만 지웠다. 그러면 다음 요청에서 userId 가 falsy 라
          // 아래 `else if (token.email)` 분기로 내려가 **이메일로 사용자를 다시 조회**한다.
          // 삭제된 계정과 같은 이메일로 누군가 새로 가입하면(register 는 이메일 미검증,
          // OAuth 도 가능) 탈퇴자의 낡은 JWT 가 신규 계정의 userId/role 로 되살아나
          // 계정 탈취가 성립했다. 토큰에서 식별자를 전부 걷어내야 무효화가 완결된다.
          invalidateToken(token);
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
          invalidateToken(token);
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
