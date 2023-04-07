import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import html2canvas from 'html2canvas';
import {ReactiveVar} from 'meteor/reactive-var';

Template.login.onCreated(function() {
    //create reactive variable to hold the verification code
    verCode = Math.floor(100000 + Math.random() * 900000);
    //add verification code to the user's profile
    this.verificationCode = new ReactiveVar(verCode);
});
Template.login.helpers({
    'verficationCode': function() {
        //display the verification code
        return Template.instance().verificationCode.get();
    }
});
Template.login.events({
    'click #login-submit': function(event) {
        event.preventDefault();
        Meteor.loginWithPassword($('#usernameLogin').val(), $('#passwordLogin').val(), function(error) {
            if (error) {
                console.log(error);
                alert("Login failed, please try again");
                //send error to server to log
                Meteor.call('logError', error);
                $('#passwordLogin').val('');
                Session.set('overrideCordova', true);
                Router.go('/', 
                    {
                        message: "Login failed",
                        alert: "danger"
                    }
                );
                //set user's last login attempt to failed
            } else {
                console.log("Login successful");
                $('#usernameLogin').val('');
                $('#passwordLogin').val('');
                //use html2canvas to take a screenshot of the login page, add a timestamp, and save it to the user's profile
                //verify that html2canvas is working
                if(!html2canvas){
                    console.log("html2canvas not working");
                    alert("Verification not working, please contact support. Error: html2canvas not working" + e);
                }
                    try{
                    html2canvas(document.body, {
                        scale: 0.25
                        }).then(function(canvas) {
                        //add timestamp to image in readable format
                        var ctx = canvas.getContext('2d');
                        ctx.font = "100px Arial";
                        ctx.fillStyle = "red";
                        //get human readable timestamp
                        var date = new Date();
                        var timestamp = date.toDateString() + " " + date.toLocaleTimeString();
                        //break timestamp into lines
                        var lines = timestamp.split(" ");
                        //add each line to the image
                        for(var i = 0; i < lines.length; i++){
                            ctx.fillText(lines[i], 10, 200 + (i * 100));
                        }
                        //add verification code to image at the bottom
                        ctx.font = "100px Arial";
                        ctx.fillStyle = "red";
                        ctx.fillText(verCode, 10, 800);
                        //convert canvas to data url
                        var dataURL = canvas.toDataURL();
                        //save data url to user's profile
                        Meteor.call('saveLoginScreenshot', dataURL, function(error, result){
                            if(error){
                                console.log(error);
                                alert("Verification not working, please contact support. Error: " + error)
                                Meteor.call('logError', error);
                            }
                            else{
                                console.log("Login screenshot saved");
                            }
                        })
                    });
                } catch (e) {
                    console.log(e);
                    alert("Verification not working, please contact support. Error: " + e);
                    Meteor.call('logError', e);
                }
            }
        });
        Meteor.call('saveVerificationCode', verCode, function(error, result){
            if(error){
                console.log(error);
            }
            else{
                console.log("Verification code saved");
            }
        })
        Router.go('/profile');
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