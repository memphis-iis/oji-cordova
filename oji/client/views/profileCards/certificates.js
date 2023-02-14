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
            var canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
            canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size
            canvas.getContext('2d').drawImage(this, 0, 0);
            // Get raw image data
            var data = canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '');
            // Convert to Blob
            var blob = new Blob([data], {type: 'image/png'});
            //if cordova is available, save the blob to the device as a file in the downloads folder
            if (Meteor.isCordova) {
                window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function(dir) {
                    dir.getFile("certificate.png", {create:true}, function(file) {
                        file.createWriter(function(fileWriter) {
                            fileWriter.write(blob);
                            //alert('File saved to downloads folder');
                            //open the file in the device's default image viewer
                            cordova.plugins.fileOpener2.open(
                                cordova.file.externalRootDirectory + 'certificate.png', 
                                'image/png', 
                                { 
                                    error : function(e) { 
                                        console.log('Error status: ' + e.status + ' - Error message: ' + e.message);
                                    },
                                    success : function () {
                                        console.log('file opened successfully');
                                    }
                                }
                            );
                        });
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