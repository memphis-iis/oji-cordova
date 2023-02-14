Template.messages.helpers({
    'message': function(){
        var chats = Chats.find({status:'unread'}, {sort: {createdAt: -1}}).fetch();
        t = Template.instance();
        t.allMessages.set(chats);
        return chats;
    },
    'inbox': function(){
        template = Template.instance();
        console.log(template.inbox.get());
        return template.inbox.get();
    },
    'compose': function(){
        template = Template.instance();
        return template.compose.get();
    },
    'curMessage': function(){
        template = Template.instance();
        return template.curMessage.get();
    },
    'displayMessage': function(){
        template = Template.instance();
        return template.displayMessage.get();
    },
    'usersList': function() {
        if(Roles.userIsInRole(Meteor.userId(), 'admin')) {
            return Meteor.users.find({organization: Meteor.user().organization}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        } else {
            return Meteor.users.find({ role: 'user', organization: Meteor.user().organization, supervisor: Meteor.userId()}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch();
        }
    },
})

Template.messages.events({
    'click #msg-mark-read': function(e){
        e.preventDefault();
        var id = $(e.target).attr('data-id');
        Meteor.call('updateMessageStatus', id, "read");
        template = Template.instance();
        template.displayMessage.set(false);
        template.curMessage.set(null);
        template.inbox.set(true);
        template.compose.set(false);
    },
    'click #msg-reply-display': function(e){
        $('#msg-reply-display').show();
        var to = $(e.target).attr('data-id');
        $('#msg-reply-to').val(to);
    },
    'click #msg-send': function(e){
        e.preventDefault();
        var message = $('#message').val();
        var subject = $('#msg-subject').val();
        //get current user's supervisor
        var to = $('#msg-to').val() || Meteor.users.findOne({_id: Meteor.userId()}).supervisor;
        Meteor.call('newMessage', message, to, subject, function(error, result){
            if(error){
                alert('Message failed to send');
            } else 
                alert('Message sent');
            }
        ); 
        $('#message').val('');
        $('#msg-subject').val('');
        $('#msg-to').val('');
        template = Template.instance();
        template.displayMessage.set(false);
        template.curMessage.set(null);
        template.inbox.set(true);
        template.compose.set(false);
        
    },
    'click #newMessage': function(e){
        e.preventDefault();
        template = Template.instance();
        template.inbox.set(false);
        template.compose.set(true);
        template.curMessage.set(false);
    }, 
    'click #inbox': function(e){
        e.preventDefault();
        template = Template.instance();
        template.inbox.set(true);
        template.compose.set(false);
        template.curMessage.set(false);
    },
    'click #display-message': function(e){
        e.preventDefault();
        template = Template.instance();
        selectedMessageId = $(e.target).attr('data-id');
        console.log(selectedMessageId);
        allMessages = template.allMessages.get();
        selectedMessage = allMessages.find(function(message){
            return message._id == selectedMessageId;
        });
        template.curMessage.set(selectedMessage);
        template.displayMessage.set(true);
        template.inbox.set(false);
        template.compose.set(false);
    },
    'click #msg-reply': function(e){
        e.preventDefault();
        template = Template.instance();
        curMessage = template.curMessage.get();
        template.inbox.set(false);
        template.compose.set(true);
        template.curMessage.set(curMessage);
        template.displayMessage.set(false);
        $('#message').val(curMessage.message);
        $('#msg-subject').val('RE: ' + curMessage.subject);
        $('#msg-to').val(curMessage.from);
    }
})

Template.messages.onCreated(function(){
    Meteor.subscribe('getUsersInOrg');
    this.inbox = new ReactiveVar(true);
    this.compose = new ReactiveVar(false);
    this.curMessage = new ReactiveVar(false);
    this.displayMessage = new ReactiveVar(false);
    this.allMessages = new ReactiveVar(false);
})