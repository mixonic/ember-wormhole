import Ember from 'ember';

export default Ember.Helper.helper((_, {registry, as: slot, dom}) => {
  let node = dom.createTextNode('');
  registry[slot] = node;
  return node;
});
