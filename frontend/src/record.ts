// import CodeMirror from 'codemirror';
import { api, el, env } from './app';
import { RecordResponse } from './types';

import { history, historyKeymap, standardKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { EditorView, minimalSetup } from 'codemirror';
import { chordsheet } from './chordsheet-lang/chordsheet';

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
    el.cm?.destroy();
    el.cm = new EditorView({
      doc: this.response.contents,
      extensions: [
        minimalSetup,
        chordsheet(),
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...standardKeymap, ...historyKeymap, { key: 'Mod-s', run: this.save, preventDefault: true }]),
        EditorState.readOnly.of(!this.response.can_edit),
        EditorView.editable.of(this.response.can_edit),
      ],
      parent: el.editor as Element,
    });
    return this;
  }

  async delete() {
    await api.deleteRecord(this.id);
    return this;
  }

  save = (target: EditorView | null = el.cm) => {
    if (this === env.activeRecord) {
      const newContents = target?.state.doc.toString();
      if (newContents && newContents !== this.response.contents) {
        api.editRecord(this.id, newContents).then(response => {
          this.response = response;
          this.updateCard();
          window.dispatchEvent(new Event('wc-cards-updated'));
          return true;
        });
      }
    }
    return false;
  };

  async setPublic(make_public: boolean) {
    this.response = await api.setPublic(this.id, make_public);
    this.updateCard();
    window.dispatchEvent(new Event('wc-cards-updated'));
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
