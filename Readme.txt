Flashcard Learning App

HOW TO RUN 
1. Open your terminal and navigate to the Backend folder:
   cd Backend
3. Start the server:
   node server.js
4. Wait until you see the following in the terminal:
   Connected to MongoDB Atlas
   Server running on port 3000: http://localhost:3000
5. Click the link or open your browser and go to:
   http://localhost:3000

Note: The server must be running the whole time you use the app.
      If you close the terminal the app will stop working. 
      It is okay for the marker to use the credential in the .env
      as these credentials were just created for this assignment. 


PROJECT SUMMARY 
Students often find the best way to retain information is through using flashcards. 
However it is often time consuming to create physical flashcards. Hence this app allows users
to create and study flashcards which are grouped by subjects online. It alows for study mode 
where you can reveal the answer, randomise the card order making studying easier. 

TECHNICAL STACK 
Frontend:     HTML, CSS, Vanilla JavaScript (Single Page Application)
Styling:      Custom CSS with CSS variables, keyframe animations, and responsive layout
Backend:      Node.js with Express
Database:     MongoDB Atlas (cloud-hosted NoSQL database)
API:          RESTful API connecting frontend to backend via fetch()
Deployment:   Local (localhost:3000)

FEATURES
- Create flashcard groups (subjects)
- Add flashcards with a question and answer to any group
- Edit existing flashcard questions and answers
- Delete individual flashcards or entire groups (with all their cards)
- Study mode with question first reveal, answer shown only on request
- Tick to mark a card as known and remove it from the pile
- Cross to send a card to the back of the pile for more practice
- Smooth fade-out animation when a card is answered correctly
- Shake animation with red glow when a card is marked wrong
- Green glow on card when hovering tick, red glow when hovering cross
- Randomise card order toggle in study mode


FOLDER STRUCTURE
ProgramingOnTheInternet_Assignment1/
  Readme.txt
  Frontend/
    index.html        - Single HTML file
    styles.css        - All styling including animations and theme variables
    app.js            - All frontend logic, DOM manipulation, and API calls
    images/
      Card.png        - background image used for study cards
  Backend/
    server.js         - Express server with all REST API routes
    .env              - MongoDB connection string

CHALLENGES OVERCOME 
One early security mistake i made was commiting the MongoDB connection string 
and password to GitHub. I moved it to an .env file and the .env to the .gitignore 
so that the credentials are never pushed to GitHub. Another challange that was 
overcome was using a custom image as the flashcard background in study mode. It required
careful CSS tuning so that the background size and position would make the note fit perfectly.
Another challenge was positioning and sizing the buttons for the study mode. This was 
unexpectedly tricky as the buttons were inside a flex container that was inheriting the 
card width and stretching the buttons to full height making them look weird. This required 
wrapping them in a sepearte container div to break out of the flex context

TEST LOGINS
There are two test users seeded into the database on server start:

- admin@example.com / admin
- testuser@example.com / testuser