window.addEventListener('popstate', e => loadRecord(e.state.r));

const csrftoken = getCookie('csrftoken');
var cm;
let darkMode;

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
  }
}

document.addEventListener('DOMContentLoaded', () => {
  darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const urlParams = new URLSearchParams(window.location.search);
  let r = null;
  if (urlParams.has('r')) r = urlParams.get('r');
  
  console.log(cm)
  
  fetch('/api/records')
    .then(response => response.json())
    .then(result => {
      console.log(result);
      let cards = new Array();
      result.results.forEach(record => {
        let card = recordCard(record);
        cards.push(card);
      });
      document.querySelector('.browse-items > .list-group').replaceChildren(...cards);
      if (r !== null) loadRecord(r);
    });
  
});

function loadRecord(recordId) {
  fetch(`/api/records/${recordId}`)
  .then(response => response.json())
    .then(result => {
      showRecord(result)
  })
}

function recordCard(record) {
  let recordCard = document.querySelector('.item-card').cloneNode(true);
  recordCard.querySelector('.title-line').innerHTML = record.title_line;
  recordCard.querySelector('.second-line').innerHTML = record.second_line;
  recordCard.querySelector('.timestamp')
    .innerHTML = new Date(record.update_timestamp)
      .toLocaleString(undefined, {month: "short", day: "numeric", 
                                  hour: "numeric", minute: "numeric"});
  recordCard.setAttribute('href', `?r=${record.id}`);
  recordCard.dataset.id = record.id;
  recordCard.onclick = function (e) {
    if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    loadRecord(this.dataset.id);
    history.pushState({ r: this.dataset.id }, '', `?r=${this.dataset.id}`);
  }
  return recordCard;
}

function showRecord(result) {
  const saveBtn = document.querySelector('.save-btn')
  const textArea = document.querySelector('.contents');
  if (cm !== undefined) {
    cm.toTextArea();
    textArea.dataset.activeId = null;
    saveBtn.onclick = null;
  }
  textArea.value = result.contents;
  cm = CodeMirror.fromTextArea(textArea, {
    lineWrapping: true,
    lineNumbers: true,
    autofocus: true,
    viewportMargin: Infinity,
    scrollbarStyle: 'native',
    theme: env.darkMode ? 'material-darker' : 'neat',
  });
  textArea.dataset.activeId = result.id;
  saveBtn.onclick = function (e) {
    e.preventDefault();
    saveCurrentRecord();
  }
  document.querySelectorAll('[data-id]').forEach(card => {
    card.classList.toggle('active', card.dataset.id === result.id)
  })
}

function saveCurrentRecord() {
  const textArea = document.querySelector('.contents');
  if (cm !== undefined) {
    cm.save();
    const newContents = textArea.value;
    const id = textArea.dataset.activeId;
    if (id !== null) {
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
        .then(result => {
          const recordCard = document.querySelector(`[data-id=${result.id}]`)
          if (recordCard !== null) {
            recordCard.replaceWith(recordCard(result));
          }
          showRecord(result);
        });
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