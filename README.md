 # AutoAssistant (CarGuide)

[🇹🇷 Türkçe Versiyon (Turkish Version)](README_TR.md)

An end-to-end AI-powered automotive management and advisory platform designed to eliminate information asymmetry in the used car market. This project provides a transparent, reliable, and user-friendly mobile experience for vehicle maintenance, diagnostics, and valuation.

##  Key Features

* **AI-Powered Damage Detection:** Uses a custom-trained **YOLOv11** computer vision model to identify and evaluate the severity of exterior damages (dents, scratches, cracks) from images, helping buyers avoid hidden flaws.
* **Smart Price Prediction:** A predictive machine learning pipeline using **Scikit-learn** estimates the fair market value of used cars dynamically based on historical data.
* **Intelligent OBD-II Diagnostics:** Leverages **Google Gemini AI (LLM)** to translate complex, technical engine fault codes (DTCs) into easy-to-understand, user-friendly explanations.
* **Hybrid Vehicle Recommendation Engine:** Acts as a personalized auto consultant by combining traditional SQL filtering with generative AI analysis (Gemini) to recommend vehicles matching subjective criteria like comfort, performance, and reliability.

##  Technology Stack

* **Frontend (Mobile App):** React Native, Expo, Custom Premium UI (Glassmorphism).
* **Backend:** Python, Flask, RESTful APIs, JWT Authentication.
* **Machine Learning & AI:** PyTorch, Ultralytics YOLOv11 (Computer Vision), Scikit-Learn (Predictive ML), Google Gemini AI (Generative AI / NLP).
* **Database:** SQLite (Relational database modeling for users, history, and vehicle listings), Pandas for data processing.

##  Architecture
The system employs an edge-to-cloud architecture. Heavy AI tasks (YOLO model inference and GenAI calls) are processed on a fast Python backend, leaving the mobile application lightweight and responsive for the end-user.
