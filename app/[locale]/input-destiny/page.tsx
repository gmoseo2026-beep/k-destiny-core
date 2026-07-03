"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, User, Calendar, Clock, Loader2, HelpCircle, MapPin } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Country, City, State } from "country-state-city";
import { getLocalizedRegionName } from "@/lib/regionTranslations";
import { getProfile, saveProfile, clearLastResult, getMaster } from "@/lib/userStateManager";

// Shared input classes to avoid repetition
const INPUT_BASE = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all font-sans text-base shadow-inner";
const SELECT_BASE = `${INPUT_BASE} appearance-none`;
const SELECT_COMPACT = "w-full bg-black/40 border border-white/10 rounded-xl px-2 sm:px-4 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all font-sans text-base shadow-inner appearance-none";
const LABEL_BASE = "text-xs sm:text-sm font-sans font-medium text-gray-300 tracking-wide uppercase flex items-center gap-2";

function InputDestinyContent() {
  const router = useRouter();
  const t = useTranslations('InputDestiny');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const masterId = searchParams.get("masterId") || getMaster()?.toString() || "5";
  const isEditMode = searchParams.get("edit") === "true";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unknownTime, setUnknownTime] = useState(false);
  const [ready, setReady] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    year: "",
    month: "",
    day: "",
    time: "",
    country: "",
    city: "",
    gender: "",
  });

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const localizedCountries = useMemo(() => {
    const defaultCountries = Country.getAllCountries().map(c => ({ ...c, displayName: c.name }));
    if (!isMounted) return defaultCountries;

    try {
      const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
      return Country.getAllCountries().map(country => {
        let displayName = country.name;
        try {
          displayName = regionNames.of(country.isoCode) || country.name;
        } catch (e) {}
        return { ...country, displayName };
      }).sort((a, b) => a.displayName.localeCompare(b.displayName, locale));
    } catch (e) {
      return defaultCountries;
    }
  }, [locale, isMounted]);

  const [cities, setCities] = useState<{name: string, isoCode: string, displayName: string}[]>([]);

  const getRegions = (countryCode: string) => {
    const states = State.getStatesOfCountry(countryCode) || [];
    if (states.length === 0) {
      // Fallback: some tiny countries have no states, use cities instead
      const allCities = City.getCitiesOfCountry(countryCode) || [];
      const seen = new Set();
      return allCities.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      }).map(c => ({ name: c.name, isoCode: c.name, displayName: c.name }));
    }

    return states.map(s => ({
      name: s.name,
      isoCode: s.isoCode,
      displayName: getLocalizedRegionName(locale, countryCode, s.name),
    })).sort((a, b) => a.displayName.localeCompare(b.displayName, locale));
  };

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = getProfile();
    if (savedProfile) {
      if (!isEditMode) {
        // Profile already exists & not editing → skip to result
        setReady(true);
        router.push(`/result?masterId=${masterId}`);
        return;
      }
      // Pre-fill form with saved data
      setFormData({
        name: savedProfile.name,
        year: savedProfile.year,
        month: savedProfile.month,
        day: savedProfile.day,
        time: savedProfile.time,
        country: savedProfile.country,
        city: savedProfile.city,
        gender: savedProfile.gender,
      });
      setUnknownTime(savedProfile.unknownTime);
      // Load regions for saved country
      if (savedProfile.country) {
        const regions = getRegions(savedProfile.country);
        setCities(regions);
      }
    } else {
      // No profile → detect location via IP (HTTPS for production safety)
      const controller = new AbortController();
      fetch("https://ipapi.co/json/", { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data?.country_code) {
            const detectedCountry = data.country_code;
            const detectedRegionName = data.region || "";
            const detectedRegionCode = data.region_code || "";
            const newRegions = getRegions(detectedCountry);
            setCities(newRegions);
            const matched = newRegions.find(
              r => r.isoCode === detectedRegionCode || r.name === detectedRegionName
            );
            setFormData((prev) => ({
              ...prev,
              country: detectedCountry,
              city: matched ? matched.name : ""
            }));
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.log("Failed to detect IP location", err);
          }
        });
      return () => controller.abort();
    }
    setReady(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const newRegions = getRegions(countryCode);
    setCities(newRegions);
    setFormData((prev) => ({ ...prev, country: countryCode, city: "" }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Save profile to localStorage for persistence
    saveProfile({
      name: formData.name,
      year: formData.year,
      month: formData.month,
      day: formData.day,
      time: formData.time,
      unknownTime,
      country: formData.country,
      city: formData.city,
      gender: formData.gender,
    });

    // If editing, clear old result cache
    if (isEditMode) {
      clearLastResult();
    }

    // Save data to sessionStorage for the result page to use
    const submissionData = {
      ...formData,
      unknownTime,
      dob: `${formData.year}-${formData.month.padStart(2, '0')}-${formData.day.padStart(2, '0')}`,
      masterName: "Master K-Destiny",
      locale,
    };
    sessionStorage.setItem("destinyFormData", JSON.stringify(submissionData));
    
    // Simulate slight loading for the transition, then push to /result
    setTimeout(() => {
      router.push(`/result?masterId=${masterId}`); 
    }, 1500);
  };

  // Prepare year/month/day arrays
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => currentYear - i), [currentYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <main className="relative min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden">
      {/* Mystical Background - local SVG pattern instead of external URL */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-20 mix-blend-screen" />
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-8 sm:mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-sm font-sans tracking-widest text-gold/90 uppercase">
              {t('badge')}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 text-balance">
            <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              {t('headline')}
            </span>
          </h1>
          <p className="font-sans text-gray-400 text-sm sm:text-base text-balance">
            {t('description')}
          </p>
        </motion.div>

        {/* Glassmorphism Form Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)]"
        >
          {/* Loading State Overlay */}
          <AnimatePresence>
            {isSubmitting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 rounded-3xl bg-background/80 backdrop-blur-md flex flex-col items-center justify-center border border-gold/30"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="mb-6 relative"
                >
                  <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full" />
                  <Loader2 className="w-12 h-12 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                </motion.div>
                <h3 className="font-serif text-xl sm:text-2xl text-white font-bold mb-2">{t('loading_title')}</h3>
                <p className="font-sans text-sm text-gold/70 animate-pulse">{t('loading_desc')}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            
            {/* Name Field */}
            <div className="space-y-2">
              <label className={LABEL_BASE}>
                <User className="w-4 h-4 text-gold/70" />
                {t('label_name')}
              </label>
              <input
                type="text"
                name="name"
                required
                disabled={isSubmitting}
                value={formData.name}
                onChange={handleChange}
                placeholder={t('placeholder_name')}
                className={`${INPUT_BASE} placeholder-gray-600`}
              />
            </div>

            {/* Date of Birth Dropdowns */}
            <div className="space-y-2">
              <label className={LABEL_BASE}>
                <Calendar className="w-4 h-4 text-gold/70" />
                {t('label_dob')}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Year */}
                <div className="relative">
                  <select
                    name="year"
                    required
                    disabled={isSubmitting}
                    value={formData.year}
                    onChange={handleChange}
                    className={SELECT_COMPACT}
                  >
                    <option value="" disabled>{t('label_year')}</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                </div>
                {/* Month */}
                <div className="relative">
                  <select
                    name="month"
                    required
                    disabled={isSubmitting}
                    value={formData.month}
                    onChange={handleChange}
                    className={SELECT_COMPACT}
                  >
                    <option value="" disabled>{t('label_month')}</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                </div>
                {/* Day */}
                <div className="relative">
                  <select
                    name="day"
                    required
                    disabled={isSubmitting}
                    value={formData.day}
                    onChange={handleChange}
                    className={SELECT_COMPACT}
                  >
                    <option value="" disabled>{t('label_day')}</option>
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-xs">▼</div>
                </div>
              </div>
            </div>

            {/* Time of Birth */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className={LABEL_BASE}>
                  <Clock className="w-4 h-4 text-gold/70" />
                  {t('label_time')}
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      disabled={isSubmitting}
                      checked={unknownTime}
                      onChange={(e) => {
                        setUnknownTime(e.target.checked);
                        if (e.target.checked) setFormData((prev) => ({ ...prev, time: "" }));
                      }}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-gray-500 bg-transparent peer-checked:bg-gold peer-checked:border-gold transition-colors flex items-center justify-center">
                      <motion.div
                        initial={false}
                        animate={{ scale: unknownTime ? 1 : 0 }}
                        className="w-2 h-2 bg-black rounded-sm"
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">{t('unknown_time')}</span>
                </label>
              </div>
              <div className="relative">
                <select
                  name="time"
                  required={!unknownTime}
                  disabled={isSubmitting || unknownTime}
                  value={formData.time}
                  onChange={handleChange}
                  className={`${SELECT_BASE} placeholder-gray-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="" disabled>{t('time_placeholder')}</option>
                  <option value="00:00-01:30">00:00 - 01:30</option>
                  <option value="01:30-03:30">01:30 - 03:30</option>
                  <option value="03:30-05:30">03:30 - 05:30</option>
                  <option value="05:30-07:30">05:30 - 07:30</option>
                  <option value="07:30-09:30">07:30 - 09:30</option>
                  <option value="09:30-11:30">09:30 - 11:30</option>
                  <option value="11:30-13:30">11:30 - 13:30</option>
                  <option value="13:30-15:30">13:30 - 15:30</option>
                  <option value="15:30-17:30">15:30 - 17:30</option>
                  <option value="17:30-19:30">17:30 - 19:30</option>
                  <option value="19:30-21:30">19:30 - 21:30</option>
                  <option value="21:30-23:30">21:30 - 23:30</option>
                  <option value="23:30-24:00">23:30 - 24:00</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-sm">▼</div>
              </div>
            </div>

            {/* Birth Location (Country & City) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className={LABEL_BASE}>
                  <MapPin className="w-4 h-4 text-gold/70" />
                  {t('label_country')}
                </label>
                <div className="relative">
                  <select
                    name="country"
                    required
                    disabled={isSubmitting}
                    value={formData.country}
                    onChange={handleCountryChange}
                    className={SELECT_BASE}
                  >
                    <option value="" disabled>{t('placeholder_country')}</option>
                    {localizedCountries.map(country => (
                      <option key={country.isoCode} value={country.isoCode}>
                        {country.displayName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-sm">▼</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={LABEL_BASE}>
                  <MapPin className="w-4 h-4 text-gold/70" />
                  {t('label_city')}
                </label>
                <div className="relative">
                  <select
                    name="city"
                    required
                    disabled={isSubmitting || !formData.country || !cities?.length}
                    value={formData.city}
                    onChange={handleChange}
                    className={`${SELECT_BASE} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="" disabled>
                      {!formData.country 
                        ? t('placeholder_country') 
                        : (!cities?.length ? "No cities found" : t('placeholder_city'))}
                    </option>
                    {cities?.map((city, idx) => (
                      <option key={`${city.name}-${idx}`} value={city.name}>
                        {city.displayName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gold/50 text-sm">▼</div>
                </div>
              </div>
            </div>

            {/* Gender Toggle */}
            <div className="space-y-2">
              <label className={LABEL_BASE}>
                <HelpCircle className="w-4 h-4 text-gold/70" />
                {t('gender_label')}
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {(["Male", "Female"] as const).map((g) => {
                  const labelStr = g === "Male" ? t('gender_male') : t('gender_female');
                  const isSelected = formData.gender === g;
                  return (
                    <label
                      key={g}
                      className={`relative flex items-center justify-center p-3 sm:p-4 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-gold/10 border-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                          : "bg-black/40 border-white/10 hover:border-white/20"
                      } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={isSelected}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="sr-only"
                        required
                      />
                      <span className={`font-sans text-sm sm:text-base ${isSelected ? "text-gold font-bold" : "text-gray-400"}`}>
                        {labelStr}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full relative group flex items-center justify-center gap-2 mt-6 sm:mt-8 px-8 py-4 sm:py-5 rounded-2xl font-sans text-background bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] font-bold text-base sm:text-lg tracking-wide overflow-hidden transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] disabled:opacity-70 disabled:cursor-wait"
            >
              <span className="relative z-10">{t('cta_button')}</span>
              <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              
              {/* Shimmer effect */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 w-1/2"
              />
            </motion.button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}

export default function InputDestinyPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    }>
      <InputDestinyContent />
    </Suspense>
  );
}
