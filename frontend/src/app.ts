import { EditorFromTextArea } from 'codemirror';

import * as CodeMirror from 'codemirror';
import '../node_modules/codemirror/addon/mode/simple.js';
import './chord-md.js';

window.addEventListener('popstate', e => {
  // TODO: Fix somehow. Same as in set activeRecordId(value), but no push state
  env._activeRecordId = e.state.r; 
  const activeElements = document.querySelectorAll(`[data-id].active, [data-id="${env._activeRecordId}"]`) as NodeListOf<HTMLElement>;
  activeElements.forEach(card => {
    card.classList.toggle('active', card.dataset.id === env._activeRecordId)
  });
  if (env._activeRecordId !== null) {
    loadRecord(env._activeRecordId);
  } else {
    if (cm !== undefined && cm !== null) {
      cm.toTextArea();
      const saveBtn: HTMLElement | null = document.querySelector('.save-btn')
      if (saveBtn !== null) saveBtn.onclick = null;
    }
  }
});

const csrftoken = getCookie('csrftoken');
let jwttoken: string | null;
var cm: EditorFromTextArea | null;

interface RecordDict {
  [id: string]: Record;
}

let env = {
  forceDark: false,
  forceLight: false,
  get systemDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  get darkMode() {
    return !this.forceLight && (this.systemDarkMode || this.forceDark);
  },
  updateEditorTheme() {
    if (cm !== undefined && cm !== null) {
      cm.setOption('theme', this.darkMode ? 'material-darker' : 'neat');
      cm.save();
    }
  },

  _activeRecordId: null as string | null,
  get activeRecordId() { return this._activeRecordId; },
  set activeRecordId(value) {
    if (value !== this._activeRecordId) {
      // console.log(value);
      history.pushState({ r: value }, '', (value === null) ? '/' : `?r=${value}`);
    }
    this._activeRecordId = value; 
    const activeELements = document.querySelectorAll(`[data-id].active, [data-id="${this._activeRecordId}"]`) as NodeListOf<HTMLElement>
    activeELements.forEach(card => {
      card.classList.toggle('active', card.dataset.id === this._activeRecordId)
    });
    if (this._activeRecordId !== null) {
      loadRecord(this._activeRecordId);
    } else {
      if (cm !== undefined && cm !== null) {
        cm.toTextArea();
        const saveBtn = document.querySelector('.save-btn') as HTMLElement | null
        if (saveBtn !== null) saveBtn.onclick = null;
      }
    } 
  },

  _browseRecords: {} as RecordDict,
  get browseRecords() {
    return this._browseRecords;
  },
  set browseRecords(records) {
    if (Array.isArray(records)) {
      const newRecords: RecordDict = {};
      records.forEach(record => newRecords[record.id] = record)
      this._browseRecords = newRecords;
    } else if (typeof records === 'object') {
      this._browseRecords = records;
    }
    localStorage.setItem("browseRecords", JSON.stringify(this._browseRecords));
    showEnvBrowseCards();
    
    const activeCard = document.querySelector('[data-id].active');
    if (activeCard !== null) activeCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
  },

  get profile() { return JSON.parse(sessionStorage.getItem('profile') ?? ""); },
  set profile(value) { sessionStorage.setItem('profile', JSON.stringify(value)); }
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('hi');
  fetch('/api/auth/token/refresh/', {
    method: 'POST',
  })
    .then(response => response.json())
    .then(result => {
      jwttoken = result.access;
      if (env.profile === null) {
        fetch('/api/auth/user/', {
          headers: {
            'authorization': `Bearer ${jwttoken}`,
          }
        })
          .then(response => response.json())
          .then(result => env.profile = result)
          .then(fetchRecords);
      } else { fetchRecords(); }
      const urlParams = new URLSearchParams(window.location.search);
      let r = null;
      if (urlParams.has('r')) r = urlParams.get('r');

      env.activeRecordId = r;
    })
  
  try { env.browseRecords = JSON.parse(localStorage.getItem("browseRecords") ?? ""); }
  catch (e) { console.log(e); }

  function fetchRecords() {
    if (!env.profile.is_anonymous) {
      fetch('/api/records', {
        headers: {
          'authorization': `Bearer ${jwttoken}`,
        }
      })
        .then(response => response.json())
        .then(result => {
          env.browseRecords = result.results === undefined ? {} : result.results;
        });
    }
    const username = document.querySelector('.username');
    if (username !== null) username.classList.toggle('d-none', env.profile.is_anonymous);
    const browsePane = document.querySelector('.username');
    if (browsePane !== null) browsePane.classList.toggle('d-md-flex', !env.profile.is_anonymous);
    const rootEl = document.querySelector(':root') as HTMLElement | null;
    if (rootEl !== null) rootEl.style.setProperty('--browse-pane-width', env.profile.is_anonymous ? '0' : '320px');
  }

  const searchbar: HTMLInputElement | null = document.querySelector('.searchbar input')
  if (searchbar !== null) searchbar.addEventListener('keypress', (function (this: typeof searchbar, e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.value = '';
      fetch('/api/records', {
        headers: {
          'authorization': `Bearer ${jwttoken}`,
        }
      })
        .then(response => response.json())
        .then(result => env.browseRecords = result.results === undefined ? {} : result.results);
    }
    if (e.key === 'Enter' || this.value.length >= 3) {
      fetch(`/api/records?search=${this.value}`, {
        headers: {
          'authorization': `Bearer ${jwttoken}`,
        }
      })
        .then(response => response.json())
        .then(result => env.browseRecords = result.results === undefined ? {} : result.results);
    }
  }) as EventListener);
  document.querySelectorAll('.new-btn').forEach(e => e.addEventListener('click', createNewRecord));
  document.querySelectorAll('.del-btn').forEach(e => e.addEventListener('click', deleteCurrentRecord));
});

interface Record {
  id: string;
  url: string;
  contents?: string;
  author: number;
  title_line: string;
  second_line: string;
  create_timestamp: string;
  update_timestamp: string;
  is_public: boolean;
  can_edit: boolean;
}

function showEnvBrowseCards() {
  let cards = new Array();
  let result = Object.values(env.browseRecords).sort(
    (a, b) => new Date(b.update_timestamp).getTime() - new Date(a.update_timestamp).getTime()
  );
  result.forEach(record => {
    let card = recordCard(record);
    cards.push(card);
  });
  // console.log(result);
  const listGroup = document.querySelector('.browse-items > .list-group')
  if (listGroup !== null) listGroup.replaceChildren(...cards);
}

function loadRecord(recordId: string) {
  fetch(`/api/records/${recordId}`, {
    headers: {
      'authorization': `Bearer ${jwttoken}`,
    },
  })
    .then(response => response.json())
    .then(result => {
      if (result.id !== undefined) {
        showRecord(result);
        // CodeMirror.commands.save = saveCurrentRecord;
      }
  })
}

function recordCard(record: Record) {
  const cardTemplate: HTMLTemplateElement | null = document.querySelector('template#item-card-template');
  const recordCard = cardTemplate?.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
  const titleLine = recordCard?.querySelector('.title-line');
  const secondLine = recordCard?.querySelector('.second-line');
  const timeStamp = recordCard?.querySelector('.timestamp')
  if (titleLine) titleLine.innerHTML = record.title_line;
  if (secondLine) secondLine.innerHTML = record.second_line;
  if (timeStamp) timeStamp
    .innerHTML = new Date(record.update_timestamp)
      .toLocaleString(undefined, {month: "short", day: "numeric", 
                                  hour: "numeric", minute: "numeric"});
  if (recordCard) {
    recordCard.setAttribute('href', `?r=${record.id}`);
    recordCard.classList.toggle('active', record.id === env.activeRecordId);
    recordCard.dataset.id = record.id;
    recordCard.onclick = (function (this: typeof recordCard, e: MouseEvent) {
      if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      env.activeRecordId = this.dataset.id ?? null;
    } as EventListener)
  } 
  return recordCard;
}

function showRecord(result: Record) {
  saveCurrentRecord()
  const saveBtn: HTMLButtonElement | null = document.querySelector('.save-btn');
  const backBtn: HTMLButtonElement | null = document.querySelector('.back-btn');
  const delBtn: HTMLButtonElement | null = document.querySelector('.del-btn');
  const browsePane = document.querySelector('.browse-pane');
  const editorPane = document.querySelector('.editor-pane');
  if (browsePane) browsePane.classList.add('d-none');
  if (editorPane) editorPane.classList.remove('d-none');
  const textArea: HTMLTextAreaElement | null = editorPane?.querySelector('.contents') ?? null;
  if (cm) {
    cm.toTextArea();
    if (saveBtn) saveBtn.onclick = null;
  }
  if (textArea) {
    textArea.value = result.contents ?? "";
    cm = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      autofocus: true,
      viewportMargin: Infinity,
      scrollbarStyle: 'native',
      mode: 'chords',
      theme: env.darkMode ? 'material-darker' : 'neat',
      readOnly: result.can_edit ? false : 'nocursor',
    });
  
    if (saveBtn) saveBtn.toggleAttribute('hidden', !result.can_edit);
    if (delBtn) delBtn.toggleAttribute('hidden', !result.can_edit);
    if (result.can_edit) {
      if (saveBtn) saveBtn.onclick = function (e) {
        e.preventDefault();
        saveCurrentRecord();
      }
    } else {
      if (saveBtn) saveBtn.onclick = null;
    }
  }
  if (backBtn) backBtn.onclick = function (e) {
    e.preventDefault();
    if (browsePane) browsePane.classList.remove('d-none');
    if (editorPane) editorPane.classList.add('d-none');
  }
  // createTooltips();
  
}

// function createTooltips() {
//   let chords = document.querySelectorAll(".cm-chord");
//   chords.forEach(async chord => {
//     // const response = await fetch(`https://api.uberchord.com/v1/embed/chords?nameLike=${chord.innerHTML}`);
//     // const result = await response.text();
//     // const embedHtml = document.createElement('div');
//     // embedHtml.innerHTML = result;
//     // console.log(embedHtml);
//     // chord.title = `${embedHtml.innerHTML}`;
//     const hd = document.createElement('div');
//     hd.innerHTML = `<div data-autosize="1" data-no-icon="1" class="uberchord-chords" data-search-by="nameLike" data-search-query="${chord.innerHTML}"></div>`;
//     hd.setAttribute('hidden', '');
//     chord.appendChild(hd);
//     chord.dataset.bsHtml = "true";
//     chord.dataset.bsTitle = ``;
//     chord.dataset.bsToggle = "tooltip";
//     new bootstrap.Tooltip(chord);
//   });
// }

function createNewRecord() {
  saveCurrentRecord();
  fetch(`/api/records`, {
    method: 'POST',
    headers: {
      'X-CSRFToken': csrftoken,
      'authorization': `Bearer ${jwttoken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    } as HeadersInit,
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
      'authorization': `Bearer ${jwttoken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    } as HeadersInit,
    mode: 'same-origin', // Do not send CSRF token to another domain.
  })
    .then(response => {
      if (response.status == 204) {
        console.log(response);
        let newBrowseRecords = env.browseRecords;
        if (id && newBrowseRecords[id]) delete newBrowseRecords[id];
        env.browseRecords = newBrowseRecords;
        env.activeRecordId = null;
      }
    });
}

function saveCurrentRecord() {
  const textArea: HTMLInputElement | null = document.querySelector('.contents');
  if (cm) {
    const oldContents = textArea?.value;
    cm.save();
    const newContents = textArea?.value;
    const id = env.activeRecordId;
    if (oldContents !== newContents && id !== null) {
      fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: {
          'X-CSRFToken': csrftoken,
          'authorization': `Bearer ${jwttoken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        } as HeadersInit,
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
 function getCookie(name: string) {
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