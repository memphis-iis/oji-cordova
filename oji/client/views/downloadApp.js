Template.downloadApp.events({
    'click #downloadAndroid': function(event) {
        event.preventDefault();
        window.open("https://drive.google.com/file/d/1YodcT1fAiCoGrQhBrd0jJLl7xbChIr-F/view?usp=share_link", "_system");
    },
});


Template.downloadApp.onRendered(function() {
    //remove background image
    $('body').css('background-image', 'none');
});
