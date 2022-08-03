import { Api } from './api';
import { Record } from './record';
import { RecordResponse } from './types';

import { AxiosError } from 'axios';
import { Modal } from 'bootstrap';
import CodeMirror, { EditorFromTextArea } from 'codemirror';

import 'bootstrap';
import 'codemirror/addon/mode/simple';
import './chord-md';

export const api = new Api('/api');

document.addEventListener('DOMContentLoaded', loadContents);

window.addEventListener('popstate', e => {
  env.setActiveRecordId(e.state.r, false);
});

window.addEventListener('unhandledrejection', function (e) {
  if (e.reason instanceof AxiosError) {
    e.preventDefault();
    console.warn(e.reason.message);
    console.log(e.reason.response);
  } else {
    console.log(e);
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleThemeChange);

window.addEventListener('storage', function (e) {
  if (e.storageArea === window.sessionStorage && e.key === 'profile') handleUserChange();
  console.log(e);
});

export const env = {
  _darkOverride: JSON.parse(window.localStorage.getItem('dark-override')!) ?? (null as boolean | null), // null - auto, true - force dark, false - force light
  get darkOverride() {
    return this._darkOverride;
  },
  set darkOverride(value) {
    this._darkOverride = value;
    if (value === null) {
      window.localStorage.removeItem('dark-override');
    } else {
      window.localStorage.setItem('dark-override', JSON.stringify(value));
    }
    handleThemeChange();
  },
  get systemDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  get darkMode() {
    return this.darkOverride ?? this.systemDarkMode;
  },

  _activeRecordId: null as string | null,
  get activeRecordId() {
    return this._activeRecordId;
  },
  set activeRecordId(value: string | null) {
    this.setActiveRecordId(value);
  },

  setActiveRecordId(value: string | null, pushState: boolean = true) {
    saveCurrentRecord();
    if (value !== this._activeRecordId) {
      this._activeRecordId = value;
      if (pushState) history.pushState({ r: value }, '', value === null ? '/' : `?r=${value}`);
      if (this._activeRecordId !== null) fetchRecordDetails(this._activeRecordId);
    }
    handleRecordChange();
  },

  get activeRecord() {
    return this.activeRecordId ? this.fetchedRecords[this.activeRecordId] : null;
  },

  _fetchedRecords: {} as { [id: string]: Record },
  get fetchedRecords() {
    return this._fetchedRecords;
  },
  set fetchedRecords(records) {
    this._fetchedRecords = records;
    handleCardsUpdate();
  },

  setFetchedRecordsFromResponseArray(array: Array<RecordResponse>) {
    const obj = {} as { [id: string]: Record };
    array.forEach(response => (obj[response.id] = new Record(response)));
    this._fetchedRecords = obj;
    handleCardsUpdate();
  },

  get profile() {
    if (sessionStorage.getItem('profile') === null) return { is_anonymous: true };
    else return JSON.parse(sessionStorage.getItem('profile')!);
  },
};

export const el = {
  cm: null as EditorFromTextArea | null,
  get root() {
    return document.querySelector<HTMLElement>(':root');
  },
  get body() {
    return document.querySelector<HTMLBodyElement>('body');
  },
  get username() {
    return document.querySelector<HTMLParagraphElement>('.username');
  },
  get browsePane() {
    return document.querySelector<HTMLDivElement>('.browse-pane');
  },
  get searchbar() {
    return document.querySelector<HTMLInputElement>('.searchbar input');
  },
  get browseItems() {
    return document.querySelector<HTMLUListElement>('.browse-items > .list-group');
  },
  get editorPane() {
    return document.querySelector<HTMLDivElement>('.editor-pane');
  },
  get editorTextArea() {
    return document.querySelector<HTMLTextAreaElement>('.editor-pane .contents');
  },
  get userBtn() {
    return document.querySelector<HTMLButtonElement>('.user-btn');
  },
  get themeCheckBox() {
    return document.querySelector<HTMLInputElement>('.theme-check');
  },
  get themeAutoCheckBox() {
    return document.querySelector<HTMLInputElement>('.theme-auto-check');
  },
  get logoutLink() {
    return document.querySelector<HTMLAnchorElement>('.logout-link');
  },
  get loginLink() {
    return document.querySelector<HTMLAnchorElement>('.login-link');
  },
  get loginModal() {
    return document.querySelector<HTMLDivElement>('#login-form-modal');
  },
  get loginForm() {
    return document.querySelector<HTMLFormElement>('.login-form');
  },
  get usernameInput() {
    return document.querySelector<HTMLInputElement>('.login-form #username');
  },
  get passwordInput() {
    return document.querySelector<HTMLInputElement>('.login-form #password');
  },
  get newBtns() {
    return document.querySelectorAll<HTMLButtonElement>('.new-btn');
  },
  get saveBtn() {
    return document.querySelector<HTMLButtonElement>('.save-btn');
  },
  get backBtn() {
    return document.querySelector<HTMLButtonElement>('.back-btn');
  },
  get delBtn() {
    return document.querySelector<HTMLButtonElement>('.del-btn');
  },
  get activeRecordCard() {
    return document.querySelector<HTMLAnchorElement>('[data-id].active');
  },
  get activeRecordCards() {
    return document.querySelectorAll<HTMLAnchorElement>(`[data-id].active, [data-id="${env.activeRecordId}"]`);
  },
  get authOnlyLis() {
    return document.querySelectorAll<HTMLLIElement>('li.auth-only');
  },
  get unauthOnlyLis() {
    return document.querySelectorAll<HTMLLIElement>('li.unauth-only');
  },
};

function handleUserChange() {
  if (el.username) el.username.innerHTML = env.profile.username ?? 'Guest';
  el.browsePane?.classList.toggle('d-md-flex', !env.profile.is_anonymous);
  el.browsePane?.classList.toggle('d-none', env.profile.is_anonymous);
  el.browsePane?.classList.toggle('d-md-none', env.profile.is_anonymous);
  el.root?.style.setProperty('--browse-pane-width', env.profile.is_anonymous ? '0' : '320px');
  [el.saveBtn, el.delBtn, el.backBtn, ...el.newBtns, el.browsePane].forEach(btn => {
    btn?.toggleAttribute('hidden', env.profile.is_anonymous);
  });

  if (env.activeRecordId) fetchRecordDetails(env.activeRecordId).catch(() => (env.activeRecordId = null));
  el.authOnlyLis.forEach(e => e.toggleAttribute('hidden', env.profile.is_anonymous));
  el.unauthOnlyLis.forEach(e => e.toggleAttribute('hidden', !env.profile.is_anonymous));

  el.themeCheckBox?.addEventListener('input', function () {
    env.darkOverride = el.themeCheckBox?.checked ?? null;
  });
  el.themeAutoCheckBox?.addEventListener('input', function () {
    env.darkOverride = el.themeAutoCheckBox?.checked ? null : el.themeCheckBox?.checked;
  });

  if (el.userBtn) {
    el.userBtn.dataset.bsToggle = 'dropdown';
  }

  if (env.profile.is_anonymous) {
    if (el.loginLink) {
      el.loginLink.dataset.bsToggle = 'modal';
      el.loginLink.dataset.bsTarget = '#login-form-modal';
    }

    el.loginForm?.addEventListener('submit', e => {
      e.preventDefault();
      const username = el.usernameInput?.value ?? '';
      const password = el.passwordInput?.value ?? '';
      api.authLogin(username, password).then(loadContents);
    });
    el.loginModal?.addEventListener('shown.bs.modal', () => {
      el.usernameInput?.focus();
    });
  } else {
    el.newBtns.forEach(e => e.addEventListener('click', createNewRecord));
    el.delBtn?.addEventListener('click', deleteCurrentRecord);

    el.logoutLink?.addEventListener('click', e => {
      e.preventDefault();
      saveCurrentRecord();
      api.authLogout().then(loadContents);
    });
  }
}

function handleRecordChange() {
  el.activeRecordCards.forEach(card => {
    card.classList.toggle('active', card.dataset.id === env.activeRecordId);
  });
  if (env.activeRecordId === null && el.cm) {
    el.cm.toTextArea();
  }

  const recordResponse = env.activeRecordId === null ? null : env.activeRecord?.response ?? null;
  el.browsePane?.classList.toggle('d-none', env.activeRecordId !== null);
  el.editorPane?.classList.toggle('d-none', env.activeRecordId === null);
  el.saveBtn?.toggleAttribute('hidden', env.profile.is_anonymous || !recordResponse?.can_edit);
  el.delBtn?.toggleAttribute('hidden', env.profile.is_anonymous || !recordResponse?.can_edit);

  if (!env.profile.is_anonymous && recordResponse?.can_edit) {
    (CodeMirror.commands as any).save = saveCurrentRecord;
    if (el.saveBtn)
      el.saveBtn.onclick = function (e) {
        e.preventDefault();
        saveCurrentRecord();
      };
  } else {
    if (el.saveBtn) el.saveBtn.onclick = null;
    (CodeMirror.commands as any).save = null;
  }
}

function handleThemeChange() {
  if (el.cm) {
    el.cm.setOption('theme', env.darkMode ? 'material-darker' : 'neat');
    el.cm.save();
  }
  el.body?.classList.toggle('dark', env.darkMode);

  if (el.themeCheckBox) el.themeCheckBox.checked = env.darkOverride == null ? env.darkMode : env.darkOverride;
  if (el.themeAutoCheckBox) el.themeAutoCheckBox.checked = env.darkOverride === null;
}

async function loadContents() {
  handleThemeChange();
  Modal.getInstance(el.loginModal as Element)?.hide();
  el.loginForm?.reset();

  const urlParams = new URLSearchParams(window.location.search);
  let r = null;
  if (urlParams.has('r')) r = urlParams.get('r');

  await fetchRecordsList();
  env.activeRecordId = r;

  handleUserChange();

  el.searchbar?.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      this.value = '';
      fetchRecordsList();
    }
  });
  el.searchbar?.addEventListener('input', function () {
    fetchRecordsList(this.value);
  });
  if (el.backBtn) {
    el.backBtn.onclick = function (e) {
      e.preventDefault();
      el.browsePane?.classList.remove('d-none');
      el.editorPane?.classList.add('d-none');
    };
  }
}

async function fetchRecordsList(search?: string) {
  if (env.profile.is_anonymous) {
    env.fetchedRecords = {};
    return;
  }
  try {
    const result = await api.getRecordsList(search);
    env.setFetchedRecordsFromResponseArray(result.results);
  } catch {
    env.fetchedRecords = {};
  }
}

async function fetchRecordDetails(id: string) {
  try {
    let record = env.fetchedRecords[id];
    if (!record) {
      record = new Record(await api.getRecordDetails(id));
      env.fetchedRecords = { ...env.fetchedRecords, [record.id]: record };
    }
    record.open();
  } catch {
    env.activeRecordId = null;
  }
}

function handleCardsUpdate() {
  let cards = new Array<HTMLAnchorElement>();
  let result = Object.values(env.fetchedRecords).sort(
    (a, b) => new Date(b.response.update_timestamp).getTime() - new Date(a.response.update_timestamp).getTime()
  );
  result.forEach(record => {
    cards.push(record.card);
  });
  el.browseItems?.replaceChildren(...cards);
}

async function createNewRecord() {
  saveCurrentRecord();
  const newRecord = await Record.create();
  env.fetchedRecords = { ...env.fetchedRecords, [newRecord.id]: newRecord };
  env.activeRecordId = newRecord.id;
}

async function deleteCurrentRecord() {
  const id = env.activeRecordId;
  if (!id) return;

  const record = env.fetchedRecords[id];
  await record.delete();
  const { [id]: string, ...rest } = env.fetchedRecords;
  env.fetchedRecords = rest;
  env.activeRecordId = null;
}

async function saveCurrentRecord() {
  const id = env.activeRecordId;
  if (!id || !env.fetchedRecords[id]) return;

  const result = await env.fetchedRecords[id].save();
  env.fetchedRecords = { ...env.fetchedRecords, [result.id]: result };
}
