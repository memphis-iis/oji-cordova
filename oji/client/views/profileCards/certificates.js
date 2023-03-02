Template.awards.helpers({
    'certificates': function(){
        return Meteor.user().certificates;
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
        //convert the image to a blob
        image.onload = function() {
            //if cordova is available, save the image to the device's downloads folder
            if (Meteor.isCordova) {
                //ask the user for permission to save the image using xhttp request
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'blob';
                xhr.onload = function(e) {
                    if (this.status == 200) {
                        var blob = this.response;
                        //save the blob to the device's downloads folder
                        window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dir) {
                            dir.getFile('certificate.png', { create: true }, function(file) {
                                file.createWriter(function(fileWriter) {
                                    fileWriter.write(blob);
                                    alert('certificate saved to downloads folder');
                                });
                            });
                        });
                    }
                }
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