import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.login.events({
    'click #login-submit': function() {
        event.preventDefault();
        Meteor.loginWithPassword($('#usernameLogin')[0].value, $('#passwordLogin')[0].value);
        //clears the Login boxes on submit
        $('#usernameLogin')[0].value = '';
        $('#passwordLogin')[0].value = '';
    },
    'click #signup-submit': function() {
        event.preventDefault();
        Router.go('/signup')
    }
})