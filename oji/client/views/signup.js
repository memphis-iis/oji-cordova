import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.signup.events({
    'click #signup-submit': function(event) {
        event.preventDefault();
        var user = $('#usernameSignin').val();
        var pass = $('#passwordSignin').val();
        var emailAddr = $('#emailSignin').val();
        var firstName = $('#firstnameSignin').val();
        var lastName = $('#lastnameSignin').val();
        var linkId = $('#linkId').val();
        Meteor.call('createNewUser', user, pass, emailAddr,firstName, lastName, linkId, function(err, res) {
            var route;
            if(res){
                Meteor.loginWithPassword(user, pass);
                Router.go(res);
            }
        });
    },
    
});


