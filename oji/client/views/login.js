import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.login.events({
    'click #login-submit': function(event) {
        event.preventDefault();
        Meteor.loginWithPassword($('#usernameLogin').val(), $('#passwordLogin').val(), function(error) {
            if (error) {
                console.log(error);
                $('#passwordLogin').val('');
                Session.set('overrideCordova', true);
                Router.go('/', 
                    {
                        message: "Login failed",
                        alert: "danger"
                    }
                );
            } else {
                console.log("Login successful");
                $('#usernameLogin').val('');
                $('#passwordLogin').val('');
                //goes to profile
                Router.go('profile');
            }
        });
        //clears the Login boxes on submit
    },
    'click #signup-submit': function(event) {
        event.preventDefault();
        Router.go('/signup')
    },
    'click #code-submit': function(event) {
        event.preventDefault();
        Router.go('/code')
    }
})