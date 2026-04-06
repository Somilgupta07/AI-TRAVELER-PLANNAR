"""
app.py - Main Flask application for AI Travel Planner with RAG
This file sets up our web server, handles routes, and connects the frontend to our RAG pipeline.
"""

import os
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from rag_pipeline import TravelRAG

# Load environment variables from .env file
load_dotenv()

# Set up basic logging so we can see what's happening in the terminal
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Create the Flask app
app = Flask(__name__)

# Initialize the RAG pipeline ONCE when the app starts
# This is efficient - we don't want to reload documents on every request
logger.info("Initializing RAG pipeline at startup...")
rag = TravelRAG(docs_folder="travel_docs")
rag.build_index()
logger.info("RAG pipeline ready!")


@app.route("/")
def home():
    """Serve the main page."""
    return render_template("index.html")


@app.route("/plan", methods=["POST"])
def plan():
    """
    This route handles the travel plan generation request.
    It receives user input, builds a query, runs it through RAG, and returns the result.
    """
    try:
        # Get JSON data from the frontend
        data = request.get_json()

        # Extract all the fields sent from the form
        destination = data.get("destination", "").strip()
        budget = data.get("budget", "").strip()
        days = data.get("days", "").strip()
        travel_type = data.get("travel_type", "solo").strip()
        interests = data.get("interests", [])  # This is a list
        custom_query = data.get("custom_query", "").strip()

        # Make sure at least destination is provided
        if not destination:
            return jsonify({"error": "Please enter a destination."}), 400

        # Build a clean, descriptive query string from all the user inputs
        interests_str = ", ".join(interests) if interests else "general sightseeing"
        query = f"Plan a {days}-day trip to {destination} for {travel_type} travelers with a budget of {budget}."
        query += f" Interests include: {interests_str}."
        if custom_query:
            query += f" Additional request: {custom_query}"

        logger.info(f"Generating plan for query: {query}")

        # Pass the query to the RAG pipeline
        result = rag.generate_plan(query)

        # Return the generated plan and sources back to the frontend
        return jsonify({
            "plan": result["answer"],
            "sources": result["sources"]
        })

    except Exception as e:
        logger.error(f"Error generating plan: {e}")
        return jsonify({"error": f"Something went wrong: {str(e)}"}), 500


# Run the app
if __name__ == "__main__":
    app.run(debug=True, port=5000)
