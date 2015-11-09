import {WidgetCtl} from './WidgetCtl';

(function (window, document){
    "use strict";

    document.registerElement('x-widget', {
        prototype: Object.create(HTMLElement.prototype, {
            createdCallback: {
                value: function() {
                    var root = this.createShadowRoot(),
                        template = document.querySelector('#template'),
                        clone = document.importNode(template.content, true);

                    root.appendChild(clone);
                }
            },
            attachedCallback: {
                value:function () {
                    new WidgetCtl(this, {
                        layout: this.getAttribute('data-layout')
                    });
                }
            },
            detachedCallback: {
                value:function () {
                    //TODO: cleanup
                }
            },
            attributeChangedCallback: {
                value: function() {
                    //TODO: implement
                }
            }
        })
    });
})(window, document.currentScript.ownerDocument);