import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

function loginUser(){
    Meteor.loginWithPassword($('#usernameInput')[0].value, $('#passwordInput')[0].value);
    //clears the input boxes on submit
    $('#usernameInput')[0].value = '';
    $('#passwordInput')[0].value = '';
}

Template.login.events({
    'click #login-submit': loginUser()
})