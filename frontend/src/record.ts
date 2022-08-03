import CodeMirror from 'codemirror';
import { api, el, env } from './app';
import { RecordResponse } from './types';

export class Record {
  private static get cardTemplate(): HTMLTemplateElement {
    const template: HTMLTemplateElement | null = document.querySelector('template#item-card-template');
    if (template === null) throw new ReferenceError();
    return template;
  }
  card = Record.cardTemplate.content.firstElementChild?.cloneNode(true) as HTMLAnchorElement;
  id: string;
  response: RecordResponse;

  static async create(contents?: string) {
    return new Record(await api.createRecord(contents));
  }

  constructor(response: RecordResponse) {
    this.id = response.id;
    this.response = response;
    this.updateCard();
  }

  private updateCard() {
    const titleLine = this.card.querySelector('.title-line');
    const secondLine = this.card.querySelector('.second-line');
    const timeStamp = this.card.querySelector('.timestamp');
    if (titleLine) titleLine.innerHTML = this.response.title_line;
    if (secondLine) secondLine.innerHTML = this.response.second_line;
    if (timeStamp)
      timeStamp.innerHTML = new Date(this.response.update_timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    if (this.card) {
      this.card.setAttribute('href', `/r/${this.response.id}`);
      this.card.classList.toggle('active', this.response.id === env.activeRecordId);
      this.card.dataset.id = this.response.id;
      this.card.onclick = (e: MouseEvent) => {
        if (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey || e.button !== 0) return;
        e.preventDefault();
        env.activeRecordId = this.card?.dataset.id ?? null;
      };
    }
  }

  async open() {
    this.response = await api.getRecordDetails(this.id);
    el.browsePane?.classList.add('d-none');
    el.editorPane?.classList.remove('d-none');
    if (el.cm) {
      el.cm.toTextArea();
      if (el.saveBtn) el.saveBtn.onclick = null;
    }
    if (el.editorTextArea) {
      el.editorTextArea.value = this.response.contents ?? '';
      el.cm = CodeMirror.fromTextArea(el.editorTextArea, {
        lineNumbers: true,
        autofocus: true,
        viewportMargin: Infinity,
        scrollbarStyle: 'native',
        mode: 'chords',
        theme: env.darkMode ? 'material-darker' : 'neat',
        readOnly: this.response.can_edit ? false : 'nocursor',
      });
    }
    return this;
  }

  async delete() {
    await api.deleteRecord(this.id);
    return this;
  }

  async save() {
    if (el.cm && this.id === env.activeRecordId) {
      const oldContents = el.editorTextArea?.value;
      el.cm.save();
      const newContents = el.editorTextArea?.value;
      if (newContents && oldContents !== newContents) {
        this.response = await api.editRecord(this.id, newContents);
        this.updateCard();
      }
    }
    return this;
  }
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
