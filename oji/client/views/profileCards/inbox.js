Template.inbox.helpers({
    'message': function(){
        var chats = Chats.find({status:'unread'}, {sort: {createdAt: -1}}).fetch();
        console.log("Chats: " + chats);
        return chats;
    },
});

Template.inbox.events({
    'click .display-message': function(e){
        Router.go('/messages/');
    },
});