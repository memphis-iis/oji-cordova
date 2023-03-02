Template.downloadApp.events({
    'click #login-submit': function(event) {
        event.preventDefault();
        Meteor.loginWithPassword($('#usernameLogin').val(), $('#passwordLogin').val());
        //clears the Login boxes on submit
        $('#usernameLogin').val('');
        $('#passwordLogin').val('');
        //alert('Login Successful');
    },
    'click #downloadAndroid': function(event) {
        event.preventDefault();
        //get the asset url from meteor
        Meteor.call('getAPKUrl', function(err, url){
            //open the url in a new tab
            window.open(url, '_blank');
        });
    },
});
