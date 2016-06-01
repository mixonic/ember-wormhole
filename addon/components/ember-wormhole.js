import Ember from 'ember';
import layout from '../templates/components/ember-wormhole';

var computed = Ember.computed;
var observer = Ember.observer;
var run = Ember.run;

function getActiveElement() {
  if (typeof document === 'undefined') {
    return null;
  } else {
    return document.activeElement;
  }
}

// used to find an element by id
function childNodesOfElement(element) {
  let children = [];
  let child = element.firstChild;
  while (child) {
    children.push(child);
    child = child.nextSibling;
  }
  return children;
}

// implement our own getElementById since it doesn't exist in SimpleDOM
function findElementById(doc, id) {
  let nodes = childNodesOfElement(doc);
  let node;

  while (nodes.length) {
    node = nodes.shift();

    if (node.getAttribute && node.getAttribute('id') === id) {
      return node;
    }

    nodes = childNodesOfElement(node).concat(nodes);
  }
}

export default Ember.Component.extend({
  layout,
  to: computed.alias('destinationElementId'),
  destinationElementId: null,
  destinationElement: computed('destinationElementId', 'renderInPlace', function() {
    let renderInPlace = this.get('renderInPlace');
    if (renderInPlace) {
      return this._element;
    }
    let id = this.get('destinationElementId');
    if (!id) {
      return null;
    }
    let doc = this.get('dom').document;
    let el = findElementById(doc, id);
    return el;
  }),
  renderInPlace: false,

  init() {
    this._super(...arguments);
    // keep a ref to 'dom' and 'registry' because those will be passed to
    // the ember-wormhole-placeholder helper
    let dom = this.renderer._dom;
    this.set('dom', dom);
    this.set('registry', {});
    this._didInsert = false;
  },

  willRender() {
    this._super(...arguments);
    if (!this._didInsert) {
      this._didInsert = true;
      run.schedule('afterRender', () => {
        // read the values from the ember-wormhole-placeholder helpers
        this._firstNode = this.get('registry.head');
        this._lastNode = this.get('registry.tail');
        this._element = this._firstNode.parentNode;
        this.appendToDestination();
      });
    }
  },

  willDestroyElement: function() {
    // not called in fastboot
    this._super(...arguments);
    var firstNode = this._firstNode;
    var lastNode = this._lastNode;
    run.schedule('render', () => {
      this.removeRange(firstNode, lastNode);
    });
  },

  destinationDidChange: observer('destinationElement', function() {
    var destinationElement = this.get('destinationElement');
    if (destinationElement !== this._firstNode.parentNode) {
      run.schedule('render', this, 'appendToDestination');
    }
  }),

  appendToDestination: function() {
    var destinationElement = this.get('destinationElement');
    if (!destinationElement) {
      var destinationElementId = this.get('destinationElementId');
      if (destinationElementId) {
        throw new Error(`ember-wormhole failed to render into '#${this.get('destinationElementId')}' because the element is not in the DOM`);
      }
      throw new Error('ember-wormhole failed to render content because the destinationElementId was set to an undefined or falsy value.');
    }

    var currentActiveElement = getActiveElement();
    this.appendRange(destinationElement, this._firstNode, this._lastNode);
    if (currentActiveElement && getActiveElement() !== currentActiveElement) {
      currentActiveElement.focus();
    }
  },

  appendRange: function(destinationElement, firstNode, lastNode) {
    while(firstNode) {
      destinationElement.insertBefore(firstNode, null);
      firstNode = firstNode !== lastNode ? lastNode.parentNode.firstChild : null;
    }
  },

  removeRange: function(firstNode, lastNode) {
    var node = lastNode;
    do {
      var next = node.previousSibling;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
        if (node === firstNode) {
          break;
        }
      }
      node = next;
    } while (node);
  }

});
