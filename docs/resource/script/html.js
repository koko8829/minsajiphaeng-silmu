const HtmlExport = {

    contents: new Map(),

    addSearchContent: (id, contents) => {
        HtmlExport.contents.set(id, contents);
    },

    search: (id, { query, filter }) => {
        const { title, contents } = HtmlExport.contents.get(id);
        const finder = createFinder(query.toLowerCase());
        const result = {
            completed: true,
            rate: 100,
            title,
            chapters: [],
            count: 0,
        }
        contents.forEach(each => {
            const value = finder.search(each);
            if (value.count > 0) {
                result.count += value.count;
                result.chapters.push(value);
            }
        });
        return result;
    },

    searchLibrary: (query) => {
        const response = {
            completed: false,
            rate: 0,
            subworks: [],
        };
        const size = HtmlExport.contents.size;
        let i = 0;
        HtmlExport.contents.forEach((v, id) => {
            const value = HtmlExport.search(id, { query });
            value.id = id;
            response.rate = Math.max(99, 100 * (i++) / size);
            response.subworks.push(value);
            Applications.fire(EventType.SEARCH_PROGRESS, response);
        });
        response.completed = true;
        response.rate = 100;
        return response;
    },

};

function createFinder(keyword) {
    var finder = {
        count: 0,
        textMatch: {
            caseSensitive: false,
            index: -1,
            remaining: '',
            init: function (keyword) {
                if (this.caseSensitive) {
                    keyword = keyword.toLowerCase();
                }
                keyword = keyword.replace(/&/, '&amp;').replace(/</, '&lt;').replace(/>/, '&gt;');
                this.actual = keyword.split('');
            },
            getMatched: function () {
                var openTags = [];
                var closeTags = [];
                var index = this.remaining.indexOf('<');
                while (index !== -1) {
                    var tag = "";
                    var open = true;
                    for (var i = index + 1; i < this.remaining.length; i++) {
                        var c = this.remaining.charAt(i);
                        if (i === index + 1) {
                            open = c !== '/';
                        }
                        if (c === ' ' || c === '>') {
                            if (open) {
                                openTags[openTags.length] = tag;
                            } else {
                                tag = tag.substring(1);
                                if (openTags.length === 0) {
                                    closeTags[closeTags.length] = tag;
                                } else {
                                    var t = openTags[openTags.length - 1];
                                    if (t === tag) {
                                        openTags.pop();
                                    } else {
                                        closeTags[closeTags.length] = tag;
                                    }
                                }
                            }
                            index = this.remaining.indexOf('/', i + 1);
                            break;
                        } else {
                            tag += c;
                        }
                    }
                }
                var result = "";
                closeTags.forEach(function (each) {
                    result += '</' + each + '>';
                });
                result += '<span class="find">';
                closeTags.forEach(function (each) {
                    result += '<' + each + '>';
                });
                result += this.remaining;
                openTags.forEach(function (each) {
                    result += '</' + each + '>';
                });
                result += '</span>';
                openTags.forEach(function (each) {
                    result += '<' + each + '>';
                });
                return result;
            },
            getRemaining: function () {
                return this.remaining;
            },
            reset: function () {
                this.index = -1;
                this.remaining = '';
            },
            add: function (c, ignore) {
                var compare = this.caseSensitive ? c : c.toLowerCase();
                if (this.index === -1) {
                    if (!ignore && compare === this.actual[0]) {
                        this.remaining += c;
                        this.index = 0;
                        return this.actual.length === 1 ? 'MATCHED' : 'IGNORE';
                    } else {
                        return 'ADD';
                    }
                } else {
                    this.remaining += c;
                    if (ignore) {
                        return 'IGNORE';
                    } else if (compare === this.actual[++this.index]) {
                        return (this.index === this.actual.length - 1) ? 'MATCHED' : 'IGNORE';
                    } else {
                        return 'UNMATCHED';
                    }
                }
            }
        },
        find: function (content) {
            if (!content) {
                return '';
            }
            var result = '';
            content = content.replace(/(&nbsp;){1}/, ' ');
            var ignore = false;
            for (var i = 0; i < content.length; i++) {
                var each = content.charAt(i);
                if (!ignore && each === '<') {
                    ignore = true;
                }
                switch (this.textMatch.add(each, ignore)) {
                    case 'ADD':
                        result += each;
                        break;
                    case 'MATCHED':
                        result += this.textMatch.getMatched();
                        this.textMatch.reset();
                        this.count++;
                        break;
                    case 'UNMATCHED':
                        result += this.textMatch.getRemaining();
                        this.textMatch.reset();
                        break;
                }
                if (ignore && each === '>') {
                    ignore = false;
                }
            }
            result += this.textMatch.getRemaining();
            this.textMatch.reset();
            return result;
        },
        getCount: function () {
            return this.count;
        },
        reset: function () {
            this.count = 0;
            this.textMatch.reset();
        },
        search: function (content) {
            if (!this.keyword) {
                return {
                    html: '',
                    count: 0
                };
            }
            var count = 0;
            var results = [];
            content.elements.forEach((each) => {
                var text = each.text;
                var sb = this.find(text);
                var c = this.getCount();
                if (c > 0) {
                    count += c;
                    results.push(sb);
                }
                this.reset();
            });
            return {
                id: content.id,
                title: content.title,
                partTitle: content.partTitle,
                href: content.href,
                count: count,
                elements: results,
            };
        }
    };

    keyword = keyword.toLowerCase();
    finder.textMatch.init(keyword);
    finder.keyword = keyword;
    return finder;
}
