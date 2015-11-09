"use strict";

var WidgetCtl;
export {WidgetCtl};

(function (window, document) {
    let de = document.createElement.bind(document),
        df = document.createDocumentFragment.bind(document),
        sort = Array.prototype.sort,
        each = Array.prototype.forEach;

    const CLASS = {
        HIDDEN: 'hidden',
        ERROR: 'error'
    };

    //FIXME: ! rewrite tree walkthroug

    //TODO: actualize list
    var STOP_WORDS = ['для', 'на', 'по'];

    function strComparator(a, b) {
        a = a.toLocaleLowerCase();
        b = b.toLowerCase();

        if (a > b) return 1;
        if (a < b) return -1;
        return 0;
    }

    function loadData() {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/data?c=100&i=1000');

            xhr.onload = function (e) {
                resolve(JSON.parse(this.response));
            };
            xhr.onerror = reject;

            xhr.send();
        });
    }

    /*
     function tokenize(str, adj = []) {
     return str.split(' ').filter((t) => {
     //TODO: stemming
     return STOP_WORDS.indexOf(t) === -1
     && !!adj.length && adj.indexOf(t) === -1;
     });
     }
     */
    function tokenize(str, adj = []) {
        return str.split(' ').map(s => s.toLowerCase());
    }

    function appendIndex(tree, str, val) {
        let path = str.split(''),
            leaf = tree;

        for (let p of path) {
            leaf[p] = leaf[p] || {};
            leaf = leaf[p];
            leaf.nodes = leaf.nodes || [];
            val ? leaf.nodes.push(val) : null;
        }

        return leaf;
    }

    function searchIndex(tree, str) {
        let path = str.split(''),
            leaf = tree;

        for (let p of path) {
            if (!leaf[p]) {
                leaf = null;
                break;
            }
            leaf = leaf[p];
        }

        return leaf ? leaf.nodes : null;
    }

    WidgetCtl = class WidgetCtl {

        constructor(widget, options) {
            this.widget = widget;
            this.index = {};
            this.cards = {};
            this.allNodes = [];
            //TODO: default options
            this.options = options;

            let shadowRoot = widget.shadowRoot;
            this.view = {
                list: shadowRoot.getElementById('list'),
                search: shadowRoot.getElementById('search')
            };

            loadData()
                .then((data) => {
                    let content = this.render(data),
                        list = this.view.list;

                    list.appendChild(content);

                    this.layoutManager = this.options.layout === 'js'
                                            ? new Packery(this.view.list, {
                                                    itemSelector: 'div',
                                                    gutter: 10
                                                })
                                            : null;
                    this._bindEvents();
                })
                .catch(function () {
                    console.error(arguments);
                })
            ;
        }


        _hideNode(node) {
            node.el.classList.add(CLASS.HIDDEN);
        }

        _showNode(node) {
            node.el.classList.remove(CLASS.HIDDEN);
        }

        _toggleSearchNotFound(toggle) {
            let search = this.view.search;

            toggle
                ? search.classList.add(CLASS.ERROR)
                : search.classList.remove(CLASS.ERROR);
        }

        updateView(val) {
            let nodes = searchIndex(this.index, val);

            this._toggleSearchNotFound(!nodes);
            this.resetView();

            if(!nodes) {
                return;
            }

            this.allNodes.forEach((n) => {
                this._hideNode(n);
            });

            let roots = {};
            nodes && nodes.forEach((n) => {
                this._showNode(n);

                if(n.parent) {
                    this._showNode(n.parent);
                    roots[n.parent.id] = roots[n.parent.id] || {}
                    roots[n.parent.id].cnt = (roots[n.parent.id].cnt || 0) + 1;
                    roots[n.parent.id].label = roots[n.parent.id].label || n.parent.data.label;
                } else {
                    roots[n.id] = roots[n.id] || {};
                    roots[n.id].cnt = roots[n.id].cnt || 0;
                    roots[n.id].label = n.data.label;
                }
            });

            if(Object.keys(roots).length) {
                for(let id in roots) {
                    roots[id].label.setAttribute('data-count', roots[id].cnt || 0);
                }
            }

            this.relayout();
        }

        _bindEvents() {
            let list = this.view.list,
                search = this.view.search,
                keyUpDebounceTimer = null;

            list.addEventListener('click', (evt) => {
                let target = evt.target,
                    parent = target.parentNode,
                    label = parent.previousSibling,
                    targetName = target.nodeName.toUpperCase();

                if ('LI' === targetName) {
                    let path = [label.textContent, target.textContent].join(' / ');
                    let event = new CustomEvent('xselect', {detail: path});
                    this.widget.dispatchEvent(event);
                } else if ('LABEL' === targetName) {
                    //TODO: animation end event
                    setTimeout(() => this.relayout(), 800);
                }
            });

            search.addEventListener('keyup', (evt) => {
                clearInterval(keyUpDebounceTimer);

                keyUpDebounceTimer = setTimeout(() => {
                    let val = search.value.trim().toLowerCase();

                    if (!val) {
                        this.resetView();
                        return;
                    }

                    this.updateView(val);
                }, 800);
            });
        }

        resetView() {
            this.allNodes.forEach(this._showNode);
            this.relayout();
        }

        relayout() {
            if (this.layoutManager) {
                this.layoutManager.layout();
            }
        }

        render(data) {
            let sections = data.sections,
                topics = data.topics,
                cats = [],
                cards = this.cards,
                frag = df(),
                index = this.index;

            sections.forEach((s) => {
                let container = de('div');
                let check = de('input');
                let sectionId = 'section_' + s.id;
                let title = s.title;

                check.setAttribute('type', 'checkbox');
                check.setAttribute('checked', 'checked');
                check.setAttribute('id', sectionId);

                let label = de('label');
                label.setAttribute('for', sectionId);
                label.textContent = title;

                let list = de('ul');

                container.appendChild(check);
                container.appendChild(label);
                container.appendChild(list);

                let leaf = {
                    el: container,
                    data: {
                        list: list,
                        label: label,
                        title: title
                    },
                    children: [],
                    level: 1,
                    id: s.id,
                    parent: null
                };

                cats.push(leaf);
                this.allNodes.push(leaf);
                cards[s.id] = leaf;

                for (let t of tokenize(title)) {
                    appendIndex(index, t, leaf);
                }
            });

            cats.sort(function (a, b) {
                return strComparator(a.data.title, b.data.title);
            });

            topics.forEach((topic) => {
                let el = de('li');
                let topicId = 'topic_' + topic.id;
                let parentId = topic.section;
                let title = topic.title;
                let parent = cards[parentId];

                el.textContent = title;
                el.setAttribute('id', topicId);
                parent.children.push(el);

                let leaf = {
                    el: el,
                    level: 2,
                    id: topic.id,
                    data: null,
                    children: null,
                    parent: cards[parentId]
                };

                this.allNodes.push(leaf);

                for (let token of tokenize(title)) {
                    appendIndex(index, token, leaf);
                }
            });


            for (let cat of cats) {
                sort.call(cat.children, function (a, b) {
                    return strComparator(a.textContent, b.textContent);
                });

                cat.data.label.setAttribute('data-count', cat.children.length);

                each.call(cat.children, function (c) {
                    cat.data.list.appendChild(c);
                });

                frag.appendChild(cat.el);
            }

            return frag;
        }
    }
})(window, document.currentScript.ownerDocument);