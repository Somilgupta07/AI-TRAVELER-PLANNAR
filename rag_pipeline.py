"""
rag_pipeline.py - The heart of our RAG (Retrieval-Augmented Generation) system.

What is RAG?
  Instead of just asking an AI a question, we first SEARCH our own documents
  for relevant information, then give that info to the AI as "context".
  This grounds the AI's answer in real, specific data.

Flow:
  User query → embed query → search FAISS index → get top chunks →
  build prompt with context → send to Gemini → return answer
"""

import os
import logging
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

logger = logging.getLogger(__name__)


class TravelRAG:
    def __init__(self, docs_folder="travel_docs"):
        """
        Set up the RAG system.
        docs_folder: the folder containing our .txt knowledge base files
        """
        self.docs_folder = docs_folder

        # We'll store raw text chunks and which file they came from
        self.chunks = []        # List of text strings
        self.chunk_sources = [] # List of filenames (one per chunk)

        # The FAISS index will hold our vector embeddings for fast search
        self.index = None

        # Load the sentence transformer model for creating embeddings
        # all-MiniLM-L6-v2 is fast, small, and works great for semantic search
        logger.info("Loading sentence transformer model...")
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Embedding model loaded.")

        # Set up Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables.")
        genai.configure(api_key=api_key)

        # NOTE: If this model name becomes invalid, change it here in ONE place.
        # Check https://ai.google.dev/models for the latest model names.
        self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Gemini model initialized.")

    # ─────────────────────────────────────────────
    # STEP 1: Load documents from the travel_docs/ folder
    # ─────────────────────────────────────────────
    def load_documents(self):
        """
        Read all .txt files from the docs folder.
        Returns a list of (filename, full_text) tuples.
        """
        documents = []
        if not os.path.exists(self.docs_folder):
            logger.warning(f"Docs folder '{self.docs_folder}' not found!")
            return documents

        for filename in os.listdir(self.docs_folder):
            if filename.endswith(".txt"):
                filepath = os.path.join(self.docs_folder, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read().strip()
                if text:
                    documents.append((filename, text))
                    logger.info(f"Loaded: {filename}")

        logger.info(f"Total documents loaded: {len(documents)}")
        return documents

    # ─────────────────────────────────────────────
    # STEP 2: Split documents into smaller chunks
    # ─────────────────────────────────────────────
    def chunk_documents(self, documents, chunk_size=500, overlap=50):
        """
        Split large documents into smaller overlapping chunks.
        Why? FAISS searches work better on smaller, focused pieces of text.

        chunk_size: approx number of characters per chunk
        overlap: characters shared between consecutive chunks (for continuity)
        """
        all_chunks = []
        all_sources = []

        for filename, text in documents:
            # Split by sliding window
            start = 0
            while start < len(text):
                end = start + chunk_size
                chunk = text[start:end].strip()
                if chunk:
                    all_chunks.append(chunk)
                    all_sources.append(filename)
                start += chunk_size - overlap  # overlap keeps context flowing

        logger.info(f"Total chunks created: {len(all_chunks)}")
        return all_chunks, all_sources

    # ─────────────────────────────────────────────
    # STEP 3: Build the FAISS vector index
    # ─────────────────────────────────────────────
    def build_index(self):
        """
        This is the main setup method. It:
        1. Loads all text files
        2. Chunks them
        3. Creates embeddings (vectors) for each chunk
        4. Stores vectors in a FAISS index for fast similarity search
        """
        # Load and chunk documents
        documents = self.load_documents()
        if not documents:
            logger.warning("No documents found. RAG will work without context.")
            return

        self.chunks, self.chunk_sources = self.chunk_documents(documents)

        # Create embeddings for all chunks
        # An embedding is a list of numbers that represents the meaning of text
        logger.info("Creating embeddings for all chunks...")
        embeddings = self.embedding_model.encode(self.chunks, show_progress_bar=True)
        embeddings = np.array(embeddings).astype("float32")

        # Build the FAISS index
        # IndexFlatL2 = exact search using Euclidean distance
        dimension = embeddings.shape[1]  # Size of each embedding vector
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings)

        logger.info(f"FAISS index built with {self.index.ntotal} vectors.")

    # ─────────────────────────────────────────────
    # STEP 4: Retrieve relevant chunks for a query
    # ─────────────────────────────────────────────
    def retrieve(self, query, top_k=5):
        """
        Given a user query, find the top_k most relevant text chunks.

        How it works:
        1. Convert the query into an embedding vector
        2. Search the FAISS index for similar vectors
        3. Return the matching chunks and their source filenames
        """
        if self.index is None or len(self.chunks) == 0:
            logger.warning("No index available. Returning empty context.")
            return [], []

        # Embed the query using the same model we used for documents
        query_embedding = self.embedding_model.encode([query])
        query_embedding = np.array(query_embedding).astype("float32")

        # Search FAISS: returns distances and indices of nearest neighbors
        distances, indices = self.index.search(query_embedding, top_k)

        # Collect the relevant chunks and their source file names
        retrieved_chunks = []
        retrieved_sources = []

        for idx in indices[0]:
            if idx < len(self.chunks):  # Safety check
                retrieved_chunks.append(self.chunks[idx])
                retrieved_sources.append(self.chunk_sources[idx])

        # Deduplicate source names for display (keep order)
        unique_sources = list(dict.fromkeys(retrieved_sources))

        logger.info(f"Retrieved {len(retrieved_chunks)} chunks from: {unique_sources}")
        return retrieved_chunks, unique_sources

    # ─────────────────────────────────────────────
    # STEP 5: Generate a travel plan using Gemini
    # ─────────────────────────────────────────────
    def generate_plan(self, user_query):
        """
        Full RAG pipeline:
        1. Retrieve relevant chunks
        2. Build a detailed prompt with context
        3. Send to Gemini
        4. Return the answer and source names
        """
        # Retrieve context from our knowledge base
        retrieved_chunks, sources = self.retrieve(user_query)

        # Build context string from retrieved chunks
        if retrieved_chunks:
            context = "\n\n---\n\n".join(retrieved_chunks)
            context_section = f"""
Here is relevant travel information from our knowledge base to help you:

{context}

---
"""
        else:
            context_section = "(No specific context found in knowledge base. Use your general knowledge.)\n"

        # Build the full prompt for Gemini
        prompt = f"""
You are an expert AI travel planner. A user has requested help planning a trip.

{context_section}

User's Travel Request:
{user_query}

Please create a detailed, well-structured travel plan that includes ALL of the following sections.
Use clear headings for each section. Format it so it looks great when displayed as HTML.

1. 🗓️ Day-wise Itinerary
   - Break the trip into days with morning, afternoon, and evening activities.

2. 💰 Estimated Budget Breakdown
   - Provide a realistic cost breakdown (accommodation, food, transport, activities, misc).
   - Total the estimated cost.

3. 🎒 Packing Checklist
   - List essential items to pack based on destination type and activities.

4. 📅 Best Time to Visit
   - Mention the ideal months to visit and why.

5. 🍽️ Local Food Suggestions
   - List 5-8 must-try local dishes or restaurants.

6. 💡 Travel Tips
   - Provide 5-7 practical tips specific to this destination and travel type.

7. 🏛️ Nearby Attractions
   - List 4-6 interesting places to visit nearby.

8. 🛡️ Safety Tips
   - Provide 4-5 important safety tips for this destination.

Make the response friendly, helpful, and specific. Use emojis to make it visually appealing.
"""

        logger.info("Sending prompt to Gemini...")

        try:
            response = self.gemini_model.generate_content(prompt)
            answer = response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            answer = f"Error generating response from Gemini: {str(e)}"

        return {
            "answer": answer,
            "sources": sources
        }
