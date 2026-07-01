const fs = require('fs');
const path = require('path');

const locales = ['en', 'ko', 'ja', 'es', 'de', 'fr'];
const messagesDir = path.join(__dirname, 'messages');

const newTranslations = {
  ko: {
    Chat: {
      premium_upsell: "✨ 마스터가 운명의 중요한 전환점을 발견했습니다. 프리미엄을 해제하여 진실을 확인하세요."
    },
    Result: {
      reconnecting: "우주의 기운에 다시 연결하는 중... (시도 {attempt})",
      error_title: "우주적 간섭",
      btn_retry: "다시 시도",
      btn_go_back: "뒤로 가기"
    }
  },
  en: {
    Chat: {
      premium_upsell: "✨ Master sees a critical turning point. Unlock Premium to reveal the truth."
    },
    Result: {
      reconnecting: "Reconnecting to the cosmos... (attempt {attempt})",
      error_title: "Cosmic Interference",
      btn_retry: "Retry",
      btn_go_back: "Go Back"
    }
  },
  ja: {
    Chat: {
      premium_upsell: "✨ マスターが運命の重要な転換点を発見しました。プレミアムを解除して真実を確認してください。"
    },
    Result: {
      reconnecting: "宇宙の気運に再接続中... (試行 {attempt})",
      error_title: "宇宙の干渉",
      btn_retry: "再試行",
      btn_go_back: "戻る"
    }
  },
  es: {
    Chat: {
      premium_upsell: "✨ El maestro ve un punto de inflexión crítico. Desbloquea Premium para revelar la verdad."
    },
    Result: {
      reconnecting: "Reconectando con el cosmos... (intento {attempt})",
      error_title: "Interferencia Cósmica",
      btn_retry: "Reintentar",
      btn_go_back: "Volver"
    }
  },
  de: {
    Chat: {
      premium_upsell: "✨ Der Meister sieht einen kritischen Wendepunkt. Schalten Sie Premium frei, um die Wahrheit zu enthüllen."
    },
    Result: {
      reconnecting: "Wiederverbindung mit dem Kosmos... (Versuch {attempt})",
      error_title: "Kosmische Interferenz",
      btn_retry: "Wiederholen",
      btn_go_back: "Zurück"
    }
  },
  fr: {
    Chat: {
      premium_upsell: "✨ Le maître voit un tournant critique. Débloquez Premium pour révéler la vérité."
    },
    Result: {
      reconnecting: "Reconnexion au cosmos... (tentative {attempt})",
      error_title: "Interférence Cosmique",
      btn_retry: "Réessayer",
      btn_go_back: "Retour"
    }
  }
};

locales.forEach(locale => {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.Chat) data.Chat = {};
    if (!data.Result) data.Result = {};
    
    Object.assign(data.Chat, newTranslations[locale].Chat);
    Object.assign(data.Result, newTranslations[locale].Result);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${locale}.json`);
  }
});
