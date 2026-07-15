<div align="center">

# 🧮 Advanced Calculator Pro

### A modern, all-in-one calculator suite built with pure HTML, CSS &amp; JavaScript

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![No Framework](https://img.shields.io/badge/Framework-None-lightgrey?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**[🚀 Live Demo](#-live-demo) · [✨ Features](#-features) · [🛠 Tech Stack](#️-tech-stack) · [📦 Installation](#-installation--setup) · [📁 Structure](#-project-structure)**

</div>

---

## 📖 About The Project

**Advanced Calculator Pro** is not just a simple calculator — it's a complete calculation suite covering everyday math, scientific computation, programmer/bitwise operations, financial planning, health metrics, unit conversion, and live currency exchange, all wrapped in a single polished web app.

It was built as a demonstration of clean vanilla JavaScript architecture — **no frameworks, no libraries for core logic, no backend** — proving that a rich, multi-module application can be built with fundamentals alone: a hand-written expression parser, LocalStorage-based persistence, and a component-driven UI structure.

---

## 🚀 Live Demo

🔗 **[Add your GitHub Pages link here once it's live]**

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🧮 Standard & Scientific
- Basic arithmetic + percentage
- `sin cos tan · sinh cosh tanh`
- `log ln √ ∛ x² x³ 10ˣ 1/x n! |x|`
- Modulo, nPr, nCr, π, e, random
- Memory: `M+ M− MR MC`
- Safe custom expression parser (tokenizer + shunting-yard) — **no `eval()`**
- Voice input & voice output
- OCR — scan a calculation from a photo
- Copy / Share / Print result
- Full keyboard support

### 🟣 Programmer Mode
- Binary · Octal · Decimal · Hex
- `AND OR XOR NOT`
- Left / Right bit shift
- All 4 bases shown live, side-by-side

### 🟡 Financial Suite
- EMI · GST · Discount · Tip
- Loan · SIP · FD · RD
- Simple & Compound Interest

</td>
<td width="50%" valign="top">

### 🟢 Health Tools
- BMI Calculator
- Age Calculator
- BMR (Mifflin-St Jeor formula)
- Ideal Weight (Devine formula)

### 🔵 Unit Converter
Length · Weight · Temperature · Area · Volume · Speed · Time · Data Storage · Pressure · Energy

### 🟣 Currency Converter
INR · USD · EUR · GBP · JPY · AED — live exchange rates

### 📜 History & Dashboard
- Unlimited history (LocalStorage)
- Search · Favorite ⭐ · Pin 📌 · Notes 📝
- Export as CSV / PDF · Print
- Usage dashboard with weekly activity chart

### 🎨 Interface
- 9 built-in themes (Glass, Neon, Material, Ocean, Sunset, Forest, Mono, Pastel, Light)
- Glassmorphism UI + animated background
- Fully responsive · EN/HI toggle
- Adjustable font size, sound & vibration

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Custom Properties, Glassmorphism, Flex/Grid) |
| Logic | Vanilla JavaScript (ES6+) |
| OCR | [Tesseract.js](https://github.com/naptha/tesseract.js) |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) |
| Currency Data | [open.er-api.com](https://www.exchangerate-api.com/) (free, no API key) |
| Voice I/O | Web Speech API |
| Persistence | Browser LocalStorage |

No build tools, no bundlers, no package manager required — it just runs.

---

## 📁 Project Structure

```
Virtual-Calculator/
├── index.html      # Page structure & markup
├── style.css        # All styling, themes & animations
├── script.js         # Calculator engine, all modules & interactivity
└── README.md
```

---

## 📦 Installation & Setup

No installation needed — it's a static site.

**Option 1 — Run locally**
```bash
git clone https://github.com/Itsmeankita/Virtual-Calculator.git
cd Virtual-Calculator
```
Then simply open `index.html` in any modern browser.

**Option 2 — Use it live**
Just visit the [Live Demo](#-live-demo) link above.

---

## 🧠 How It Works (Key Design Notes)

- **Expression Parsing:** Rather than trusting `eval()`, calculations are tokenized and converted to postfix notation (shunting-yard algorithm), then evaluated on a stack — the same technique used by real calculator engines and interpreters.
- **State Persistence:** History, settings, favorites, and notes are all stored in the browser's `localStorage`, so your data survives a page refresh without needing any backend or database.
- **Modular UI:** Each mode (Scientific, Programmer, Financial, Health, Converter, Currency) is an independent panel driven by shared logic, keeping the codebase organized despite the wide feature set.

---

## 📌 Honest Notes

- Live currency rates and OCR require an active internet connection.
- Voice input/output relies on the browser's built-in Web Speech API — support and accuracy vary by browser (works best on Chrome/Edge).
- This is a fully client-side app: all calculation history and settings stay in your own browser's local storage and are never transmitted to any server.

---

## 👤 Author

**Ankita Kumari** ([@Itsmeankita](https://github.com/Itsmeankita))
3rd Year Computer Science Engineering Student

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

⭐ If you found this project useful, consider giving it a star!

</div>