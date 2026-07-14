const ChapterType = {
TOC: Symbol(),
LIST_OF_FIGURES: Symbol(),
LIST_OF_TABLES: Symbol(),
LIST_OF_CODES: Symbol(),
GLOSSARY: Symbol(),
ABBREVIATION: Symbol(),
INDEX: Symbol(),
}
class DocumentChapterSelector {
#modal;
#id;
#bookId;
#chaptersPanel;
#listener;
constructor({id, bookId} = {}) {
this.#id = id;
this.#bookId = bookId;
}
open(listener) {
this.#listener = listener;
if (!this.#modal) {
this.#modal = new Modal({
title: I18n.get('label.select_chapter'),
}).css({
width: '60rem',
maxWidth: 'calc(100vw - 20rem)',
});
const panel = new UI(this.#bookId ? 'div' : 'ui-h-flex-panel');
if (!this.#bookId) {
new DocumentTree({
id: this.#id,
listener: doc => {
this.#chaptersPanel.clear();
this.loadChapters(doc.id);
}
}, panel).addClass('mouseover-scrollbar').css({
maxHeight: 'calc(100dvh - 20rem)',
flex: '1',
});
}
this.#chaptersPanel = new UI('div', panel).addClass('mouseover-scrollbar').css({
maxHeight: 'calc(100dvh - 20rem)',
flex: '1',
});
this.#modal.addComponent(panel);
if (this.#bookId || this.#id) {
this.loadChapters(this.#bookId || this.#id);
}
} else {
this.#modal.reattach();
}
}
close() {
this.#modal.detach();
}
loadChapters(id) {
new TableOfContents({
id,
openInNew: false,
listener: chapter => this.#listener(chapter, this),
}, this.#chaptersPanel);
}
}
class DocumentMap extends Modal {
#id;
#depth;
constructor(id, title) {
super({
title,
fullscreen: true,
});
this.#id = id;
this.addClass('document_map');
const table = new UI('table');
this.add(table);
queueMicrotask(() => this.load(id, table));
}
async load(id, table) {
const response = await Http.get(`/r/viewer/chapters/${id}`, true);
this.#depth = this.getDepth({chapters: response}) - 1;
const tbody = new UI('tbody', table);
response.forEach(each => {
const tr = new UI('tr', tbody);
this.render(tbody, tr, 0, each);
});
}
getDepth({chapters, headings}) {
const children = this.getChildren({chapters, headings});
if (!children) {
return 1;
}
return 1 + children.reduce((max, each) => Math.max(max, this.getDepth(each)), 0);
}
render(tbody, tr, col, node) {
const {id, name, chapters, headings} = node;
const size = this.getChildrenSize(node);
const td = new UI('td', tr);
if (size > 1) {
td.attr('rowspan', size);
}
new Link({
name: new Html(name),
listener: event => {
event.preventDefault();
window.open(`/r/viewer/book/${this.#id}#${id}`);
},
}, td);
const children = this.getChildren({chapters, headings});
if (children) {
children.forEach((each, i) => {
if (i > 0) {
this.render(tbody, new UI('tr', tbody), col + 1, each);
} else {
this.render(tbody, tr, col + 1, each);
}
});
} else {
for (let i = col + 1; i < this.#depth; i++) {
new UI('td', tr);
}
}
}
getChildrenSize({chapters, headings}) {
const children = this.getChildren({chapters, headings});
if (!children) {
return 1;
}
return children.reduce((sum, each) => sum + this.getChildrenSize(each), 0);
}
getChildren({chapters, headings}) {
return chapters || headings;
}
}
class DocumentSelector {
static selector;
static openSelector(listener) {
if (!DocumentSelector.selector) {
DocumentSelector.selector = new DocumentSelector({
showElement: true,
});
}
DocumentSelector.selector.open(listener);
}
#option;
#modal;
#panel;
#listener;
constructor(option = {}) {
this.#option = option;
}
open(listener) {
this.#listener = listener;
if (!this.#modal) {
this.#modal = new Modal({
title: new UIArray([
new Plain(I18n.get('label.select_book')),
new Icon({
icon: 'refresh',
title: I18n.get('label.refresh'),
listener: () => {
Http.removeCache(`/r/document/documents/${this.#option.type || 'CHAPTER_SELECTOR'}`);
this.#panel?.remove();
this.load();
},
}),
]),
});
this.load();
} else {
this.#modal.reattach();
}
}
load() {
this.#panel = new UI('ui-h-flex-panel');
new DocumentTree({
id: this.#option.id,
type: this.#option.type,
showElement: this.#option.showElement,
listener: doc => {
doc.title = this.removeBoldTag(doc.title);
this.#listener(doc, this);
}
}, this.#panel);
this.#modal.addComponent(this.#panel);
}
close() {
this.#modal.detach();
}
removeBoldTag(title) {
if (!title) {
return title;
}
const i = title.indexOf('<b>');
if (i === -1) {
return title;
}
const j = title.indexOf('</b>', i);
if (j === -1) {
return title;
}
return title.substring(i + 3, j);
}
}
class DocumentSelectorPanel extends UI {
constructor({listener}) {
super('ui-flex-panel');
new PageHeader({
title: I18n.get('label.document'),
subtitle: new Link({
name: I18n.get('label.dashboard'),
href: '/!#/r/book',
openInNew: true,
}),
}, this);
new DocumentTree({
listener,
type: 'ALL',
showElement: true,
}, this).css({margin: '-.5rem'});
}
}
class DocumentTree extends UI {
#tree;
#type;
#showElement;
#elementType;
#id;
#listener;
#contextMenuLoader;
#badges;
constructor({
id,
listener,
type = 'CHAPTER_SELECTOR',
showElement = false,
elementType,
contextMenuLoader,
cache = true,
addBadge = false,
}, parent = null) {
super('ui-document-tree', parent);
this.#type = type;
this.#showElement = showElement;
this.#elementType = elementType || 'ALL';
this.#id = id;
this.#listener = listener;
this.#contextMenuLoader = contextMenuLoader;
if (addBadge) {
this.#badges = new Map();
}
queueMicrotask(() => this.load(cache));
}
unselect() {
this.#tree.select();
}
clearBadges() {
if (this.#badges) {
this.#badges.forEach(badge => badge.clear());
}
}
getBadge(id) {
return this.#badges?.get(id);
}
async load(cache) {
await this.skeleton(async () => {
const {node} = await Http.get(`/r/document/documents/${this.#type}`, cache);
if (!node || !node.children) {
new Message(I18n.get('label.empty_row'), this);
return;
}
this.#tree = new Tree(this);
node.children.forEach(each => this.loadItem(this.#tree, each));
if (this.#id) {
this.#tree.select(this.#id);
}
}, 10);
}
loadItem(treeItem, {id, type, name, children}, parentBadge = null) {
const documentIcon = Icon.getDocumentIcon(type, name);
let badge;
if (this.#badges && id) {
badge = new Badge();
if (parentBadge) {
badge.parentBadge = parentBadge;
}
this.#badges.set(id, badge);
}
let hasChildren;
if (this.#showElement) {
if (type === 'book_type' || type === 'article_type' || type === 'blog_type') {
hasChildren = async (treeItem) => {
const {node} = await Http.get(`/r/document/document/${id}?type=${this.#elementType}`);
if (node && node.children) {
node.children.forEach(each => this.loadItem(treeItem, each));
}
};
}
}
const model = {
id,
type,
name: badge ? [documentIcon, badge] : documentIcon,
hasChildren,
contextMenuLoader: this.#contextMenuLoader,
contextMenuModel: {
id,
type,
name: documentIcon,
}
};
if (type !== 'project_type' && id) {
model.listener = () => {
if (this.#listener) {
this.#listener({
id,
type,
name: documentIcon,
title: name,
});
}
};
}
const item = treeItem.add(model);
if (children) {
children.forEach(each => this.loadItem(item, each, badge));
}
}
}
const FeedbackType = {
NOT_AT_ALL_HELPFUL: Symbol(),
NOT_VERY_HELPFUL: Symbol(),
SOMEWHAT_HELPFUL: Symbol(),
VERY_HELPFUL: Symbol(),
EXTREMELY_HELPFUL: Symbol(),
};
const FeedbackReasonType = {
NOT_RELATED_TO_MY_ISSUE: Symbol(),
TOO_COMPLICATED_EXPLANATIONS: Symbol(),
SOLUTION_DIDNT_WORK: Symbol(),
TOO_MUCH_INFORMATION: Symbol(),
INCORRECT_INFORMATION: Symbol(),
UNCLEAR_INFORMATION: Symbol(),
INCOMPLETE_INFORMATION: Symbol(),
};
class FeedbackPanel extends Panel {
static #toOptions(type) {
return Object.keys(type).map(each => ({
value: each,
name: I18n.get(`label.${each.toLowerCase()}`),
}));
}
#id;
constructor(id, parent) {
super(I18n.get('label.how_helpful_is_this_article'), parent);
this.#id = id;
new SingleOptionSelector({
options: FeedbackPanel.#toOptions(FeedbackType),
listener: ({value}) => this.openForm(value),
}, this);
}
openForm(type) {
const modal = new Modal({
title: I18n.get(`label.${type.toLowerCase()}`),
});
DomUtil.addClass(modal.query('main'), 'flex', 'flex-col', 'gap-8');
const form = new Form();
if (type !== 'VERY_HELPFUL' && type !== 'EXTREMELY_HELPFUL') {
const panel = modal.addComponent(new Panel(I18n.get('label.please_tell_us_why_you_didnt_find_this_answer_helpful')));
const fields = new Fields({form}, panel);
fields.type = 'single';
fields.checkboxGroup({
label: I18n.get('label.please_tell_us_why_you_didnt_find_this_answer_helpful'),
name: 'reasons',
values: FeedbackPanel.#toOptions(FeedbackReasonType),
});
}
const panel = modal.addComponent(new Panel(I18n.get('label.do_you_have_any_other_feedback_about_this_article')));
const fields = new Fields({form}, panel);
fields.type = 'single';
fields.textarea({
label: I18n.get('label.do_you_have_any_other_feedback_about_this_article'),
name: 'comment',
});
modal.button({
name: I18n.get('label.submit'),
listener: async () => await this.submit({type, ...form.parameter}, modal),
});
modal.addComponent(form);
}
async submit(parameter, modal) {
await Http.post(`/r/feedback/send/${this.#id}`, parameter);
this.query('ui-single-option-selector').remove();
new UIArray([
new Badge(I18n.get(`label.${parameter.type.toLowerCase()}`)),
new Message({
content: I18n.get('label.feedback_recored'),
}),
], this);
modal.close();
}
}
class FootnotePanel extends UI {
#footnotes = new Map();
constructor({footnotes, listener}, parent = null) {
super('ui-footnote', parent);
if (footnotes) {
this.el.dataset.title = I18n.get('label.footnote');
this.child('ol', ul => {
footnotes.forEach(each => {
this.#footnotes.set(each.id, each);
const li = ul.child('li');
if (listener) {
new Link({
name: each.label + '.',
listener: () => listener(each),
}, li).attr('title', I18n.get('label.to_content'));
} else {
new UI('span', li).html(each.label + '.');
}
new UI('span', li).html(each.text).on('click', event => {
const a = event.target.closest('a');
if (a && a.tagName === 'A') {
event.preventDefault();
this.openLink(a);
}
});
});
});
}
}
setContentPanel(panel) {
panel.queryAll('.table_footnotes .footnote_item').forEach(each => {
const id = Number(each.dataset.footnoteId);
this.#footnotes.set(id, {
id,
elementId: each.dataset.elementId,
text: each.innerHTML,
});
});
panel.el.addEventListener('click', event => {
let element = event.target;
if (DomUtil.hasClass(element, 'footnote')) {
event.preventDefault();
event.stopPropagation();
this.footnote(element);
}
});
}
footnote(sup) {
const id = Number(sup.parentNode.dataset.id);
const footnote = this.#footnotes.get(id);
if (!footnote) {
return;
}
const fp = new FloatingPanel({closable: true});
new UI('ui-footnote-modal', fp).html(footnote.text);
fp.open(sup);
}
openLink(a) {
let href = a.getAttribute('href');
if (!href) {
return;
}
if (DomUtil.hasClass(a, 'reference')) {
href = `/r/document/view/${href.substring(1)}`;
}
const {layoutOption} = Applications.getOption();
if (layoutOption && layoutOption.openLinkInCurrent) {
window.location.href = href;
} else {
window.open(href);
}
}
}
class ChapterContentManager {
constructor({fragment = false, panel, footnotes,}) {
panel.el.addEventListener('click', event => {
let openInNew = false;
let a = event.target;
let {tagName} = a;
if (tagName === 'IMG' && DomUtil.hasClass(a, 'link')) {
a = a.previousElementSibling;
openInNew = true;
tagName = a?.tagName;
}
if (tagName === 'A') {
if (DomUtil.hasClass(a, 'reference')) {
const id = a.getAttribute('href').substring(1);
const element = document.getElementById(id);
if (!openInNew && element) {
Applications.getApplication().scroll(element);
} else if (openInNew) {
if (fragment) {
window.open(`/r/a/${id}`);
} else {
window.open(`/r/document/view/${id}`);
}
} else {
if (fragment) {
window.location.href = `/r/a/${id}`;
} else {
window.open(`/r/document/view/${id}`);
}
}
event.preventDefault();
} else if (!Applications.getOption().openLinkInCurrent) {
window.open(a.getAttribute('href'));
event.preventDefault();
}
} else if (tagName === 'SPAN' && DomUtil.hasClass(a, 'link')) {
this.openContextMenu(event, a.previousElementSibling);
}
});
if (footnotes?.length) {
const footnotePanel = new FootnotePanel({
footnotes,
listener: footnote => {
const sub = panel.query(`#footnote_${footnote.id}`);
if (sub) {
Applications.getApplication().scroll(sub);
}
},
});
footnotePanel.setContentPanel(panel);
panel.appendAfter(footnotePanel);
}
}
openContextMenu(event, a) {
const contextMenu = new ContextMenu();
if (Applications.getOption().exportType !== 'HTML') {
contextMenu.add({
name: I18n.get('label.preview'),
listener: () => {
const id = a.dataset.reference || a.getAttribute('href').substring(1);
if (id) {
DocumentPreviewer.open(id, a.innerHTML);
}
},
});
}
contextMenu.add({
name: I18n.get('label.open_link_in_new_window'),
listener: () => this.openDocument(a, true),
});
contextMenu.add({
name: I18n.get('label.open_link_in_current_window'),
listener: () => this.openDocument(a, false),
});
contextMenu.open(event.x, event.y);
}
openDocument(a, openInNew) {
const href = a.getAttribute('href');
if (!href) {
return;
}
const url = `/r/document/view/${href.substring(1)}`;
if (openInNew) {
window.open(url);
} else {
window.location.href = url;
}
}
}
class IndexPreviewer extends UI {
constructor(option) {
super('ui-index-previewer', document.body);
new PageHeader({
title: new Html(option.title),
icon: 'format_align_right',
}, this);
new IndexViewer({
preview: true,
...option,
listener: id => window.open(`/r/document/open/${id}`),
}, this);
}
}
class IndexViewer extends UI {
constructor(model, parent) {
super('ui-index-viewer', parent);
queueMicrotask(() => this.skeleton(async () => this.load(model), 10));
}
async load(model) {
const url = model.preview ? `/r/index/get/${model.id}` : `/r/viewer/index/${model.id}`;
const response = await Http.get(url, true);
const panel = new TogglePanel(this);
response.forEach(each => panel.add(each.name, new IndexEntry(each, model.listener)));
}
}
class IndexEntry extends UI {
#listener;
constructor(model, listener) {
super('ui-index-entry');
if (listener) {
this.#listener = event => listener(event.currentTarget.getAttribute('href').substring(1));
}
new UI('h1', this).plain(model.name);
this.addEntries(new UI('ul', this), model.entries);
}
addEntries(ul, entries = []) {
entries.forEach(({name, locations, entries: children}) => {
ul.child('li', li => {
li.html(name);
if (locations) {
li.child('span', span => {
locations.forEach((href) => {
new Link({
name: '·',
href,
listener: this.#listener,
}, span);
});
});
}
if (children) {
this.addEntries(new UI('ul', li), children);
}
});
});
}
}
class DocLink extends Link {
constructor({id, name, href, elementId}, parent = null) {
super({
name: new Html(name),
listener: event => {
if (!id && !href) {
return;
}
const cm = new ContextMenu();
if (Applications.getOption().exportType !== 'HTML' && id) {
cm.add({
name: I18n.get('label.preview'),
listener: () => DocumentPreviewer.open(elementId || id, this.el.innerText),
});
}
cm.add({
name: I18n.get('label.open_link_in_new_window'),
listener: () => window.open(id ? `/r/document/view/${elementId || id}` : href),
});
if (Applications.getController().open) {
cm.add({
name: I18n.get('label.open_link_in_current_window'),
listener: () => id ? Applications.getController().open(elementId || id) : window.location.href = href,
});
}
cm.open(event);
}
}, parent);
}
}
class PageSelector extends Modal {
constructor(model) {
super({
title: I18n.get('label.select_page'),
});
queueMicrotask(() => this.load(model));
}
async load({values = [], listener}) {
const pages = await Http.get('/r/web_page/pages');
const fields = new Fields({form: new Form(),});
fields.type = 'option';
pages.forEach(each => {
fields.toggle({
label: each.name,
value: values.includes(each.id),
listener: on => listener(each, on),
});
});
this.add(fields);
}
}
class DocumentPreviewer extends UI {
static previewer;
static open(id, name) {
if (!DocumentPreviewer.previewer) {
DocumentPreviewer.previewer = new DocumentPreviewer().css({zIndex: 9999});
}
DocumentPreviewer.previewer.preview(id, name);
}
#cache = new Map();
#tab;
constructor(parent) {
super('ui-document-previewer', parent || document.body);
this.#tab = new Tab({attach: false,}, this);
if (!parent) {
new Icon({
icon: 'close',
listener: () => this.hide(),
}, this);
}
}
preview(id, name) {
if (this.#cache.has(id)) {
this.#tab.selectItem(this.#cache.get(id));
} else {
const item = this.#tab.add(new UIArray([
new UI('span').html(name),
new Icon({
icon: 'close',
listener: event => {
event.stopPropagation();
const i = this.#tab.closeItem(item);
if (this.#tab.count === 0) {
this.hide();
} else {
this.#tab.select(Math.max(0, i - 1));
}
this.#cache.delete(id);
},
}),
]), () => new UI('iframe').attr('src', this.getPreviewUrl(id)));
this.#cache.set(id, item);
this.#tab.selectItem(item);
}
const main = document.querySelector('ui-main');
if (main) {
const {x} = main.getBoundingClientRect();
this.css({left: `${x}px`});
}
this.show();
}
getPreviewUrl(id) {
const params = new URLSearchParams({preview: 'true'});
const bookId = document.body.dataset.bookId;
if (bookId) {
params.set('bookId', bookId);
}
if (this.parent !== document.body) {
params.set('editor', 'true');
}
return `/r/a/${id}?${params}`;
}
}
class SeeAlso extends Panel {
constructor(model, parent) {
super({
name: I18n.get('label.related_documents'),
}, parent);
const tree = new Tree(this);
model.forEach(each => {
if (each.type === 'GROUP') {
if (each.children) {
const node = tree.add({
name: each.name,
open: true,
});
each.children.forEach(child => node.add({name: new Link(child)}));
}
} else {
tree.add({name: new Link(each)});
}
});
}
}
