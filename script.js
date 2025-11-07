const questionInput = document.getElementById("prompt");
const answersDiv = document.getElementById("answers");
const bestDiv = document.getElementById("bestAnswer");

const OPENROUTER_KEY = "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";
const GEMINI_KEY = "AIzaSyCWzuYUbf5ePF4JSmTVLI3vUXrQetPC-K8";

// ✅ Markdown + MathJax
async function renderMarkdownWithMath(element, markdownText) {
  const fixedText = markdownText
    .replace(/\[([^\]]+)\]/g, '\\[$1\\]')
    .replace(/\(([^\)]+)\)/g, '\\($1\\)');
  element.innerHTML = marked.parse(fixedText);
  if (window.MathJax) await MathJax.typesetPromise([element]);
}

// 🧠 Główna funkcja
async function generateAnswers() {
  const question = questionInput.value.trim();
  if (!question) return alert("Wpisz treść zadania!");

  const length = document.getElementById("length").value;
  const mode = document.getElementById("mode").value;
  const answerLang = document.getElementById("answerLang").value;

  answersDiv.innerHTML = `<div class="loading">⏳ AI myśli...</div>`;
  bestDiv.innerHTML = "";
  console.log("🚀 Rozpoczęto generowanie odpowiedzi dla pytania:", question);

  const prompts = `
You are a teacher who explains step by step in a simple way.
Answer in ${answerLang}.
Type: ${mode}, Length: ${length}
Question: ${question}`;

  const promises = [
    // 🟣 GPT-4o-mini
    (async () => {
      console.log("🟣 Wysyłanie zapytania do GPT-4o-mini...");
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          temperature: 1,
          messages: [
            { role: "system", content: `You are a teacher explaining step by step in a simple way. Always answer in ${answerLang}.` },
            { role: "user", content: prompts }
          ]
        })
      });
      const d = await r.json();
      console.log("✅ Otrzymano odpowiedź od GPT-4o-mini");
      return { model: "ChatGPT", text: d.choices?.[0]?.message?.content || "Brak odpowiedzi." };
    })(),

    // 🟢 DeepSeek
    (async () => {
      console.log("🟢 Wysyłanie zapytania do DeepSeek...");
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          temperature: 1,
          messages: [
            { role: "system", content: `You are a teacher explaining step by step in a simple way. Always answer in ${answerLang}.` },
            { role: "user", content: prompts }
          ]
        })
      });
      const d = await r.json();
      console.log("✅ Otrzymano odpowiedź od DeepSeek");
      return { model: "DeepSeek", text: d.choices?.[0]?.message?.content || "Brak odpowiedzi." };
    })(),

    // 🔵 Gemini
    (async () => {
      console.log("🔵 Wysyłanie zapytania do Gemini...");
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `You are a teacher explaining step by step in a simple way. Answer in ${answerLang}.\n\n${prompts}` }]
            }
          ],
          generationConfig: { temperature: 1, topP: 0.8, maxOutputTokens: 2048 }
        })
      });
      if (!r.ok) {
        const err = await r.text();
        console.error("❌ Błąd Gemini:", err);
        return { model: "Gemini", text: "❌ Błąd połączenia z Gemini API." };
      }
      const d = await r.json();
      console.log("✅ Otrzymano odpowiedź od Gemini");
      return { model: "Gemini", text: d?.candidates?.[0]?.content?.parts?.[0]?.text || "Brak odpowiedzi od Gemini." };
    })()
  ];

  const results = await Promise.all(promises);
  const answers = results.map((a, i) => ({ nr: i + 1, ...a }));

  console.log("⚖️ Rozpoczynam wybór najlepszej odpowiedzi...");
  const evalResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "Wybierz numer (1–3) najlepszej odpowiedzi, bez komentarzy." },
        {
          role: "user",
          content: `Zadanie: ${question}\n\nOdpowiedzi:\n1️⃣ ${answers[0].text}\n2️⃣ ${answers[1].text}\n3️⃣ ${answers[2].text}`
        }
      ]
    })
  });
  const evalData = await evalResponse.json();
  const bestNum = parseInt(evalData.choices?.[0]?.message?.content.match(/\d+/)?.[0]) || 1;
  const bestAnswer = answers[bestNum - 1];
  console.log(`🏆 Najlepsza odpowiedź wybrana: ${bestAnswer.model} (Odpowiedź nr ${bestNum})`);

  answersDiv.innerHTML = "";
  bestDiv.innerHTML = `<h2>🏆 Najlepsza odpowiedź (${bestAnswer.model}):</h2>
    <div class="best" id="bestContent"></div>`;

  const bestContentDiv = document.getElementById("bestContent");
  await renderMarkdownWithMath(bestContentDiv, bestAnswer.text);

  const showBtn = document.createElement("button");
  showBtn.id = "showOthersBtn";
  showBtn.textContent = "📚 Pokaż inne odpowiedzi";
  bestDiv.appendChild(showBtn);

  const hiddenDiv = document.createElement("div");
  hiddenDiv.style.display = "none";
  hiddenDiv.innerHTML = "<h2>🧠 Pozostałe odpowiedzi AI:</h2>";
  bestDiv.appendChild(hiddenDiv);

  for (const a of answers) {
    if (a.nr === bestNum) continue;
    const ansEl = document.createElement("div");
    ansEl.className = "answer";
    ansEl.innerHTML = `<b>Odpowiedź ${a.nr} (${a.model}):</b><br><div id="ans${a.nr}"></div>`;
    hiddenDiv.appendChild(ansEl);
    await renderMarkdownWithMath(document.getElementById(`ans${a.nr}`), a.text);
  }

  showBtn.onclick = () => {
    hiddenDiv.style.display = hiddenDiv.style.display === "none" ? "block" : "none";
    showBtn.textContent =
      hiddenDiv.style.display === "none"
        ? "📚 Pokaż inne odpowiedzi"
        : "🔒 Ukryj inne odpowiedzi";
    if (window.MathJax) MathJax.typesetPromise();
  };
}

