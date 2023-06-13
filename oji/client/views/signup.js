import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';

Template.signup.onCreated(function() {
    //create reactive variable to hold terms and conditions acceptance timestamp
    this.acceptedTermsTimestamp = new ReactiveVar();
});

Template.signup.events({
    'click #terms-accept': function(event) {
        event.preventDefault();
        //hide terms and show signup form
        $('#terms').prop('hidden', true);
        $('#signup-form').prop('hidden', false);
        //set reactive variable to current time
        Template.instance().acceptedTermsTimestamp.set(Date.now());
    },
    'click #signup-submit': function(event) {
        event.preventDefault();
        const user = $('#usernameSignin').val();
        const pass = $('#passwordSignin').val();
        const emailAddr = $('#emailSignin').val();
        const firstName = $('#firstnameSignin').val();
        const lastName = $('#lastnameSignin').val();
        const sex = $('#sex').val();
        const gender = $('#gender').val();
        const linkId = $('#linkId').val();
        const acceptedTermsTimestamp = Template.instance().acceptedTermsTimestamp.get();
        //verify that all fields are filled out, and that password is at least 6 characters and contains at least one number, one uppercase letter, and one lowercase letter, otherwise display error message
        if(
            user === '' ||
            pass === '' ||
            emailAddr === '' ||
            firstName === '' ||
            lastName === '' ||
            !pass.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{6,}$/)
        ){
            alert('Please fill out all fields and ensure that your password is at least 6 characters and contains at least one number, one uppercase letter, and one lowercase letter.');
            return;
        }

        Meteor.call('createNewUser', user, pass, emailAddr,firstName, lastName, sex, gender, acceptedTermsTimestamp, linkId, function(error, result){
            if(error){
                console.log(error);
                alert("There was an error creating your accounnt: " + error);
            }
            else{
                Meteor.loginWithPassword($('#usernameSignin').val(), $('#passwordSignin').val());
                if($('#linkId').val()){
                    Router.go("/profile");
                }
                else{
                    Router.go("/createOrg")
                }
            }
        })
    },
    'click #home-route': function() {
        event.preventDefault();
        Router.go('/')
    }
});


