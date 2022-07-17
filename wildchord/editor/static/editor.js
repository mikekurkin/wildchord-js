// import { javascript } from "../../node_modules/@codemirror/lang-javascript";
// import { basicSetup, EditorView } from "codemirror";

// new EditorView({
//   doc: "console.log('hello')\n",
//   extensions: [basicSetup, javascript()],
//   parent: document.querySelector('.editor')
// })



window.addEventListener('popstate', e => showRecord(e.state.r));

var cm;
let darkMode

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
          showRecord(this.dataset.id);
          history.pushState({ r: this.dataset.id }, '', `?r=${this.dataset.id}`);
        }
        cards.push(recordCard);
      });
      document.querySelector('.browse-items > .list-group').replaceChildren(...cards);
      if (r !== null) showRecord(r);
    });
  
});

function showRecord(recordId) {
  fetch(`/api/records/${recordId}`)
  .then(response => response.json())
    .then(result => {
      const textArea = document.querySelector('.contents');
      if (cm !== undefined) {
        cm.toTextArea();
      }
      textArea.value = result.contents;
      cm = CodeMirror.fromTextArea(textArea, {
        lineWrapping: true,
        lineNumbers: true,
        autofocus: true,
        viewportMargin: Infinity,
        scrollbarStyle: 'native',
        theme: darkMode ? 'material-darker' : 'neat',
      });
      document.querySelectorAll('.item-card').forEach(card => {
        card.classList.toggle('active', card.dataset.id === result.id)
      })
  })
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", function (e) {
    console.log(cm);
    const colorScheme = e.matches ? "dark" : "light";
    console.log(colorScheme);
    if (cm != undefined) {
      if (colorScheme === "dark") {
        darkMode = true;
        cm.setOption('theme', 'material-darker');
      } else {
        darkMode = false;
        cm.setOption('theme', 'neat');
      }
      cm.save();
    }
  });
