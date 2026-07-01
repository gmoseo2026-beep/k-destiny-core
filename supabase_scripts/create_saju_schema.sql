-- K-Destiny Saju IP Tables for Supabase

-- 1. K-Destiny 독자적 사주 해석 콘텐츠 딕셔너리 (우리의 지적 재산 IP)
CREATE TABLE IF NOT EXISTS public.saju_content_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 예: 'DAY_MASTER', 'ZODIAC', 'ELEMENT_LACK'
    sign_key TEXT NOT NULL, -- 예: 'WATER_YIN', 'WOOD_0'
    english_content TEXT NOT NULL,
    remedy_action TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- 빠른 매핑을 위한 복합 유니크 키 인덱스
    CONSTRAINT saju_dict_unique_key UNIQUE (category, sign_key)
);

-- 딕셔너리 RLS 설정: 누구나 읽을 수 있으나, 수정은 관리자만 가능
ALTER TABLE public.saju_content_dictionary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.saju_content_dictionary FOR SELECT USING (true);


-- 2. 유저 명식 데이터베이스 (재계산 방지 및 PII 보호 구역)
CREATE TABLE IF NOT EXISTS public.user_saju_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    birth_hash TEXT, -- 생년월일시 해싱 값 (선택적)
    gender TEXT NOT NULL,
    four_pillars JSONB NOT NULL,
    day_master TEXT NOT NULL,
    elements_score JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 프로필 RLS 설정: 유저는 자신의 데이터만 읽고 쓸 수 있음
ALTER TABLE public.user_saju_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.user_saju_profile 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_saju_profile 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_saju_profile 
    FOR UPDATE USING (auth.uid() = user_id);
