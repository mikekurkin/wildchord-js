import { Api } from './api';
import { Record } from './record';
import { NullUser, RecordResponse, User } from './types';

import axios, { AxiosError } from 'axios';
import { Modal, Toast } from 'bootstrap';

import { EditorView } from '@codemirror/view';

import 'bootstrap';

export const api = new Api(`${window.location.protocol.toString()}//${window.location.hostname.toString()}:8000/api`);

document.addEventListener('DOMContentLoaded', loadContents);

window.addEventListener('popstate', e => {
  if (e.state.r) env.setActiveRecordId(e.state.r, false);
  history.replaceState(history.state, document.title, window.location.pathname);
});

window.addEventListener('unhandledrejection', function (e) {
  if (e.reason instanceof AxiosError && e.reason.response) {
    e.preventDefault();
    const res = e.reason.response;
    if (el.errorAlert && el.errorMsg) {
      if (res.status === 400) {
        const { non_field_errors, ...rest } = res.data;
        const strs = [non_field_errors, ...Object.values(rest)];
        el.errorMsg.innerHTML = strs.length > 0 ? strs.join('\n') : `${res.status}: ${res.data.detail}`;
      } else {
        el.errorMsg.innerHTML = `${res.status}: ${res.data.detail}`;
      }
      const toast = Toast.getOrCreateInstance(el.errorAlert);
      toast.show();
    }
  }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleThemeChange);

window.addEventListener('storage', function (e) {
  if (e.storageArea === window.localStorage && e.key === 'profile') handleUserChange();
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

  async setActiveRecordId(value: string | null, pushState: boolean = true) {
    saveCurrentRecord();
    if (value !== this._activeRecordId) {
      this._activeRecordId = value;
      if (pushState) history.pushState({ r: value }, '', value === null ? '/' : `/r/${value}`);
      if (this._activeRecordId !== null) {
        await fetchRecordDetails(this._activeRecordId);
      }
    }
    handleRecordChange();
  },

  get activeRecord() {
    if (!this.activeRecordId || !this.fetchedRecords[this.activeRecordId]) return null;
    else return this.fetchedRecords[this.activeRecordId];
  },

  _fetchedRecords: {} as { [id: string]: Record },
  get fetchedRecords() {
    return this._fetchedRecords;
  },
  set fetchedRecords(records) {
    this._fetchedRecords = records;
    window.dispatchEvent(new Event('wc-cards-updated'));
  },

  setFetchedRecordsFromResponseArray(array: Array<RecordResponse>) {
    const obj = {} as { [id: string]: Record };
    array.forEach(response => (obj[response.id] = new Record(response)));
    this.fetchedRecords = obj;
  },

  get profile(): User {
    if (localStorage.getItem('profile') === null) return new NullUser();
    else return JSON.parse(localStorage.getItem('profile')!);
  },

  modalListeners: {} as { [id: string]: EventListener },
};

export const el = {
  // cm: null as EditorFromTextArea | null,
  cm: null as EditorView | null,
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
  get editor() {
    return document.querySelector<HTMLDivElement>('.editor');
  },
  get editorTextArea() {
    return document.querySelector<HTMLTextAreaElement>('.editor-pane .contents');
  },
  get userMenu() {
    return document.querySelector<HTMLDivElement>('.user-menu');
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
  get regLink() {
    return document.querySelector<HTMLAnchorElement>('.register-link');
  },
  get passChangeLink() {
    return document.querySelector<HTMLAnchorElement>('.pass-change-link');
  },
  get loginModal() {
    return document.querySelector<HTMLDivElement>('#login-form-modal');
  },
  get loginForm() {
    return document.querySelector<HTMLFormElement>('.login-form');
  },
  get regForm() {
    return document.querySelector<HTMLFormElement>('.register-form');
  },
  get usernameInput() {
    return document.querySelector<HTMLInputElement>('input#username');
  },
  get passwordInput() {
    return document.querySelector<HTMLInputElement>('input#password');
  },
  get oldPasswordInput() {
    return document.querySelector<HTMLInputElement>('input#old-password');
  },
  get newPasswordInput() {
    return document.querySelector<HTMLInputElement>('input#new-password');
  },
  get confirmationInput() {
    return document.querySelector<HTMLInputElement>('input#confirmation');
  },
  get newBtns() {
    return document.querySelectorAll<HTMLButtonElement>('.new-btn');
  },
  get saveBtn() {
    return document.querySelector<HTMLButtonElement>('.save-btn');
  },
  get dupBtn() {
    return document.querySelector<HTMLButtonElement>('.dup-btn');
  },
  get backBtn() {
    return document.querySelector<HTMLButtonElement>('.back-btn');
  },
  get fontDownBtn() {
    return document.querySelector<HTMLButtonElement>('.font-down-btn');
  },
  get fontUpBtn() {
    return document.querySelector<HTMLButtonElement>('.font-up-btn');
  },
  get shareMenuBtn() {
    return document.querySelector<HTMLButtonElement>('.shr-menu-btn');
  },
  get shareCheck() {
    return document.querySelector<HTMLInputElement>('.shr-check');
  },
  get shareAddr() {
    return document.querySelector<HTMLInputElement>('.shr-addr');
  },
  get copyBtn() {
    return document.querySelector<HTMLButtonElement>('.copy-btn');
  },
  get delMenuBtn() {
    return document.querySelector<HTMLButtonElement>('.del-menu-btn');
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
  get errorAlert() {
    return document.querySelector<HTMLDivElement>('.error-alert');
  },
  get errorMsg() {
    return document.querySelector<HTMLParagraphElement>('.error-msg');
  },
};

async function handleUserChange() {
  if (el.username) el.username.innerHTML = env.profile.username;
  el.browsePane?.classList.toggle('d-md-flex', !env.profile.is_anonymous);
  el.browsePane?.classList.toggle('d-none', env.profile.is_anonymous);
  el.browsePane?.classList.toggle('d-md-none', env.profile.is_anonymous);
  el.root?.style.setProperty('--browse-pane-width', env.profile.is_anonymous ? '0' : '320px');
  [el.saveBtn, el.dupBtn, el.delMenuBtn, el.backBtn, el.shareMenuBtn, ...el.newBtns, el.browsePane].forEach(e => {
    e?.toggleAttribute('hidden', env.profile.is_anonymous);
  });
  [el.saveBtn, el.shareMenuBtn, el.delMenuBtn].forEach(e => {
    e?.toggleAttribute('hidden', !env.activeRecord?.response.can_edit);
  });
  el.dupBtn?.toggleAttribute('hidden', env.profile.is_anonymous || env.activeRecord?.response.can_edit);

  if (env.activeRecordId) {
    await fetchRecordDetails(env.activeRecordId);
  }

  el.authOnlyLis.forEach(e => e.toggleAttribute('hidden', env.profile.is_anonymous));
  el.unauthOnlyLis.forEach(e => e.toggleAttribute('hidden', !env.profile.is_anonymous));

  if (env.profile.is_anonymous) {
    makeModalForm('login', el.loginLink, '/static/login_form.html', handleLogin);
    makeModalForm('reg', el.regLink, '/static/register_form.html', handleRegister);
    delete env.modalListeners.change;
  } else {
    el.newBtns.forEach(e => e.addEventListener('click', () => createNewRecord()));
    el.dupBtn?.addEventListener('click', async () => {
      const id = env.activeRecordId;
      if (id) {
        await createNewRecord(env.activeRecord?.response.contents);
        const { [id]: deleted, ...rest } = env.fetchedRecords;
        env.fetchedRecords = rest;
      }
    });
    el.delBtn?.addEventListener('click', deleteCurrentRecord);
    makeModalForm('change', el.passChangeLink, '/static/pass_change_form.html', handlePassChange);
    delete env.modalListeners.login;
    delete env.modalListeners.reg;

    el.logoutLink?.addEventListener('click', e => {
      e.preventDefault();
      saveCurrentRecord();
      api.authLogout().then(loadContents);
    });
  }
}

function handleRecordChange() {
  document.title = env.activeRecord ? `${env.activeRecord?.response.title_line} : WildChord` : 'WildChord';

  el.activeRecordCards.forEach(card => {
    card.classList.toggle('active', card.dataset.id === env.activeRecordId);
  });
  if (env.activeRecord === null && el.cm) {
    el.cm?.destroy();
  }

  el.browsePane?.classList.toggle('d-none', env.activeRecord !== null);
  el.editorPane?.classList.toggle('d-none', env.activeRecord === null);

  [el.saveBtn, el.delMenuBtn, el.shareMenuBtn].forEach(e => {
    e?.toggleAttribute('hidden', !env.activeRecord?.response.can_edit);
  });
  el.dupBtn?.toggleAttribute('hidden', env.profile.is_anonymous || env.activeRecord?.response.can_edit);

  handleShareStateChange();

  if (el.shareCheck)
    el.shareCheck.oninput = async function (e) {
      if (el.shareCheck) await env.activeRecord?.setPublic(el.shareCheck.checked);
      handleShareStateChange();
      el.shareAddr?.select();
      el.shareAddr?.setSelectionRange(0, 999);
    };

  if (el.copyBtn)
    el.copyBtn.onclick = function () {
      if (el.shareAddr) {
        el.shareAddr?.select();
        el.shareAddr?.setSelectionRange(0, 999);
        if (navigator.clipboard) navigator.clipboard.writeText(el.shareAddr.value);
      }
    };

  if (el.shareAddr)
    el.shareAddr.onclick = function () {
      if (el.shareAddr) {
        el.shareAddr?.select();
        el.shareAddr?.setSelectionRange(0, 999);
      }
    };

  if (env.activeRecord) {
    if (el.saveBtn)
      el.saveBtn.onclick = () => {
        saveCurrentRecord();
      };
  }

  if (el.fontDownBtn)
    el.fontDownBtn.onclick = () => {
      let currentFontAdj = parseInt(el.editorPane?.style.getPropertyValue('--font-size-adj') || '0');
      el.editorPane?.style.setProperty('--font-size-adj', (currentFontAdj - 1).toString());
    };
  if (el.fontUpBtn)
    el.fontUpBtn.onclick = () => {
      let currentFontAdj = parseInt(el.editorPane?.style.getPropertyValue('--font-size-adj') || '0');
      el.editorPane?.style.setProperty('--font-size-adj', (currentFontAdj + 1).toString());
    };
}

function handleShareStateChange() {
  el.shareCheck?.toggleAttribute('checked', env.activeRecord?.response.is_public);
  el.shareAddr?.toggleAttribute('disabled', !env.activeRecord?.response.is_public);
  el.copyBtn?.toggleAttribute('disabled', !env.activeRecord?.response.is_public);
  if (el.shareAddr) el.shareAddr.value = env.activeRecord?.response.is_public ? window.location.href : '';
}

function handleThemeChange() {
  el.body?.classList.toggle('dark', env.darkMode);

  if (el.themeCheckBox) el.themeCheckBox.checked = env.darkOverride == null ? env.darkMode : env.darkOverride;
  if (el.themeAutoCheckBox) el.themeAutoCheckBox.checked = env.darkOverride === null;
}

async function loadContents() {
  handleThemeChange();

  let r = null;

  const urlPath = window.location.pathname.replace(/\/+$/, '').split('/');
  if (urlPath[urlPath.length - 2] === 'r') {
    r = urlPath[urlPath.length - 1];
  } else if (urlPath[1] !== '') {
    history.pushState({ r: null }, '', '/');
  }

  await fetchRecordsList();
  handleUserChange();
  env.activeRecordId = r;

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

  el.themeCheckBox?.addEventListener('input', function () {
    env.darkOverride = el.themeCheckBox?.checked ?? null;
  });
  el.themeAutoCheckBox?.addEventListener('input', function () {
    env.darkOverride = el.themeAutoCheckBox?.checked ? null : el.themeCheckBox?.checked;
  });

  if (el.errorAlert) {
    Toast.getOrCreateInstance(el.errorAlert).dispose();
  }
}

async function handleLogin() {
  const username = el.usernameInput?.value ?? '';
  const password = el.passwordInput?.value ?? '';
  await api.authLogin(username, password);
  loadContents();
}

async function handleRegister() {
  const username = el.usernameInput?.value ?? '';
  const password = el.passwordInput?.value ?? '';
  const confirmation = el.confirmationInput?.value ?? '';
  await api.authRegister(username, password, confirmation);
  loadContents();
}

async function handlePassChange() {
  const oldPassword = el.oldPasswordInput?.value ?? '';
  const newPassword = el.newPasswordInput?.value ?? '';
  const confirmation = el.confirmationInput?.value ?? '';
  await api.authChangePass(oldPassword, newPassword, confirmation);
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
  let record = env.fetchedRecords[id];
  if (!record) {
    record = new Record(await api.getRecordDetails(id));
    env.fetchedRecords = { ...env.fetchedRecords, [record.id]: record };
  }
  await record.open();
  el.browsePane?.classList.add('d-none');
  el.editorPane?.classList.remove('d-none');
}

window.addEventListener('wc-cards-updated', () => {
  let cards = new Array<HTMLAnchorElement>();
  let result = Object.values(env.fetchedRecords).sort(
    (a, b) => new Date(b.response.update_timestamp).getTime() - new Date(a.response.update_timestamp).getTime()
  );
  result.forEach(record => {
    cards.push(record.card);
  });
  el.browseItems?.replaceChildren(...cards);
});

async function createNewRecord(contents?: string) {
  saveCurrentRecord();
  const newRecord = await Record.create(contents);
  env.fetchedRecords = { ...env.fetchedRecords, [newRecord.id]: newRecord };
  env.activeRecordId = newRecord.id;
}

async function deleteCurrentRecord() {
  const id = env.activeRecordId;
  if (!id) return;

  const record = env.fetchedRecords[id];
  await record.delete();
  const { [id]: deleted, ...rest } = env.fetchedRecords;
  env.fetchedRecords = rest;
  env.activeRecordId = null;
}

async function saveCurrentRecord() {
  env.activeRecord?.save();
}

async function fetchHTMLElement(filename: string) {
  const response = (await axios.get(filename)).data;
  const dummy = document.createElement('div');
  dummy.innerHTML = response;
  return dummy.childElementCount === 1 ? dummy.firstChild : dummy;
}

function makeModalForm(name: string, activator: HTMLElement | null, templateName: string, handler: Function) {
  if (activator) {
    const listener = async (e: Event, pushState = true) => {
      e.preventDefault();
      const modal = (await fetchHTMLElement(templateName)) as HTMLElement;
      document.querySelector('body')?.prepend(modal);
      modal.querySelector('form')?.addEventListener('submit', async e => {
        e.preventDefault();
        await handler();
        modal.querySelector('form')?.reset();
        Modal.getInstance(modal as Element)?.hide();
      });
      new Modal(modal as Element)?.show();
      modal.addEventListener('shown.bs.modal', () => {
        if (pushState) history.replaceState(history.state, document.title, `?mod=${name}`);
        modal.querySelector<HTMLInputElement>('input[autofocus]')?.focus();
      });
      modal.addEventListener('hidden.bs.modal', () => {
        history.replaceState(history.state, document.title, window.location.pathname);
        modal.remove();
      });
    };
    env.modalListeners[name] = listener;
    activator.onclick = listener;
  }
}
