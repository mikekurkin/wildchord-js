window.addEventListener('popstate', e => loadRecord(e.state.r));

const csrftoken = getCookie('csrftoken');
var cm;


let env = {
  forceDark: false,
  forceLight: false,
  get systemDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  get darkMode() {
    return !this._forceLight && (this.systemDarkMode || this._forceDark);
  },
  updateEditorTheme() {
    if (cm !== undefined) {
      cm.setOption('theme', this.darkMode ? 'material-darker' : 'neat');
      cm.save();
    }
  },

  _activeRecordId: null,
  get activeRecordId() {
    return this._activeRecordId;
  },
  set activeRecordId(value) {
    if (value !== this._activeRecordId) {
      history.pushState({ r: value }, '', `?r=${value}`);
    }
    this._activeRecordId = value; 
    document.querySelectorAll(`[data-id].active, [data-id="${this._activeRecordId}"]`).forEach(card => {
      card.classList.toggle('active', card.dataset.id === this._activeRecordId)
    });
    if (this._activeRecordId !== null) loadRecord(this._activeRecordId);
  },

  _browseRecords: {},
  get browseRecords() {
    return this._browseRecords;
  },
  set browseRecords(records) {
    if (Array.isArray(records)) {
      const newRecords = new Object();
      records.forEach(record => newRecords[record.id] = record)
      this._browseRecords = newRecords;
    } else if (typeof records === 'object') {
      this._browseRecords = records;
    }
    localStorage.setItem("browseRecords", JSON.stringify(this._browseRecords));
    showEnvBrowseCards();
  },
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  let r = null;
  if (urlParams.has('r')) r = urlParams.get('r');

  try { env.browseRecords = JSON.parse(localStorage.getItem("browseRecords")); }
  catch (e) { console.log(e); }
  fetch('/api/records')
  .then(response => response.json())
    .then(result => {
      env.browseRecords = result.results;
      env.activeRecordId = r;
      const activeCard = document.querySelector('[data-id].active');
      if (activeCard !== null) activeCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

  document.querySelector('.searchbar input').addEventListener('keypress', function (e) {
    console.log(e);
    if (e.keyCode === 27) {
      this.value = '';
      fetch('/api/records')
        .then(response => response.json())
        .then(result => env.browseRecords = result.results);
    }
    if (e.keyCode === 13 || this.value.length >= 3) {
      fetch(`/api/records?search=${this.value}`)
        .then(response => response.json())
        .then(result => env.browseRecords = result.results);
    }
  });
  document.querySelectorAll('.new-btn').forEach(e => e.addEventListener('click', createNewRecord));
  document.querySelectorAll('.del-btn').forEach(e => e.addEventListener('click', deleteCurrentRecord));
});

function showEnvBrowseCards() {
  let cards = new Array();
  let result = Object.values(env.browseRecords).sort(
    (a, b) => new Date(b.update_timestamp).getTime() - new Date(a.update_timestamp).getTime()
  );
  result.forEach(record => {
    let card = recordCard(record);
    cards.push(card);
  });
  document.querySelector('.browse-items > .list-group').replaceChildren(...cards);
}

function loadRecord(recordId) {
  fetch(`/api/records/${recordId}`)
  .then(response => response.json())
  .then(result => {
    showRecord(result);
    CodeMirror.commands.save = saveCurrentRecord;
  })
}

function recordCard(record) {
  const cardTemplate = document.querySelector('template#item-card-template');
  const recordCard = cardTemplate.content.firstElementChild.cloneNode(true);
  recordCard.querySelector('.title-line').innerHTML = record.title_line;
  recordCard.querySelector('.second-line').innerHTML = record.second_line;
  recordCard.querySelector('.timestamp')
    .innerHTML = new Date(record.update_timestamp)
      .toLocaleString(undefined, {month: "short", day: "numeric", 
                                  hour: "numeric", minute: "numeric"});
  recordCard.setAttribute('href', `?r=${record.id}`);
  recordCard.classList.toggle('active', record.id === env.activeRecordId);
  recordCard.dataset.id = record.id;
  recordCard.onclick = function (e) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    env.activeRecordId = this.dataset.id;
    
  }
  return recordCard;
}

function showRecord(result) {
  saveCurrentRecord()
  const saveBtn = document.querySelector('.save-btn');
  const backBtn = document.querySelector('.back-btn');
  const browsePane = document.querySelector('.browse-pane');
  const editorPane = document.querySelector('.editor-pane');
  browsePane.classList.add('d-none');
  editorPane.classList.remove('d-none');
  const textArea = editorPane.querySelector('.contents');
  if (cm !== undefined) {
    cm.toTextArea();
    saveBtn.onclick = null;
  }
  textArea.value = result.contents;
  cm = CodeMirror.fromTextArea(textArea, {
    lineNumbers: true,
    autofocus: true,
    viewportMargin: Infinity,
    scrollbarStyle: 'native',
    mode: 'chords',
    theme: env.darkMode ? 'material-darker' : 'neat',
  });
  saveBtn.onclick = function (e) {
    e.preventDefault();
    saveCurrentRecord();
  }
  backBtn.onclick = function (e) {
    e.preventDefault();
    browsePane.classList.remove('d-none');
    editorPane.classList.add('d-none');
  }
  
  

function createNewRecord() {
  saveCurrentRecord();
  fetch(`/api/records`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrftoken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    mode: 'same-origin', // Do not send CSRF token to another domain.
    body: JSON.stringify({
      contents: '',
    }),
  })
    .then(response => response.json())
    .then(result => {
      env.browseRecords = { ...env.browseRecords, [result.id]: result }
      env.activeRecordId = result.id;
    });
}

function deleteCurrentRecord() {
  const id = env.activeRecordId
  fetch(`/api/records/${id}`, {
    method: 'DELETE',
    headers: {
      'X-CSRFToken': csrftoken,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    mode: 'same-origin', // Do not send CSRF token to another domain.
  })
    .then(response => {
      if (response.status == 204) {
        console.log(response);
        let newBrowseRecords = env.browseRecords;
        delete newBrowseRecords[id];
        env.browseRecords = newBrowseRecords;
        env.activeRecordId = null;
      }
    });
}

function saveCurrentRecord() {
  const textArea = document.querySelector('.contents');
  if (cm !== undefined) {
    const oldContents = textArea.value;
    cm.save();
    const newContents = textArea.value;
    const id = env.activeRecordId;
    if (oldContents !== newContents && id !== null) {
      fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: {
          'X-CSRFToken': csrftoken,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'same-origin', // Do not send CSRF token to another domain.
        body: JSON.stringify({
          contents: newContents,
        }),
      })
        .then(response => response.json())
        .then(result => env.browseRecords = { ...env.browseRecords, [result.id]: result });
    }
  }
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", function () {
    env.updateEditorTheme();
  });

/**
 * Function that helps get CSRF token from cookies
 * 
 * Source: {@link https://docs.djangoproject.com/en/4.0/ref/csrf/#ajax}
 */
 function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}