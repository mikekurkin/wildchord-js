import { EditorFromTextArea } from 'codemirror';
import { Api } from './api';
import { RecordDict, RecordResponse } from './types';

import { AxiosError } from 'axios';
import CodeMirror from 'codemirror';
import '../node_modules/codemirror/addon/mode/simple.js';
import './chord-md.js';

const api = new Api('/api');

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

window.addEventListener('unhandledrejection', function (e) {
  if (e.reason instanceof AxiosError) {
    e.preventDefault();
    console.warn(e.reason.message);
    console.log(e.reason.response);
  } else {console.log(e)}
}) 

let cm: EditorFromTextArea | null;

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
    saveCurrentRecord();
    if (value !== this._activeRecordId) {
      // console.log(value);
      history.pushState({ r: value }, '', (value === null) ? '/' : `?r=${value}`);
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
    }
  },

  _browseRecords: {} as RecordDict,
  get browseRecords(): RecordDict {
    return this._browseRecords;
  },
  set browseRecords(records: [RecordResponse] | RecordDict) {
    if (Array.isArray(records)) {
      const newRecords: RecordDict = {};
      records.forEach(record => newRecords[record.id] = record)
      this._browseRecords = newRecords;
    } else if (typeof records === 'object') {
      this._browseRecords = records;
    }
    // localStorage.setItem("browseRecords", JSON.stringify(this._browseRecords));
    showEnvBrowseCards();
    
    const activeCard = document.querySelector('[data-id].active');
    if (activeCard !== null) activeCard.scrollIntoView({ block: 'center', behavior: 'smooth' });
  },

  get profile() {
    if (sessionStorage.getItem('profile') === null) return {is_anonymous: true}
    else return JSON.parse(sessionStorage.getItem('profile')!);
  },
  set profile(value) { sessionStorage.setItem('profile', JSON.stringify(value)); }
}


document.addEventListener('DOMContentLoaded', loadContents);

async function loadContents() {
  if (!env.profile.is_anonymous) await fetchRecords();
  // document.querySelector('.user')?.classList.toggle('d-none', env.profile.is_anonymous);
  const username = document.querySelector('.username');
  if (username) username.innerHTML = env.profile.is_anonymous ? "Log In" : env.profile.username;
  document.querySelector('.browse-pane')?.classList.toggle('d-md-flex', !env.profile.is_anonymous); 
  document.querySelector('.browse-pane')?.classList.toggle('d-none',  env.profile.is_anonymous); 
  const rootEl = document.querySelector(':root') as HTMLElement | null;
  rootEl?.style.setProperty('--browse-pane-width', env.profile.is_anonymous ? '0' : '320px');
  
  const urlParams = new URLSearchParams(window.location.search);  
  let r = null;
  if (urlParams.has('r')) r = urlParams.get('r');

  document.querySelector('.browse-pane')?.classList.toggle('d-none', r !== null); 

  env.activeRecordId = r;
  
  // try { env.browseRecords = JSON.parse(localStorage.getItem("browseRecords") ?? ""); }
  // catch (e) { console.log(e); }  

  async function fetchRecords(search?: string) {
    await api.getRecordsList(search)
      .then(result => env.browseRecords = result.results)
      .catch(() => env.browseRecords = {});
  }

  const searchbar: HTMLInputElement | null = document.querySelector('.searchbar input')
  searchbar?.addEventListener('keydown', (function (e) {
    if (e.key === 'Escape') {
      this.value = '';
      fetchRecords();
    }
  }))
  searchbar?.addEventListener('input', (function () {
    fetchRecords(this.value)
  }))
  
  const userBtn: HTMLButtonElement | null = document.querySelector('.user-btn');

  if (env.profile.is_anonymous) {
    if (userBtn) {
      userBtn.dataset.bsToggle = "modal";
      userBtn.dataset.bsTarget = "#login-form-modal";
    }
    const loginForm = document.querySelector('.login-form')
    if (loginForm) {
      const usernameInput: HTMLInputElement | null = loginForm.querySelector('#username');
      const passwordInput: HTMLInputElement | null = loginForm.querySelector('#password');
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const username = usernameInput?.value ?? "";
        const password = passwordInput?.value ?? "";
        api.authLogin(username, password)
          .then(() => {
            loadContents();
            bootstrap.Modal.getInstance(document.querySelector('#login-form-modal')).hide();
          })
          .catch(e => console.log(e))
      });
      document.querySelector('#login-form-modal')?.addEventListener('shown.bs.modal', () => {
        usernameInput?.focus();
      })
    }
  } else {
    document.querySelectorAll('.new-btn').forEach(e => e.addEventListener('click', createNewRecord));
    document.querySelectorAll('.del-btn').forEach(e => e.addEventListener('click', deleteCurrentRecord));
    if (userBtn) {
      userBtn.dataset.bsToggle = "dropdown";
      const logoutLink = document.querySelector('.logout-link');
      logoutLink?.addEventListener('click', e => {
        e.preventDefault();
        api.authLogout()
          .then(() => location.reload())
          .catch(e => console.log(e))
      })
    }
  }
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
  document.querySelector('.browse-items > .list-group')?.replaceChildren(...cards);
}

function loadRecord(recordId: string) {
  api.getRecordDetails(recordId)
    .then(result => {
      showRecord(result);
      (CodeMirror.commands as any).save = saveCurrentRecord;
    })
}

function recordCard(record: RecordResponse) {
  const cardTemplate: HTMLTemplateElement | null = document.querySelector('template#item-card-template');
  const recordCard = cardTemplate?.content.firstElementChild?.cloneNode(true) as HTMLElement | null;
  const titleLine = recordCard?.querySelector('.title-line');
  const secondLine = recordCard?.querySelector('.second-line');
  const timeStamp = recordCard?.querySelector('.timestamp')
  if (titleLine) titleLine.innerHTML = record.title_line;
  if (secondLine) secondLine.innerHTML = record.second_line;
  if (timeStamp) timeStamp.innerHTML = new Date(record.update_timestamp)
    .toLocaleString(undefined, {month: "short", day: "numeric", 
                                hour: "numeric", minute: "numeric"});
  if (recordCard) {
    recordCard.setAttribute('href', `?r=${record.id}`);
    recordCard.classList.toggle('active', record.id === env.activeRecordId);
    recordCard.dataset.id = record.id;
    recordCard.onclick = (function (this: typeof recordCard, e: MouseEvent) {
      if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey || e.button !== 0) return;
      e.preventDefault();
      env.activeRecordId = this.dataset.id ?? null;
    } as EventListener)
  } 
  return recordCard;
}

function showRecord(result: RecordResponse) {
  
  const saveBtn: HTMLButtonElement | null = document.querySelector('.save-btn');
  const backBtn: HTMLButtonElement | null = document.querySelector('.back-btn');
  const delBtn: HTMLButtonElement | null = document.querySelector('.del-btn');
  const browsePane = document.querySelector('.browse-pane');
  const editorPane = document.querySelector('.editor-pane');
  browsePane?.classList.add('d-none');
  editorPane?.classList.remove('d-none');
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
  
    saveBtn?.toggleAttribute('hidden', env.profile.is_anonymous || !result.can_edit);
    delBtn?.toggleAttribute('hidden', env.profile.is_anonymous || !result.can_edit);
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
    browsePane?.classList.remove('d-none');
    editorPane?.classList.add('d-none');
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
  api.createRecord()
    .then(result => {
      env.browseRecords = { ...env.browseRecords, [result.id]: result }
      env.activeRecordId = result.id;
    });
}

function deleteCurrentRecord() {
  const id = env.activeRecordId
  if (id) api.deleteRecord(id)
    .then(() => {
      let newBrowseRecords = env.browseRecords;
      if (id && newBrowseRecords[id]) delete newBrowseRecords[id];
      env.browseRecords = newBrowseRecords;
      env.activeRecordId = null;
    });
}

function saveCurrentRecord() {
  const textArea: HTMLInputElement | null = document.querySelector('.contents');
  if (cm) {
    const oldContents = textArea?.value;
    cm.save();
    const newContents = textArea?.value;
    const id = env.activeRecordId;
    if (oldContents !== newContents && id !== null && newContents !== undefined) {
      api.editRecord(id, newContents)
        .then(result => env.browseRecords = { ...env.browseRecords, [result.id]: result });
    }
  }
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", function () {
    env.updateEditorTheme();
  });
