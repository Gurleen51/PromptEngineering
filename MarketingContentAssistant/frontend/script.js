const form = document.getElementById("contentForm");
const outputDiv = document.getElementById("output");
const generateBtn = document.getElementById("generateBtn");
const historyBtn = document.getElementById("historyBtn");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");
const historyContainer = document.getElementById("history");

// 🎤 VOICE INPUT (STT) Setup
const micButtons = document.querySelectorAll('.mic-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    micButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            button.classList.add('active-listening');
            generateBtn.disabled = true; // Disable generate button while recording
            recognition.start();

            recognition.onresult = (event) => {
                const speechResult = event.results[0][0].transcript;
                targetInput.value = speechResult;
            };

            recognition.onspeechend = () => {
                recognition.stop();
                button.classList.remove('active-listening');
                generateBtn.disabled = false;
            };

            recognition.onerror = (event) => {
                recognition.stop();
                console.error('Speech recognition error:', event.error);
                button.classList.remove('active-listening');
                generateBtn.disabled = false;
                alert('Voice input failed. Please ensure microphone is active.');
            };
        });
    });
} else {
    micButtons.forEach(button => button.style.display = 'none');
}


// 📢 VOICE OUTPUT (TTS) Setup
const readOutputBtn = document.getElementById("readOutputBtn");
const synth = window.speechSynthesis;

function speakContent(text) {
    if (synth.speaking) {
        synth.cancel(); // Stop if already speaking
    }
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = 'en-US';
    synth.speak(utterance);
}

readOutputBtn.addEventListener('click', () => {
    const textToRead = document.querySelector('.formatted-output-container').innerText;
    speakContent(textToRead);
});


// 🗑️ DELETE HISTORY ITEM
async function deleteItem(id) {
    if (!confirm("Are you sure you want to delete this history item?")) return;

    try {
        const res = await fetch(`/history/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (data.status === "success") {
            // alert("Item deleted successfully!"); // Use silent update instead of alert
            fetchHistory(); // Reload the history list
        } else {
            alert(`Error deleting item: ${data.message}`);
        }
    } catch (err) {
        alert("Failed to connect to backend for delete operation.");
    }
}

// ⭐ TOGGLE FAVORITE
async function toggleFavorite(id) {
    try {
        const res = await fetch(`/history/favorite/${id}`, { method: 'POST' });
        const data = await res.json();
        
        if (data.status === "success") {
            fetchHistory(); // Reload the history list to show the star and reorder
        } else {
            alert(`Error favoriting item: ${data.message}`);
        }
    } catch (err) {
        alert("Failed to connect to backend for favorite operation.");
    }
}


// -------------------------------------------------------------
// Core Functions
// -------------------------------------------------------------

function formatGeneratedText(rawText) {
    if (!rawText) return "<p>No content generated.</p>";

    let cleanedText = rawText.replace(/^(Okay, here are|Here are|Below are) .*? variants (for|for the) .*?:?\n*/i, '').trim();
    let variants = cleanedText.split(/(\*\*\*|\-\-\-|\n\s*\n)/).map(v => v.trim()).filter(v => v && v !== '***' && v !== '---');

    const formattedHtml = variants.map((variant, index) => {
        let htmlContent = variant.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        let titleMatch = htmlContent.match(/^(Variant \d+|[A-Z]{3,}.*?):\s*(.*)/i);
        
        if (titleMatch) {
            htmlContent = `<h4>${titleMatch[1].trim()}</h4>` + `<p class="variant-body">${titleMatch[2].trim()}</p>` + htmlContent.substring(titleMatch[0].length).trim();
            htmlContent = htmlContent.replace(/<p class="variant-body"><\/p>/, ''); 
        } else {
            htmlContent = `<blockquote>${htmlContent}</blockquote>`;
        }

        htmlContent = htmlContent.replace(/\n\s*\* (.*)/g, (match, p1) => `<li>${p1.trim()}</li>`);
        if (htmlContent.includes('<li>')) {
            htmlContent = htmlContent.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
        }
        
        htmlContent = htmlContent.split('\n\n').map(p => {
             if (p.startsWith('<') || p.includes('<li>')) return p;
             return `<p>${p.trim()}</p>`;
        }).join('');


        return `
            <div class="generated-variant">
                ${htmlContent}
            </div>
        `;
    }).join('<hr class="variant-separator">');

    return formattedHtml;
}


async function fetchHistory() {
  try {
    const res = await fetch("/history");
    const data = await res.json();

    if (data.length === 0) {
      historyContainer.innerHTML = `<p class="placeholder">No history found yet.</p>`;
      return;
    }

    historyContainer.innerHTML = data
      .map(
        (item) => `
      <div class="history-item ${item.favorite ? 'favorite-item' : ''}">
        <div class="history-header">
            <h4>${item.product_name}</h4>
            <div class="history-actions">
                <button class="favorite-btn" data-id="${item.id}" title="Toggle Favorite">
                    ${item.favorite ? '⭐' : '☆'}
                </button>
                <button class="delete-btn" data-id="${item.id}" title="Delete Item">
                    🗑️
                </button>
            </div>
        </div>
        <p><strong>Template:</strong> ${item.template} | <strong>Tone:</strong> ${item.tone}</p>
        <pre>${item.generated_text}</pre> 
        <small>${item.created_at}</small>
      </div>
    `
      )
      .join("");
    
    // 🌟 ATTACH LISTENERS AFTER RENDERING
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => deleteItem(e.currentTarget.getAttribute('data-id')));
    });

    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', (e) => toggleFavorite(e.currentTarget.getAttribute('data-id')));
    });

  } catch (err) {
    historyContainer.innerHTML = `<p class="error">⚠️ Could not load history.</p>`;
  }
}


form.addEventListener("submit", async (e) => {
  e.preventDefault();
  generateBtn.disabled = true;
  generateBtn.innerText = "✨ Generating...";
  generateBtn.classList.add('is-loading'); 
  outputDiv.innerHTML = `<p class="loading-message">Generating content, please wait...</p>`; 

  const payload = {
    product_name: document.getElementById("product_name").value,
    description: document.getElementById("description").value,
    audience: document.getElementById("audience").value,
    tone: document.getElementById("tone").value,
    template: document.getElementById("template").value,
    n_variants: document.getElementById("n_variants").value,
  };

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.status === "success") {
      const formattedContent = formatGeneratedText(data.text);
      
      outputDiv.innerHTML = `
        <h3>✅ Generated Content for <span>${data.product_name}</span></h3>
        <div class="formatted-output-container">
            ${formattedContent}
        </div>
      `;
      readOutputBtn.style.display = 'inline-block';
      fetchHistory(); 
    } else {
      outputDiv.innerHTML = `<p class="error">❌ ${data.message}</p>`;
      readOutputBtn.style.display = 'none'; 
    }
  } catch (err) {
    outputDiv.innerHTML = `<p class="error">⚠️ Failed to connect to backend.</p>`;
    readOutputBtn.style.display = 'none';
  }

  generateBtn.disabled = false;
  generateBtn.innerText = "🚀 Generate";
  generateBtn.classList.remove('is-loading');
});

historyBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  fetchHistory();
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
});

window.addEventListener("load", () => {
    fetchHistory();
    if (readOutputBtn) readOutputBtn.style.display = 'none'; 
});