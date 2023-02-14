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
        Meteor.call('getAsset', 'release.apk', function(err, url) {
            var asset = url;
            //create a blob from the asset
            var blob = new Blob([asset], {type: 'application/vnd.android.package-archive'});
            //create a url from the blob
            var url = URL.createObjectURL(blob);
            //create a link element
            var a = document.createElement('a');
            //set the href of the link to the url
            a.href = url;
            //set the download attribute of the link to the filename
            a.download = 'release.apk';
            //append the link to the body
            document.body.appendChild(a);
            //click the link
            a.click();
            //remove the link from the body
            document.body.removeChild(a);
        });
    },
});
