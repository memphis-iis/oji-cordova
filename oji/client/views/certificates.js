Template.certifcates.helpers({
    'certificates': function(){
        files = Files.find({"meta.user": Meteor.userId()}).fetch();
        certificates = [];
        for(let cert of files){
            moduleTitle = 'Oji Completion'
            if(cert.meta.moduleId !== "completion"){
                moduleTitle = Modules.findOne({_id: cert.meta.moduleId}).title;
            }
            certificates.push({
                file: cert.name,
                link: Files.link(cert),
                moduleTitle: moduleTitle
            });
        }
        console.log(certificates);
        return certificates;
    }
})

Template.certifcates.events({
    
})


Template.certifcates.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('modules');
    Meteor.subscribe('files.images.all');
})