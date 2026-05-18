//Admin view: fetch and display all users learning history
async function loadAdminHistory() {
  flashcardsDiv.innerHTML = '';
  hideAddFlashCardSection();

  try {
    const res = await authFetch(`${backendURL}/history/all`);
    const history = await res.json();

    const wrapper = document.createElement('div');
    wrapper.classList.add('full-row');

    const title = document.createElement('h2');
    title.textContent = 'Admin — Learning History';
    title.classList.add('text-center');
    wrapper.appendChild(title);

    if (history.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No study history yet.';
      empty.classList.add('text-center');
      wrapper.appendChild(empty);
      flashcardsDiv.appendChild(wrapper);
      return;
    }

    const tableWrapper = document.createElement('div');
    tableWrapper.classList.add('data-table-wrapper');

    const table = document.createElement('table');
    table.classList.add('data-table');

    table.innerHTML = `
      <thead>
        <tr>
          <th>User</th>
          <th>Question</th>
          <th>Answer</th>
          <th>Result</th>
          <th>Time</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    history.forEach((entry) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.user_id}</td>
        <td>${entry.question}</td>
        <td>${entry.answer}</td>
        <td>${entry.correct ? '✅' : '❌'}</td>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    wrapper.appendChild(tableWrapper);
    flashcardsDiv.appendChild(wrapper);
  } catch (err) {
    showToast('Error loading admin history.');
  }
}
