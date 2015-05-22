// run `node index.js` under demo directory to see what changes.

var tagRegex = /* /$tag/ */ /./;

var html = '<input class="biu" value=\'hello, regular expression!\' />';
var groups = tagRegex.exec(html);

/* /$tag/ */
var match = groups[0];

html = html.replace(tagRegex, function /* /$tag/ */(match) {
    return match;
});

console.log(groups);
