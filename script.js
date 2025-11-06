const questionInput = document.getElementById("prompt");
const answersDiv = document.getElementById("answers");
const bestDiv = document.getElementById("bestAnswer");

const OPENROUTER_KEY = "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";

async function renderMarkdownWithMath(element, markdownText) {
  element.innerHTML = marked.parse(markdownText);  // renderujemy Markdown
  if (window.MathJax) {
    await MathJax.typesetPromise([element]);        // renderujemy wzory LaTeX
  }
}

async function generateAnswers() {
  const question = questionInput.value.trim();
  if (!question) return alert("Wpisz treść zadania!");

  answersDiv.innerHTML = `<div class="loading">⏳ ChatGPT myśli...</div>`;
  bestDiv.innerHTML = "";

  const model = "openai/gpt-4o-mini";
// 🔁 3 równoległe próby tej samej odpowiedzi
const promises = [];

for (let i = 1; i <= 3; i++) {
  promises.push(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 1,
        messages: [
          { role: "system", content: "Jesteś nauczycielem, który rozwiązuje zadania szkolne krok po kroku w prosty sposób." },
          { role: "user", content: question }
        ]
      })
    }).then(res => res.json())
  );
}

const results = await Promise.all(promises);

const answers = results.map((data, i) => ({
  nr: i + 1,
  text: data.choices?.[0]?.message?.content || "Brak odpowiedzi."
}));


// 🧩 AI wybiera najlepszą odpowiedź (1–3)
const evaluator = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENROUTER_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content:
          "Jesteś sędzią AI. Twoim zadaniem jest wybrać numer (1–3) najlepszej odpowiedzi, bez żadnych komentarzy, uzasadnień ani dodatkowych znaków. Odpowiedz tylko numerem, np. '2'."
      },
      {
        role: "user",
        content: `Zadanie: ${question}\n\nOdpowiedzi:\n1️⃣ ${answers[0].text}\n2️⃣ ${answers[1].text}\n3️⃣ ${answers[2].text}`
      }
    ]
  })
});

  const evalData = await evaluator.json();
  const evalText = evalData.choices?.[0]?.message?.content || "1";
  const bestNum = parseInt(evalText.match(/\d+/)?.[0]) || 1;
  const bestAnswer = answers[bestNum - 1];

  // ✅ Pokazujemy tylko najlepszą odpowiedź
  answersDiv.innerHTML = "";
  bestDiv.innerHTML = `<h2>🏆 Najlepsza odpowiedź:</h2><div class="best">${bestAnswer.text}</div>`;

  // 📚 Przycisk "Pokaż inne odpowiedzi"
  const showBtn = document.createElement("button");
  showBtn.id = "showOthersBtn";
  showBtn.textContent = "📚 Pokaż inne odpowiedzi";
  bestDiv.appendChild(showBtn);

  // 🔒 Ukryte inne odpowiedzi
  const hiddenDiv = document.createElement("div");
  hiddenDiv.style.display = "none";
  hiddenDiv.innerHTML = "<h2>🧠 Pozostałe odpowiedzi ChatGPT:</h2>";
  answers.forEach(a => {
    hiddenDiv.innerHTML += `<div class="answer"><b>Odpowiedź ${a.nr}:</b><br>${a.text}</div>`;
  });
  bestDiv.appendChild(hiddenDiv);

  showBtn.onclick = () => {
    hiddenDiv.style.display = hiddenDiv.style.display === "none" ? "block" : "none";
    showBtn.textContent =
      hiddenDiv.style.display === "none"
        ? "📚 Pokaż inne odpowiedzi"
        : "🔒 Ukryj inne odpowiedzi";
    if (window.MathJax) MathJax.typesetPromise();
  };

  if (window.MathJax) MathJax.typesetPromise();
};

