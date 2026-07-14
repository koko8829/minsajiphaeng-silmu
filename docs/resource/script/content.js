class ChapterWriter {
#panel;
#sections = new Map();
constructor(chapter, panel) {
this.#panel = panel;
panel.addClass('chapter_content');
if (chapter.lang) {
panel.attr('lang', chapter.lang.split('_')[0]);
}
const elements = [];
let node, step;
chapter.elements.forEach(each => {
const {type} = each;
if (type.startsWith('heading')) {
step = null;
const level = Number(type.replace('heading', ''));
each.headingLevel = level;
if (node) {
if (node.headingLevel < level) { // 새로운 단락이 하위일 때
each.parent = node;
(node.children ||= []).push(each);
node = each;
} else if (node.headingLevel === level) { // 새로운 단락이 같은 수준일 때
const parent = node.parent;
each.parent = parent;
if (parent) {
(parent.children ||= []).push(each);
} else {
elements.push(each);
}
node = each;
} else { //새로운 단락이 상위일 때
let parent = node;
while (parent && parent.headingLevel >= level) {
parent = parent.parent;
}
if (!parent) {
elements.push(each);
} else {
each.parent = parent;
(parent.children ||= []).push(each);
}
node = each;
}
} else {
node = each;
elements.push(each);
}
} else {
if (type === 'step1') {
step = each;
if (node) {
(node.children ||= []).push(each);
} else {
elements.push(each);
}
} else {
if (step && each.ignoreStepIndent) {
step = null;
}
if (step) {
(step.children ||= []).push(each);
} else if (node) {
(node.children ||= []).push(each);
} else {
elements.push(each);
}
}
}
});
const {sectionView} = chapter;
if (sectionView === 'ACCORDION' || sectionView === 'OPENED_ACCORDION') {
this.writeAccordion(null, panel, elements, sectionView === 'OPENED_ACCORDION');
} else if (sectionView === 'TAB') {
this.writeTab(null, panel, elements);
} else {
elements.forEach(each => this.write(null, panel, each, sectionView));
}
}
write(parentSection, panel, element, sectionView) {
if (element.headingLevel) {
const section = new UI('section', panel);
if (sectionView) {
section.addClass(`section_${sectionView.toLowerCase()}`);
}
let main;
new Icon({
icon: 'keyboard_arrow_down',
title: I18n.get('label.collapse'),
listener: (event, icon) => {
if (icon.icon === 'keyboard_arrow_down') {
icon.icon = 'keyboard_arrow_right';
icon.attr('title', I18n.get('label.expand'));
main.hide();
} else {
icon.icon = 'keyboard_arrow_down';
icon.attr('title', I18n.get('label.collapse'));
main.show();
}
},
}, section);
new UI('header', section).append(element);
if (element.children) {
main = new UI('main', section);
const {sectionView, children} = element;
if (sectionView === 'ACCORDION' || sectionView === 'OPENED_ACCORDION') {
this.writeAccordion(parentSection, main, children, sectionView === 'OPENED_ACCORDION');
} else if (sectionView === 'TAB') {
this.writeTab(parentSection, main, children);
} else {
element.children.forEach(each => this.write(parentSection, main, each));
}
}
} else if (element.type === 'step1') {
this.writeStep(parentSection, panel, element);
} else {
this.writeElement(panel, element);
}
if (parentSection) {
this.setSection(element, parentSection);
}
}
getSection(id) {
return this.#sections.get(id);
}
setSection(element, section) {
const {id, contextId} = element;
if (!this.#sections.has(id)) {
this.#sections.set(id, section);
}
if (contextId && !this.#sections.has(contextId)) {
this.#sections.set(contextId, section);
}
}
writeAccordion(parentSection, panel, elements, opened) {
let accordion = null;
elements.forEach(each => {
const {type, headingLevel, sectionView, children} = each;
if (headingLevel) {
if (!accordion) {
accordion = new Accordion(panel);
}
const section = {
ui: accordion,
index: accordion.count,
parentSection,
};
const main = new UI('main');
if (children) {
if (sectionView === 'ACCORDION' || sectionView === 'OPENED_ACCORDION') {
this.writeAccordion(section, main, children, sectionView === 'OPENED_ACCORDION');
} else if (sectionView === 'TAB') {
this.writeTab(section, main, children);
} else {
children.forEach(each => this.write(section, main, each));
}
children.forEach(child => this.setSection(child, section));
}
const name = each.html.replaceAll(`<h${headingLevel}`, '<div').replaceAll(`</h${headingLevel}>`, '</div>');
accordion.add(new UI('div').html(name), main, opened);
this.setSection(each, section);
} else if (type === 'step1') {
this.writeStep(parentSection, panel, each);
} else {
this.writeElement(panel, each);
}
});
}
writeTab(parentSection, panel, elements) {
if (!elements && !elements.length) {
return;
}
const main = new UI('main', panel);
let tab = null;
elements.forEach(each => {
const {type, headingLevel, sectionView, children} = each;
if (headingLevel) {
if (!tab) {
tab = new Tab({}, main).addClass('my-16');
}
const section = {
ui: tab,
index: tab.count,
parentSection,
};
const name = each.html.replaceAll(`<h${headingLevel}`, '<div').replaceAll(`</h${headingLevel}>`, '</div>');
const tabItemMain = new UI('main');
if (children) {
if (sectionView === 'ACCORDION' || sectionView === 'OPENED_ACCORDION') {
this.writeAccordion(section, tabItemMain, children, sectionView === 'OPENED_ACCORDION');
} else if (sectionView === 'TAB') {
this.writeTab(section, tabItemMain, children);
} else {
children.forEach(each => this.write(section, tabItemMain, each));
}
children.forEach(child => this.setSection(child, section));
}
tab.add(new UI('div').html(name), tabItemMain);
this.setSection(each, section);
} else if (type === 'step1') {
this.writeStep(parentSection, panel, each);
} else {
this.writeElement(main, each);
}
});
if (tab) {
tab.select(0);
}
return main;
}
writeStep(parentSection, panel, element) {
const section = new UI('section', panel);
new UI('header', section).append(element);
if (element.children) {
let opened = true;
const main = new UI('main', section).addClass('step_section');
element.children.forEach(each => this.write(parentSection, main, each));
section.query('.step1_n').addEventListener('mouseup', event => {
event.preventDefault();
event.stopPropagation();
opened = !opened;
if (opened) {
main.show();
} else {
main.hide();
}
});
}
}
writeElement(panel, element) {
const {type, html, footnote, indented} = element;
if (html) {
const el = panel.append(element);
if (type === 'code') {
const pre = el.query('pre');
DomUtil.addClass(pre, 'mobile-scroll');
this.addCodeCopyIcon(pre);
} else if (type === 'command') {
el.addClass('mobile-scroll');
this.addCodeCopyIcon(el.el);
} else if (type === 'table' && footnote) {
panel.append({
html: footnote,
});
} else if (type === 'javascript_module') {
IMAGE_LAZY_LOADER.observe(el.query('ui-javascript-module'));
} else if (type === 'web_page') {
IMAGE_LAZY_LOADER.observe(el.query('ui-web-page'));
}
if (indented) {
el.addClass(indented);
}
}
}
addCodeCopyIcon(pre) {
new Icon({
icon: 'content_copy',
title: I18n.get('label.copy'),
listener: (event, icon) => {
event.stopPropagation();
new WebClipboard().copy({
text: pre,
type: 'code',
}, false);
icon.icon = 'check';
setTimeout(() => icon.icon = 'content_copy', 2000);
},
}, pre);
}
scrollTo(elementId) {
const section = this.getSection(elementId);
if (section) {
const {ui, index, parentSection} = section;
if (parentSection) {
parentSection.ui.select(parentSection.index);
}
ui.select(index);
}
const current = this.#panel.query(`[id="${elementId}"]`);
if (current) {
setTimeout(() => {
current.scrollIntoView({
behavior: 'smooth',
});
}, 100);
DomUtil.focus(current);
}
}
}
class LibrarySearchDocuments extends UI {
#documents = new Map();
constructor({documents, keyword, filter}, parent = null) {
super('ui-flex-panel', parent);
const accordion = new Accordion(this, {toggleAll: true}).css({maxWidth: '45rem'});
documents.forEach(each => this.#documents.set(each.id, new LibrarySearchDocument(each, accordion, keyword, filter)));
}
start() {
}
progress({subworks = []}) {
subworks.forEach(({completed, id, count}) => {
if (completed) {
const d = this.#documents.get(id);
if (d) {
d.count = count;
}
}
});
}
complete({subworks}) {
let total = 0;
if (subworks) {
subworks.forEach(each => {
const {id, bookId, count} = each;
if (count) {
const p = this.#documents.get(id) || this.#documents.get(bookId);
if (p) {
p.count = count;
p.setSearchResult(each);
total += count;
}
}
});
}
this.prepend(new UIArray([
new Link({
name: I18n.get('label.close'),
listener: () => Applications.fire(EventType.CLOSE_SEARCH_PANEL),
}),
new Badge(total),
], this, true));
const values = Array.from(this.#documents.values());
values.sort((a, b) => b.count - a.count);
const visible = [];
values.forEach(each => {
if (each.count) {
each.ui.reattach();
visible.push(each);
} else {
each.ui.detach();
}
});
if (visible.length) {
if (!visible[0].ui.opened) {
visible[0].ui.toggle();
}
return true;
}
return false;
}
}
class LibrarySearchDocument {
#id;
#accordionItem;
#title;
#count = 0;
#spinner;
#result;
#keyword;
#filter;
constructor({id, type, title}, accordion, keyword, filter) {
this.#id = id;
this.#keyword = keyword;
this.#filter = filter;
this.#title = Icon.getDocumentIcon(type, title);
this.#spinner = new Spinner();
this.#accordionItem = accordion.add(new UIArray([
this.#title,
this.#spinner,
]), new LazyPanel(() => this.#buildPanel()));
}
get id() {
return this.#id;
}
get count() {
return this.#count;
}
set count(count) {
this.#spinner.appendAfter(new Badge(this.#count = count));
this.#spinner.remove();
}
get ui() {
return this.#accordionItem;
}
start() {
this.count = 0;
}
setSearchResult(result) {
this.#title.html(result.title);
this.#result = result;
}
#buildPanel() {
const result = this.#result;
if (!result) {
return new UI('div');
}
const {exportType} = Applications.getOption();
const panel = new UI('ui-book-search-content').addClass('mouseover-scrollbar');
const sectionMap = new Map();
result.chapters.forEach(each => {
const section = new UI('section', panel);
new PageHeader({
title: [
new Icon({
icon: 'keyboard_arrow_down',
listener: (event, icon) => {
if (icon.icon === 'keyboard_arrow_down') {
icon.icon = 'keyboard_arrow_right';
DomUtil.hide(section.query('.searched_content'));
} else {
icon.icon = 'keyboard_arrow_down';
DomUtil.showByDisplay('flex', section.query('.searched_content'));
}
},
}),
new Html(each.title),
],
subtitle: [
() => {
if (exportType !== 'HTML') {
return new Link({
name: I18n.get('label.preview'),
listener: () => DocumentPreviewer.open(`${result.bookId}/${each.id}`, each.title),
openInNew: true,
});
}
},
new Link({
name: I18n.get('label.open'),
href: each.href || `/r/viewer/book/${result.id}#${each.id}`,
openInNew: true,
}),
],
}, section);
if (exportType === 'HTML') {
new SearchedContent({item: each}, section);
} else {
sectionMap.set(each.id, section);
}
});
if (sectionMap.size > 0) {
this.#loadChapters(result, sectionMap, panel);
}
return panel;
}
#loadChapters(result, sectionMap, panel) {
const observer = new IntersectionObserver(entries => {
if (entries[0].isIntersecting) {
observer.disconnect();
panel.skeleton(async () => {
const chapters = await Http.post(`/r/find/chapters_search/${result.id}`, {
chapterIds: Array.from(sectionMap.keys()),
keyword: this.#keyword,
filter: this.#filter,
});
if (chapters) {
chapters.forEach(chapterResult => {
const section = sectionMap.get(chapterResult.id);
if (section && chapterResult.contents) {
new ExpandableSearchContent({contents: chapterResult.contents, footnotes: chapterResult.footnotes}, section);
}
});
}
});
}
}, {root: null});
requestAnimationFrame(() => observer.observe(panel.el));
}
}
class ExpandableSearchContent extends UI {
constructor({contents, footnotes}, parent = null) {
super('div', parent);
this.addClass('chapter_content', 'searched_content', 'flex', 'flex-col', 'gap-8');
this.on('click', event => {
const a = event.target.closest('a');
if (!a) {
return;
}
let href = a.getAttribute('href');
if (!href) {
return;
}
event.preventDefault();
event.stopPropagation();
if (DomUtil.hasClass(a, 'reference')) {
href = `/r/document/view/${href.substring(1)}`;
}
window.open(href);
});
this.#render(contents);
if (footnotes) {
footnotes.forEach(footnote => {
this.append({html: `<div id="${footnote.elementId}" class="element normal" data-footnote="${footnote.id}">${footnote.text}</div>`});
});
}
}
#render(contents) {
const matchedIndices = [];
contents.forEach((item, i) => {
if (item.matched) {
matchedIndices.push(i);
}
});
if (matchedIndices.length === 0) {
return;
}
let cursor = 0;
for (const mi of matchedIndices) {
if (mi > cursor) {
this.#addMoreGap(contents, cursor, mi, cursor !== 0, true);
}
this.append({html: contents[mi].html});
cursor = mi + 1;
}
if (cursor < contents.length) {
this.#addMoreGap(contents, cursor, contents.length, true, false);
}
}
#addMoreGap(contents, from, to, showDown, showUp) {
const STEP = 3;
const gap = new UI('ui-more-gap', this);
const state = {start: from, end: to, icons: []};
const remaining = () => state.end - state.start;
const update = () => {
if (remaining() <= 0) {
gap.remove();
} else {
state.icons.forEach(i => i.attr('title', `${I18n.get('label.more')} (${remaining()})`));
}
};
if (showDown) {
const icon = new Icon({
icon: 'arrow_downward',
title: `${I18n.get('label.more')} (${to - from})`,
listener: () => {
const limit = Math.min(state.start + STEP, state.end);
let last;
for (let i = state.start; i < limit; i++) {
last = DomUtil.appendBefore(gap.el, contents[i].html);
Animation.fadeIn(last);
}
state.start = limit;
update();
(remaining() > 0 ? gap.el : last).scrollIntoView({behavior: 'smooth', block: 'nearest'});
},
}, gap);
icon.addClass('more-down');
state.icons.push(icon);
}
if (showUp) {
const icon = new Icon({
icon: 'arrow_upward',
title: `${I18n.get('label.more')} (${to - from})`,
listener: () => {
const limit = Math.max(state.end - STEP, state.start);
let last;
for (let i = state.end - 1; i >= limit; i--) {
last = DomUtil.appendAfter(gap.el, contents[i].html);
Animation.fadeIn(last);
}
state.end = limit;
update();
(remaining() > 0 ? gap.el : last).scrollIntoView({behavior: 'smooth', block: 'nearest'});
},
}, gap);
icon.addClass('more-up');
state.icons.push(icon);
}
}
}
class SearchedContent extends UI {
constructor({item, selectable}, parent = null) {
super('div', parent);
this.addClass('chapter_content', 'searched_content', 'flex', 'flex-col', 'gap-8');
const {elements, footnotes} = item;
if (elements) {
elements.forEach(element => {
const el = this.append({html: element});
if (selectable) {
el.addClass('cursor-pointer');
}
});
this.#filterTableRow();
}
if (footnotes) {
footnotes.forEach(footnote => {
const el = this.append({html: `<div id="${footnote.elementId}" class="element normal" data-footnote="${footnote.id}">${footnote.text}</div>`});
if (selectable) {
el.addClass('cursor-pointer');
}
});
}
}
#filterTableRow() {
const allRows = [...this.queryAll('tbody tr')];
const matchedRows = new Set();
allRows.forEach(tr => {
if (tr.querySelector('.find')) {
matchedRows.add(tr);
}
});
allRows.forEach(tr => {
if (!matchedRows.has(tr)) return;
tr.querySelectorAll('td[rowspan], th[rowspan]').forEach(cell => {
const rowspan = parseInt(cell.getAttribute('rowspan'));
let current = tr.nextElementSibling;
for (let i = 1; i < rowspan; i++) {
if (current) {
matchedRows.add(current);
current = current.nextElementSibling;
}
}
});
});
allRows.forEach(tr => {
if (matchedRows.has(tr)) {
DomUtil.addClass(tr, 'matched');
}
});
}
}
