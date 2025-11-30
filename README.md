Real-Time Collaborative Code Editor

A lightweight, high-performance web application that allows developers to edit code together in real-time. Featuring file management, live cursor tracking, and an integrated code execution environment, this tool simplifies remote pair programming.

📸 Demo & Preview

See the application in action.


1. The Workspace
   
   <img width="1867" height="963" alt="maineditor" src="https://github.com/user-attachments/assets/e3384a2a-15be-443e-aaf0-b858001a8aff" />

    A clean, dark-themed coding environment optimized for focus.

3. Real-Time Collaboration
    [colab-demo.webm](https://github.com/user-attachments/assets/46d459f8-acce-4778-8efb-557e1ff269c4)

    See other users' cursors and edits instantly as they type.

4. Code Execution & Terminal
    [code-execution-demo.webm](https://github.com/user-attachments/assets/51d8baf2-50e1-4ebe-8a12-58a12b3fca7b)

    Execute Python code directly in the browser and see results immediately.

✨ Features

    Real-Time Collaboration: Powered by WebSockets, multiple users can edit the same file simultaneously with sub-second latency.

    Live Presence: See exactly where your teammates are working with color-coded remote cursors.

    File System Management: Create, switch between, and manage multiple files within a single room.

    Smart Autocomplete: Includes a mocked AI-style autocomplete that suggests code snippets (Ghost Text) as you type.

    Integrated Runner: Built-in Python execution engine to run your scripts and view output in an integrated terminal.

    Auto-Save: Changes are synced to the backend database to ensure work is never lost.

🚀 Installation & Setup

Prerequisites

    Node.js (v16 or higher)

    npm or yarn

    Python 3.9+ (For the backend)

1. Backend Setup

Important: The backend is hosted in a separate repository. You must set it up first for the application to work.

    Visit the backend repository: https://github.com/Indrane/prototype-backend

    Follow the instructions in that repository's README to:

        Clone the code.

        Install Python dependencies (fastapi, uvicorn, sqlalchemy, etc.).

        Start the server (usually running on port 8000).

2. Frontend Setup

Once your backend is running, follow these steps to set up the user interface:

    Clone this repository:
    Bash

git clone https://github.com/Indrane/frontend
cd frontend

Install dependencies:
Bash

npm install
# or
yarn install

Start the development server:
Bash

    npm start
    # or
    yarn start

    Open your browser and navigate to http://localhost:3000 (or the port shown in your terminal).

🧪 How to Test & Run the System

Follow these steps to verify that the collaboration and execution features are working correctly.

Step 1: Create a Room

When you first open the application, you may be redirected to a room or asked to create one (depending on current routing).

   
   <img width="1920" height="1080" alt="room-hompage" src="https://github.com/user-attachments/assets/2fae572b-b759-429f-b43b-090997a4bede" />


Step 2: Create a New File

    Look at the "EXPLORER" sidebar on the left.

    Click + New File.

    Enter a name (e.g., script.py).

    The new file will appear in the list and automatically open.

    
   <img width="1920" height="1080" alt="create-new-file" src="https://github.com/user-attachments/assets/d16913c9-008f-48f3-802c-5f58a0be55cf" />


Step 3: Test Real-Time Sync

    Open the same URL (including the Room ID) in a second browser window or Incognito tab.

    Arrange the windows side-by-side.

    Type code in Window A.

    Verify: You should see the text appear in Window B instantly, along with a colored cursor showing the other user's position.

    
   <img width="1920" height="1080" alt="colab-sidebyside" src="https://github.com/user-attachments/assets/1fc77999-e2f1-4de1-b552-b128d95be2a5" />


Step 4: Run Code

    Type a simple Python script, for example:
    Python

    print("Hello from the collaborative editor!")

    Click the ▶ Run button in the top right header.

    Verify: The "TERMINAL" panel at the bottom should display the output.

    
   <img width="1920" height="1080" alt="run-demo" src="https://github.com/user-attachments/assets/e81ea912-53e8-4cae-b0cc-d68dfb995731" />


Step 5: Autocomplete

    Type a common keyword like def or import and wait a split second.

    Verify: A grey "ghost text" suggestion should appear. Press Tab to accept it.

   <img width="1920" height="1080" alt="autocomplete" src="https://github.com/user-attachments/assets/a4cb8e02-c1e1-45e8-bfb3-d996b5f5da00" />


🛠️ Technology Stack

    Frontend: React, TypeScript, Monaco Editor (VS Code core), Styled Components

    Backend: Python, FastAPI, WebSockets, SQLAlchemy

    Database: PostgreSQL (Compatible)
