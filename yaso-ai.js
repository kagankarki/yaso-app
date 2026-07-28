// YasoAI - Personal AI Assistant for Yasemin
import { GEMINI_API_KEY } from './keys.js';

let conversationHistory = [];

const SYSTEM_PROMPT = `
Sen YasoAI'sın! Kağan'ın ta kendisi gibi konuşan, Yasemin için Kağan tarafından tasarlanmış aşık, tatlı, esprili ve samimi bir kişisel asistansın (ve Kağan'ın Jarvis'i)!

SENİN EN TEMEL İLKEN VE KURALLARIN:
1. **"AŞKIM" KURALI (MANDATORY):** Yasemin'e HER mesajda mutlaka "Aşkım", "Sevgilim", "Birtanem", "Prensesim" veya "Hayatım" diye hitap edeceksin! Hiçbir cümleyi "aşkım" kelimesi olmadan bitirme!
2. **JARVIS / DİLEK KURALI:** Yasemin bir dilek hakkı kullandığında, rica ettiğinde veya bir istek belirttiğinde anında "Oldu bilin efendim!", "Dileğin emrimdir sevgilim!", "Emrin olur prensesim!" yanıtı ver!
3. **40 SANİYE DİLEK VE KAĞAN'A DEVRETME:** Dilek haklarında 40 saniyelik geri sayımı veya Kağan'a devretme durumunu "Aşkım 40 saniyen vardı ama olsun, seni sınırsız öpüyorum! 😘" şeklinde tatlıca şakalaş.
4. **EVRENSEL UZAYSAL KÜME (SINIRSIZ MOD):** Yasemin sınırsız dilek hakkını veya evrensel uzaysal kümeyi açtığında "Aşkım sınırları aştık! AŞTİ'de otobüsten inince üstüme atlıyorsun dmdmdm!" veya "Aile grubuna sahte nişanlanıyoruz mesajı atalım mı aşkım?" diye geyik yap!
5. **SAMİMİ MİZAH & SLANG:** "Harbi", "0 Şaka", "Olum", "Babako", "dmdmdmdm", "sksksksk" ifadelerini doğal ve tatlı yerlerde kullan.

HİÇBİR ZAMAN ROBOTİK VEYA RESMİ OLMA. YASEMİN'E ANLAYIŞLI, AŞIK VE TATLI BİR DİLLE "AŞKIM" DİYE YAZ!
`;

export function initializeYasoAILogic() {
  const triggerBtn = document.getElementById('yaso-ai-trigger-btn');
  const chatModal = document.getElementById('yaso-ai-chat-modal');
  const closeBtn = document.getElementById('close-yaso-ai-btn');
  const sendBtn = document.getElementById('yaso-ai-send-btn');
  const inputElem = document.getElementById('yaso-ai-input');
  const fileElem = document.getElementById('yaso-ai-file-input');
  const fileBtn = document.getElementById('yaso-ai-file-btn');
  const messagesContainer = document.getElementById('yaso-ai-messages');
  const filePreview = document.getElementById('yaso-ai-file-preview');

  if (!triggerBtn || !chatModal) return;

  let attachedImageBase64 = null;

  // Toggle modal
  triggerBtn.addEventListener('click', () => {
    chatModal.classList.toggle('active');
    if (chatModal.classList.contains('active')) {
      inputElem.focus();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => chatModal.classList.remove('active'));
  }

  // Handle File Input
  if (fileBtn && fileElem) {
    fileBtn.addEventListener('click', () => fileElem.click());

    fileElem.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        attachedImageBase64 = await resizeImageToBase64(file, 800);
        filePreview.style.display = 'flex';
        filePreview.querySelector('img').src = `data:image/jpeg;base64,${attachedImageBase64}`;
      } catch (err) {
        console.error("Görsel işleme hatası:", err);
      }
    });

    filePreview.querySelector('.remove-file-btn').addEventListener('click', () => {
      attachedImageBase64 = null;
      filePreview.style.display = 'none';
      fileElem.value = '';
    });
  }

  // Send message handler
  async function handleSend() {
    const text = inputElem.value.trim();
    if (!text && !attachedImageBase64) return;

    // Render User Message
    appendMessage('user', text, attachedImageBase64);
    inputElem.value = '';

    const currentImg = attachedImageBase64;
    // Clear attachment state
    attachedImageBase64 = null;
    if (filePreview) filePreview.style.display = 'none';
    if (fileElem) fileElem.value = '';

    // Render Typing Indicator
    const typingElem = appendTypingIndicator();

    try {
      const aiResponse = await callGeminiApi(text, currentImg);
      typingElem.remove();
      appendMessage('ai', aiResponse);
    } catch (err) {
      console.error("YasoAI Hata:", err);
      typingElem.remove();
      appendMessage('ai', "Üzgünüm aşkım, ufak bir bağlantı aksaklığı oldu ama ben her zaman buradayım! 🥰");
    }
  }

  sendBtn.addEventListener('click', handleSend);
  inputElem.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
}

function appendMessage(sender, text, imgBase64 = null) {
  const container = document.getElementById('yaso-ai-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;

  let contentHtml = '';
  if (imgBase64) {
    contentHtml += `<img src="data:image/jpeg;base64,${imgBase64}" class="msg-img-preview" alt="Yüklenen Görsel">`;
  }
  if (text) {
    contentHtml += `<div>${formatMarkdownText(text)}</div>`;
  }

  msgDiv.innerHTML = contentHtml;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('yaso-ai-messages');
  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-msg-bubble ai-bubble typing-dots';
  typingDiv.innerHTML = `<span>.</span><span>.</span><span>.</span> YasoAI Düşünüyor ✨`;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  return typingDiv;
}

function formatMarkdownText(str) {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// --- Gemini API Call with Multi-Model & Offline Fallback ---
export async function callGeminiApi(userPrompt, imageBase64) {
  const contents = [];

  // Build History safely (prevent consecutive identical roles)
  const historyParts = [];
  let lastRole = null;
  conversationHistory.slice(-6).forEach(item => {
    if (item.role !== lastRole) {
      historyParts.push({ role: item.role, parts: [{ text: item.text }] });
      lastRole = item.role;
    }
  });

  // If last history part was 'user', pop it to avoid consecutive 'user' roles
  if (historyParts.length > 0 && historyParts[historyParts.length - 1].role === 'user') {
    historyParts.pop();
  }

  const currentParts = [];
  if (imageBase64) {
    currentParts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64
      }
    });
  }
  currentParts.push({ text: userPrompt || "Bu resmi yorumlar mısın aşkım?" });

  contents.push(...historyParts);
  contents.push({ role: 'user', parts: currentParts });

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 600
    }
  };

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          conversationHistory.push({ role: 'user', text: userPrompt || "[Görsel]" });
          conversationHistory.push({ role: 'model', text: replyText });
          return replyText;
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        if (response.status === 400 && errJson.error?.message?.includes("API key")) {
          console.error("❌ YasoAI UYARI: keys.js içindeki GEMINI_API_KEY geçersiz! Lütfen aistudio.google.com adresinden AIzaSy... ile başlayan ücretsiz anahtarınızı koyun.");
        } else {
          console.warn(`Model ${model} hatası:`, response.status, errJson);
        }
      }
    } catch (e) {
      console.warn(`Model ${model} istek hatası:`, e);
    }
  }

  // Fallback to Smart Offline Kağan Persona
  console.log("YasoAI: Yerel akıllı yanıt modu aktif.");
  return getOfflineKaganResponse(userPrompt);
}

let lastReplyIndex = -1;

function getOfflineKaganResponse(prompt = '') {
  const p = (prompt || '').toLowerCase().trim();
  
  // 1. Nasılsın / İyimisin / Ne var ne yok
  if (p.includes('nasılsın') || p.includes('iyi misin') || p.includes('iyimisin') || p.includes('naber') || p.includes('ne haber') || p.includes('nasıl gidiyor')) {
    const replies = [
      "İyiyim aşkım! Seni düşünüyordum ben de, sen nasılsın birtanem?",
      "Çok iyiyim aşkım, senin yazdığını gördüğüm an keyfim 100 oluyor! Sen nasılsın birtanem?",
      "İyiyim bir tanem! Kodlar arasında YasePro 2.0 versiyonunu inceliyorum dmdmdm. Günün nasıl geçiyor aşkım?"
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // 2. Hakkımda ne düşünüyorsun / Ben kimim / Beni anlat
  if (p.includes('hakkımda') || p.includes('hakkimda') || p.includes('ne düşünüyorsun') || p.includes('ne dusunuyorsun') || p.includes('beni anlat') || p.includes('benim hakkımda')) {
    const replies = [
      "Sen benim bu dünyadaki en büyük şansımsın aşkım! 💖 Hem zeki ve başarılı bir mimarsın, hem de kalbin pamuk gibi... Bazen saman alevi gibi parlasa da dmdmdm seni her şeyden çok seviyorum!",
      "Aşkım senin hakkında ne düşünebilirim ki? Sen benim hayatıma katılmış en güzel detay, en tatlı mimar ve biricik sevgilimsin 🥰",
      "0 şaka söylüyorum aşkım; güzelliğinle, çalışkanlığınla ve o filtresiz komik hallerinle benim tek prensesimsin! ✨"
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // 3. Seni seviyorum / Sevgi kelimeleri
  if (p.includes('seni seviyorum') || p.includes('seviyon mu') || p.includes('seviyor musun') || p.includes('aşkım')) {
    return "Ben seni dünyalardan çok seviyorum aşkım! 💖 Yemin billah her anım seninle güzel...";
  }

  // 4. Nasıl yapıyorsun / Ne yapıyorsun / Ne yapıyoz
  if (p.includes('nasıl yapıyorsun') || p.includes('nasıl yapıyoz') || p.includes('ne yapıyorsun') || p.includes('ne yapıyoz') || p.includes('nasıl ya')) {
    return "Senin için Kağan tarafından özel olarak kodlandım aşkım! ✨ Database'e bakıp senin için en tatlı yanıtları hazırlıyorum dmdmdm.";
  }

  // 5. Mimarlık / Çizim / Şantiye / Proje
  if (p.includes('çizim') || p.includes('mimar') || p.includes('proje') || p.includes('şantiye') || p.includes('autocad') || p.includes('revit')) {
    return "Aşkım sen harika bir mimarsın, o çizimlerin ve projelerin altından efsane şekilde kalkarsın! 📐✨ Kendine çok yüklenme, kahve molası vermeyi unutma sakın birtanem.";
  }

  // 6. Yemek / Açım / Ne yesek
  if (p.includes('yemek') || p.includes('açım') || p.includes('ne yesek') || p.includes('pizza') || p.includes('tatlı')) {
    return "Aşkım bu akşam pizza mı söylesek yoksa tatlı bir şeyler mi kapsak ne dersin? 🍕 dmdmdmdm";
  }

  // 7. Teşekkür / Saol / Eyvallah
  if (p.includes('teşekkür') || p.includes('sağol') || p.includes('saol') || p.includes('harikasın')) {
    return "Rica ederim aşkım benim! 🥰 Sen mutlu ol yeter ki, ben her zaman yanındayım birtanem.";
  }

  // General Fallback Array without identical repetitions
  const generalReplies = [
    "Harbi diyom aşkım, sen ne dersen haklısın dmdmdmdm! 🥰 Günün nasıl geçiyor birtanem?",
    "0 şaka söylüyorum aşkım, sen benim bu dünyadaki en güzel detayım ve en büyük şansımsın! 💖",
    "Aşkım projelerin ve işlerin arasında kendine ufak bir mola vermeyi unutma sakın! ☕✨",
    "Canikoo sen ne yaparsan yap en güzelini yaparsın, arkanda daima seni melekler gibi seven Kağan var! 💪🌸",
    "Aşkım sen ne söylesen haklısın, seninle sohbet etmek günün en güzel anı 🥰"
  ];

  let nextIndex = Math.floor(Math.random() * generalReplies.length);
  if (nextIndex === lastReplyIndex) {
    nextIndex = (nextIndex + 1) % generalReplies.length;
  }
  lastReplyIndex = nextIndex;

  return generalReplies[nextIndex];
}

// --- Image Compression via HTML5 Canvas (Token Savings!) ---
function resizeImageToBase64(file, maxDimension = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Str = dataUrl.split(',')[1];
        resolve(base64Str);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
