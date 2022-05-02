import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

Template.devtest.events({
    'click #generateCert': function(event) {
        event.preventDefault();
        Meteor.call('generateCertificate',async function(err,res){
            const pdfDoc = await PDFDocument.load(res.pdfDoc);
            const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
            var a = document.createElement("a");
            document.getElementById('pdf').src = pdfDataUri.src = pdfDataUri;
        });
    },
    'click #generateCertMod': function(event) {
        event.preventDefault();
        Meteor.call('generateCertificate','Wb5YzxL5H3pJMTpBQ',async function(err,res){
            const pdfDoc = await PDFDocument.load(res.pdfDoc);
            const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
            var a = document.createElement("a");
            document.getElementById('pdf').src = pdfDataUri.src = pdfDataUri;
        });
    }
});