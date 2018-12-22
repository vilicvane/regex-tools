// run `node index.js` under demo directory to see what changes.

let tagRegex = /* /$tag/ */ /./;

let html = '<input class="biu" value=\'hello, regular expression!\' />';
let groups = tagRegex.exec(html);

/* /$tag/ */
let text = groups[0];

html = html.replace(tagRegex, function(/* /$tag/ */ text) {
  return text;
});

html = html.replace(tagRegex, function(/* /$tag/ */ text) {
  return text;
});

html = html.replace(tagRegex, function(/* /$tag/ */ text, foo) {
  return text;
});

html = html.replace(tagRegex, function(/* /$tag/ */ text, foo, bar) {
  return text;
});

html = html.replace(tagRegex, function(/* /$tag/ */ text, foo, bar) {
  return text;
});

console.log(groups);
