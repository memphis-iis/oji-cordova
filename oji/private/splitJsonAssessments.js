// use fs to load defaultAssessments.json
const fs = require('fs');
const path = require('path');
//use fs to read defaultAssessments.json
const defaultAssessments = fs.readFileSync("defaultAssessments.json", "utf8");
//make dir named assessments
fs.mkdirSync(path.join(__dirname, 'assessments'));
//read defaultAssessments.json
const assessments = JSON.parse(defaultAssessments);
const assessmentList = assessments.assessments
//loop through the object and write each assessment to a file
for (let i = 0; i < assessmentList.length; i++) {
    const assessment = assessmentList[i];
    const assessmentName = assessment.assessment.title;
    const assessmentString = JSON.stringify(assessment);
    fs.writeFileSync(path.join(__dirname, 'assessments', assessmentName + '.json'), assessmentString);
    }
//write the assessmentList to a file
const assessmentListString = JSON.stringify(assessmentList);
fs.writeFileSync(path.join(__dirname, 'assessmentList.json'), assessmentListString);
