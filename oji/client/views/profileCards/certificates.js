Template.awards.helpers({
    'certificates': function(){
        certificates = Meteor.user().certificates;
        Console.log(certificates);
        return certificates;
    },
});

Template.awards.events({
    'click .certificate': function(e){
        console.log('clicked');
        //get the url
        var url = $(e.target).attr('data-itemurl');
        //open the url as an image object
        var image = new Image();
        image.src = url;
        //get the certificate's name
        var name = $(e.target).attr('data-itemname');
        //convert the image to a blob
        image.onload = function() {
            //if cordova is available, save the image to the device's downloads folder
            if (Meteor.isCordova) {
                //ask the user for permission to save the image using xhttp request
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
                    fileSystem.root.getFile("Download/" + name + ".png", {
                        create: true,
                        exclusive: false
                    }, function(fileEntry) {
                        var fileTransfer = new FileTransfer();
                        fileTransfer.download(url, fileEntry.toURL(), function(entry) {
                            //success
                            console.log("download complete: " + entry.toURL());
                            alert('Certificate saved to your downloads folder');
                        }, function(error) {
                            //error
                            console.log("download error source " + error.source);
                            console.log("download error target " + error.target);
                            console.log("upload error code" + error.code);
                            alert('Error saving certificate:' + error.code);
                        });
                    }, function() {
                        //error
                        console.log('error');
                    });
                });
            } else {
                //if cordova is not available, save the blob to the browser's downloads folder
                var link = document.createElement('a');
                link.href = url;
                link.download = 'certificate.png';
                link.click();
                //delete the link
                delete link;
            }
        }; 
    },
});