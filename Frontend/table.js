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
    title.textContent = 'Learning History';
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
        <td>${entry.correct ? '<span style="color:var(--btn-success)">✔</span>' : '<span style="color:var(--btn-danger)">✘</span>'}</td>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
      `;
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    wrapper.appendChild(tableWrapper);
    flashcardsDiv.appendChild(wrapper);

    // Users table
    const usersRes = await authFetch(`${backendURL}/admin/users`);
    const users = await usersRes.json();

    const usersWrapper = document.createElement('div');
    usersWrapper.classList.add('full-row');

    const usersTitle = document.createElement('h2');
    usersTitle.textContent = 'All Users';
    usersTitle.classList.add('text-center');
    usersWrapper.appendChild(usersTitle);

    const usersTableWrapper = document.createElement('div');
    usersTableWrapper.classList.add('data-table-wrapper');

    const usersTable = document.createElement('table');
    usersTable.classList.add('data-table');

    usersTable.innerHTML = `
      <thead>
        <tr>
          <th>Username</th>
          <th>Role</th>
          <th>Last Login</th>
          <th></th>
        </tr>
      </thead>
    `;

    const usersTbody = document.createElement('tbody');
    users.forEach((user) => {
      const row = document.createElement('tr');

      const usernameCell = document.createElement('td');
      usernameCell.textContent = user.username;

      const roleCell = document.createElement('td');
      roleCell.textContent = user.role;

      const lastLoginCell = document.createElement('td');
      lastLoginCell.textContent = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';

      const actionCell = document.createElement('td');
      actionCell.classList.add('table-action-cell');
      if (user.role !== 'Admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('btn-danger');
        deleteBtn.dataset.action = 'delete-user';
        deleteBtn.addEventListener('click', async () => {
          const confirmed = await showConfirm(`Delete user "${user.username}" and all their data?`);
          if (!confirmed) return;
          const delRes = await authFetch(`${backendURL}/admin/users/${encodeURIComponent(user.username)}`, { method: 'DELETE' });
          if (delRes.ok) {
            row.remove();
            showToast('User deleted.', true);
          } else {
            const data = await delRes.json();
            showToast(data.error || 'Error deleting user.');
          }
        });
        actionCell.appendChild(deleteBtn);
      }

      row.appendChild(usernameCell);
      row.appendChild(roleCell);
      row.appendChild(lastLoginCell);
      row.appendChild(actionCell);
      usersTbody.appendChild(row);
    });

    usersTable.appendChild(usersTbody);
    usersTableWrapper.appendChild(usersTable);
    usersWrapper.appendChild(usersTableWrapper);
    flashcardsDiv.appendChild(usersWrapper);
  } catch (err) {
    showToast('Error loading admin history.');
  }
}
