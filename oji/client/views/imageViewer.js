Template.imageViewer.helpers({
    /* get source from url */
    'imageSource': function(){
        return this.source;
    },
});

Template.imageViewer.events({
    'click #close': function(event){
        event.preventDefault();
        //return to previous page
        window.history.back();
    },
    'click #download': function(event){
        //get the image source from this.source
        src = this.source;
        //strip the filename from the source
        var filename = src.substring(src.lastIndexOf('/')+1);
        //if cordova, ask for permission to download, then download using xhttprequest
        //if not cordova, download 
        if(Meteor.isCordova){
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
                fileSystem.root.getFile(filename, {create: true, exclusive: false}, function(fileEntry){
                    var fileTransfer = new FileTransfer();
                    fileTransfer.download(src, fileEntry.toURL(), function(entry){
                        console.log("download complete: " + entry.toURL());
                    }, function(error){
                        console.log("download error source " + error.source);
                        console.log("download error target " + error.target);
                        console.log("upload error code" + error.code);
                    });
                }, function(error){
                    console.log("fileEntry error: " + error.code);
                });
            });
        }
    }
});

