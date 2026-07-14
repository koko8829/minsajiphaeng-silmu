class WebPageController {
#option = Applications.getOption();
constructor() {
this.createApplication();
}
createApplication() {
const {preview, exportType, id, name, user, libraryId, libraryName} = this.#option;
const app = new Application(document.body, preview);
const page = app.add(new Page());
if (!preview) {
app.addPen(id);
if (user) {
if (user.editable) {
app.addSidebarButton({
icon: 'edit',
bottom: true,
title: I18n.get('label.edit'),
listener: () => window.open(`/r/web_page_editor/load/${id}`),
});
}
}
app.addSidebarButton({
icon: 'vertical_align_top',
bottom: true,
title: I18n.get('label.to_top'),
listener: () => app.scrollTo(0, 0),
});
if (libraryId) {
new LibraryNavigator(app.getTop());
const breadcrumb = new Breadcrumb({}, page);
breadcrumb.add({
id: libraryId,
name: libraryName,
href: exportType === 'HTML' ? 'index.html' : `/r/library_search/${libraryId}`,
});
breadcrumb.add({
name: name,
});
}
}
new WebPage(this.#option.mainPage, page);
}
}
class WebPage extends UI {
constructor({components, layout, gap, openInNew, keepLibrary,}, parent) {
super('ui-web-page', parent);
this.addClass(layout);
this.css({gap: `${gap}rem`});
if (components) {
components.forEach(each => WebPage.writeComponent(each, this));
}
if (openInNew || (keepLibrary && keepLibrary.keepLibrary)) {
this.el.addEventListener('click', event => {
let target = event.target;
if (!(target instanceof HTMLAnchorElement)) {
target = target.closest('a');
}
if (target instanceof HTMLAnchorElement) {
event.preventDefault();
new KeepLibrary(keepLibrary, target.href, target.target === '_blank' || openInNew);
}
}, true);
}
}
static writeComponent(component, parent) {
try {
let result;
const {type, tagName, error} = component;
if (error) {
console.error(component);
return;
}
if (type === 'plain') {
let text = component.text.trim();
if (text) {
parent.append(document.createTextNode(component.text));
}
} else if (type === 'html') {
const panel = new UI(tagName, parent);
Object.keys(component).forEach(each => {
if (each !== 'tagName' && each !== 'type' && each !== 'children' && each !== 'text' && each !== 'html') {
panel.attr({
[each]: component[each],
});
}
});
(component.children || []).forEach(each => {
WebPage.writeComponent(each, panel);
});
} else if (tagName === 'r-action') {
result = new WebPageAction(component, parent);
} else if (tagName === 'r-banner') {
result = new BannerManager().open(component.banners, parent);
} else if (tagName === 'r-box') {
result = new WebPageBox(component, parent);
} else if (tagName === 'r-panel') {
result = new WebPagePanel(component, parent);
} else if (tagName === 'r-tab') {
result = new WebPageTab(component, parent);
} else if (tagName === 'r-text') {
result = new WebPageText(component, parent);
} else if (tagName === 'r-list') {
result = new WebPageList(component, parent);
} else if (tagName === 'r-doc') {
result = new WebPageDoc(component, parent);
} else if (tagName === 'r-html') {
result = new WebPageHtml(component, parent);
}
if (result) {
const {row, column} = component;
if (row) {
result.css({
gridRow: row,
});
}
if (column) {
result.css({
gridColumn: column,
});
}
}
} catch (e) {
console.error(e);
}
}
}
class WebPageAction extends UI {
constructor({children = []}, parent) {
super('ui-wp-action', parent);
this.addClass('flex', 'flex-wrap', 'gap-4', 'select-none');
children = children.filter(each => each.tagName === 'r-item');
if (children.length) {
children.forEach(({title, icon, color = 'blue', href, target,}) => {
const openInNew = (target || Applications.get('wp-target')) === '_blank';
const button = new Button({
name: title,
icon,
listener: () => {
if (openInNew) {
window.open(href);
} else {
window.location.href = href;
}
},
}, this).addClass('h-10', 'leading-10', 'px-6', 'font-bold', 'text-center', 'rounded', 'border');
button.el.dataset.bgColor = color;
});
}
}
}
class WebPageBox extends UI {
constructor(model, parent) {
super('ui-wp-box', parent);
const {title, posts, clips} = model;
if (title) {
new WebPageHeading(model, this);
}
const main = new UI('main', this).addClass('flex', 'gap-6', 'flex-wrap');
if (posts) {
posts.forEach(each => {
const card = new UI('card', main).addClass('flex', 'flex-col', 'gap-4', 'w-60', 'cursor-pointer');
const img = new UI('div', card).addClass('h-40', 'bg-cover', 'border', 'rounded-lg', 'bg-no-repeat');
if (each.themeImage) {
img.css({
backgroundImage: `URL(/r/image/get/${each.themeImage}`,
});
} else {
img.addClass('bg-sky-400')
}
const inner = new UI('div', card).addClass('flex', 'flex-col', 'gap-2');
if (each.category) {
new WebCategory(each.category, inner);
}
new UI('h1', inner).plain(each.title);
if (each.subtitle) {
new UI('p', inner).plain(each.subtitle);
}
card.on('click', () => window.location.href = `/r/document/view/${each.id}`);
});
} else if (clips) {
clips.forEach(each => {
each.listener = () => window.location.href = `/r/document/view/${each.id}`;
new VideoClip(each, main);
});
}
}
}
class WebPageDoc extends UI {
constructor(model, parent) {
super('ui-wp-doc', parent);
this.addClass('flex', 'flex-col', 'gap-12');
let {title, chapters, view} = model;
if (title) {
new WebPageHeading(model, this);
}
if (chapters) {
const openInNew = Applications.get('target') === '_blank';
const main = new UI('main', this);
if (view === 'column2') {
main.addClass('grid', 'grid-cols-2');
} else if (view === 'column3') {
main.addClass('grid', 'grid-cols-3');
} else if (view === 'column4') {
main.addClass('grid', 'grid-cols-4');
} else if (view === 'column5') {
main.addClass('grid', 'grid-cols-5');
} else {
main.addClass('flex', 'flex-col');
}
if (chapters.find(each => each.type === 'PART')) {
main.addClass('gap-8');
if (chapters.find(each => each.type === 'APPENDIX')) {
const appendixes = chapters.filter(each => each.type === 'APPENDIX');
chapters.push({
type: 'PART',
title: I18n.get('label.appendix'),
chapters: appendixes,
});
}
chapters = chapters.filter(each => each.type === 'PART' || each.type === 'CHAPTER');
chapters.forEach(each => {
if (each.chapters) {
const section = new UI('section', main).addClass('flex', 'flex-col', 'gap-3');
new UI('h1', new UI('header', section)).plain(each.title).addClass('font-bold');
const chaptersMain = new UI('main', section).addClass('flex', 'flex-col', 'gap-2');
each.chapters.forEach(({title, href}) => {
new Link({
name: new Plain(title),
href,
openInNew,
}, chaptersMain);
});
} else {
new Link({
name: new Plain(each.title),
href: each.href,
openInNew,
}, main);
}
});
} else {
main.addClass('gap-2');
chapters.forEach(({title, href}) => {
new Link({
name: new Plain(title),
href,
openInNew,
}, main);
});
}
}
}
}
class WebPageHeading extends UI {
constructor({title, icon, color}, parent) {
super('h1', parent);
this.addClass('flex', 'gap-2', 'items-center', 'w-fit', 'max-w-full', 'truncate',);
if (icon) {
new UIArray([
new Icon({
icon,
color,
}),
new Html(title),
], this);
} else {
this.html(title);
}
}
}
class WebPageHtml extends UI {
constructor(model, parent) {
super('ui-wp-html', parent);
const {title, children} = model;
if (title && !(parent instanceof SwitchPanel)) {
this.addClass('flex', 'flex-col', 'gap-4');
new WebPageHeading(model, this);
}
if (children) {
children.forEach(each => WebPage.writeComponent(each, this));
}
}
}
class WebPageList extends UI {
constructor(model, parent) {
super('ui-wp-list', parent);
this.addClass('flex', 'flex-col', 'gap-4');
const {title, children} = model;
if (title) {
if (children.length) {
model.title = new UIArray([
new Plain(model.title),
new Icon({
icon: 'keyboard_arrow_down',
listener: (event, icon) => {
if (icon.icon === 'keyboard_arrow_right') {
icon.icon = 'keyboard_arrow_down';
icon.attr('title', I18n.get('label.collapse'));
main.show();
} else {
icon.icon = 'keyboard_arrow_right';
icon.attr('title', I18n.get('label.expand'));
main.hide();
}
},
}).attr('title', I18n.get('label.collapse')),
]);
}
new WebPageHeading(model, this);
}
let main;
if (children.length) {
main = new UI('main', this).addClass('flex', 'flex-col', 'gap-2');
children.forEach(each => {
let {title, href, target, labels, error} = each;
if (error) {
console.error(each);
return;
}
title ||= href;
if (!target) {
target = Applications.get('wp-target');
}
new UIArray([
new Icon('arrow_right'),
() => {
if (labels) {
return new UIArray([
new Link({
name: title,
href: href,
openInNew: target === '_blank',
}),
new Labels({labels}),
]);
} else {
return new Link({
name: title,
href: href,
openInNew: target === '_blank',
});
}
},
], main);
});
}
}
}
class WebPagePanel extends UI {
constructor(model, parent) {
super('ui-wp-panel', parent);
this.addClass('flex', 'flex-col', 'gap-12');
const {title, children} = model;
if (title) {
new WebPageHeading(model, this);
}
if (children) {
children.forEach(each => WebPage.writeComponent(each, this));
}
}
}
class WebPageTab extends Tab {
constructor({children = []}, parent) {
super({}, parent);
children.forEach(each => {
if (each.tagName === 'text') {
return;
}
let {title, icon, color} = each;
if (title) {
if (icon || color) {
title = new UIArray([
new Icon({icon, color}).addClass('rounded'),
new Html(title),
]);
}
this.add(title, () => {
const result = new UI('div');
delete each.title; // 탭 아래에 오는 컴포넌트는 제목이 필요 없음
WebPage.writeComponent(each, result);
return result;
});
} else {
console.error(each);
}
});
this.select(0);
}
}
class WebPageText extends UI {
constructor({title, href, icon, color, html}, parent) {
super('ui-wp-text', parent);
this.addClass('flex', 'flex-col', 'gap-4');
const openInNew = Applications.get('wp-target') === '_blank';
if (href) {
this.addClass('cursor-pointer');
this.on('click', () => {
if (openInNew) {
window.open(href);
} else {
window.location.href = href;
}
});
}
if (icon) {
if (icon.startsWith('/r/wp/')) {
new UI('img', this).attr('src', icon);
} else {
new Icon({
icon,
color: color,
}, this);
}
}
if (title) {
new UI('h1', this).plain(title).addClass('text-base', 'hover:underline');
}
if (html) {
new UI('p', this).html(html).addClass('leading-loose');
}
}
}
