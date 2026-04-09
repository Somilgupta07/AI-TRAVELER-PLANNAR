# 🗺️ AI Travel Planner with RAG

> A full-stack AI web app that generates personalized travel plans using **Retrieval-Augmented Generation (RAG)** — powered by Flask, FAISS, SentenceTransformers, and Gemini 2.5 Flash.

---

## 📌 Project Overview

This project is a smart travel planning assistant that combines a local knowledge base (`.txt` files) with Google's Gemini AI model. Instead of just asking Gemini a question, we first **search our own documents** for relevant travel information using FAISS vector search, then feed that context to the AI to generate a grounded, accurate response.

This is a hands-on implementation of a RAG pipeline — built from scratch without LangChain.

---

## ✨ Features

- 🧠 **RAG pipeline** — retrieves real context before calling the AI
- 🗓️ **Day-wise itinerary** generation
- 💰 **Budget breakdown** estimation
- 🎒 **Packing checklist** based on destination type
- 🍽️ **Local food suggestions**
- 🛡️ **Safety tips** and travel advice
- 📚 **Shows source documents** used in the response
- 🎨 **Beautiful UI** with warm editorial design
- 📱 **Mobile responsive**

---

## 🛠️ Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Backend     | Python, Flask                            |
| LLM         | Gemini 2.5 Flash (via google-generativeai) |
| Embeddings  | sentence-transformers (all-MiniLM-L6-v2) |
| Vector DB   | FAISS (faiss-cpu)                        |
| Frontend    | HTML, CSS, Vanilla JavaScript            |
| Config      | python-dotenv (.env file)                |

---

## 📁 Folder Structure

```
ai-travel-planner-rag/
│
├── app.py                  # Flask server — routes and request handling
├── rag_pipeline.py         # RAG engine — load, embed, search, generate
├── requirements.txt        # Python dependencies
├── .env.example            # Template for environment variables
├── README.md               # You are here
│
├── travel_docs/            # Knowledge base (.txt files)
│   ├── manali.txt
│   ├── goa.txt
│   ├── jaipur.txt
│   ├── ladakh.txt
│   ├── budget_tips.txt
│   ├── mountain_packing.txt
│   ├── beach_packing.txt
│   ├── safety_tips.txt
│   └── transport_tips.txt
│
├── templates/
│   └── index.html          # Main HTML page
│
└── static/
    ├── style.css           # Styling
    └── script.js           # Frontend JavaScript
```

---

## 🚀 Setup Instructions

### 1. Clone or download the project

```bash
git clone https://github.com/Somilgupta07/ai-travel-planner-rag.git
cd ai-travel-planner-rag
```

### 2. Create a Python virtual environment

```bash
# Create the environment
python -m venv venv

# Activate it:
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ First run will download the sentence-transformer model (~90MB). This is automatic.

### 4. Set up your Gemini API key

```bash
# Copy the example file
cp .env.example .env

# Open .env and replace with your actual key:
# GEMINI_API_KEY=your_actual_key_here
```

Get your free Gemini API key at: https://aistudio.google.com/app/apikey

### 5. Run the app

```bash
python app.py
```

### 6. Open in browser

Visit: **http://localhost:5000**

---

## 💡 Example Usage

1. Enter **destination**: `Manali`
2. Enter **budget**: `₹12,000`
3. Enter **days**: `4`
4. Select **travel type**: `Friends`
5. Select **interests**: Adventure, Nature, Food
6. (Optional) Custom request: *"We prefer homestays over hotels and love local food"*
7. Click **Generate My Travel Plan**

The app will:
- Search the knowledge base for Manali info, packing tips, and budget tips
- Build a rich prompt with that context
- Send it to Gemini 2.5 Flash
- Display a full structured travel plan

---

## 🔬 How the RAG Pipeline Works

```
User Input
    │
    ▼
Build Query String
    │
    ▼
Embed Query using SentenceTransformers (all-MiniLM-L6-v2)
    │
    ▼
Search FAISS Index → Top 5 Matching Chunks
    │
    ▼
Build Prompt:
  [System Role] + [Retrieved Context] + [User Request]
    │
    ▼
Send to Gemini 2.5 Flash API
    │
    ▼
Return: Travel Plan + Source File Names
    │
    ▼
Render in Browser
```

### Why RAG?

Without RAG, the AI might give vague or generic answers. With RAG:
- The AI has **specific, accurate info** about the destination
- We can **update the knowledge base** without retraining the model
- The AI is less likely to **hallucinate** details
- The response is **grounded in real data**

---

## ⚙️ Changing the Gemini Model

The model name is defined in **one place only** in `rag_pipeline.py`:

```python
self.gemini_model = genai.GenerativeModel("gemini-2.5-flash-preview-04-17")
```

To update: Change this string to the latest model name from https://ai.google.dev/models

---

## 🔮 Future Improvements

1. **Add more destinations** — Extend the `travel_docs/` folder with more city `.txt` files (Rishikesh, Varanasi, Coorg, etc.)
2. **PDF knowledge base** — Allow uploading PDFs as knowledge sources instead of just `.txt` files
3. **User accounts** — Save and revisit past travel plans using a database (SQLite/PostgreSQL)
4. **Export to PDF** — Allow users to download their travel plan as a formatted PDF
5. **Voice input** — Add speech-to-text for the destination and custom query fields
6. **Multilingual support** — Generate plans in Hindi, French, etc. using Gemini's multilingual capability
7. **Hotel/flight links** — Integrate with travel APIs (Skyscanner, MakeMyTrip) to show real-time prices
8. **Map integration** — Show the itinerary on an interactive map using Google Maps JS API

---

## 📄 Resume-Ready Project Description

> **AI Travel Planner with RAG** | Python, Flask, FAISS, SentenceTransformers, Gemini API
>
> Built a full-stack AI travel planning application implementing a Retrieval-Augmented Generation (RAG) pipeline from scratch. The system embeds a local knowledge base of travel documents using SentenceTransformers (all-MiniLM-L6-v2), indexes them with FAISS for fast semantic search, and retrieves contextually relevant chunks to ground Gemini 2.5 Flash's responses. The Flask backend exposes a REST API that accepts user travel preferences, performs vector similarity search, and returns structured day-wise itineraries, budget breakdowns, and packing checklists. Frontend built with vanilla HTML/CSS/JS with async fetch for a smooth single-page experience.

---

## 📃 License

MIT License — free to use and modify for personal and educational projects.
