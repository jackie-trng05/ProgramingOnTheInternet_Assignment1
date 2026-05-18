// Creates a labelled search bar row and returns { row, input }
function createSearchBar(placeholder) {
  const searchRow = document.createElement('div');
  searchRow.classList.add('edit-search-row');

  const searchLabel = document.createElement('label');
  searchLabel.textContent = 'Search:';
  searchLabel.classList.add('search-label');
  searchRow.appendChild(searchLabel);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = placeholder;
  searchInput.classList.add('search-input');
  searchRow.appendChild(searchInput);

  return { row: searchRow, input: searchInput };
}

// Ensures the groups header (title + search bar) exists in its dedicated container.
// Creates it on first call; on subsequent calls returns the existing input.
function ensureGroupsHeader(_, onSearch) {
  const existing = document.getElementById('groups-search');
  if (existing) return existing;

  const container = document.getElementById('groups-header-area');

  const headerDiv = document.createElement('div');
  headerDiv.classList.add('groups-header');

  const title = document.createElement('h2');
  title.textContent = 'Groups';
  headerDiv.appendChild(title);

  const { row: searchRow, input } = createSearchBar('Search groups...');
  input.id = 'groups-search';
  input.addEventListener('input', onSearch);
  headerDiv.appendChild(searchRow);

  container.innerHTML = '';
  container.appendChild(headerDiv);

  return input;
}
