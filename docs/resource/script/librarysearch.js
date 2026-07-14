class LibraryController {
#main;
#history;
#logId;
#clarification;
constructor() {
Applications.set(ComponentType.CONTROLLER, this);
this.createApplication();
}
clearConversation() {
this.#history = new ChatbotHistory();
this.#logId = null;
this.#clarification = null;
}
get logId() {
return this.#logId;
}
set logId(logId) {
this.#logId = logId;
}
get clarification() {
return this.#clarification;
}
set clarification(clarification) {
this.#clarification = clarification;
}
get history() {
if (!this.#history) {
this.#history = new ChatbotHistory();
}
return this.#history;
}
createApplication() {
const option = Applications.getOption();
const {id, user, chatbot, footerPage, showSidebar} = option;
const app = new Application();
app.addSidebarButton({
icon: 'view_cozy',
title: I18n.get('label.document_explorer'),
listener: button => app.openSidebar(button, () => new LibraryDocuments(option)),
});
if (user) {
app.addSidebarButton({
icon: 'menu',
title: I18n.get('label.document_explorer'),
listener: button => app.openSidebar(button, () => new DocumentPanel()),
});
app.addSidebarButton({
icon: 'star',
title: I18n.get('label.favorites'),
listener: button => app.openSidebar(button, () => new FavoritePanel(true, 'view')),
});
app.addPen(null);
if (user.editable) {
app.addSidebarButton({
icon: 'edit',
bottom: true,
title: I18n.get('label.edit'),
listener: () => window.open(`/!#/r/library/view/${id}`),
});
}
}
app.addSidebarButton({
icon: 'vertical_align_top',
bottom: true,
title: I18n.get('label.to_top'),
listener: () => app.scrollTo(0, 0),
});
new LibraryNavigator(app.getTop());
if (chatbot) {
this.#main = app.add(new Tab({}));
this.#main.add(I18n.get('label.chatbot'), new ChatbotPanel([chatbot]));
this.#main.add(document.title, new LibraryMain(option));
this.#main.select(0);
} else {
this.#main = app.add(new LibraryMain(option));
}
if (footerPage) {
app.add(new Footer(footerPage));
}
if (showSidebar) {
app.runSidebarButton(0);
}
if (window.parent) {
this.onMessage();
}
}
onMessage() {
window.addEventListener('message', event => {
const {type} = event.data;
if (type === 'get-document-profile') {
const {id} = Applications.getOption();
window.parent.postMessage({
type: 'document-profile',
library: {
id,
type: 'LIBRARY',
},
}, '*');
}
});
}
}
class LibraryMain extends UI {
constructor(option) {
super('ui-flex-panel');
const {id, libraryId, documents, page} = option;
if (!documents.length && !Applications.user()) {
new Message(I18n.get('label.login_required_for_library', window.location.pathname), this);
}
const searchPanel = new UI('div');
new LibrarySearcher(
{
...option,
id: libraryId || id,
},
searchPanel,
this,
);
const switchPanel = new SwitchPanel({}, this);
switchPanel.add('search', searchPanel);
const main = new UI('div');
new WebPage(page.mainPage, main);
switchPanel.add('main', main, true);
Applications.addEventListener(EventType.SHOW_SEARCH_PANEL, () => switchPanel.get('search'));
Applications.addEventListener(EventType.CLOSE_SEARCH_PANEL, () => switchPanel.get('main'));
}
}
class KeepLibrary {
constructor({id, keepLibrary,}, href, openInNew) {
if (keepLibrary) {
const flag = href.indexOf('?') === -1 ? `?_l=${id}` : `&_l=${id}`;
const i = href.indexOf('#');
if (i === -1) {
href += flag;
} else {
href = href.substring(0, i) + flag + href.substring(i);
}
}
if (openInNew) {
window.open(href);
} else {
window.location.href = href;
}
};
}
class LibraryDocuments extends UI {
constructor(option, parent = null) {
super('ui-flex-panel', parent);
const accordion = new Accordion(this);
option.documents.forEach(each => new LibraryDocument(each, accordion));
this.detach();
}
}
class LibraryDocument {
constructor({id, title, type}, accordion) {
const {exportType} = Applications.getOption();
accordion.add(new UIArray(
[
Icon.getDocumentIcon(type, title),
() => {
if (type === 'BOOK' && exportType !== 'HTML') {
return new Icon({
icon: 'apps',
listener: event => {
event.preventDefault();
event.stopPropagation();
new DocumentMap(id, title);
},
});
}
}
]
), new LazyPanel(() => {
return new TableOfContents({
id,
exportType,
listener: ({id, title, href}, openInNew, event) => {
href = href || `/r/document/view/${id}`;
if (openInNew) {
const contextMenu = new ContextMenu();
if (exportType !== 'HTML') {
contextMenu.add({
name: I18n.get('label.preview'),
listener: () => DocumentPreviewer.open(id, title),
});
}
contextMenu.add({
name: I18n.get('label.open_link_in_new_window'),
listener: () => {
new KeepLibrary(Applications.getOption(), href, true);
},
});
contextMenu.add({
name: I18n.get('label.open_link_in_current_window'),
listener: () => {
new KeepLibrary(Applications.getOption(), href, false);
},
});
contextMenu.open(event.x, event.y);
} else {
new KeepLibrary(Applications.getOption(), href, openInNew);
}
},
});
}));
}
}
class LibraryDownloadController {
constructor(option) {
Applications.set(ComponentType.APPLICATION_OPTION, option);
Applications.set(ComponentType.CONTROLLER, this);
this.createApplication();
}
createApplication() {
const app = new Application();
app.addSidebarButton({
icon: 'vertical_align_top',
bottom: true,
title: I18n.get('label.to_top'),
listener: () => app.scrollTo(0, 0),
});
new LibraryNavigator(app.getTop());
app.add(new LibraryDownload());
}
}
class LibraryDownload extends Page {
constructor() {
super();
queueMicrotask(() => this.load());
}
async load() {
const {libraryId, libraryName} = Applications.getOption();
const breadcrumb = new Breadcrumb({}, this);
breadcrumb.add({
id: libraryId,
name: libraryName,
href: `/r/library_search/${libraryId}`,
});
breadcrumb.add({
name: I18n.get('label.download'),
});
const documents = await Http.get(`/r/library_download/${Applications.getOption().libraryId}/documents`);
new Grid({
columns: [
{
id: 'name',
w: 10,
render: ({documentId, type, name}) => new Link({
name: name,
href: `/r/${type.toLowerCase()}/download/${documentId}`,
}),
sortable: false,
},
{
id: 'type',
w: 3,
render: ({type}) => new Plain(I18n.get(`label.${type.toLowerCase()}`)),
sortable: false,
},
{
id: 'size',
unit: 'file',
w: 3,
sortable: false,
},
{...GridColumns.createTime(), w: 5, sortable: false},
],
data: documents,
}, this);
}
}
class LibraryNavigator {
#parent;
#topSearchPanel;
#topSearcher;
constructor(parent) {
this.#parent = parent;
queueMicrotask(() => this.load());
}
async load() {
let {exportType, id, libraryId, originalId, hideSearchInTop} = Applications.getOption();
if (originalId) {
id = originalId;
}
let library;
if (id === 'all') {
library = {items: []};
} else {
library = await Http.get(`/r/library_search/get_items/${libraryId}`, true);
const f = (each) => {
if (each.bookId === id && !each.item) {
each.selected = true;
}
if (each.children) {
each.children.forEach(c => f(c));
}
};
library.items.forEach(each => {
if (each.type === 'MENU_GLOSSARY') {
each.listener = () => this.openGlossary(each.bookId);
}
f(each);
});
}
new Navigator(library, this.#parent);
if (exportType !== 'HTML' && !hideSearchInTop) {
const sb = new UI('ui-top-search');
sb.on('click', async () => {
await this.loadTopSearchPanel();
this.openTopSearchPanel();
this.#topSearcher.focus();
});
new Icon('search', sb);
this.#parent.query('ui-avatar').after(sb.el);
window.addEventListener('popstate', () => {
if (!this.#topSearchPanel || this.#topSearchPanel.el.style.display === 'none') {
return;
}
this.#topSearchPanel.hide();
});
}
}
async loadTopSearchPanel() {
if (this.#topSearchPanel) {
return;
}
const option = Applications.getOption();
const documents = await this.getTopSearchDocuments(option.libraryId);
this.#topSearchPanel = new UI('ui-top-search-panel', document.body).addClass('mouseover-scrollbar');
this.#topSearchPanel.hide();
new Icon({
icon: 'close',
listener: () => window.history.back(),
}, this.#topSearchPanel);
this.#topSearcher = new LibrarySearcher({
...option,
id: option.libraryId,
documents,
showSearchPanel: false,
}, null, this.#topSearchPanel);
}
async getTopSearchDocuments(libraryId) {
try {
return await Http.get(`/r/library/get_documents/${libraryId}`);
} catch (ignore) {
return [];
}
}
openTopSearchPanel() {
if (this.#topSearchPanel.el.style.display !== 'none') {
return;
}
try {
history.pushState({topSearchPanel: true}, '', window.location.href);
} catch (ignore) {
}
this.#topSearchPanel.show('flex');
}
async openGlossary(id) {
await DrawerManager.toggle(id, () => {
const drawer = new Drawer({
title: I18n.get('label.glossary'),
});
new GlossaryPanel({
url: `/r/library_search/glossary/${Applications.getOption().libraryId}/${id}`,
}, drawer);
return drawer;
});
}
}
class LibrarySearcher extends SearchBox {
#panel;
#documents;
#showSearchPanel;
constructor(option, panel, parent) {
super({
filter: option.exportType === 'HTML' ? null : LibrarySearcher.getFilter(option),
suggestion: option.exportType === 'HTML' ? null : option.id,
listener: query => this.searchLibrary(query, option),
}, parent);
if (!panel) {
panel = new UI('div', parent);
}
this.#panel = panel;
this.#showSearchPanel = option.showSearchPanel !== false;
const q = this.queryString('q');
if (q) {
this.search(q);
}
}
static getFilter(option) {
const filter = [
{
id: 'base',
name: I18n.get('label.name'),
options: [
{
name: I18n.get('label.case_sensitive'),
value: 'caseSensitive',
},
{
name: I18n.get('label.search_any_word'),
value: 'anyWord',
},
],
},
{
id: 'type',
name: I18n.get('label.type'),
allToggle: true,
options: [
{
name: I18n.get('label.heading'),
value: 'HEADING',
},
{
name: I18n.get('label.code'),
value: 'CODE',
},
{
name: I18n.get('label.table'),
value: 'TABLE',
},
{
name: I18n.get('label.image'),
value: 'IMAGE',
},
{
name: I18n.get('label.text'),
value: 'TEXT',
},
],
}
];
filter.push({
id: 'document',
layout: 'column',
name: I18n.get('label.document'),
allToggle: true,
options: [
...option.documents.map(({title, id}) => ({
name: title,
value: id,
})),
],
});
return filter;
}
async searchLibrary(query, option) {
const q = (query.query || '').trim();
if (!q) {
if (this.#showSearchPanel) {
Applications.fire(EventType.CLOSE_SEARCH_PANEL);
} else {
if (this.#documents) {
this.#documents.remove();
this.#documents = null;
}
this.#panel.clear();
}
return;
}
if (this.#showSearchPanel) {
Applications.fire(EventType.SHOW_SEARCH_PANEL);
}
if (this.#documents) {
this.#documents.remove();
}
this.#documents = new LibrarySearchDocuments({...option, keyword: q, filter: query.filter}, this.#panel);
this.#documents.start();
if (option.exportType === 'HTML') {
this.#documents.complete(HtmlExport.searchLibrary(q));
return;
}
await Http.monitor({
url: `/r/library_search/${option.id}?keyword=${q}`,
parameter: query,
monitor: response => {
this.#documents.progress(response);
if (response.completed) {
if (!this.#documents.complete(response)) {
this.#panel.clear();
new Message(I18n.get('label.string_not_found'), this.#panel);
}
}
},
});
}
}
class StaticLibraryController {
constructor() {
Applications.set(ComponentType.CONTROLLER, this);
this.createApplication();
}
createApplication() {
const app = new Application();
app.addPen(null);
app.addSidebarButton({
icon: 'vertical_align_top',
bottom: true,
title: I18n.get('label.to_top'),
listener: () => this.scroll(),
});
new LibraryNavigator(app.getTop());
app.add(new StaticPanel());
}
scroll() {
const iframe = document.querySelector('iframe');
iframe.contentWindow.scrollTo(0, 0);
}
}
class StaticPanel extends UI {
constructor() {
super('iframe');
const {defaultUrl} = Applications.getOption();
this.attr('src', defaultUrl);
}
}
