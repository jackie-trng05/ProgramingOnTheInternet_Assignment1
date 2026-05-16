//Getting the important html elements for later use
const form = document.getElementById('flashcardForm');
const flashcardsDiv = document.getElementById('flashcards');
const addFlashcardSection = document.getElementById('addFlashcardSection');
const addGroupBtn = document.getElementById('addGroupBtn');
const toast = document.getElementById('toast');
const confirmModal = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOk');
const confirmCancelBtn = document.getElementById('confirmCancel');

// Backend API base URL (same origin or fallback to localhost)
const backendURL = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://localhost:3000';

// Use the authFetch helper from login.js if available, otherwise fallback to native fetch.
async function authFetch(url, options = {}) {
  const helper = window.authFetch || ((u, o) => fetch(u, o));
  return helper(url, options);
}

let studyPile = []; //Stores the cards being studied
let currentIndex = 0; //Tracks the current card position

//Displays a temporary error message to the user 
function showToast(message = 'Something went wrong. Please try again.') {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

//Confirmation modal functionality (Waits for the users response and returns a promise that is either true or false)
function showConfirm(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmModal.classList.remove('hidden');

    const handleOk = () => {
      confirmModal.classList.add('hidden');
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      confirmModal.classList.add('hidden');
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      confirmOkBtn.removeEventListener('click', handleOk);
      confirmCancelBtn.removeEventListener('click', handleCancel);
    };

    confirmOkBtn.addEventListener('click', handleOk);
    confirmCancelBtn.addEventListener('click', handleCancel);
  });
}

//Function used to make sure we can't add a flashcard during edit or study mode
function hideAddFlashCardSection() {
  addFlashcardSection.style.display = 'none';
  form.style.display = 'none';
}

//Function to show the add flashcard section again after study or edit mode
function showAddFlashCardSection() {
  addFlashcardSection.style.display = '';
  form.style.display = '';
}

//Loading groups from the backend and fills the drop down menu
async function loadGroups() {
  try {
    const res = await authFetch(`${backendURL}/groups`);
    if (!res.ok) throw new Error('Could not load groups');
    const groups = await res.json();

    const select = document.getElementById('group');
    select.innerHTML = '<option value="">Select group</option>';
    groups.forEach(g => {
      const option = document.createElement('option');
      option.value = g.name;
      option.textContent = g.name;
      select.appendChild(option);
    });

    return groups;
  } catch (err) {
    showToast('Could not load groups. Is the server running?');
    return [];
  }
}

//Adding a new group by sending a request to the backend
async function addGroup() {
  const name = document.getElementById('newGroup').value.trim();
  if (!name) return;

  try {
    await authFetch(`${backendURL}/groups`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });

    document.getElementById('newGroup').value = '';
    loadGroups();
    loadFlashcards();
  } catch (err) {
    showToast('Could not add group. Is the server running?');
  }
}

if (addGroupBtn) {
  addGroupBtn.addEventListener('click', addGroup);
}

//Deleting a group by sending a request
async function deleteGroup(name) {
  const confirmed = await showConfirm(`Delete group "${name}" and all its flashcards?`);
  if (!confirmed) return;

  try {
    await authFetch(`${backendURL}/groups/${name}`, { method: 'DELETE' });
    loadGroups();
    loadFlashcards();
  } catch (err) {
    showToast('Could not delete group. Is the server running?');
  }
}

//Loading and displaying all the groups and their flashcards
async function loadFlashcards() {
  showAddFlashCardSection(); //Make sure the add flashcard section is visible when we load the flashcards

  try {
    //Fetching groups and flashcards from the backend
      const groupsRes = await authFetch(`${backendURL}/groups`);
      const cardsRes = await authFetch(`${backendURL}/flashcards`);
      const groups = groupsRes.ok ? await groupsRes.json() : [];
      const cards = cardsRes.ok ? await cardsRes.json() : [];

    //Reseting the UI and adding a header 
    flashcardsDiv.innerHTML = '<h2>Groups</h2>';

    //Looping through the groups and creating a section for each group with its flashcards
    groups.forEach(groupObj => {
      const groupName = groupObj.name;
      const groupCards = cards.filter(c => c.group === groupName);

      const div = document.createElement('div');
      div.classList.add('flashcard');

      //Displays group name and number of cards 
      const title = document.createElement('h3');
      const cardCount = groupCards.length;
      title.textContent = `${groupName} — ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`;
      div.appendChild(title);

      //Container for all the buttons for the group (study, edit, delete)
      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '5px';

      //Study button
      const studyBtn = document.createElement('button');
      studyBtn.textContent = 'Study';
      studyBtn.onclick = (e) => {
        e.stopPropagation();
        startStudyMode(groupName, groupCards);
      };
      btnContainer.appendChild(studyBtn);

      //Edit button
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        showEditMode(groupName, groupCards);
      };
      btnContainer.appendChild(editBtn);

      //Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteGroup(groupName);
      };
      btnContainer.appendChild(delBtn);

      div.appendChild(btnContainer);
      flashcardsDiv.appendChild(div);
    });
  } catch (err) { //Error message for if server is unreachable
    flashcardsDiv.innerHTML = `
      <div class="done-message">
        <p>Could not connect to the server.</p>
        <p>Please make sure the server is running and refresh the page.</p>
        <button onclick="loadFlashcards()">Try Again</button>
      </div>
    `;
    showToast('Could not load flashcards. Is the server running?');
  }
}

//Function to start the study mode for a specific group
function startStudyMode(groupName, groupCards) {
  hideAddFlashCardSection(); //Hide the add flashcard section during study mode

  //original order so we can reset if the user toggles switches back from randomised
  let originalOrder = [...groupCards]; 
  
  //Study pile is the array that will be modified as the user goes through the flashcards (we dont want to change the original array)
  studyPile = [...groupCards];
  currentIndex = 0;

  let randomised = false; 
 
  //Function to render the current flashcard and the study mode UI
  //(It is a closure so it has access to the study pile and current index variables)
  function renderCard() {
    flashcardsDiv.innerHTML = ''; //Clear the any of the previosu UI

    //UI for when all cards have been studied
    if (studyPile.length === 0) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('study-mode-wrapper');
      wrapper.innerHTML = `<h2>${groupName}</h2>`;

      const doneDiv = document.createElement('div');
      doneDiv.classList.add('done-message');
      doneDiv.innerHTML = `<p>All cards studied!</p>`;

      const backBtn = document.createElement('button');
      backBtn.textContent = 'Back to Groups';
      backBtn.onclick = loadFlashcards;
      doneDiv.appendChild(backBtn);

      wrapper.appendChild(doneDiv);
      flashcardsDiv.appendChild(wrapper);
      return;
    }

    //Get the current card and create the UI elements
    const card = studyPile[currentIndex];
    let isFlipped = false;
    let isAnimating = false;

    const wrapper = document.createElement('div');
    wrapper.classList.add('study-mode-wrapper');

    //Tittle
    const title = document.createElement('h2');
    title.textContent = `${groupName} - Study Mode`;
    wrapper.appendChild(title);

    //Card Counter
    const counter = document.createElement('p');
    counter.classList.add('card-counter');
    counter.textContent = `Card ${currentIndex + 1} of ${studyPile.length}`;
    wrapper.appendChild(counter);

    //Flashcard display
    const cardEl = document.createElement('div');
    cardEl.classList.add('study-flashcard');
    cardEl.innerHTML = `<strong>Q:</strong> ${card.question}`;
    wrapper.appendChild(cardEl);

    //Contianer for the answer and correct/incorrect buttons
    const cardBtnRow = document.createElement('div');
    cardBtnRow.classList.add('study-controls-wrapper');

    const cardBtns = document.createElement('div');
    cardBtns.classList.add('study-btn-row');

    //Show/Hide answer button
    const answerBtn = document.createElement('button');
    answerBtn.textContent = 'Show Answer';
    answerBtn.onclick = () => {
      if (!isFlipped) {
        isFlipped = true;
        cardEl.innerHTML = `<strong>Q:</strong> ${card.question}<br><br><strong>A:</strong> ${card.answer}`;
        answerBtn.textContent = 'Hide Answer';
      } else {
        isFlipped = false;
        cardEl.innerHTML = `<strong>Q:</strong> ${card.question}`;
        answerBtn.textContent = 'Show Answer';
      }
    };
    cardBtns.appendChild(answerBtn);

    //Correct button (removes the card from the pile)
    const tickBtn = document.createElement('button');
    tickBtn.textContent = '✅';
    //hover effect
    tickBtn.addEventListener('mouseenter', () => {
      cardEl.classList.add('hover-correct');
    });
    tickBtn.addEventListener('mouseleave', () => {
      cardEl.classList.remove('hover-correct');
    });
    tickBtn.onclick = () => {
      if (isAnimating) return;
      isAnimating = true;
      //Animation to remove the card from the pile
      cardEl.classList.remove('hover-correct');
      cardEl.classList.add('correct-anim');
      setTimeout(() => {
        studyPile.splice(currentIndex, 1);
        renderCard();
      }, 800);
    };
    cardBtns.appendChild(tickBtn);

    //Incorrect button (moves the card to the end of the pile so that studnet can study again)
    const crossBtn = document.createElement('button');
    crossBtn.textContent = '❌';
    //Hover effect
    crossBtn.addEventListener('mouseenter', () => {
      cardEl.classList.add('hover-wrong');
    });
    crossBtn.addEventListener('mouseleave', () => {
      cardEl.classList.remove('hover-wrong');
    });
    //Animation to move card to the end of the pile
    crossBtn.onclick = () => {
      if (isAnimating) return;
      isAnimating = true;
      cardEl.classList.remove('hover-wrong');
      cardEl.classList.add('wrong-anim');
      setTimeout(() => {
        const c = studyPile.splice(currentIndex, 1)[0];
        studyPile.push(c);
        renderCard();
      }, 600);
    };
    cardBtns.appendChild(crossBtn);

    cardBtnRow.appendChild(cardBtns);
    wrapper.appendChild(cardBtnRow);

    //Navigation buttons (Randomise and back to groups)
    const navBtnRow = document.createElement('div');
    navBtnRow.classList.add('study-controls-wrapper');

    const navBtns = document.createElement('div');
    navBtns.classList.add('study-btn-row');

    //Randomise button (Shuffles the study pile and resets the index)
    const randomBtn = document.createElement('button');
    randomBtn.textContent = randomised ? 'Randomise: On' : 'Randomise: Off';
    randomBtn.style.backgroundColor = randomised ? 'var(--btn-success)' : '';
    randomBtn.onclick = () => {
      randomised = !randomised;
      if (randomised) {
        studyPile = shuffleArray([...studyPile]); //Shuffle card
      } else {
        studyPile = [...originalOrder]; //Reset to original order
      }
      currentIndex = 0;
      renderCard();
    };
    navBtns.appendChild(randomBtn);

    //Back to groups button
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back to Groups';
    backBtn.onclick = loadFlashcards;
    navBtns.appendChild(backBtn);

    navBtnRow.appendChild(navBtns);
    wrapper.appendChild(navBtnRow);

    flashcardsDiv.appendChild(wrapper);
  }

  renderCard();
}

// Function used to shuffle the array (in randomise in study mode) using Fisher-Yates algorithm
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

//Function to start the edit mode for a specific group
function showEditMode(groupName, groupCards) {
  hideAddFlashCardSection();
  flashcardsDiv.innerHTML = `<h2>${groupName} - Edit Mode</h2>`;

  //Loop through the flashcards and create its UI with edit and delete buttons for each card
  groupCards.forEach(card => {
    const div = document.createElement('div');
    div.classList.add('flashcard');

    //Display the card content
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('card-content');
    contentDiv.innerHTML = `
      <strong>Q:</strong> ${card.question}<br>
      <strong>A:</strong> ${card.answer}<br>
    `;
    div.appendChild(contentDiv);

    const editBtnRow = document.createElement('div');
    editBtnRow.classList.add('edit-btn-row');

    //Edit button which turns into a save button 
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
      //Replace the text with input fields for the user to edit the question and answer
      contentDiv.innerHTML = `
        <input class="edit-input" id="editQ-${card._id}" value="${card.question}"><br>
        <input class="edit-input" id="editA-${card._id}" value="${card.answer}">
      `;

      editBtn.textContent = 'Save';

      //When the user clicks the save button, we send a request to the backend to update the card
      editBtn.onclick = async () => {
        const newQuestion = document.getElementById(`editQ-${card._id}`).value.trim();
        const newAnswer = document.getElementById(`editA-${card._id}`).value.trim();
        if (!newQuestion || !newAnswer) return;
        await editCard({ ...card, question: newQuestion, answer: newAnswer });
      };
    };

    //Delete button which sends a request to the backend to delete the card
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteCard(card._id);

    editBtnRow.appendChild(editBtn);
    editBtnRow.appendChild(deleteBtn);
    div.appendChild(editBtnRow);

    flashcardsDiv.appendChild(div);
  });

  //Back to groups button
  const backBtn = document.createElement('button');
  backBtn.textContent = 'Back to Groups';
  backBtn.onclick = loadFlashcards;
  flashcardsDiv.appendChild(backBtn);
}

//Handles adding a new flashcard by sending the data to the backend
form.addEventListener('submit', async (e) => {
  e.preventDefault(); //Prevent the reload of the page on form submission

  const question = document.getElementById('question').value.trim();
  const answer = document.getElementById('answer').value.trim();
  const group = document.getElementById('group').value;

  if (!question || !answer || !group) return;

  try {
    await authFetch(`${backendURL}/flashcards`, {
      method: 'POST',
      body: JSON.stringify({ question, answer, group })
    });

    form.reset();
    loadFlashcards();
  } catch (err) {
    showToast('Could not add flashcard. Is the server running?');
  }
});

//Deletes a flashcard by its id by sending a request to the backend
async function deleteCard(id) {
  const confirmed = await showConfirm('Delete this flashcard?');
  if (!confirmed) return;

  try {
    await authFetch(`${backendURL}/flashcards/${id}`, { method: 'DELETE' });
    loadFlashcards();
  } catch (err) {
    showToast('Could not delete flashcard. Is the server running?');
  }
}

//Edits a flashcard by its id by sending the updated data to the backend
async function editCard(card) {
  try {
    await authFetch(`${backendURL}/flashcards/${card._id}`, {
      method: 'PUT',
      body: JSON.stringify({ question: card.question, answer: card.answer, group: card.group })
    });

    loadFlashcards();
  } catch (err) {
    showToast('Could not update flashcard. Is the server running?');
  }
}

// Initialize the app: if the user is already authenticated, load groups and flashcards.
if (window.isAuthenticated && window.isAuthenticated()) {
  loadGroups();
  loadFlashcards();
}