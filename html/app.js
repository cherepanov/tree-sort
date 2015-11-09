(function (document, global) {
    "use strict";

    let qsa = document.querySelectorAll.bind(document),
        qs = document.querySelector.bind(document),
        byId = document.getElementById.bind(document),
        cl = console.log.bind(console),
        de = document.createElement.bind(document),
        sort = Array.prototype.sort,
        each = Array.prototype.forEach,
        slice = Array.prototype.slice,
        map = Array.prototype.map,
        heapSort = window.heapSort;


    //let index = Object.create(null);
    let index = {},
        cards = {};


    //TODO: actualize list
    var STOP_WORDS = ['для', 'на', 'по'];

    function loadData() {
        return new Promise((resolve, reject) => {
            $.getJSON('/data?c=100&i=1000').done(function(data) {
                resolve(data);
            }).fail(function() {
                reject(arguments);
            });
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

        for(let p of path) {
            leaf[p] = leaf[p] || {};
            leaf = leaf[p];
            leaf.items = leaf.items || [];
            val ? leaf.items.push(val) : null;
        }

        return leaf;
    }

    function searchIndex(tree, str) {
        let path = str.split(''),
            leaf = tree;

        for(let p of path) {
            if(!leaf[p]) break;
            leaf = leaf[p];
        }

        return leaf.items;
    }

    function strComparator(a, b) {
        a = a.toLocaleLowerCase();
        b = b.toLowerCase();

        if(a > b) return 1;
        if(a < b) return -1;
        return 0;
    }

    function render(data) {
        let sections = data.sections,
            topics = data.topics,
            cats = [],//TODO: new Array(sections.length),
            frag = document.createDocumentFragment();

        sections.forEach(function (s) {
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

            let tokens = tokenize(title);

            let leaf = {
                root: container,
                list: list,
                label: label,
                title: title,
                tmp: []
            };

            cats.push(leaf);
            cards[s.id] = leaf;

            for(let t of tokens) {
                appendIndex(index, t, leaf);
            }
        });

        cats.sort(function(a, b) {
            return strComparator(a.title, b.title);
        });

        topics.forEach(function(t) {
            let el = de('li');
            let topicId = 'topic_' + t.id;
            let title = t.title;
            let leaf = cards[t.section];

            el.textContent = title;
            el.setAttribute('id', topicId);
            leaf.tmp.push(el);

            let tokens = tokenize(title);

            for(let t of tokens) {
                appendIndex(index, t, el);
            }
        });

        for(let cat of cats) {
            var items = cat.tmp,
                el = cat.root;

            sort.call(items, function(a, b) {
                return strComparator(a.textContent, b.textContent);
            });

            cat.label.setAttribute('data-count', items.length);

            each.call(items, function(i) {
                cat.list.appendChild(i);
            });
            delete cat['tmp'];

            frag.appendChild(el);
        }

        return frag;
    }

    window.onload = function() {
        loadData().then(function(data) {
            let content = render(data),
                search = byId('search'),
                list = byId('list'),
                useJsLayout = list.getAttribute('data-layout') === 'js',
                packery;

            function relayout () {
                if(!useJsLayout) return;

                packery = packery || new Packery(list, {
                    itemSelector: '#list div',
                    gutter: 10/*,
                     isInitLayout: false*/
                });

                //TODO: real animation end
                setTimeout(() => {
                    packery.layout();
                }, 500);
            }

            list.appendChild(content);
            relayout();

            list.addEventListener('click', function(evt) {
                let target = evt.target,
                    parent = target.parentNode,
                    label = parent.previousSibling,
                    targetName = target.nodeName.toUpperCase();

                if('LI' === targetName) {
                    //TODO: callback
                    let path = [label.textContent, target.textContent].join(' / ');
                    console.log(path);
                } else if('LABEL' === targetName) {
                    relayout();
                }

            });

            let keyUpDebounceTimer = null;
            let prevNodes = null;
            search.addEventListener('keyup', function() {
                clearInterval(keyUpDebounceTimer);

                keyUpDebounceTimer = setTimeout(() => {
                    let val = this.value.trim().toLowerCase(),
                        nodes = searchIndex(index, val);

                    for(let c in cards) {
                        cards[c].root.classList.add('hidden');
                        each.call(cards[c].list, (l) => {
                            l.classList.add('hidden');
                        });
                    }

                    nodes && each.call(nodes, (n) => {
                        let el = n.root || n;
                        el.classList.remove('hidden');
                    });

                    //TODO: each
                    for(let c in cards) {
                        var len = cards[c].list.querySelectorAll(':not(.hidden)').length;
                        cl(len);
                        cards[c].label.setAttribute('data-count', len);
                    }

/*
                    prevNodes && each.call(prevNodes, (n) => {
                        let el = n.root || n;
                        el.classList.remove('hidden');
                    });

                    nodes && each.call(nodes, (n) => {
                        let el = n.root || n;
                        el.classList.add('hidden');
                    });

                    prevNodes = nodes;
*/

                    relayout();
                }, 400);
            });
        }).catch(function() {
            console.error(arguments);
        });
    };
})(document, window);
