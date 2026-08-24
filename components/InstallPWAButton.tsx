'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, Download, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // 1. 이미 설치된 상태인지 체크 (PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore - iOS standalone 
      const isStandaloneNav = window.navigator.standalone === true;
      return isStandaloneMedia || isStandaloneNav;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    // 2. 이전에 닫은 적이 있는지 체크 (7일간 숨김)
    const dismissedAt = localStorage.getItem('kongdak_pwa_dismissed');
    if (dismissedAt) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedAt, 10);
      if (timeSinceDismissed < 7 * 24 * 60 * 60 * 1000) {
        return; // 아직 7일 안지남
      }
    }

    // 3. iOS 여부 감지
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. beforeinstallprompt 이벤트 리스너 등록
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault(); // 기본 프롬프트 무시
      setDeferredPrompt(e);
      setShowBanner(true); // 커스텀 배너 표시
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // iOS 이거나 데스크톱/안드로이드인데 프롬프트 이벤트 없이 일정 시간 후 배너 표시 (대안)
    const timer = setTimeout(() => {
      if (!checkStandalone() && !localStorage.getItem('kongdak_pwa_dismissed')) {
        setShowBanner(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('kongdak_pwa_dismissed', Date.now().toString());
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        
        // VAPID public key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.warn('VAPID public key not found');
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        // DB에 구독 정보 전송
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription),
        });
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      setShowBanner(false);
      return;
    }

    if (!deferredPrompt) {
      // 프롬프트가 없으면 알림 권한만이라도 획득 시도
      await subscribeToPush();
      setShowBanner(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowBanner(false);
      
      // 설치 승인 후 부드럽게 푸시 알림 권한 요청
      setTimeout(() => {
        subscribeToPush();
      }, 1000);
    }
  };

  if (isStandalone) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-50 p-2 md:p-4"
          >
            <div className="mx-auto max-w-md bg-white border border-[#FF8AA1]/30 shadow-xl rounded-2xl p-4 flex items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF8AA1] to-[#FF5C77]"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF6F1] flex items-center justify-center flex-shrink-0">
                  <img src="/icons/icon-192.png" alt="콩닥" className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2B2430]">콩닥 앱 설치하고</p>
                  <p className="text-xs text-gray-500">더 빠르고 편하게 확인하세요!</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-[#FF5C77] text-white text-xs font-semibold py-2 px-4 rounded-full active:scale-95 transition-transform"
                >
                  {isIOS ? '설치 안내' : '무료 설치'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-[#FFF6F1] rounded-2xl flex items-center justify-center mb-4">
                  <img src="/icons/icon-192.png" alt="콩닥" className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold text-[#2B2430] mb-2">iOS 홈 화면에 추가하기</h3>
                <p className="text-sm text-gray-600">
                  사파리(Safari) 브라우저 하단의 <span className="font-bold border border-gray-200 px-1 rounded mx-1">공유 아이콘</span>을 누른 후,<br/>
                  <span className="font-bold border border-gray-200 px-1 rounded mx-1">홈 화면에 추가</span>를 선택해주세요!
                </p>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 bg-[#FF5C77] text-white rounded-xl font-bold active:scale-95 transition-transform"
              >
                확인
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Utility function
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
