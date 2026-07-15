# 🧮 Advanced Calculator Pro

Ek all-in-one calculator web-app — pure HTML, CSS aur JavaScript se bana hai (koi framework nahi), single `index.html` file me.

## 🚀 Live Demo
[Yaha apni GitHub Pages link daalo]

## ✨ Features

### Calculator
- Standard + Scientific mode (sin, cos, tan, sinh/cosh/tanh, log, ln, √, ∛, x², x³, 10ˣ, 1/x, n!, |x|, mod, nPr, nCr, π, e, random)
- Memory functions (M+, M−, MR, MC)
- Real expression parser — no `eval()`, handles brackets and operator precedence safely
- Voice input (🎤 speak your calculation) and voice output (🔊 hear the result)
- OCR — scan a photo of a calculation (📷) and auto-fill it
- Copy result, share result, print result

### 🟣 Programmer Calculator
Binary / Octal / Decimal / Hex conversion, AND / OR / XOR / NOT, left/right bit shift

### 🟡 Financial Calculator
EMI, GST, Discount, Tip, Loan, SIP, FD, RD, Simple Interest, Compound Interest

### 🟢 Health Calculator
BMI, Age, BMR, Ideal Weight

### 🔵 Unit Converter
Length, Weight, Temperature, Area, Volume, Speed, Time, Data Storage, Pressure, Energy

### 🟣 Currency Converter
INR / USD / EUR / GBP / JPY / AED with live exchange rates (needs internet)

### 📜 History & Dashboard
- Unlimited history saved in browser (LocalStorage)
- Search, favorite ⭐, pin 📌, add notes 📝, delete single entries
- Export as CSV or PDF, print history
- Dashboard: total calculations, today's count, most used operator, weekly usage chart, favorites count

### 🎨 UI
- 9 built-in themes (Glass, Light, Neon, Material, Ocean, Sunset, Forest, Mono, Pastel)
- Dark glassmorphism design with animated background
- Fully responsive (mobile + desktop)
- Adjustable font size, sound & vibration feedback toggles
- English / हिन्दी language toggle
- Keyboard shortcuts (digits, `+ - * /`, Enter, Backspace, Esc, brackets, `^`)

## 🛠️ Built With
- HTML5, CSS3, Vanilla JavaScript
- [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR
- [jsPDF](https://github.com/parallax/jsPDF) for PDF export
- [open.er-api.com](https://www.exchangerate-api.com/) for live currency rates
- Web Speech API for voice input/output

## 📌 Notes
- Live currency rates and OCR require an active internet connection.
- Voice input/output works best in Chrome/Edge (uses the browser's built-in Web Speech API).
- This is a client-side app — all your history and settings are stored locally in your own browser (LocalStorage), never sent anywhere.

## 👤 Author
**Itsmeankita**