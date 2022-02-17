import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.DefaultLayout.onCreated(function() {
  this.autorun(() => {
    console.log(Orgs.find().fetch());
    
  });
})

Template.DefaultLayout.events({
  'click #logoutButton': function(event) {
    event.preventDefault();
    Meteor.logout();
    Router.go("/");
  },

  'click #navbar-brand': function(event){
    event.preventDefault();
    Router.go("/");
  }
});

Template.DefaultLayout.helpers({
  'organization': () => Orgs.findOne(),
}); 
