const fs = require('fs');
const path = require('path');

const newKeys = {
  en: {
    Sync: {
      your_energy_badge: "Your Energy",
    },
    Profile: {
      reset_saju_title: "Reset Saju Warning",
      reset_saju_desc: "Changing your Saju information will reset all your previously accumulated destiny data and analysis results. Do you wish to proceed?",
      btn_agree_reset: "Agree & Reset",
      btn_cancel: "Cancel",
    }
  },
  ko: {
    Sync: {
      your_energy_badge: "나의 정보",
    },
    Profile: {
      reset_saju_title: "사주 정보 초기화 경고",
      reset_saju_desc: "사주 정보를 변경하시면 기존에 쌓였던 운세 데이터 및 분석 결과가 모두 초기화됩니다. 계속 진행하시겠습니까?",
      btn_agree_reset: "동의 및 변경",
      btn_cancel: "닫기",
    }
  },
  ja: {
    Sync: {
      your_energy_badge: "あなたの情報",
    },
    Profile: {
      reset_saju_title: "四柱推命情報のリセット警告",
      reset_saju_desc: "四柱推命情報を変更すると、これまでに蓄積された運勢データや分析結果がすべてリセットされます。よろしいですか？",
      btn_agree_reset: "同意して変更",
      btn_cancel: "閉じる",
    }
  },
  es: {
    Sync: {
      your_energy_badge: "Tu Energía",
    },
    Profile: {
      reset_saju_title: "Advertencia de Restablecimiento",
      reset_saju_desc: "Cambiar su información de Saju restablecerá todos sus datos de destino y resultados de análisis acumulados. ¿Desea proceder?",
      btn_agree_reset: "Aceptar y Cambiar",
      btn_cancel: "Cancelar",
    }
  },
  fr: {
    Sync: {
      your_energy_badge: "Votre Énergie",
    },
    Profile: {
      reset_saju_title: "Avertissement de Réinitialisation",
      reset_saju_desc: "La modification de vos informations Saju réinitialisera toutes vos données de destin accumulées et vos résultats d'analyse. Souhaitez-vous continuer ?",
      btn_agree_reset: "Accepter et Modifier",
      btn_cancel: "Annuler",
    }
  },
  de: {
    Sync: {
      your_energy_badge: "Ihre Energie",
    },
    Profile: {
      reset_saju_title: "Zurücksetzen Warnung",
      reset_saju_desc: "Wenn Sie Ihre Saju-Informationen ändern, werden alle Ihre bisher gesammelten Schicksalsdaten und Analyseergebnisse zurückgesetzt. Möchten Sie fortfahren?",
      btn_agree_reset: "Zustimmen & Ändern",
      btn_cancel: "Abbrechen",
    }
  }
};

const dir = path.join(__dirname, 'messages');
const files = fs.readdirSync(dir);

files.forEach(file => {
  if (!file.endsWith('.json')) return;
  const lang = file.replace('.json', '');
  if (!newKeys[lang]) return;
  
  const filePath = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  Object.keys(newKeys[lang]).forEach(category => {
    if (!data[category]) {
      data[category] = {};
    }
    data[category] = {
      ...data[category],
      ...newKeys[lang][category]
    };
  });
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${file}`);
});
