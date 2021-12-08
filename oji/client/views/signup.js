import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.login.events({
    'click #signup-submit': function(event) {
        event.preventDefault();
        if (!Accounts.findUserByUsername($('#usernameSignin')[0].value)) {
            Accounts.createUser({
                username: $('#usernameSignin')[0].value,
                password: $('#passwordSignin')[0].value,
                email: $('#emailSignin')[0].value,
                firstname: $('#firstnameSignin')[0].value,
                lastname: $('#lastnameSignin')[0].value,
                organization: null,
                supervisor: null,
            });
            Router.go("/");
        }
        
    }
})


