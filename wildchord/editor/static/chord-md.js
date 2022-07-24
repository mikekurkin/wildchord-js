CodeMirror.defineSimpleMode("chords", {
  start: [
    {regex: /\b(([A-H][b#♭♯♮]*)\-?){3,8}(?!(?:[a-zJ-Z.,/\-+="]))/g,
      token: "atom.tuning",},
    {regex: /capo:?\s+[+\-]?\d{1,2}/gi,
    token: "atom.capo",},
    {regex: /\b([A-H][b#♭♯♮]*)((?:(?:[mM](?!aj)(?!in))|maj|min)?)((?:\s?(?:\(?[M+\-b#♭♯oøΔ]|maj|add|dim|aug|sus){0,2}\d{1,2}?\)?\+?)*)(?:\s?\/\s?([A-H][b#♭♯♮]*))?(?!(?:[a-zA-Z.,/\-+="]))/g,
     token: "keyword.chord",}
  ],
});