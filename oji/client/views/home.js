import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.home.helpers({
    'userIsUser' : () => Roles.userIsInRole(Meteor.userId(), 'user'),
});

Template.home.events({
})

Template.home.rendered = function() {
    //if user is logged in, route to profile
    if(Meteor.userId()){
        Router.go('/profile');
    }
};